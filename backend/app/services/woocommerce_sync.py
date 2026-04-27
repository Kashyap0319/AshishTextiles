"""
WooCommerce sync service — push live stock to sample.tdmfabric.com
Client admin panel: wp-admin → WooCommerce → Settings → Advanced → REST API → Add Key
Env vars needed: WOO_URL, WOO_KEY, WOO_SECRET
"""
import base64
import os
from typing import Any

import httpx


class WooCommerceSyncClient:
    def __init__(self):
        self.base_url = os.getenv("WOO_URL", "").rstrip("/")
        self.consumer_key = os.getenv("WOO_KEY", "")
        self.consumer_secret = os.getenv("WOO_SECRET", "")
        self.configured = bool(self.base_url and self.consumer_key and self.consumer_secret)

    def _auth_header(self) -> dict:
        creds = f"{self.consumer_key}:{self.consumer_secret}"
        token = base64.b64encode(creds.encode()).decode()
        return {"Authorization": f"Basic {token}"}

    async def get_product_by_sku(self, sku: str) -> dict | None:
        """Find product in WooCommerce by SKU (= article code)."""
        if not self.configured:
            return None
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{self.base_url}/wp-json/wc/v3/products",
                params={"sku": sku},
                headers=self._auth_header(),
            )
            if r.status_code == 200:
                items = r.json()
                return items[0] if items else None
        return None

    async def upsert_product(self, data: dict) -> dict:
        """Create or update product by SKU.
        data = { sku, name, description, regular_price, stock_quantity, categories, images }
        """
        if not self.configured:
            return {"error": "WooCommerce not configured. Set WOO_URL, WOO_KEY, WOO_SECRET env vars."}

        existing = await self.get_product_by_sku(data.get("sku", ""))

        async with httpx.AsyncClient(timeout=20.0) as client:
            if existing:
                # Update
                r = await client.put(
                    f"{self.base_url}/wp-json/wc/v3/products/{existing['id']}",
                    json=data,
                    headers=self._auth_header(),
                )
                return {"action": "updated", "id": existing["id"], "response": r.status_code}
            else:
                # Create
                r = await client.post(
                    f"{self.base_url}/wp-json/wc/v3/products",
                    json={**data, "status": "publish", "manage_stock": True},
                    headers=self._auth_header(),
                )
                return {"action": "created", "response": r.status_code, "body": r.json() if r.status_code < 400 else r.text}

    async def bulk_sync(self, stock_items: list[dict]) -> dict:
        """Sync a list of stock items to WooCommerce. Returns summary."""
        if not self.configured:
            return {"error": "WooCommerce not configured", "synced": 0}

        synced = 0
        created = 0
        updated = 0
        failed = []

        for item in stock_items:
            try:
                result = await self.upsert_product({
                    "sku": item.get("article_code") or item.get("sku"),
                    "name": item.get("name") or item.get("article_code"),
                    "description": item.get("description") or f"Surplus stock — {item.get('quality_category', '')}",
                    "regular_price": str(item.get("price", 0) or 0),
                    "stock_quantity": int(item.get("meters", 0) or 0),
                    "categories": item.get("categories", []),
                })
                if result.get("action") == "created":
                    created += 1
                elif result.get("action") == "updated":
                    updated += 1
                synced += 1
            except Exception as e:
                failed.append({"sku": item.get("article_code"), "error": str(e)})

        return {
            "synced": synced,
            "created": created,
            "updated": updated,
            "failed_count": len(failed),
            "failed": failed[:10],
        }


woo_client = WooCommerceSyncClient()
