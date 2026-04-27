"""
Duplicate Buyer Detection using TF-IDF + Cosine Similarity.
Finds potential duplicate buyers based on name similarity.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buyers import Buyer


def preprocess_name(name: str) -> str:
    """Normalize buyer name for comparison."""
    name = name.upper().strip()
    # Remove common suffixes/prefixes
    for suffix in [" PVT LTD", " PVT. LTD.", " PRIVATE LIMITED", " LTD", " LTD.",
                   " TRADERS", " TEXTILES", " TEXTILE", " FABRICS", " FABRIC",
                   " ENTERPRISES", " INDUSTRIES", " & CO", " AND CO"]:
        name = name.replace(suffix, "")
    # Remove punctuation
    for ch in ".,()-&/\\":
        name = name.replace(ch, " ")
    # Collapse whitespace
    return " ".join(name.split())


async def find_duplicates_tfidf(db: AsyncSession, threshold: float = 0.7, limit: int = 50):
    """Find duplicate buyers using TF-IDF cosine similarity."""
    result = await db.execute(
        select(Buyer).where(Buyer.is_active == True).order_by(Buyer.id)
    )
    buyers = result.scalars().all()

    if len(buyers) < 2:
        return []

    # Preprocess names
    names = [preprocess_name(b.name) for b in buyers]
    ids = [b.id for b in buyers]
    original_names = [b.name for b in buyers]
    meters = [b.total_purchases_meters or 0 for b in buyers]

    # TF-IDF on character n-grams (works better for names than word tokens)
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4))
    tfidf_matrix = vectorizer.fit_transform(names)

    # Compute pairwise cosine similarity
    # Process in chunks to avoid memory issues with 15K buyers
    duplicate_groups = []
    seen = set()

    # Only compare buyers with some purchase history to reduce noise
    active_indices = [i for i in range(len(buyers)) if meters[i] > 0]

    for i in active_indices:
        if ids[i] in seen:
            continue

        # Compute similarity of this buyer against all others
        sim = cosine_similarity(tfidf_matrix[i:i+1], tfidf_matrix).flatten()

        matches = []
        for j in range(len(buyers)):
            if i == j or ids[j] in seen:
                continue
            if sim[j] >= threshold:
                matches.append({
                    "id": ids[j],
                    "name": original_names[j],
                    "similarity": round(float(sim[j]), 3),
                    "total_meters": meters[j],
                })
                seen.add(ids[j])

        if matches:
            group = {
                "primary": {
                    "id": ids[i],
                    "name": original_names[i],
                    "total_meters": meters[i],
                },
                "duplicates": sorted(matches, key=lambda x: x["similarity"], reverse=True),
            }
            duplicate_groups.append(group)
            seen.add(ids[i])

        if len(duplicate_groups) >= limit:
            break

    return duplicate_groups
