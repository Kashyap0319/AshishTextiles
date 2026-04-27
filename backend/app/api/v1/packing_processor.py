"""
Packing List Processor — Ashishji's #1 pain point.
Takes raw mill packing list, auto-fills quality categories (no #N/A),
suggests rack numbers, flags unknown articles.
"""
import io
import re

import pandas as pd
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.articles import Article

router = APIRouter(prefix="/packing-processor", tags=["packing-processor"])


# Rack assignment rules based on quality group
# Rack rules derived from actual rack numbers Excel (211 racks across 9 halls)
RACK_RULES = {
    # Hall 2 (200 series) — Print
    "PRINT-SHTG": "Hall 2 (200 series)",
    "PRINT": "Hall 2 (200 series)",
    "CRAPE": "Hall 2 (200 series)",
    # Hall 3 (300 series) — White, Indigo
    "WHITE": "Hall 3 (300 series)",
    "WHITE-SHTG": "Hall 3 (300 series)",
    "INDIGO": "Hall 3 (300 series)",
    "RFD-SHTG": "Hall 3 (300 series)",
    # Hall 4 (400 series) — White-Bottom, Drill
    "WHITE-BOTTOM": "Hall 4 (400 series)",
    "GATE": "Hall 4 (400 series)",
    # Hall 5 (500 series) — White, Blue articles
    "A116B150": "Hall 5 (500 series)",
    "BLUE": "Hall 5 (500 series)",
    # Hall 6 (600 series) — Small pieces, Sheeting, Cemric
    "SMALL": "Hall 6 (600 series)",
    "SHEETING": "Hall 6 (600 series)",
    "CEMRIC": "Hall 6 (600 series)",
    "TENSIL": "Hall 6 (600 series)",
    # Hall 7 (700 series) — Poplin, Viscorse, Twill Shtg, 130129, Dobby
    "POPLIN": "Hall 7 (700 series)",
    "130129": "Hall 7 (700 series)",
    "VISCORSE": "Hall 7 (700 series)",
    "VISCOSE": "Hall 7 (700 series)",
    "TWILL-SHTG": "Hall 7 (700 series)",
    "DOBBY-SHTG": "Hall 7 (700 series)",
    "WHITE-SHIRTING": "Hall 7 (700 series)",
    "SATIN-SHTG": "Hall 7 (700 series)",
    "OXFORD": "Hall 7 (700 series)",
    "LINEN": "Hall 7 (700 series)",
    # Hall 8 (800 series) — Lycre (all types), LY-*
    "LYCRE-RD": "Hall 8 (800 series)",
    "LYCRE-KNIT": "Hall 8 (800 series)",
    "LYCRE-DOBBY": "Hall 8 (800 series)",
    "LY-TWILL": "Hall 8 (800 series)",
    "LY-SATIN": "Hall 8 (800 series)",
    "LY-DRILL": "Hall 8 (800 series)",
    "LY-13257": "Hall 8 (800 series)",
    "LY-POPLIN": "Hall 8 (800 series)",
    "LY-MATTY": "Hall 8 (800 series)",
    "LY-RFD": "Hall 8 (800 series)",
    "A150C873": "Hall 8 (800 series)",
    "A120D870": "Hall 8 (800 series)",
    "A120B275": "Hall 8 (800 series)",
    "SATIN-BOTTOM": "Hall 8 (800 series)",
    # Hall 9 (900 series) — Lycre-Twill, 4-way, Satin-Shirting
    "LYCRE-TWILL": "Hall 9 (900 series)",
    "4-WAY-LYCRE": "Hall 9 (900 series)",
    "SATIN-SHIRTING": "Hall 9 (900 series)",
    "TWILL": "Hall 9 (900 series)",
    "DOBBY-BOTTOM": "Hall 9 (900 series)",
    "LIN-TWIL": "Hall 9 (900 series)",
    # Hall 10 (1000 series) — Drill, Tussur, Matty, Ribstop, 2-Ply
    "DRILL-16X12": "Hall 10 (1000 series)",
    "DRILL-10X10": "Hall 10 (1000 series)",
    "DRILL-7X7": "Hall 10 (1000 series)",
    "DRILL-ECRU": "Hall 10 (1000 series)",
    "DRILL-RD": "Hall 10 (1000 series)",
    "TUSSUR": "Hall 10 (1000 series)",
    "A130162": "Hall 10 (1000 series)",
    "A132A453": "Hall 10 (1000 series)",
    "RIBSTOP": "Hall 10 (1000 series)",
    "2-PLY": "Hall 10 (1000 series)",
    "PC-TWILL": "Hall 10 (1000 series)",
    "A120C445-MATTY": "Hall 10 (1000 series)",
    "A109A001": "Hall 10 (1000 series)",
    "MATTY": "Hall 10 (1000 series)",
}


