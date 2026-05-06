# MongoDB Database Connection and Usage

The Node.js backend uses **Mongoose** (an ODM for MongoDB) to manage
connections, schemas, and CRUD operations.

---

## 1. Connection Setup

### 1.1 Environment variables

Credentials are never hard-coded. The connection string lives in a `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/attendance_system
PORT=5000
JWT_SECRET=<long-random-string>
```

`dotenv` loads it at process start:

```js
import "dotenv/config";
```

### 1.2 Opening the connection

`backend/server.js`:

```js
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB connected");
```

Mongoose maintains a **connection pool** (default 5 sockets). All subsequent
model operations share that pool.

### 1.3 How collections are auto-created

MongoDB is schemaless at the engine level. Collections are created **lazily on
first write**. Mongoose derives a collection name from the model:

```js
mongoose.model("Attendance", schema); // → collection "attendances"
```

No explicit `createCollection()` call is needed.

---

## 2. Schemas

### 2.1 `Admin` — `backend/models/Admin.js`

```js
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
```

- Passwords are stored as **bcrypt** hashes (never plaintext).
- A default `admin / admin123` account is seeded on server startup if empty.

### 2.2 `Student` — `backend/models/Student.js`

```js
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  usn:  { type: String, required: true, unique: true },
  department: { type: String, default: "AI & DS" },
  createdAt: { type: Date, default: Date.now },
});
```

- `usn` is a **unique** index → prevents duplicate student records.
- `name` correlates 1-to-1 with the folder name inside `dataset/`.

### 2.3 `Attendance` — `backend/models/Attendance.js`

```js
const attendanceSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  usn:        { type: String, default: "" },
  department: { type: String, default: "AI & DS" },
  date:       { type: String, required: true },   // YYYY-MM-DD
  time:       { type: String, required: true },   // HH:MM:SS
  status:     { type: String, enum: ["Present", "Absent"], default: "Present" },
  createdAt:  { type: Date, default: Date.now },
});

attendanceSchema.index({ name: 1, date: 1 }, { unique: true });
```

- Compound unique index `{ name, date }` guarantees **one record per
  student per day**.
- `status` is constrained to an enum for data integrity.

---

## 3. CRUD Operations

### 3.1 Insert (Create)

```js
await new Attendance({ name, usn, date, time, status }).save();
```

Returns the inserted document including `_id` and `createdAt`.

### 3.2 Read (Query)

```js
const records = await Attendance.find({ date: "2026-04-22" }).sort({ createdAt: -1 });
const count   = await Student.countDocuments();
```

- `find()` returns an array.
- `countDocuments()` is used for the Dashboard's **Total Students** card.

### 3.3 Update

```js
await Attendance.findByIdAndUpdate(id, { status: "Absent" }, { new: true });
```

`{ new: true }` makes it return the **post-update** document.

### 3.4 Upsert (used for students)

```js
await Student.findOneAndUpdate(
  { usn },
  { name, usn, department },
  { upsert: true, new: true }
);
```

Insert if missing, update if present — used when training overlaps with
student registration.

### 3.5 Delete

```js
await Attendance.findByIdAndDelete(id);
await Student.findByIdAndDelete(id); // cascade removes related attendance rows
```

### 3.6 Bulk insert (auto-absent)

```js
await Attendance.insertMany(rows, { ordered: false });
```

`ordered: false` → continues inserting even if some rows violate the unique
index, which is exactly the behavior we want when marking absent at end of day.

---

## 4. Indexes in Play

| Collection | Index | Reason |
|---|---|---|
| `students` | `{ usn: 1 }` unique | Prevents duplicate registration |
| `attendances` | `{ name: 1, date: 1 }` unique | One attendance per student per day |
| `admins` | `{ username: 1 }` unique | Single admin per username |

---

## 5. Connection Lifecycle

1. **Server start** → `mongoose.connect()` opens the pool.
2. **Idle** → pool is kept alive via TCP keep-alive pings.
3. **Request arrives** → a socket is borrowed, query executed, returned.
4. **Shutdown** → `SIGINT` handler calls `mongoose.disconnect()`.
