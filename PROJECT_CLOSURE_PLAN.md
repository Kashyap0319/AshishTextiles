# CaratSense — Project Closure Plan
## Final Gap Analysis + Action Plan to Ship

**Review date:** April 2026
**Reviewed:** 10-page scope doc + Architecture PDF + Discovery Questionnaire (Ashish's answers) + 3 meeting transcripts + entire conversation history + current codebase

---

## 🎯 WHAT ASHISH ACTUALLY WANTS (from Questionnaire)

This is the **source of truth** — everything below is what Ashish explicitly answered in the questionnaire and meetings.

### Business Reality
- **Team:** 4 sales at warehouse + 2 billing + 1 purchase/swatch person at office (7 people total)
- **Process:** Packing list → Google Sheets (VLOOKUP) → truck arrival → sort by bale reading → mark rack → dispatch
- **Inventory:** Bales have **physical barcode stickers** with bale number — critical identifier
- **Sales:** 4 sales emp show goods, buyers visit warehouse. Sample couriers ~64/day to outside-Delhi buyers
- **Stock classification:** **HIERARCHICAL** (Dyed vs Grey → Piece Dyed/Print/Yarndyed/Denim → Cotton/Poly → Bottom/Shirting → Lycra/Non-Lycra → specific quality) — **NOT the 6 flat types we built**

### Ashish's Explicit Requirements (Questionnaire)
| Q | What he said |
|---|--------------|
| Q4 | **Stock types (Dead/Off-Shade/etc.) NOT NEEDED.** Wants hierarchical quality structure |
| Q5 | Defect logging NOT required |
| Q6 | **BARCODE SCANNING** or text box for bale number |
| Q13 | Payment terms NOT required |
| Q14 | Fixed prices per quality |
| Q15 | **PRICE APPROVAL workflow** — sales can't dispatch without owner approval |
| Q16 | **QUALITY-MIX FLAG BOT** — if a poplin sale has a lycre twill roll, flag it |
| Q16 | **NOT-FOUND SALE workflow** — missing rolls go to "*NOT FOUND/TRACED*" sale in Busy |
| Q17 | **SAMPLE→SALE LEARNING** — track 64 daily courier samples, match with sales |
| Q18 | Supplier tracking NOT NEEDED — focus only on buyers |
| Q23 | Website: **sample.tdmfabric.com** (admin access provided) + tdmfabrics.com |
| Q25 | Hinglish: English labels + Hindi AI chat |
| Q26 | **Static IP** restriction (warehouse + shop only) |
| Q27 | Only Admin + Sales roles |

---

## ✅ WHAT'S DONE (90% of backbone)

### Backend (fully working)
- 24 API routes with auth, rate limiting, audit logs
- 12 database tables (2,621 articles, 15,437 buyers, 52,900 sales, 511,608 purchases imported)
- 5 ML modules (SVD matching, K-Means clustering, TF-IDF duplicates, clearance velocity, basket analysis)
- Packing list processor (4 formats: WITH/WITHOUT GOWDEN, Google Sheet, old format)
- QR generation, Excel exports, EOD reports, website sync API

### Frontend (UI done, some wiring pending)
- Landing page + login with JWT + geolocation
- Dashboard with 11 modules (after sidebar cleanup):
  1. Dashboard | 2. Smart Stock | 3. Sales | 4. Warehouse | 5. Buyers | 6. AI Assistant | 7. Activity
  8. Staff Tagging | 9. Tasks | 10. Data Input | 11. Website Sync
- Role-based sidebar (Owner/Sales/Warehouse)
- Framer Motion animations throughout
- Real data everywhere (no mock/random data)

---

## ❌ CRITICAL GAPS — What's Missing

### 🔴 BLOCKING (Must Build Before Shipping)

#### 1. **Stock Classification System is WRONG**
**Current:** 6 flat types (Dead Stock, Off-Shade, Mill Seconds, Remnants, Surplus, Manufactured)
**Ashish said:** "Our classification is VERY DIFFERENT. We DON'T need these."
**What's needed:** Hierarchical filter tree matching his actual classification:
```
Level 1: Dyed | Grey
Level 2: Piece Dyed | Print | Yarndyed | Denim
Level 3 (Piece Dyed): Cotton | Poly-cotton
Level 4 (Cotton): Bottom | Shirting
Level 5 (Bottom): Lycra | Non-Lycra
Level 6: Specific quality (Twill, Dobby, Knit, Satin, Matty, Tussur, etc.)
```
**Effort:** 1 day — rebuild stock classification + filters in Smart Stock module

#### 2. **Barcode Scanning for Bales**
**Current:** OCR text extraction (experimental)
**Ashish said:** "ALL bales have barcode + bale number on physical label. ADD BARCODE SCANNING."
**What's needed:**
- Mobile camera barcode scanning (browser-based using `html5-qrcode` or similar)
- Manual bale number text entry as fallback
- Instant lookup: scan → show article, meters, quality, rack
**Effort:** 1 day

#### 3. **Quality-Mix Sale Detection Bot** (HIGH PRIORITY)
**What Ashish wants:**
> "Make a bot to check sales. If the whole sale is Poplin, check if there's any other quality roll. If Poplin sale has a Lycre Twill roll, flag it because rates are different."
**Status:** Backend endpoint `/quality-check/sale-flags` exists but **no frontend UI**
**Effort:** Half day — add Quality Check module to dashboard

#### 4. **Price Approval Workflow**
**Ashish said:** "Sales team doesn't have power to dispatch without getting rates checked from us. Add approval workflow for price."
**What's needed:**
- Sales create sale with price → status: "Pending Approval"
- Admin gets notification
- Admin approves/rejects with optional counter-price
- Once approved, dispatch allowed
**Effort:** 1 day

#### 5. **Not-Found Sale Workflow**
**Process:** Missing rolls → dummy sale with `*NOT FOUND/TRACED*` in particulars → if roll appears later → delete from not-found, add to real buyer sale
**What's needed:**
- UI to create "Not Found" entries during packing
- When creating real sale: check if bale is in not-found → auto-prompt to move it
**Effort:** Half day

#### 6. **Sample → Sale Learning Module**
**What Ashish wants:**
> "We send ~64 courier samples daily. Upload courier bills. System should track which of those 64 buyers actually purchased later. Can also add photos of samples → match with sales."
**What's needed:**
- Upload courier bill (Excel or OCR)
- Extract buyer list from bill
- Match with sales in next 7-30 days
- ML: learn which sample type → which customer type
- Photo upload for swatches with article linking
**Effort:** 2 days

---

### 🟡 IMPORTANT (Before Demo/Launch)

#### 7. **Product Code Parser**
**Format:** `10828-MOK-ST-NF-RFD0000000-LY-DRILL`
- `10828` = article
- `MOK` = mill code (skip)
- `ST-NF` = composition + finish
- `RFD0000000` = color code (RFD=ready for dyeing, 00000087=white, 1000292837=cream, etc.)
- `LY-DRILL` = quality

**What's needed:** Parser that extracts article/composition/finish/color/quality from code. Need composition master from Ashish.
**Effort:** Half day (pending composition master Excel from Ashish)

#### 8. **Sample Stock Catalog on `sample.tdmfabric.com`**
**Status:** Admin access received. Need WooCommerce/WordPress sync.
**What's needed:**
- Auto-sync live stock from DB → sample.tdmfabric.com product catalog
- Daily refresh
- Stock quantity updates when sold
**Effort:** 2 days (needs WooCommerce API keys from WordPress admin)

#### 9. **Hinglish Support in AI Chat**
**Status:** Gemini backend accepts Hindi/English queries. Frontend works. Just need testing.
**What's needed:** Add Hinglish sample prompts in AI chat UI ("Kitna stock hai?", "Kaun sa buyer chahiye?")
**Effort:** 2 hours

#### 10. **Static IP Restriction**
**Current:** Geofence by lat/lng
**Ashish's preference:** Static IP-based lock (warehouse IP + shop IP only)
**What's needed:** Add IP whitelist in auth middleware. More reliable than GPS.
**Effort:** Half day

#### 11. **Client View/Buyer Portal**
**From meeting:** Per-buyer dashboard with pickup timeline, payment history, past purchases, inquiries
**Status:** Backend has all data, no dedicated UI
**Effort:** 1 day

#### 12. **Demand-Triggered Alerts (Rare SKU Inquiry Module)**
**Meeting request:** When a specific color/SKU arrives, auto-notify buyers who asked for it
**What's needed:**
- Inquiry creation form: buyer + article + color
- When matching stock arrives → auto-WhatsApp pre-filled message
- Track alerts sent + responses
**Effort:** 1 day

---

### 🟢 NICE TO HAVE (Post-Launch)

#### 13. **Busy → Platform Auto-Sync**
**Designed:** `.bat` script + Python watcher + Task Scheduler
**Pending:** Install on Ashish's PC (needs AnyDesk session)
**Effort:** 30 min remote setup

#### 14. **WhatsApp Business API Integration**
**Current:** `wa.me` pre-filled message links
**Upgrade:** Actual WhatsApp Business API for programmatic broadcasts
**Effort:** 2 days (+ Meta Business approval time)

#### 15. **Warehouse Layout Update**
Ashish will draw on paper and send. Update rack master when received.
**Effort:** 2 hours

---

## 📊 EXECUTION PLAN — 5 Days to Ship

### Day 1 — Core Fixes
- Rebuild stock classification (hierarchical filter tree)
- Barcode scanner component (html5-qrcode)
- Quality-mix sale detection UI
- **Deliverable:** Smart Stock + Quality Check modules match Ashish's reality

### Day 2 — Workflow Completion
- Price approval workflow (sales → pending → admin approve)
- Not-found sale workflow
- Static IP restriction
- **Deliverable:** Complete sales flow matches Busy's process

### Day 3 — Intelligence Layer
- Sample→Sale learning module
- Courier bill upload + OCR extraction
- Demand-triggered alerts system
- **Deliverable:** AI intelligence features Ashish specifically requested

### Day 4 — External Integration
- `sample.tdmfabric.com` WooCommerce sync setup
- Product code parser (pending composition master)
- Hinglish prompts in AI chat
- Client/Buyer portal view
- **Deliverable:** Website sync live

### Day 5 — Polish + Deploy
- End-to-end testing with real data
- Client PC setup (Busy sync via AnyDesk)
- Team training video/doc
- **Deliverable:** Ship to production, handover to Ashish

---

## 🎁 WHAT TO COLLECT FROM ASHISH (This Week)

| # | Item | Blocker? | Sent status |
|---|------|----------|-------------|
| 1 | Fresh stock snapshot Excel | No (have old data) | Promised "will send" |
| 2 | Warehouse layout drawn on paper | No | Promised |
| 3 | **Hierarchical stock classification** (the one on page 15-16) | ✅ **RECEIVED** | Done |
| 4 | Composition + Finish master (ST-NF, CT-SF, etc.) | Yes (for product code parser) | Pending |
| 5 | 4 Sales team member names + phone | Yes (for tagging) | Pending |
| 6 | Owner (Ashish + Dad) login creds | Yes (for approval workflow) | Pending |
| 7 | Static IPs of warehouse + shop | Yes (for IP restriction) | Pending |
| 8 | `sample.tdmfabric.com` WooCommerce API keys | Yes (for website sync) | **Admin access received — generate keys from there** |
| 9 | 2026-2027 historical sales data | No (have till March 2026) | Promised |
| 10 | 64-buyer daily courier bill sample | Yes (for sample→sale learning) | Pending |
| 11 | Gemini API key (production) | Nice to have | We can set up |

---

## 💪 HOW TO DELIVER 1000% OUTPUT

### Work Strategy
1. **Fix the 6 BLOCKING items first** (Days 1-3) — these are the "soul" of Ashish's business
2. **Don't build what he said "not required"** — payment terms, supplier tracking, sample response tracking
3. **Match his exact workflow** — not a generic textile ERP
4. **Hinglish UI + Android-optimized** (his whole team uses Android)
5. **Working demo every 2 days** — show progress, don't go silent

### Demo Plan (End of Week)
- Live show using real TDM data
- 3 key scenarios:
  1. **Truck arrives** → packing list upload → auto-fill quality + rack → bale scanning → stock entered
  2. **Buyer inquiry** → AI matching → "best 5 buyers for this poplin" → WhatsApp
  3. **Sale confirm** → quality mix check → price approval → dispatch

### Proof Points
- "Apka exact packing list workflow — Mill Excel se lekar rack assignment tak — 10 seconds mein"
- "Poplin sale mein Lycre Twill roll aaya — system ne auto flag kiya"
- "JANI TEXTILES ne pichle 6 mahine mein 20,515m kharida — humne ML se pata kiya"
- "Aaj ka stock live sample.tdmfabric.com pe dikh raha hai — manual upload khatam"

### Billing Justification (4 lakh project)
- **Backend:** 24 APIs + 5 ML models + full auth = 40+ hours
- **Frontend:** 16 modules + animations + real data integration = 50+ hours
- **Data:** Import of 600K+ records + parser for 4 Excel formats = 20+ hours
- **Integration:** Busy sync + WooCommerce + WhatsApp = 15+ hours
- **Total:** 125+ development hours + ML engineering + deployment + training
- **Vedant's quote of 4L** is fair — we're delivering a bespoke ERP, not template software

---

## 🏁 FINAL ANSWER — Kitna Baaki Hai

**In terms of time:** 5 full working days to finish + 1 day for deployment = **~1 week from today**

**In terms of features:**
- ✅ **85% done** (UI, database, ML, all modules built)
- 🟡 **10% pending** (6 blocking fixes — stock classification, barcode, quality-check UI, price approval, not-found, sample learning)
- 🟢 **5% external** (client-side Busy install, WooCommerce keys, team training)

**Main risk:** Ashish needs to provide composition master + API keys + team names this week or Day 4-5 slips.

**Project is NOT in danger — it's in final execution phase.** Core is solid; we're building the specific workflows Ashish called out.
