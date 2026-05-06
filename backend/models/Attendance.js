import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  usn: { type: String, default: "" },
  department: { type: String, default: "AI & DS" },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent"], default: "Present" },
  createdAt: { type: Date, default: Date.now },
});

attendanceSchema.index({ name: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
