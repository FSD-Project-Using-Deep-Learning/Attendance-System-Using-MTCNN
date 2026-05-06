# Complete System Architecture Overview

The **AI-Based Student Attendance System** is a three-tier application
combining a React frontend, two backend services, and MongoDB.

---

## 1. Components and Responsibilities

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | React + TypeScript + Tailwind | UI, webcam capture, live recognition display, admin dashboards |
| **AI Backend** | FastAPI (Python) | Face detection, feature extraction, classification, training |
| **Database Backend** | Node.js + Express + Mongoose | Authentication, attendance persistence, REST API |
| **Database** | MongoDB | Storage for admins, students, attendance |
| **Dataset Folder** | Local filesystem (`dataset/`) | Per-student cropped face images used for training |

---

## 2. Text-Based Architecture Diagram

```
                   ┌─────────────────────┐
                   │     React (Vite)    │
                   │  localhost:5173     │
                   └──────────┬──────────┘
               fetch / JSON   │   fetch / multipart
        ┌─────────────────────┴────────────────────┐
        ▼                                          ▼
┌──────────────────┐                   ┌──────────────────────┐
│ Node.js Express  │                   │     FastAPI          │
│ localhost:5000   │◀──HTTP POST───────│   127.0.0.1:8000     │
│ (Auth + CRUD)    │ /api/mark-        │  (MTCNN/YOLO +       │
│                  │  attendance       │   FaceNet + SVM)     │
└────────┬─────────┘                   └──────────┬───────────┘
         │ Mongoose                                │ Filesystem I/O
         ▼                                         ▼
┌──────────────────┐                   ┌──────────────────────┐
│     MongoDB      │                   │   dataset/<name>/    │
│  attendance_sys  │                   │   model.pkl          │
└──────────────────┘                   └──────────────────────┘
```

---

## 3. Working Flows

### 3.1 Add Face Flow

1. Admin opens **Add Face** page, enters student `name`, `usn`, `department`.
2. React registers the student in MongoDB via Node:
   ```
   POST localhost:5000/api/add-student
   ```
3. Webcam captures 25 images (5 angles × 5 frames each).
4. Each frame is POSTed to FastAPI:
   ```
   POST 127.0.0.1:8000/api/add-face
   ```
5. FastAPI runs MTCNN, crops the detected face (160×160), saves to
   `dataset/<name>/<timestamp>.jpg`.
6. Frontend emits `attendance:updated` → Dashboard student count refreshes.

### 3.2 Training Flow

1. Admin clicks **Train Model** on the dashboard.
2. React calls `POST 127.0.0.1:8000/api/train`.
3. FastAPI:
   - Iterates each `dataset/<name>/` folder.
   - Applies augmentation (flip, rotation, brightness jitter).
   - Extracts 512-D embeddings with `InceptionResnetV1` (FaceNet).
   - Fits an `SVC(kernel='linear', probability=True)` with labels.
   - Saves `model.pkl` and `labels.pkl`.
4. React polls `GET /api/training-status` until `status == "done"`.

### 3.3 Recognition Flow

1. Admin opens **Live Recognition**; React streams frames to:
   ```
   POST 127.0.0.1:8000/api/recognize
   ```
2. FastAPI detects faces (MTCNN), computes embeddings (FaceNet), classifies
   them (SVM), and returns `{ name, confidence, bbox }[]`.
3. React draws green bounding boxes and renders the floating student card.
4. If `confidence ≥ 0.75`, FastAPI forwards the record:
   ```
   POST localhost:5000/api/mark-attendance
   ```
5. Node.js dedupes and persists to MongoDB.

### 3.4 Attendance Flow (End-to-End)

```
Webcam frame
  → React canvas
  → multipart/form-data (JPEG)
  → FastAPI /api/recognize
  → MTCNN detect → FaceNet embed → SVM classify
  → FastAPI → POST /api/mark-attendance (Node.js)
  → Mongoose dedup { name, date }
  → MongoDB insert or "Already Logged In"
  → emit attendance:updated (frontend)
  → Dashboard + Attendance + Analytics refetch live
```

At end of day, the admin (or a scheduled job) triggers:

```
POST localhost:5000/api/attendance/mark-absent
```

which inserts `status: "Absent"` for every registered student with no
record for today, ensuring **Present + Absent = Total Students**.

---

## 4. Ports and URLs Summary

| Service | URL |
|---|---|
| React (dev) | `http://localhost:5173` |
| Node.js API | `http://localhost:5000/api` |
| FastAPI | `http://127.0.0.1:8000/api` |
| MongoDB | `mongodb://localhost:27017/attendance_system` |
