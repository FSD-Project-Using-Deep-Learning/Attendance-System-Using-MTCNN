import { API_BASE } from "../config/api";

export interface AttendanceRecord {
  id?: string;
  _id?: string;
  studentName?: string;
  name: string;
  usn: string;
  department: string;
  status: "Present" | "Absent";
  timestamp?: Date;
  date: string;
  time: string;
}

export interface Student {
  id?: string;
  _id?: string;
  name: string;
  usn: string;
  department: string;
  createdAt: Date;
}

// ─── ATTENDANCE ──────────────────────────────────────────────

export const markAttendance = async (
  record: { studentName: string; usn: string; department: string; status: string; date: string; time: string; timestamp?: Date }
): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/mark-attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: record.studentName,
        usn: record.usn,
        department: record.department,
        status: record.status,
        date: record.date,
        time: record.time,
      }),
    });
    const data = await res.json();
    emitAttendanceUpdated();
    if (data.alreadyMarked) return null;
    return data.record?._id || null;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
};

export const getAttendanceRecords = async (
  date?: string,
  department?: string
): Promise<AttendanceRecord[]> => {
  try {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (department && department !== "All") params.set("department", department);

    const res = await fetch(`${API_BASE}/api/attendance?${params}`);
    const data = await res.json();
    return data.map((r: any) => ({
      id: r._id,
      studentName: r.name,
      name: r.name,
      usn: r.usn,
      department: r.department,
      status: r.status,
      date: r.date,
      time: r.time,
      timestamp: r.createdAt ? new Date(r.createdAt) : new Date(),
    }));
  } catch (error) {
    console.error("Error getting attendance records:", error);
    throw error;
  }
};

export const updateAttendanceRecord = async (
  recordId: string,
  updates: Partial<{ status: string; studentName: string; usn: string; department: string; time: string }>
): Promise<void> => {
  try {
    // Map studentName → name for MongoDB schema
    const body: any = { ...updates };
    if (body.studentName) {
      body.name = body.studentName;
      delete body.studentName;
    }
    await fetch(`${API_BASE}/api/attendance/${recordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    emitAttendanceUpdated();
  } catch (error) {
    console.error("Error updating attendance record:", error);
    throw error;
  }
};

export const deleteAttendanceRecord = async (recordId: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/api/attendance/${recordId}`, { method: "DELETE" });
    emitAttendanceUpdated();
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    throw error;
  }
};

// ─── STUDENTS ────────────────────────────────────────────────

export const addStudent = async (student: { name: string; usn: string; department: string; imageCount?: number; createdAt: Date }): Promise<string> => {
  try {
    const res = await fetch(`${API_BASE}/api/add-student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: student.name,
        usn: student.usn,
        department: student.department,
      }),
    });
    const data = await res.json();
    emitAttendanceUpdated();
    return data.student?._id || "";
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
};

export const getStudents = async (): Promise<Student[]> => {
  try {
    const res = await fetch(`${API_BASE}/api/students`);
    const data = await res.json();
    return data.map((s: any) => ({
      id: s._id,
      name: s.name,
      usn: s.usn,
      department: s.department,
      createdAt: new Date(s.createdAt),
    }));
  } catch (error) {
    console.error("Error getting students:", error);
    throw error;
  }
};

export const getStudentByName = async (name: string): Promise<Student | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/students/by-name?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    if (!data) return null;
    return {
      id: data._id,
      name: data.name,
      usn: data.usn,
      department: data.department,
      createdAt: new Date(data.createdAt),
    };
  } catch (error) {
    console.error("Error getting student by name:", error);
    return null;
  }
};

// ─── STATISTICS ──────────────────────────────────────────────

export const getAttendanceStats = async () => {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/stats`);
    return await res.json();
  } catch (error) {
    console.error("Error getting attendance stats:", error);
    throw error;
  }
};

export const getStudentCount = async (): Promise<number> => {
  try {
    const res = await fetch(`${API_BASE}/api/students/count`);
    const data = await res.json();
    return data?.count ?? 0;
  } catch {
    return 0;
  }
};

export const markAllAbsent = async (date?: string): Promise<number> => {
  try {
    const res = await fetch(`${API_BASE}/api/attendance/mark-absent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    const data = await res.json();
    emitAttendanceUpdated();
    return data?.inserted ?? 0;
  } catch (error) {
    console.error("Error marking all absent:", error);
    throw error;
  }
};

// ─── CROSS-PAGE EVENT BUS ────────────────────────────────────
// Emit after any mutation so Dashboard/Attendance/Analytics refetch live.
export const ATTENDANCE_EVENT = "attendance:updated";

export const emitAttendanceUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ATTENDANCE_EVENT));
  }
};

export const onAttendanceUpdated = (handler: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const fn = () => handler();
  window.addEventListener(ATTENDANCE_EVENT, fn);
  return () => window.removeEventListener(ATTENDANCE_EVENT, fn);
};
