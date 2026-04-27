import time
import os
import requests
import glob
import logging
from datetime import datetime

# ==========================================
# CaratSense Busy Data Sync Service
# ==========================================

# Configuration
WATCH_FOLDER = r"C:\BusyExports"
API_URL = "http://localhost:8000/api/v1/upload/excel"  # Replace with production URL
TOKEN = "YOUR_API_TOKEN"  # Replace with a long-lived JWT or API Key
PROCESSED_FOLDER = os.path.join(WATCH_FOLDER, "processed")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("sync_service.log"),
        logging.StreamHandler()
    ]
)

def ensure_dirs():
    if not os.path.exists(WATCH_FOLDER):
        os.makedirs(WATCH_FOLDER)
    if not os.path.exists(PROCESSED_FOLDER):
        os.makedirs(PROCESSED_FOLDER)

def get_file_type(filename):
    fname = filename.lower()
    if any(k in fname for k in ["sales", "voucher", "sale"]):
        return "sales_vouchers"
    elif any(k in fname for k in ["stock", "snapshot", "inventory"]):
        return "stock_snapshot"
    elif any(k in fname for k in ["purchase", "dyed"]):
        return "dyed_sale"
    elif any(k in fname for k in ["quality", "article", "ref"]):
        return "quality_reference"
    elif "rack" in fname:
        return "rack_numbers"
    return None

def sync():
    files = glob.glob(os.path.join(WATCH_FOLDER, "*.xlsx"))
    
    if not files:
        return

    logging.info(f"Found {len(files)} new files. Starting sync...")

    for filepath in files:
        filename = os.path.basename(filepath)
        file_type = get_file_type(filename)

        if not file_type:
            logging.warning(f"Skipping {filename}: Unknown file type")
            continue

        logging.info(f"Uploading {filename} as {file_type}...")

        try:
            with open(filepath, 'rb') as f:
                resp = requests.post(
                    API_URL,
                    files={"file": (filename, f)},
                    data={"file_type": file_type},
                    headers={"Authorization": f"Bearer {TOKEN}"},
                    timeout=60
                )

            if resp.status_code == 200:
                # Move to processed folder with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                dest_path = os.path.join(PROCESSED_FOLDER, f"{timestamp}_{filename}")
                os.rename(filepath, dest_path)
                logging.info(f"✓ Successfully synced {filename}")
            else:
                logging.error(f"✗ Failed to sync {filename}. Status: {resp.status_code}, Error: {resp.text}")
        
        except Exception as e:
            logging.error(f"✗ Error during sync of {filename}: {str(e)}")

if __name__ == "__main__":
    logging.info("CaratSense Data Sync Service Started")
    ensure_dirs()
    
    while True:
        try:
            sync()
        except Exception as e:
            logging.error(f"Service error: {str(e)}")
        
        # Check every 5 minutes
        time.sleep(300)
