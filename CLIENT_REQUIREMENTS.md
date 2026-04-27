# Client Requirements — Data Needed from Ashish Bhai

## A. Staff & Team Information

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 1 | **All 10 salesperson names** | Staff tagging module — assign stock to team members | List of names |
| 2 | **Their phone numbers** | For task assignment & notifications | Phone numbers |
| 3 | **Role assignment** — who is sales, who is warehouse | Role-based access control — sales staff only see their modules | Name → Role mapping |
| 4 | **Admin login credentials** — email & password for owner | Testing login, and setting up employee accounts | Email + password |

---

## B. Buyer Data

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 5 | **Buyer phone numbers** | WhatsApp broadcast, call buttons, follow-up reminders | Excel/CSV with buyer name → phone |
| 6 | **Buyer city/location** | Regional filtering, logistics planning | Along with phone data |
| 7 | **Buyer classification** — which are specialist, which are generalist | AI matching accuracy — specialists match on fabric type, generalists on everything | Mark on same list |
| 8 | **Preferred qualities per buyer** — kon sa buyer kya fabric leta hai | Buyer-product matching engine — core feature | Excel or verbal |

---

## C. Warehouse & Rack Data

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 9 | **Rack capacity** — kitne bales/meters samaa sakte hain per rack | Red/green capacity indicator, threshold alerts | Number per rack or per hall |
| 10 | **Current rack occupancy** — konse rack mein kitna maal hai abhi | Real warehouse map visualization | Excel or physical count |
| 11 | **Threshold rules** — 90% full = red, 30% = green, etc. | Capacity alert configuration | Percentage values |
| 12 | **Bale definition** — ek bale mein average kitne meters hote hain | Proper bale count display | Number |

---

## D. Busy Software Access

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 13 | **Busy software version** — which version are they running | Export format varies by version | Version number |
| 14 | **Export schedule** — kitne baar data export karte hain | Automated sync planning | Daily/Weekly/etc. |
| 15 | **Export location** — data kahan save hota hai | Auto-pickup script setup | Folder path |
| 16 | **Which reports they export** — Sales register, Purchase register, Stock summary | Map to our import parsers | Report names |
| 17 | **Busy computer access** — kya hum script install kar sakte hain unke PC pe | Automated Busy → Platform sync | Yes/No + remote access |

---

## E. Website Integration

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 18 | **Current website URL** | Website sync — push live stock to their site | URL |
| 19 | **Website platform** — WordPress, custom, Shopify? | Integration method depends on platform | Platform name |
| 20 | **Website admin access** — login credentials | Install sync plugin/API connector | Username + password |
| 21 | **What should be visible on website** — all stock? only certain qualities? | Configure publish rules | List of rules |

---

## F. Business Rules & Configuration

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 22 | **Stock aging thresholds** — 30/60/90 days ya different? | Aging alerts, auto-markdown suggestions | Days + discount % |
| 23 | **Sale dispatch rule** — FIFO (oldest lot first) confirmed? Any exceptions? | Sales module lot selection logic | Rule description |
| 24 | **Price information** — purchase price per lot available hai? | Stock valuation on dashboard | Yes/No, if yes then format |
| 25 | **Low stock alert threshold** — kitne meters se neeche jaaye toh alert | Notification system | Meters or % |

---

## G. API Keys & Services

| # | What We Need | Why | Format |
|---|-------------|-----|--------|
| 26 | **Gemini API key** — already set up? | AI Chat module — backend connects to Gemini | API key string |
| 27 | **WhatsApp Business API** — ya direct wa.me links chalenge? | WhatsApp broadcast feature scope | Decision |

---

## Priority Order

**Immediately needed (before demo):**
- #1 Staff names
- #4 Admin credentials
- #9 Rack capacity
- #26 Gemini API key

**Needed for full functionality:**
- #5-8 Buyer data with phones
- #13-17 Busy software details
- #18-21 Website access

**Can configure later:**
- #22-25 Business rules (defaults already set)
- #27 WhatsApp decision


---
---


# Busy Software → Platform Data Sync — Technical Plan

## How Busy Works

Busy is an **offline accounting software** (runs on Windows PC, no cloud API). It does NOT have a REST API or webhook system. The only way to get data out is:

1. **Manual Excel export** — user goes to Reports → Export → Excel
2. **Auto-export via Busy macros** — Busy has a built-in scripting/macro system that can auto-run reports
3. **Database file read** — Busy stores data in `.bdb` files (proprietary format, not recommended)

## Current Approach (Manual)

```
[Busy PC] → Manual Export → Excel files → Manual Upload → /upload/excel API → Database → Dashboard
```

This is what we have now. Works, but requires someone to export + upload every time.

## Recommended Approach (Semi-Automated)

```
[Busy PC] → Scheduled Auto-Export → Shared Folder → Python Watcher Script → API Upload → Database → Dashboard + Website
```

