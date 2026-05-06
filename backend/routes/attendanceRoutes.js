import express from "express";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";

const router = express.Router();

const todayStr = () => new Date().toISOString().split("T")[0];

router.post("/mark-attendance", async (req, res) => {
  try {
    const { name, usn, department, date, time, status } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: "Name and date are required" });
    }

    const newStatus = status || "Present";

    let finalUsn = usn || "";
    let finalDept = department || "AI & DS";
    if (!finalUsn || !department) {
      const student = await Student.findOne({ name });
      if (student) {
        finalUsn = finalUsn || student.usn;
        finalDept = department || student.department || finalDept;
      }
    }

    const existing = await Attendance.findOne({ name, date });
    if (existing) {
      if (existing.status === "Absent" && newStatus === "Present") {
        existing.status = "Present";
        existing.time = time || new Date().toLocaleTimeString("en-IN");
        if (finalUsn && !existing.usn) existing.usn = finalUsn;
        if (finalDept && !existing.department) existing.department = finalDept;
        await existing.save();
        return res.json({ success: true, message: `Updated to Present for ${name}`, record: existing, updated: true });
      }
      return res.json({
        success: false,
        message: `${name} already logged in on ${date}`,
        alreadyMarked: true,
        record: existing,
      });
    }

    const record = new Attendance({
      name,
      usn: finalUsn,
      department: finalDept,
      date,
      time: time || new Date().toLocaleTimeString("en-IN"),
      status: newStatus,
    });
    await record.save();

    res.json({ success: true, message: `Attendance marked for ${name}`, record });
  } catch (error) {
    if (error?.code === 11000) {
      return res.json({ success: false, message: "Already marked", alreadyMarked: true });
    }
    console.error("Mark attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/attendance/mark-absent", async (req, res) => {
  try {
    const date = req.body?.date || todayStr();
    const students = await Student.find();
    const existing = await Attendance.find({ date }).select("name");
    const marked = new Set(existing.map((r) => r.name));

    const toInsert = students
      .filter((s) => !marked.has(s.name))
      .map((s) => ({
        name: s.name,
        usn: s.usn,
        department: s.department || "AI & DS",
        date,
        time: "—",
        status: "Absent",
      }));

    if (toInsert.length > 0) {
      try {
        await Attendance.insertMany(toInsert, { ordered: false });
      } catch (e) {
        if (e?.code !== 11000) throw e;
      }
    }

    res.json({ success: true, inserted: toInsert.length, date });
  } catch (error) {
    console.error("Mark absent bulk error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const { date, department } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (department && department !== "All") filter.department = department;
    const records = await Attendance.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json([]);
  }
});

router.put("/attendance/:id", async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    res.json({ success: true, record });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/attendance/:id", async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Record deleted" });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/attendance/stats", async (_req, res) => {
  try {
    const today = todayStr();
    const totalStudents = await Student.countDocuments();
    const totalRecords = await Attendance.countDocuments();
    const presentToday = await Attendance.countDocuments({ date: today, status: "Present" });
    const absentRecorded = await Attendance.countDocuments({ date: today, status: "Absent" });
    const untracked = Math.max(0, totalStudents - presentToday - absentRecorded);
    const absentToday = absentRecorded + untracked;
    res.json({ totalStudents, presentToday, absentToday, totalRecords });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ totalStudents: 0, presentToday: 0, absentToday: 0, totalRecords: 0 });
  }
});

export default router;
