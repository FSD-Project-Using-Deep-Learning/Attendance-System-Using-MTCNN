# ⚙️ Installation & Setup Guide

# Prerequisites

Make sure the following are installed on your system:

- Node.js
- Python 3.x
- MongoDB

---

# 📦 Install Frontend Dependencies

Open terminal in the main project folder and run:

```bash
npm install
```

---

# 📦 Install Backend Dependencies

Move to backend folder:

```bash
cd backend
```

Install required Node.js packages:

```bash
npm install
```

Install required Python packages:

```bash
pip install fastapi uvicorn mtcnn opencv-python tensorflow numpy pandas pymongo
```

---

# 🔐 Environment Variables

Create a `.env` file in the project root/backend folder and add your MongoDB connection string.

Example:

```env
MONGO_URI=your_mongodb_connection_string
```

This is used to connect the application with MongoDB database.

---

# ▶️ Running The Project

Open **3 separate terminals**.

---

## Terminal 1 — Start Node.js Backend

```bash
cd backend
node server.js
```

---

## Terminal 2 — Start FastAPI Server

```bash
cd backend
python main.py
```

---

## Terminal 3 — Start Frontend

```bash
npm run dev
```

---

# 🚀 Application Workflow

- React frontend handles the user interface
- Node.js backend manages APIs and database operations
- FastAPI handles face recognition and AI processing
- MongoDB stores attendance and student data
