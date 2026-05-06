import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import Admin from "./models/Admin.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/attendance_system";
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[MongoDB] Connected successfully");
    await seedDefaultAdmin();
  })
  .catch((err) => console.error("[MongoDB] Connection error:", err));

// Seed default admin (STEP 3)
async function seedDefaultAdmin() {
  try {
    const exists = await Admin.findOne({ username: "admin" });
    if (!exists) {
      const hashed = await bcrypt.hash("admin123", 10);
      await Admin.create({ username: "admin", password: hashed });
      console.log("[Seed] Default admin created (username: admin, password: admin123)");
    } else {
      console.log("[Seed] Default admin already exists");
    }
  } catch (err) {
    console.error("[Seed] Error:", err);
  }
}

// Mount Routes
app.use("/api", adminRoutes);
app.use("/api", studentRoutes);
app.use("/api", attendanceRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