def _find_rack(qg: str) -> str:
    """Rack lookup with exact then prefix match."""
    if not qg:
        return "Assign manually"
    q = qg.upper().strip()
    for k, v in RACK_RULES.items():
        if k.upper() == q:
            return v
    for k, v in RACK_RULES.items():
        if q.startswith(k.upper()) or k.upper().startswith(q):
            return v
    return "Assign manually"


def _detect_format(df) -> str:
    """Detect packing list format from first 10 rows."""
    for idx in range(min(10, len(df))):
        cell = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
        if cell in ("Sale Order No. :", "Sale Order No.    :"):
            return "new_format"
        if cell == "DETAILED PACKING LIST":
            return "new_format_xls"
    return "old_format"


def _parse_new_format(df, quality_master: dict) -> dict:
    """Parse WITH/WITHOUT GOWDEN .xlsx and google sheet format.
    Header: Sale Order, Customer, Invoice, Product Description
    Then: S No | Production Order | ... | Bale No. | Qty (meter) | ...
    """
    res = {
        "sale_order": "", "customer": "", "invoice": "",
        "article_code": "", "article_desc": "",
        "quality_category": "", "quality_group": "", "suggested_rack": "", "status": "",
        "bales": [], "total_meters": 0, "total_pieces": 0,
    }
    # Parse header
    for idx in range(min(10, len(df))):
        c0 = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
        c2 = str(df.iloc[idx, 2]).strip() if len(df.columns) > 2 and pd.notna(df.iloc[idx, 2]) else ""
        if "Sale Order" in c0:
            res["sale_order"] = c2
        elif "Customer" in c0:
            res["customer"] = c2
        elif "Invoice" in c0:
            res["invoice"] = c2
        elif "Product Description" in c0:
            desc = c2 if c2 and c2 != "nan" else (str(df.iloc[idx, 1]).strip() if pd.notna(df.iloc[idx, 1]) else "")
            res["article_desc"] = desc
            parts = re.split(r'[\s\-]+', desc)
            code = parts[0].strip() if parts else ""
            res["article_code"] = code
            m = quality_master.get(code.upper())
            if m:
                res["quality_category"] = m.get("quality_category", "")
                res["quality_group"] = m.get("quality_group", "")
                res["suggested_rack"] = _find_rack(m.get("quality_group", ""))
                res["status"] = "AUTO-FILLED"
            else:
                res["quality_category"] = f"UNKNOWN ({code})"
                res["suggested_rack"] = "CHECK MANUALLY"
                res["status"] = "UNKNOWN"

    # Find S No header row and column positions
    header_idx = None
    bale_col, meter_col, colour_col, group_col, wt_col = 4, 5, None, None, None
    for idx in range(min(15, len(df))):
        c = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
        if c == "S No":
            header_idx = idx
            for ci in range(len(df.columns)):
                v = str(df.iloc[idx, ci]).strip().lower() if pd.notna(df.iloc[idx, ci]) else ""
                if "bale" in v: bale_col = ci
                elif ("meter" in v or v == "qty (meter)") and meter_col == 5: meter_col = ci
                elif "colour" in v or "color" in v: colour_col = ci
                elif "group" in v: group_col = ci
                elif "nett" in v: wt_col = ci
            break
    if header_idx is None:
        return res

    # Parse bale rows
    for idx in range(header_idx + 1, len(df)):
        c0 = df.iloc[idx, 0] if pd.notna(df.iloc[idx, 0]) else None
        if c0 is None or str(c0).strip() in ("", "nan", "Total", "Sub Total"):
            continue
        try:
            sno = int(float(c0))
        except (ValueError, TypeError):
            continue
        bale = str(df.iloc[idx, bale_col]).strip() if pd.notna(df.iloc[idx, bale_col]) else ""
        try:
            meters = float(df.iloc[idx, meter_col]) if pd.notna(df.iloc[idx, meter_col]) else 0
        except:
            meters = 0
        col_val = ""
        if colour_col and colour_col < len(df.columns):
            col_val = str(df.iloc[idx, colour_col]).strip() if pd.notna(df.iloc[idx, colour_col]) else ""
        grp = ""
        if group_col and group_col < len(df.columns):
            grp = str(df.iloc[idx, group_col]).strip() if pd.notna(df.iloc[idx, group_col]) else ""
        nw = 0
        if wt_col and wt_col < len(df.columns):
            try:
                nw = float(df.iloc[idx, wt_col]) if pd.notna(df.iloc[idx, wt_col]) else 0
            except:
                nw = 0
        # Clean bale no
        if bale and "." in bale:
            try:
                bale = str(int(float(bale)))
            except:
                pass
        if bale and bale != "nan":
            res["bales"].append({"sno": sno, "bale_no": bale, "meters": round(meters, 1), "nett_weight_kg": round(nw, 2), "colour": col_val if col_val != "nan" else "", "group_no": grp if grp != "nan" else ""})
            res["total_meters"] += meters
            res["total_pieces"] += 1
    res["total_meters"] = round(res["total_meters"], 1)
    return res


