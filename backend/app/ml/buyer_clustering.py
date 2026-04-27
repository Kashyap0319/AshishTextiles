"""
Buyer Clustering using K-Means.
Groups buyers by purchase behavior: volume, frequency, recency, quality preferences.
"""
import numpy as np
from datetime import date
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.buyers import Buyer
from app.models.sales import Sale
from app.models.articles import Article


async def cluster_buyers(db: AsyncSession, n_clusters: int = 5):
    """Cluster buyers based on purchase behavior."""
    # Get buyer features
    result = await db.execute(
        select(Buyer).where(
            Buyer.is_active == True,
            Buyer.total_purchases_count > 0,
        ).order_by(Buyer.id)
    )
    buyers = result.scalars().all()

    if len(buyers) < n_clusters:
        return {"clusters": [], "error": f"Not enough buyers ({len(buyers)}) for {n_clusters} clusters"}

    today = date.today()
    features = []
    buyer_info = []

    for b in buyers:
        recency = (today - b.last_purchase_date).days if b.last_purchase_date else 365
        features.append([
            b.total_purchases_meters or 0,        # Volume
            b.total_purchases_count or 0,          # Frequency
            recency,                               # Recency (days since last purchase)
            (b.total_purchases_meters or 0) / max(b.total_purchases_count or 1, 1),  # Avg order size
        ])
        buyer_info.append({
            "id": b.id,
            "name": b.name,
            "total_meters": b.total_purchases_meters,
            "total_orders": b.total_purchases_count,
            "last_purchase": str(b.last_purchase_date) if b.last_purchase_date else None,
            "recency_days": recency,
        })

    X = np.array(features)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-Means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(X_scaled)

    # Build cluster summaries
    clusters = {}
    for i, label in enumerate(labels):
        label = int(label)
        if label not in clusters:
            clusters[label] = {"buyers": [], "total_meters": 0, "total_orders": 0, "count": 0}
        clusters[label]["buyers"].append(buyer_info[i])
        clusters[label]["total_meters"] += features[i][0]
        clusters[label]["total_orders"] += features[i][1]
        clusters[label]["count"] += 1

    # Name clusters based on characteristics
    CLUSTER_NAMES = {
        "high_vol_frequent": "VIP Buyers",
        "high_vol_infrequent": "Bulk Buyers",
        "low_vol_frequent": "Regular Buyers",
        "low_vol_infrequent": "Occasional Buyers",
        "dormant": "Dormant Buyers",
    }

    cluster_list = []
    for label, data in sorted(clusters.items()):
        avg_meters = data["total_meters"] / data["count"]
        avg_orders = data["total_orders"] / data["count"]
        avg_recency = np.mean([b["recency_days"] for b in data["buyers"]])

        # Auto-name based on behavior
        if avg_recency > 90:
            name = "Dormant Buyers"
        elif avg_meters > 10000 and avg_orders > 10:
            name = "VIP Buyers"
        elif avg_meters > 5000:
            name = "Bulk Buyers"
        elif avg_orders > 5:
            name = "Regular Buyers"
        else:
            name = "Occasional Buyers"

        cluster_list.append({
            "cluster_id": label,
            "name": name,
            "count": data["count"],
            "avg_meters": round(avg_meters, 0),
            "avg_orders": round(avg_orders, 1),
            "avg_recency_days": round(avg_recency, 0),
            "total_meters": round(data["total_meters"], 0),
            "top_buyers": sorted(data["buyers"], key=lambda x: x["total_meters"], reverse=True)[:5],
        })

    cluster_list.sort(key=lambda x: x["total_meters"], reverse=True)
    return {"clusters": cluster_list, "total_buyers": len(buyers)}
