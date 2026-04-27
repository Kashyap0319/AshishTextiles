"""
Parse TDM Fabrics product codes.
Format: 10828-MOK-ST-NF-RFD0000000-LY-DRILL
- 10828        = sort/article number (identity of fabric)
- MOK          = mill code (not used, skip)
- ST-NF        = composition + finish (ST=Stretch, NF=Normal Finish)
- RFD0000000   = color code (RFD=Ready for Dyeing, then color numeric)
- LY-DRILL     = quality (Lycra Drill)
"""
import re

# Composition prefixes (first 2 letters) — will be expanded with Ashish's master
COMPOSITION_MAP = {
    "ST": "Stretch",
    "CT": "Cotton",
    "PC": "Poly-Cotton",
    "PO": "Polyester",
    "VI": "Viscose",
    "LI": "Linen",
    "LY": "Lycra",
}

# Finish codes (last 2 letters of the ST-NF segment)
FINISH_MAP = {
    "NF": "Normal Finish",
    "SF": "Soft Finish",
    "WR": "Water Resistant",
    "MB": "Mercerised",
    "SZ": "Sanforized",
    "CR": "Crease Resistant",
}

# RFD color code → name (partial — Ashish will share full master)
# RFD prefix means "Ready For Dyeing", then numeric portion is the color identifier
RFD_COLOR_MAP = {
    "00000087": "White",
    "1000292837": "Cream",
    "2008273647": "Yellow",
    "300928376482": "Olive",
    "4882726379": "Grey",
    "7002928338383": "Grey",
}


def parse_product_code(code: str) -> dict:
    """Parse a TDM product code into structured components.

    Example: '10828-MOK-ST-NF-RFD0000000-LY-DRILL'
    """
    result = {
        "raw": code,
        "article_number": None,
        "mill_code": None,
        "composition": None,
        "composition_name": None,
        "finish": None,
        "finish_name": None,
        "color_code": None,
        "color_name": None,
        "quality": None,
        "quality_prefix": None,
        "parse_success": False,
    }
    if not code or not isinstance(code, str):
        return result

    parts = [p.strip() for p in code.split("-") if p.strip()]
    if len(parts) < 2:
        result["article_number"] = code
        return result

    # First segment: article number (alphanumeric, often 4-7 chars or starts with A)
    result["article_number"] = parts[0]

    # Second: mill code (skip, but store)
    if len(parts) >= 2:
        result["mill_code"] = parts[1]

    # Third & fourth: composition-finish (ST-NF, CT-SF, etc.)
    if len(parts) >= 4:
        result["composition"] = parts[2]
        result["composition_name"] = COMPOSITION_MAP.get(parts[2], parts[2])
        result["finish"] = parts[3]
        result["finish_name"] = FINISH_MAP.get(parts[3], parts[3])

    # Fifth: color code (RFD... or other color indicator)
    if len(parts) >= 5:
        color_segment = parts[4]
        result["color_code"] = color_segment
        if color_segment.startswith("RFD"):
            numeric = color_segment[3:]
            result["color_name"] = RFD_COLOR_MAP.get(numeric, f"Color {numeric}" if numeric else "RFD (undyed)")
        else:
            result["color_name"] = color_segment

    # Remaining: quality (LY-DRILL, POPLIN, etc.)
    if len(parts) >= 6:
        quality_parts = parts[5:]
        result["quality"] = "-".join(quality_parts)
        result["quality_prefix"] = quality_parts[0] if quality_parts else None

    result["parse_success"] = True
    return result


def extract_article_number(code: str) -> str | None:
    """Quick extract of just the article number from a code."""
    if not code:
        return None
    parts = re.split(r'[-\s]+', code.strip())
    return parts[0] if parts else None
