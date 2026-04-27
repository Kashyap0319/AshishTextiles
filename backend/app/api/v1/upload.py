from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.upload_service import process_excel_upload

router = APIRouter(prefix="/upload", tags=["upload"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_FILE_TYPES = {"sales_vouchers", "dyed_sale", "quality_reference", "packing_list", "rack_numbers"}
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    file_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate file_type
    if file_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file_type. Allowed: {', '.join(ALLOWED_FILE_TYPES)}")

    # Validate extension
    filename = file.filename or ""
    ext = filename[filename.rfind("."):].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only .xlsx and .xls files are allowed")

    # Read with size limit
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB")

    result = await process_excel_upload(contents, file_type, filename, db)
    return result