def _parse_new_format_xls(df, quality_master: dict) -> dict:
    """Parse WITHOUT GOWDEN .xls — wider columns with Colour + Group No."""
    res = {
        "sale_order": "", "customer": "", "invoice": "",
        "article_code": "", "article_desc": "",
        "quality_category": "", "quality_group": "", "suggested_rack": "", "status": "",
        "bales": [], "total_meters": 0, "total_pieces": 0,
    }
    for idx in range(min(10, len(df))):
        c0 = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
        c2 = str(df.iloc[idx, 2]).strip() if len(df.columns) > 2 and pd.notna(df.iloc[idx, 2]) else ""
        if "Sale Order" in c0: res["sale_order"] = c2
        elif "Customer" in c0: res["customer"] = c2
        elif "Invoice" in c0: res["invoice"] = c2

    for idx in range(min(15, len(df))):
        c = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
        if c == "S No":
            for didx in range(idx + 1, len(df)):
                c0 = df.iloc[didx, 0] if pd.notna(df.iloc[didx, 0]) else None
                if c0 is None or str(c0).strip() in ("", "nan"): continue
                try:
                    sno = int(float(c0))
                except:
                    continue
                desc = str(df.iloc[didx, 2]).strip() if len(df.columns) > 2 and pd.notna(df.iloc[didx, 2]) else ""
                if desc and not res["article_code"]:
                    parts = desc.split()
                    res["article_code"] = parts[0] if parts else ""
                    res["article_desc"] = desc
                    m = quality_master.get(res["article_code"].upper())
                    if m:
                        res["quality_category"] = m.get("quality_category", "")
                        res["quality_group"] = m.get("quality_group", "")
                        res["suggested_rack"] = _find_rack(m.get("quality_group", ""))
                        res["status"] = "AUTO-FILLED"
                    else:
                        res["quality_category"] = f"UNKNOWN ({res['article_code']})"
                        res["suggested_rack"] = "CHECK MANUALLY"
                        res["status"] = "UNKNOWN"
                bale = str(df.iloc[didx, 7]).strip() if len(df.columns) > 7 and pd.notna(df.iloc[didx, 7]) else ""
                try:
                    meters = float(df.iloc[didx, 9]) if len(df.columns) > 9 and pd.notna(df.iloc[didx, 9]) else 0
                except:
                    meters = 0
                colour = str(df.iloc[didx, 14]).strip() if len(df.columns) > 14 and pd.notna(df.iloc[didx, 14]) else ""
                grp = str(df.iloc[didx, 15]).strip() if len(df.columns) > 15 and pd.notna(df.iloc[didx, 15]) else ""
                if bale and "." in bale:
                    try: bale = str(int(float(bale)))
                    except: pass
                if bale and bale != "nan":
                    res["bales"].append({"sno": sno, "bale_no": bale, "meters": round(meters, 1), "nett_weight_kg": 0, "colour": colour if colour != "nan" else "", "group_no": grp if grp != "nan" else ""})
                    res["total_meters"] += meters
                    res["total_pieces"] += 1
            break
    res["total_meters"] = round(res["total_meters"], 1)
    return res


