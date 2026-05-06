# API Endpoints Reference Guide

This reference lists every endpoint exposed by the system, which backend owns
it, and its purpose.

---

## 1. FastAPI Backend — `http://127.0.0.1:8000`

Handles all AI/ML operations: image storage, training, recognition.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/add-face` | Accepts a multipart JPEG + `name`; MTCNN detects the face, crops 160×160, saves to `dataset/<name>/` |
| `POST` | `/api/train` | Trains FaceNet-embedding + SVM model on the current dataset folder; saves `model.pkl`, `labels.pkl` |
| `GET`  | `/api/training-status` | Returns `{ status: "running" \| "done" \| "idle", progress: 0..1 }` |
| `POST` | `/api/recognize` | Accepts a multipart JPEG frame; returns `{ predictions: [{ name, usn, confidence, bbox }] }` |
| `GET`  | `/api/students/count` | Returns the count of student folders on disk (FS source of truth) |
| `GET`  | `/api/student-image/<name>` | Serves a front-facing reference image of a student from `dataset/<name>/` (used by the Live Recognition floating card) |
| `POST` | `/api/attendance/start` | Begins a live recognition session (enables auto-forward to Node) |
| `POST` | `/api/attendance/stop` | Ends the session and flushes any queued records |

### Request / Response Examples

**Recognize**
```bash
curl -X POST http://127.0.0.1:8000/api/recognize \
     -F "file=@frame.jpg"
```
```json
{
  "success": true,
  "predictions": [
    { "name": "Rahul", "usn": "1AI22CS045",
      "confidence": 0.92, "bbox": [120,88,160,160],
      "status": "Present" }
  ]
}
```

---

## 2. Node.js Backend — `http://localhost:5000`

Owns authentication, student data, and attendance persistence in MongoDB.

### 2.1 Authentication

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/login` | Verifies `{ username, password }` against `admins` collection (bcrypt). Returns `{ success, token }` |
| `POST` | `/api/verify-admin` | Confirms a JWT / admin session is still valid |
| `POST` | `/api/register-admin` | Creates a new admin account (passwords hashed with bcrypt) |

### 2.2 Students

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/add-student` | Upsert a student by `usn` |
| `GET`  | `/api/students` | List all students (sorted by `createdAt desc`) |
| `GET`  | `/api/students/count` | Count of MongoDB student documents (used by Dashboard) |
| `GET`  | `/api/students/by-name?name=...` | Single student lookup by name |
| `DELETE` | `/api/students/:id` | Delete a student + cascade-delete their attendance |

### 2.3 Attendance

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/mark-attendance` | Insert or upgrade (`Absent→Present`) a single record; dedupes by `{ name, date }` |
| `GET`  | `/api/attendance?date=&department=` | List records filtered by date/department |
| `PUT`  | `/api/attendance/:id` | Update a single record (admin edits from the table) |
| `DELETE` | `/api/attendance/:id` | Remove a record |
| `POST` | `/api/attendance/mark-absent` | Bulk-insert `Absent` rows for every student missing today's record |
| `GET`  | `/api/attendance/stats` | Returns `{ totalStudents, presentToday, absentToday, totalRecords }` |

### Example — Mark Attendance
```http
POST /api/mark-attendance
Content-Type: application/json

{
  "name": "Rahul",
  "usn":  "1AI22CS045",
  "department": "AI & DS",
  "date": "2026-04-22",
  "time": "10:14:22",
  "status": "Present"
}
```
Response (new):
```json
{ "success": true, "message": "Attendance marked for Rahul",
  "record": { "_id": "...", "status": "Present" } }
```
Response (duplicate):
```json
{ "success": false, "alreadyMarked": true,
  "message": "Rahul already logged in on 2026-04-22" }
```

---

## 3. Cross-Backend Call

FastAPI calls **one** Node.js endpoint directly:

```
FastAPI  ── POST /api/mark-attendance ──▶  Node.js
```

This is the only server-to-server link; all other traffic originates in the
browser.

---

## 4. Endpoints Matrix by Consumer

| Consumer | Endpoints used |
|---|---|
| **Dashboard page** | `GET /api/attendance/stats`, `GET /api/attendance` |
| **Attendance page** | `GET /api/attendance`, `POST /api/mark-attendance`, `PUT /api/attendance/:id`, `DELETE /api/attendance/:id`, `POST /api/attendance/mark-absent`, `GET /api/students` |
| **Analytics page** | `GET /api/attendance`, `GET /api/students` |
| **Add Face page** | `POST /api/add-student` (Node), `POST /api/add-face` (FastAPI) |
| **Train button** | `POST /api/train`, `GET /api/training-status` (FastAPI) |
| **Live Recognition** | `POST /api/recognize`, `GET /api/student-image/:name` (FastAPI) |
| **FastAPI (internal)** | `POST /api/mark-attendance` (Node) |

---

## 5. Authentication & Security Notes

- Passwords hashed with **bcrypt** (cost factor 10).
- Admin session token is a signed **JWT**; verified on each protected route.
- FastAPI endpoints are trusted within the private network; production would
  add a shared secret header (`X-Internal-Token`) between FastAPI and Node.
- All write endpoints validate payloads and return structured error objects
  (`{ success: false, message }`) for the frontend to display.
