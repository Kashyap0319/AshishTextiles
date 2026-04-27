from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.warehouse import Rack
from pydantic import BaseModel

router = APIRouter(prefix="/warehouse", tags=["warehouse"])


class RackCreate(BaseModel):
    rack_number: str
    hall: str
    assigned_article: str | None = None
    capacity_meters: float | None = None
    current_meters: float = 0


class RackUpdate(BaseModel):
    assigned_article: str | None = None
    capacity_meters: float | None = None
    current_meters: float | None = None


class RackResponse(BaseModel):
    id: int
    rack_number: str
    hall: str
    assigned_article: str | None
    capacity_meters: float | None
    current_meters: float | None

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[RackResponse])
async def list_racks(
    hall: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Rack)
    if hall:
        query = query.where(Rack.hall == hall)
    query = query.order_by(Rack.hall, Rack.rack_number)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/halls")
async def list_halls(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import distinct
    result = await db.execute(select(distinct(Rack.hall)).order_by(Rack.hall))
    return {"halls": result.scalars().all()}


@router.get("/{rack_id}", response_model=RackResponse)
async def get_rack(rack_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rack).where(Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    return rack


@router.post("/", response_model=RackResponse, status_code=201)
async def create_rack(data: RackCreate, db: AsyncSession = Depends(get_db)):
    rack = Rack(**data.model_dump())
    db.add(rack)
    await db.flush()
    await db.refresh(rack)
    return rack


@router.put("/{rack_id}", response_model=RackResponse)
async def update_rack(rack_id: int, data: RackUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rack).where(Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rack, key, value)
    await db.flush()
    await db.refresh(rack)
    return rack


@router.delete("/{rack_id}", status_code=204)
async def delete_rack(rack_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Rack).where(Rack.id == rack_id))
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")
    await db.delete(rack)