@router.post("/process")
async def process_packing_list(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload raw packing list from mill. Handles old format, WITH/WITHOUT GOWDEN, google sheet.
    Returns: processed file with quality categories filled + rack suggestions.
    """
    contents = await file.read()
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(413, "File too large (max 50MB)")

    buf = io.BytesIO(contents)
    is_xls = file.filename and file.filename.endswith(".xls") and not file.filename.endswith(".xlsx")

    try:
        xls = pd.ExcelFile(buf, engine="xlrd") if is_xls else pd.ExcelFile(buf)
        sheet_names = xls.sheet_names
    except Exception:
        raise HTTPException(400, "Cannot read Excel file")

    # Build quality master from DB
    result = await db.execute(select(Article.article_code, Article.quality_category, Article.quality_group))
    quality_master = {}
    for code, cat, group in result.all():
        if code and (cat or group):
            quality_master[str(code).strip().upper()] = {
                "quality_category": cat,
                "quality_group": group,
            }

    processed_sheets = {}
    summary = {"total_rows": 0, "filled": 0, "unknown": 0, "unknown_articles": []}

    for sheet_name in sheet_names:
        buf.seek(0)
        df = pd.read_excel(buf, sheet_name=sheet_name, header=None, engine="xlrd" if is_xls else None)

        if len(df) < 2:
            processed_sheets[sheet_name] = df
            continue

        fmt = _detect_format(df)

        if fmt in ("new_format", "new_format_xls"):
            parsed = _parse_new_format_xls(df, quality_master) if fmt == "new_format_xls" else _parse_new_format(df, quality_master)
            rows = []
            for b in parsed["bales"]:
                rows.append({
                    "S No": b["sno"], "Article": parsed["article_code"], "Bale No": b["bale_no"],
                    "Meters": b["meters"], "Weight (kg)": b["nett_weight_kg"],
                    "Colour": b["colour"], "Lot/Group": b["group_no"],
                    "Quality Category": parsed["quality_category"],
                    "Suggested Rack": parsed["suggested_rack"], "Status": parsed["status"],
                    "Invoice": parsed["invoice"], "Customer": parsed["customer"],
                })
            if rows:
                processed_sheets[sheet_name] = pd.DataFrame(rows)
            else:
                processed_sheets[sheet_name] = df
            if parsed["status"] == "AUTO-FILLED":
                summary["filled"] += 1
            elif parsed["status"] == "UNKNOWN":
                summary["unknown"] += 1
                if parsed["article_code"] not in summary["unknown_articles"]:
                    summary["unknown_articles"].append(parsed["article_code"])
            summary["total_rows"] += len(parsed["bales"])
            continue

        if len(df.columns) < 4:
            processed_sheets[sheet_name] = df
            continue

        # Old format: Detect the structure:
        # "Product Description" rows contain article info
        # Data rows have S No, Rolls No, Bale No, Qty
        # Quality column is usually column K or the last populated column

        current_article = None
        current_quality_cat = None
        current_quality_group = None
        current_rack = None

        # Add/ensure quality and rack columns
        while len(df.columns) < max(len(df.columns), 12):
            df[len(df.columns)] = None

        quality_col = 10  # Column K (0-indexed)
        rack_col = 11     # Column L
        status_col = 12   # Column M - processing status
        df[quality_col] = df[quality_col] if quality_col < len(df.columns) else None
        df[rack_col] = None
        df[status_col] = None

        for idx in range(len(df)):
            row_a = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""

            if row_a == "Product Description":
                # Extract article code from description
                desc = str(df.iloc[idx, 1]).strip() if pd.notna(df.iloc[idx, 1]) else ""
                if not desc or desc == "nan":
                    desc = str(df.iloc[idx, 2]).strip() if len(df.columns) > 2 and pd.notna(df.iloc[idx, 2]) else ""

                # Parse article code (first segment before " - ")
                parts = re.split(r'\s*-\s*', desc)
                article_code = parts[0].strip() if parts else ""

                # Look up in master
                lookup = article_code.upper()
                match = quality_master.get(lookup)

                if match:
                    current_quality_cat = match["quality_category"]
                    current_quality_group = match["quality_group"]
                    current_rack = RACK_RULES.get(current_quality_group, "Assign manually")
                    df.iloc[idx, quality_col] = current_quality_cat
                    df.iloc[idx, rack_col] = current_rack
                    df.iloc[idx, status_col] = "AUTO-FILLED"
                    summary["filled"] += 1
                else:
                    current_quality_cat = "#N/A - NEW ARTICLE"
                    current_quality_group = None
                    current_rack = "CHECK MANUALLY"
                    df.iloc[idx, quality_col] = f"#N/A ({article_code})"
                    df.iloc[idx, rack_col] = "CHECK MANUALLY"
                    df.iloc[idx, status_col] = "UNKNOWN"
                    summary["unknown"] += 1
                    if article_code and article_code not in summary["unknown_articles"]:
                        summary["unknown_articles"].append(article_code)

            elif row_a in ("S No", "", "nan"):
                # Header or blank row — fill quality down
                if current_quality_cat and current_quality_cat != "#N/A - NEW ARTICLE":
                    df.iloc[idx, quality_col] = current_quality_cat
                    df.iloc[idx, rack_col] = current_rack

            else:
                # Data row (S No is numeric) — FILL QUALITY DOWN (this is the key fix for #N/A)
                try:
                    int(float(row_a))
                    # This is a data row — always fill quality from parent Product Description
                    df.iloc[idx, quality_col] = current_quality_cat if current_quality_cat and "#N/A" not in str(current_quality_cat) else df.iloc[idx, quality_col]
                    if current_rack and "CHECK" not in str(current_rack):
                        df.iloc[idx, rack_col] = current_rack
                except (ValueError, TypeError):
                    # Sub-total or other row
                    if current_quality_cat:
                        df.iloc[idx, quality_col] = current_quality_cat

            summary["total_rows"] += 1

        # Rename columns for clarity
        col_names = list(df.columns)
        if len(col_names) > quality_col:
            col_names[quality_col] = "QUALITY CATEGORY"
        if len(col_names) > rack_col:
            col_names[rack_col] = "SUGGESTED RACK"
        if len(col_names) > status_col:
            col_names[status_col] = "STATUS"
        df.columns = col_names

        processed_sheets[sheet_name] = df

    # Write processed file
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        for sheet_name, df in processed_sheets.items():
            df.to_excel(writer, sheet_name=sheet_name[:31], index=False)
    output.seek(0)

    # Return as downloadable Excel
    filename = f"PROCESSED_{file.filename or 'packing_list.xlsx'}"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Processing-Summary": str(summary).replace("'", '"'),
        },
    )


@router.post("/preview")
async def preview_packing_list(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Preview — returns bale-level parsed data + summary. Handles all formats."""
    contents = await file.read()
    buf = io.BytesIO(contents)
    is_xls = file.filename and file.filename.endswith(".xls") and not file.filename.endswith(".xlsx")

    try:
        xls = pd.ExcelFile(buf, engine="xlrd") if is_xls else pd.ExcelFile(buf)
    except Exception:
        raise HTTPException(400, "Cannot read Excel file")

    result = await db.execute(select(Article.article_code, Article.quality_category, Article.quality_group))
    qm_set = set()
    qm_dict = {}
    for code, cat, group in result.all():
        if code:
            k = str(code).strip().upper()
            qm_set.add(k)
            if cat or group:
                qm_dict[k] = {"quality_category": cat, "quality_group": group}

    all_parsed = []
    total_meters = 0
    total_bales = 0
    unknown = []
    known = 0

    for sheet_name in xls.sheet_names:
        buf.seek(0)
        df = pd.read_excel(buf, sheet_name=sheet_name, header=None, engine="xlrd" if is_xls else None)
        if len(df) < 2:
            continue

        fmt = _detect_format(df)

        if fmt in ("new_format", "new_format_xls"):
            parsed = _parse_new_format_xls(df, qm_dict) if fmt == "new_format_xls" else _parse_new_format(df, qm_dict)
            parsed["sheet"] = sheet_name
            all_parsed.append(parsed)
            total_meters += parsed["total_meters"]
            total_bales += parsed["total_pieces"]
            if parsed["status"] == "AUTO-FILLED":
                known += 1
            elif parsed["status"] == "UNKNOWN" and parsed["article_code"]:
                if parsed["article_code"] not in [u["code"] for u in unknown]:
                    unknown.append({"code": parsed["article_code"], "description": parsed["article_desc"][:60]})
        else:
            for idx in range(len(df)):
                row_a = str(df.iloc[idx, 0]).strip() if pd.notna(df.iloc[idx, 0]) else ""
                if row_a == "Product Description":
                    desc = str(df.iloc[idx, 1]).strip() if pd.notna(df.iloc[idx, 1]) else ""
                    if not desc or desc == "nan":
                        desc = str(df.iloc[idx, 2]).strip() if len(df.columns) > 2 and pd.notna(df.iloc[idx, 2]) else ""
                    parts = re.split(r'\s*-\s*', desc)
                    code = parts[0].strip().upper() if parts else ""
                    if code in qm_set:
                        known += 1
                    elif code and code not in [u["code"] for u in unknown]:
                        unknown.append({"code": code, "description": desc[:60]})

    total_articles = known + len(unknown)
    return {
        "sheets": len(xls.sheet_names),
        "total_articles_found": total_articles,
        "known_in_master": known,
        "unknown_new": len(unknown),
        "match_rate": round(known / max(total_articles, 1) * 100, 1),
        "total_bales": total_bales,
        "total_meters": round(total_meters, 1),
        "unknown_articles": unknown[:50],
        "parsed_data": all_parsed[:10],
    }
