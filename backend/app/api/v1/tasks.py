"""Task Assignment System — admin assigns, employee completes/rejects."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tasks import Task
from app.models.users import User
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


class CreateTask(BaseModel):
    description: str
    assigned_to: int
    priority: str = "normal"


class TaskResponse(BaseModel):
    id: int
    description: str
    assigned_to: int
    assigned_by: int | None
    assigned_to_name: str | None
    assigned_by_name: str | None
    status: str
    priority: str
    notes: str | None
    created_at: object = None
    completed_at: object = None

    model_config = {"from_attributes": True}


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    data: CreateTask,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin creates a task and assigns to an employee."""
    # Verify assignee exists
    result = await db.execute(select(User).where(User.id == data.assigned_to))
    assignee = result.scalar_one_or_none()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assigned user not found")

    task = Task(
        description=data.description,
        assigned_to=data.assigned_to,
        assigned_by=user.id,
        assigned_to_name=assignee.name,
        assigned_by_name=user.name,
        priority=data.priority,
    )
    db.add(task)
    await db.flush()
    await db.refresh(task)
    return task


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    status: str | None = None,
    assigned_to: int | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List tasks — admin sees all, employee sees own."""
    query = select(Task).order_by(Task.created_at.desc())
    if user.role != "admin":
        query = query.where(Task.assigned_to == user.id)
    if status:
        query = query.where(Task.status == status)
    if assigned_to:
        query = query.where(Task.assigned_to == assigned_to)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{task_id}/complete")
async def complete_task(
    task_id: int,
    notes: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role != "admin" and task.assigned_to != user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    task.status = "completed"
    task.notes = notes
    task.completed_at = datetime.now(timezone.utc)
    await db.flush()
    return {"status": "completed", "task_id": task_id}


@router.put("/{task_id}/reject")
async def reject_task(
    task_id: int,
    notes: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role != "admin" and task.assigned_to != user.id:
        raise HTTPException(status_code=403, detail="Not your task")
    task.status = "rejected"
    task.notes = notes
    await db.flush()
    return {"status": "rejected", "task_id": task_id}


@router.put("/{task_id}/reassign")
async def reassign_task(
    task_id: int,
    new_assignee: int = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin reassigns a task to a different employee."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    assignee = await db.execute(select(User).where(User.id == new_assignee))
    new_user = assignee.scalar_one_or_none()
    if not new_user:
        raise HTTPException(status_code=404, detail="User not found")
    task.assigned_to = new_assignee
    task.assigned_to_name = new_user.name
    task.status = "pending"
    task.completed_at = None
    task.notes = f"Reassigned by {user.name}"
    await db.flush()
    return {"status": "reassigned", "task_id": task_id, "new_assignee": new_user.name}


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)


@router.get("/stats")
async def task_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = await db.execute(select(func.count(Task.id)))
    pending = await db.execute(select(func.count(Task.id)).where(Task.status == "pending"))
    completed = await db.execute(select(func.count(Task.id)).where(Task.status == "completed"))
    rejected = await db.execute(select(func.count(Task.id)).where(Task.status == "rejected"))
    return {
        "total": total.scalar(),
        "pending": pending.scalar(),
        "completed": completed.scalar(),
        "rejected": rejected.scalar(),
    }
