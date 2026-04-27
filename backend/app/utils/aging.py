from datetime import date

# Configurable discount tiers
AGING_DISCOUNT_CONFIG = {
    90: 10,   # 90+ days → 10% discount
    120: 15,  # 120+ days → 15% discount
    180: 25,  # 180+ days → 25% discount
}


def calculate_aging_days(received_date: date | None) -> int:
    if not received_date:
        return 0
    return (date.today() - received_date).days


def get_aging_flag(aging_days: int) -> str:
    if aging_days > 90:
        return "critical"
    elif aging_days > 60:
        return "warning"
    elif aging_days > 30:
        return "attention"
    return "fresh"


def get_aging_bucket(aging_days: int) -> str:
    if aging_days <= 30:
        return "0-30"
    elif aging_days <= 60:
        return "31-60"
    elif aging_days <= 90:
        return "61-90"
    return "90+"


def get_auto_discount(aging_days: int) -> int:
    """Returns auto-discount percentage based on aging days."""
    discount = 0
    for threshold, pct in sorted(AGING_DISCOUNT_CONFIG.items()):
        if aging_days >= threshold:
            discount = pct
    return discount
