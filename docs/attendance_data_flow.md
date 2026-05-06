# Attendance Recording Data Flow

This document traces the end-to-end life of an attendance record — from the
moment a face is recognized to the way it appears on the Dashboard, Attendance,
and Analytics pages.

---

## 1. Triggering Attendance

Attendance can be marked by **three sources**, all of which converge on the
same Node.js endpoint, `POST /api/mark-attendance`:

| Source | Trigger |
|---|---|
| **Live Recognition** | FastAPI forwards high-confidence predictions |
| **Manual Entry** | Admin fills the form on the Attendance page |
| **Auto-Absent** | Bulk endpoint sweeps remaining students at end of day |

---

## 2. Recognition → Mark Attendance

```
React (frame) ──▶ FastAPI /api/recognize
                       │
                       │ if confidence ≥ 0.75
                       ▼
                Node.js /api/mark-attendance
                       │
                       ▼
                MongoDB attendance
```

Request body:
```json
{
  "name": "Rahul",
  "usn":  "1AI22CS045",
  "department": "AI & DS",
  "date": "2026-04-22",
  "time": "10:14:22",
  "status": "Present"
}
```

---

## 3. Duplicate Prevention (One Record / Student / Day)

Two layers of deduplication:

### 3.1 Application check
```js
const existing = await Attendance.findOne({ name, date });
if (existing) {
  // either upgrade Absent→Present or return alreadyMarked
}
```

### 3.2 Database constraint
```js
attendanceSchema.index({ name: 1, date: 1 }, { unique: true });
```

### 3.3 Resolution Matrix

| Existing | Incoming | Outcome |
|---|---|---|
| none | Present | **Insert** `Present` |
| none | Absent  | **Insert** `Absent` |
| Absent | Present | **Upgrade** → Present (time updated) |
| Present | Present | Return `alreadyMarked: true` |
| Present | Absent | Return `alreadyMarked: true` (no downgrade) |

The response surfaces `alreadyMarked: true` to the UI so the Live Recognition
card can display **"Already Logged In"** instead of flashing "Marked".

---

## 4. Daily Storage Model

Every record is a single MongoDB document:

```json
{
  "_id": "662...",
  "name": "Rahul",
  "usn": "1AI22CS045",
  "department": "AI & DS",
  "date": "2026-04-22",
  "time": "10:14:22",
  "status": "Present",
  "createdAt": "2026-04-22T10:14:22.918Z"
}
```

`date` is stored as an **ISO-date string (`YYYY-MM-DD`)** rather than a
timestamp — this makes exact-date queries trivial (`find({ date: today })`)
and eliminates timezone edge cases.

---

## 5. Absent Marking

### 5.1 Manual / scheduled bulk
```
POST /api/attendance/mark-absent  { date?: "2026-04-22" }
```

Server-side logic:

```js
const students = await Student.find();
const existing = await Attendance.find({ date }).select("name");
const marked   = new Set(existing.map(r => r.name));

const missing = students.filter(s => !marked.has(s.name));
await Attendance.insertMany(
  missing.map(s => ({ ...s, date, time: "—", status: "Absent" })),
  { ordered: false } // skip duplicate-index errors
);
```

### 5.2 Invariant
After running this endpoint for a given day:

```
Present count + Absent count = Total Students
```

The Dashboard's `/api/attendance/stats` endpoint additionally treats **any
untracked student** as absent-by-implication, so the invariant holds even
before the bulk job has run.

---

## 6. Retrieval

### 6.1 Attendance Page
```
GET /api/attendance?date=2026-04-22&department=AI%20%26%20DS
```
Returns an array sorted by `createdAt desc`. Because the unique index
guarantees one row per student per day, **no client-side dedup is needed**.

### 6.2 Dashboard Page
```
GET /api/attendance/stats
```
Returns:
```json
{
  "totalStudents": 3,
  "presentToday":  2,
  "absentToday":   1,
  "totalRecords":  97
}
```

### 6.3 Analytics Page
```
GET /api/attendance          (full history)
GET /api/students            (denominator)
```
The page computes:

- **Daily chart** — present count per last 5 days, absent = `totalStudents − present`
- **Monthly trend** — sum of presents per month ÷ distinct days ÷ totalStudents × 100
- **Department distribution** — grouped by `student.department`
- **Student performance** — per-student present count ÷ distinct dates × 100

---

## 7. Real-Time Synchronization

Every mutation in the frontend service emits an `attendance:updated` browser
event:

```ts
export const emitAttendanceUpdated = () =>
  window.dispatchEvent(new CustomEvent("attendance:updated"));
```

Each page subscribes on mount:

```ts
useEffect(() => {
  const off = onAttendanceUpdated(fetchData);
  return () => off();
}, []);
```

As a belt-and-braces measure, the Dashboard also polls every 15 seconds so
records added by FastAPI (which bypasses the frontend) still appear in real
time without a manual refresh.

---

## 8. Empty-State Handling

| Page | Empty condition | UI message |
|---|---|---|
| Dashboard | `recentAttendance.length === 0` | *"No attendance records yet. Start a detection session."* |
| Attendance | `filteredRecords.length === 0` | *"No attendance records for this date"* |
| Analytics | `studentPerformance.length === 0` | *"No attendance data yet"* |
| Dashboard | `stats.totalStudents === 0` | card displays `0` + *"No students registered"* (Add Face page) |
