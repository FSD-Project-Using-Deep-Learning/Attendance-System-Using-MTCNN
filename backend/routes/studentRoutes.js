import express from "express";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";

const router = express.Router();

router.post("/add-student", async (req, res) => {
  try {
    const { name, usn, department } = req.body;
    if (!name || !usn) {
      return res.status(400).json({ success: false, message: "Name and USN are required" });
    }
    const student = await Student.findOneAndUpdate(
      { usn },
      { name, usn, department: department || "AI & DS" },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Student saved", student });
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/students/count", async (_req, res) => {
  try {
    const count = await Student.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Student count error:", error);
    res.status(500).json({ count: 0 });
  }
});

router.get("/students", async (_req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error("Get students error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/students/by-name", async (req, res) => {
  try {
    const { name } = req.query;
    const student = await Student.findOne({ name });
    res.json(student || null);
  } catch (error) {
    res.status(500).json(null);
  }
});

router.delete("/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: "Not found" });
    await Attendance.deleteMany({ name: student.name });
    await student.deleteOne();
    res.json({ success: true });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ success: false });
  }
});

export default router;
