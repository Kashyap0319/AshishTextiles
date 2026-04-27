"""AI Chat endpoint — Gemini API with live database context."""
import json
import re

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.chat_service import gather_context, run_query, SYSTEM_PROMPT

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant" (mapped to "model" for Gemini)
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


def detect_queries(message: str) -> list[tuple[str, dict]]:
    """Detect what data queries to run based on user message."""
    queries = []
    msg = message.lower()

    buyer_match = re.search(r'(?:buyer|खरीदार|customer)\s+["\']?([a-zA-Z\s]+)["\']?', msg, re.IGNORECASE)
    if buyer_match:
        queries.append(("buyer_search", {"name": buyer_match.group(1).strip()}))

    if any(w in msg for w in ["history", "purchases", "bought", "खरीदा", "इतिहास"]):
        name_match = re.search(r'(?:of|for|ka|ke|ki)\s+["\']?([a-zA-Z\s]+)["\']?', msg, re.IGNORECASE)
        if name_match:
            queries.append(("buyer_history", {"name": name_match.group(1).strip()}))

    article_match = re.search(r'(?:article|आर्टिकल|sort)\s+["\']?([a-zA-Z0-9]+)["\']?', msg, re.IGNORECASE)
    if article_match:
        queries.append(("article_search", {"code": article_match.group(1).strip()}))

    quality_match = re.search(r'(?:quality|गुणवत्ता|category)\s+["\']?([a-zA-Z\-]+)["\']?', msg, re.IGNORECASE)
    if quality_match:
        queries.append(("stock_by_quality", {"quality": quality_match.group(1).strip()}))

    if any(w in msg for w in ["aging", "critical", "पुराना", "old stock", "90 day", "expired"]):
        queries.append(("aging_critical", {}))

    hall_match = re.search(r'(?:hall|हॉल)\s*(\d+|[a-zA-Z]+)', msg, re.IGNORECASE)
    if hall_match:
        queries.append(("hall_stock", {"hall": f"Hall {hall_match.group(1)}"}))

    return queries


def _get_gemini_model():
    """Initialize Gemini model."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=SYSTEM_PROMPT,
    )


def _build_gemini_history(messages: list[ChatMessage], db_context: str, query_results: list[str]):
    """Convert our message format to Gemini chat history."""
    # First message includes DB context
    context_msg = db_context
    if query_results:
        context_msg += "\n\nQUERY RESULTS (from live database):\n" + "\n\n".join(query_results)

    history = []
    for i, msg in enumerate(messages[:-1]):  # All except last (which we'll send as the new message)
        role = "user" if msg.role == "user" else "model"
        content = msg.content
        # Inject context into first user message
        if i == 0 and role == "user":
            content = f"[DATABASE CONTEXT]\n{context_msg}\n\n[USER QUESTION]\n{content}"
        history.append({"role": role, "parts": [content]})

    # The last user message
    last_msg = messages[-1].content
    if not history:
        # If this is the first message, inject context
        last_msg = f"[DATABASE CONTEXT]\n{context_msg}\n\n[USER QUESTION]\n{last_msg}"

    return history, last_msg


@router.post("/")
@limiter.limit("10/minute")
async def chat(request: Request, data: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    db_context = await gather_context(db)

    user_msg = data.messages[-1].content if data.messages else ""
    queries = detect_queries(user_msg)
    query_results = []
    for qtype, params in queries:
        result = await run_query(db, qtype, params)
        query_results.append(result)

    model = _get_gemini_model()
    history, last_message = _build_gemini_history(data.messages, db_context, query_results)

    try:
        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(last_message)
        return {"reply": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")


@router.post("/stream")
@limiter.limit("10/minute")
async def chat_stream(request: Request, data: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Streaming chat response via Gemini."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    db_context = await gather_context(db)

    user_msg = data.messages[-1].content if data.messages else ""
    queries = detect_queries(user_msg)
    query_results = []
    for qtype, params in queries:
        result = await run_query(db, qtype, params)
        query_results.append(result)

    model = _get_gemini_model()
    history, last_message = _build_gemini_history(data.messages, db_context, query_results)

    async def generate():
        try:
            chat_session = model.start_chat(history=history)
            response = chat_session.send_message(last_message, stream=True)
            for chunk in response:
                if chunk.text:
                    yield f"data: {json.dumps({'text': chunk.text})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
