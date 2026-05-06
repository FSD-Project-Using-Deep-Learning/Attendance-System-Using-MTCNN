# ==============================================================================
# ATTENDANCE UTILITIES
# ==============================================================================
# Local CSV logging with daily deduplication.
# Optionally forwards to Node.js backend (MongoDB) via HTTP.
# No Firebase dependencies.
# ==============================================================================

import os
import requests
import pandas as pd
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ATTENDANCE_FILE = os.path.join(BASE_DIR, "attendance.csv")

# Node.js backend URL for MongoDB sync
NODE_BACKEND = os.environ.get("NODE_BACKEND", "http://localhost:5000")


def mark_attendance(name: str, usn: str = "", department: str = "AI & DS",
                    sync_mongo: bool = True) -> dict:
    """
    Mark attendance for a student. Only one entry per person per day.
    Writes to local CSV and syncs to MongoDB via Node.js.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")

    # Load or create CSV
    if os.path.exists(ATTENDANCE_FILE):
        df = pd.read_csv(ATTENDANCE_FILE)
    else:
        df = pd.DataFrame(columns=["Name", "USN", "Department", "Date", "Time", "Status"])

    # Duplicate check
    existing = df[(df["Name"] == name) & (df["Date"] == today)]
    if not existing.empty:
        return {
            "marked": False,
            "message": f"{name} already marked present today.",
            "time": existing.iloc[0]["Time"],
        }

    # Add to CSV
    new_row = pd.DataFrame([{
        "Name": name,
        "USN": usn,
        "Department": department,
        "Date": today,
        "Time": current_time,
        "Status": "Present",
    }])
    df = pd.concat([df, new_row], ignore_index=True)
    df.to_csv(ATTENDANCE_FILE, index=False)

    print(f"  [Attendance] Marked present: {name} at {current_time}")

    # Sync to MongoDB via Node.js backend
    if sync_mongo:
        try:
            requests.post(f"{NODE_BACKEND}/api/mark-attendance", json={
                "name": name,
                "usn": usn,
                "department": department,
                "date": today,
                "time": current_time,
                "status": "Present",
            }, timeout=5)
        except Exception as e:
            print(f"  [Attendance] MongoDB sync error (non-fatal): {e}")

    return {
        "marked": True,
        "message": f"Attendance marked for {name}.",
        "time": current_time,
    }


def get_today_attendance() -> list:
    """Get all attendance records for today."""
    if not os.path.exists(ATTENDANCE_FILE):
        return []

    df = pd.read_csv(ATTENDANCE_FILE)
    today = datetime.now().strftime("%Y-%m-%d")
    today_df = df[df["Date"] == today]
    return today_df.to_dict(orient="records")


def get_attendance_by_date(date: str) -> list:
    """Get attendance records for a specific date."""
    if not os.path.exists(ATTENDANCE_FILE):
        return []

    df = pd.read_csv(ATTENDANCE_FILE)
    filtered = df[df["Date"] == date]
    return filtered.to_dict(orient="records")