### Step-by-step Implementation:

### Step 1: Auto-Export from Busy (on their PC)

Busy has a **command-line report export** feature. We write a `.bat` script:

```batch
@echo off
REM Run daily at 9 PM via Windows Task Scheduler

REM Export Sales Register
"C:\Busy\Busy.exe" /EXPORT /REPORT:"Sales Register" /FROM:01-04-2025 /TO:31-03-2026 /FORMAT:XLSX /OUTPUT:"C:\BusyExports\sales_%date%.xlsx"

REM Export Stock Summary
"C:\Busy\Busy.exe" /EXPORT /REPORT:"Stock Summary" /FORMAT:XLSX /OUTPUT:"C:\BusyExports\stock_%date%.xlsx"

REM Export Purchase Register
"C:\Busy\Busy.exe" /EXPORT /REPORT:"Purchase Register" /FROM:01-04-2025 /TO:31-03-2026 /FORMAT:XLSX /OUTPUT:"C:\BusyExports\purchase_%date%.xlsx"
```

> **Note:** Exact Busy CLI syntax depends on their version. Need to check with Ashish bhai.

### Step 2: File Watcher Script (Python, runs on same PC or server)

```python
# sync_busy.py — runs as Windows Service or Task Scheduler
import time, os, requests, glob

WATCH_FOLDER = "C:\\BusyExports"
API_URL = "https://your-server.com/api/v1/upload/excel"
TOKEN = "jwt-token-here"  # or use API key
PROCESSED_FOLDER = "C:\\BusyExports\\processed"

def sync():
    files = glob.glob(os.path.join(WATCH_FOLDER, "*.xlsx"))
    for filepath in files:
        filename = os.path.basename(filepath).lower()
        
        # Detect file type
        if "sales" in filename or "voucher" in filename:
            file_type = "sales_vouchers"
        elif "stock" in filename or "snapshot" in filename:
            file_type = "stock_snapshot"
        elif "purchase" in filename:
            file_type = "dyed_sale"
        elif "quality" in filename:
            file_type = "quality_reference"
        else:
            continue
        
        # Upload to platform
        with open(filepath, 'rb') as f:
            resp = requests.post(
                API_URL,
                files={"file": (filename, f)},
                data={"file_type": file_type},
                headers={"Authorization": f"Bearer {TOKEN}"}
            )
        
        if resp.status_code == 200:
            # Move to processed folder
            os.rename(filepath, os.path.join(PROCESSED_FOLDER, filename))
            print(f"✓ Uploaded {filename}")
        else:
            print(f"✗ Failed {filename}: {resp.text}")

if __name__ == "__main__":
    while True:
        sync()
        time.sleep(300)  # Check every 5 minutes
```

### Step 3: Windows Task Scheduler Setup

Two scheduled tasks on client's PC:

| Task | Schedule | What it does |
|------|----------|-------------|
| `busy_export.bat` | Daily 9:00 PM | Exports fresh data from Busy to C:\BusyExports |
| `sync_busy.py` | Every 5 min (or as service) | Watches folder, uploads new files to platform |

### Step 4: Platform Auto-Processes Upload

Backend already has all parsers:
- `import_sales_vouchers` — creates Buyer + Sale records
- `import_dyed_sale` — multi-sheet parser for dyed/grey sales + purchases
- `import_quality_reference` — article → quality mapping
- `import_rack_numbers` — rack assignments

### Step 5: Website Auto-Sync

Once data is in the database, the website sync API (`/website-sync/live-stock`) automatically shows updated stock. No extra step needed.

```
Database updated → Website API reads latest data → Website shows live stock
```

## Data Flow Diagram (Final)

```
┌─────────────────┐
│  Busy Software   │ (Ashish bhai's PC)
│  (Offline)       │
└────────┬─────────┘
         │ Auto-export (Windows Task Scheduler, daily 9 PM)
         ▼
┌─────────────────┐
│  C:\BusyExports  │ (Local folder)
│  sales.xlsx      │
│  stock.xlsx      │
└────────┬─────────┘
         │ Python watcher (every 5 min)
         ▼
┌─────────────────┐
│  POST /upload/   │ (Our backend API)
│  excel endpoint  │
└────────┬─────────┘
         │ Parsed & stored
         ▼
┌─────────────────┐
│  PostgreSQL DB   │
│  buyers, stock,  │
│  sales, racks    │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────────┐
│Dashboard│ │ Website    │
│(Next.js)│ │ /live-stock│
│ :3000   │ │ API sync   │
└────────┘ └────────────┘
```

## What We Need From Client for This

1. **Busy version number** — CLI export syntax varies
2. **PC access** — remote or physical, to install scripts
3. **Which reports to export** — Sales Register, Purchase Register, Stock Summary
4. **Export frequency** — daily sufficient? Or need more frequent?
5. **Server hosting decision** — cloud (AWS/GCP) or on their premises?
