"""Bulk stock update via CSV upload."""
import io
import csv

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.stock import StockEntry
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/bulk", tags=["bulk"])


@router.post("/stock-update")
async def bulk_stock_update(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """
    Bulk update stock via CSV.
    CSV format: id, meters, status, rack_number
    First row must be header.
    """
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 5MB)")

    text = contents.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    required = {"id"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(status_code=400, detail="CSV must have 'id' column. Optional: meters, status, rack_number")

    updated = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        try:
            stock_id = int(row["id"])
            result = await db.execute(select(StockEntry).where(StockEntry.id == stock_id))
            entry = result.scalar_one_or_none()
            if not entry:
                errors.append(f"Row {i}: stock id {stock_id} not found")
                continue

            if "meters" in row and row["meters"]:
                entry.meters = float(row["meters"])
            if "status" in row and row["status"]:
                if row["status"] in ("available", "reserved", "sold"):
                    entry.status = row["status"]
                else:
                    errors.append(f"Row {i}: invalid status '{row['status']}'")
            if "rack_number" in row and row["rack_number"]:
                entry.rack_number = row["rack_number"]
            if "hall" in row and row["hall"]:
                entry.hall = row["hall"]

            updated += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")

    await db.flush()
    return {
        "updated": updated,
        "errors": errors[:20],
        "total_rows": updated + len(errors),
    }
