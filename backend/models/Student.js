import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  usn: { type: String, required: true, unique: true },
  department: { type: String, default: "AI & DS" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Student", studentSchema);
