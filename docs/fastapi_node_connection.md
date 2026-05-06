# FastAPI to Node.js Communication

This document describes how face-recognition results flow from the **FastAPI AI
backend** (`127.0.0.1:8000`) to the **Node.js + Express database backend**
(`localhost:5000`), which is the single source of truth for attendance records
stored in MongoDB.

---

## 1. Responsibilities

| Layer | Role |
|---|---|
| FastAPI | Runs the deep-learning pipeline (MTCNN → FaceNet → SVM). Produces `{name, usn, confidence, bbox}`. |
| Node.js | Persists attendance, deduplicates daily entries, serves dashboards. |
| MongoDB | Stores `students`, `attendance`, and `admins` collections. |

FastAPI **never writes directly to MongoDB**. All persistence happens through
Node.js REST endpoints.

---

## 2. Recognition → Attendance Flow

### Step 1 — Prediction on FastAPI
When `/api/recognize` classifies a face with confidence ≥ threshold
(e.g., 0.75), FastAPI prepares an attendance payload.

### Step 2 — Forwarding to Node.js
FastAPI issues an HTTP POST to Node.js using the `requests` library:

```python
import requests, datetime

payload = {
    "name": pred_name,
    "usn": pred_usn,
    "department": pred_department,
    "date": datetime.date.today().isoformat(),     # YYYY-MM-DD
    "time": datetime.datetime.now().strftime("%H:%M:%S"),
    "status": "Present",
}

try:
    requests.post(
        "http://localhost:5000/api/mark-attendance",
        json=payload,
        timeout=3,
    )
except requests.RequestException as e:
    log.warning(f"Node.js unreachable: {e}")
```

### Step 3 — Node.js receives the record
The Express route parses the JSON body:

```js
router.post("/mark-attendance", async (req, res) => {
  const { name, usn, department, date, time, status } = req.body;
  // validation + duplicate check + insert
});
```

### Step 4 — Validation
Node.js validates:

1. `name` and `date` are present.
2. If `usn` is missing, it's resolved from the `students` collection by name.
3. `status` defaults to `"Present"`.

### Step 5 — Duplicate prevention
Two layers of deduplication guarantee **one record per student per day**:

1. **Application-level check** — `Attendance.findOne({ name, date })` before insert.
2. **Database-level constraint** — compound unique index:
   ```js
   attendanceSchema.index({ name: 1, date: 1 }, { unique: true });
   ```

Behavior on a duplicate:

| Existing | Incoming | Action |
|---|---|---|
| *(none)* | Present | Insert new record |
| Absent | Present | **Upgrade** existing row to Present |
| Present | Present | Return `{ alreadyMarked: true }` — no write |
| Present | Absent | Return `{ alreadyMarked: true }` — no downgrade |

Mongo error `E11000 (duplicate key)` is also caught as a safety net for race
conditions from concurrent requests.

### Step 6 — Persistence
The document is inserted via Mongoose:

```js
await new Attendance({
  name, usn, department, date, time, status
}).save();
```

---

## 3. Text-Based Data Flow Diagram

```
          ┌────────────────────┐
          │  React Frontend    │
          │  (Live Recognition)│
          └────────┬───────────┘
                   │ JPEG frame (multipart/form-data)
                   ▼
          ┌────────────────────┐
          │  FastAPI (8000)    │
          │  MTCNN → FaceNet   │
          │       → SVM        │
          └────────┬───────────┘
                   │  HTTP POST /api/mark-attendance
                   │  { name, usn, date, time, status }
                   ▼
          ┌────────────────────┐
          │  Node.js (5000)    │
          │  Express + Mongoose│
          │  dedup { name,date}│
          └────────┬───────────┘
                   │  insert / upgrade
                   ▼
          ┌────────────────────┐
          │  MongoDB           │
          │  attendance coll.  │
          └────────────────────┘
```

---

## 4. Why Two Backends?

- FastAPI is optimized for **Python ML inference** (PyTorch, OpenCV).
- Node.js is optimized for **I/O-heavy REST** and **Mongoose**.
- Decoupling lets each scale independently — the AI service can be moved to a
  GPU host without touching the database layer.

---

## 5. Failure Modes

| Failure | Handling |
|---|---|
| Node.js is down | FastAPI logs the warning and still returns predictions; React continues to display boxes. |
| MongoDB is down | Node.js returns 500; FastAPI retries are not attempted (idempotent next-frame). |
| Duplicate in same second | Unique index rejects the 2nd write; response still `200 { alreadyMarked: true }`. |
