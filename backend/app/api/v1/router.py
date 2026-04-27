from fastapi import APIRouter, Depends

from app.api.v1.auth import router as auth_router, get_current_user
from app.api.v1.offers import router as offers_router

# These routers are PUBLIC (no auth needed)
from app.api.v1.website_sync import router as website_sync_router

# All other routers require authentication
from app.api.v1.articles import router as articles_router
from app.api.v1.buyers import router as buyers_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.sales import router as sales_router
from app.api.v1.stock import router as stock_router
from app.api.v1.upload import router as upload_router
from app.api.v1.warehouse import router as warehouse_router
from app.api.v1.quick_entry import router as quick_entry_router
from app.api.v1.export import router as export_router
from app.api.v1.admin import router as admin_router
from app.api.v1.ml import router as ml_router
from app.api.v1.chat import router as chat_router
from app.api.v1.pdf_invoice import router as invoice_router
from app.api.v1.bulk_update import router as bulk_router
from app.api.v1.qrcode_api import router as qr_router
from app.api.v1.profitability import router as profit_router
from app.api.v1.followups import router as followups_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.eod import router as eod_router
from app.api.v1.quality_check import router as quality_check_router
from app.api.v1.samples import router as samples_router
from app.api.v1.packing_processor import router as packing_processor_router
from app.api.v1.sample_tracking import router as sample_tracking_router
from app.api.v1.inquiries import router as inquiries_router
from app.api.v1.notifications_queue import router as notifications_queue_router

api_router = APIRouter(prefix="/api/v1")

# PUBLIC routes — no auth
api_router.include_router(auth_router)  # /auth/login, /auth/me
api_router.include_router(offers_router)  # POST /offers/ is public (buyer bids)
api_router.include_router(website_sync_router)  # has its own API key auth

# PROTECTED routes — require JWT auth
auth_dep = [Depends(get_current_user)]
api_router.include_router(articles_router, dependencies=auth_dep)
api_router.include_router(buyers_router, dependencies=auth_dep)
api_router.include_router(dashboard_router, dependencies=auth_dep)
api_router.include_router(sales_router, dependencies=auth_dep)
api_router.include_router(stock_router, dependencies=auth_dep)
api_router.include_router(upload_router, dependencies=auth_dep)
api_router.include_router(warehouse_router, dependencies=auth_dep)
api_router.include_router(quick_entry_router, dependencies=auth_dep)
api_router.include_router(export_router, dependencies=auth_dep)
api_router.include_router(admin_router, dependencies=auth_dep)
api_router.include_router(ml_router, dependencies=auth_dep)
api_router.include_router(chat_router, dependencies=auth_dep)
api_router.include_router(invoice_router, dependencies=auth_dep)
api_router.include_router(bulk_router, dependencies=auth_dep)
api_router.include_router(qr_router, dependencies=auth_dep)
api_router.include_router(profit_router, dependencies=auth_dep)
api_router.include_router(followups_router, dependencies=auth_dep)
api_router.include_router(notifications_router, dependencies=auth_dep)
api_router.include_router(tasks_router, dependencies=auth_dep)
api_router.include_router(eod_router, dependencies=auth_dep)
api_router.include_router(quality_check_router, dependencies=auth_dep)
api_router.include_router(samples_router, dependencies=auth_dep)
api_router.include_router(packing_processor_router, dependencies=auth_dep)
api_router.include_router(sample_tracking_router, dependencies=auth_dep)
api_router.include_router(inquiries_router, dependencies=auth_dep)
api_router.include_router(notifications_queue_router, dependencies=auth_dep)
