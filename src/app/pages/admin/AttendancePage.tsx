import { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Filter,
  Loader2,
  RefreshCw,
  Download,
  Edit3,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Plus,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  getAttendanceRecords,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  markAttendance,
  markAllAbsent,
  onAttendanceUpdated,
  getStudents,
  type AttendanceRecord,
  type Student,
} from "../../services/attendanceService";

export default function AttendancePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    studentName: string;
    usn: string;
    status: "Present" | "Absent";
    time: string;
  }>({ studentName: "", usn: "", status: "Present", time: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Manual attendance state (Section 11)
  const [showManualForm, setShowManualForm] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [manualStudentId, setManualStudentId] = useState("");
  const [manualStatus, setManualStatus] = useState<"Present" | "Absent">("Present");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [savingManual, setSavingManual] = useState(false);

  // Auto-absent state (Section 12)
  const [markingAbsent, setMarkingAbsent] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAttendanceRecords(
        selectedDate || undefined,
        selectedDepartment !== "All" ? selectedDepartment : undefined
      );
      setRecords(data);
    } catch (err: any) {
      console.error("Attendance fetch error:", err);
      setError("Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      console.warn("Could not fetch students:", err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchStudents();
  }, [selectedDate, selectedDepartment]);

  useEffect(() => {
    const off = onAttendanceUpdated(() => {
      fetchRecords();
      fetchStudents();
    });
    return () => off();
  }, [selectedDate, selectedDepartment]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.usn.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const presentCount = filteredRecords.filter((r) => r.status === "Present").length;
  const absentCount = filteredRecords.filter((r) => r.status === "Absent").length;

  const navigateDate = (direction: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + direction);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const formatDisplayDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Edit handlers
  const startEdit = (record: AttendanceRecord) => {
    setEditingId(record.id || null);
    setEditValues({
      studentName: record.studentName || record.name,
      usn: record.usn,
      status: record.status,
      time: record.time,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ studentName: "", usn: "", status: "Present", time: "" });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateAttendanceRecord(editingId, {
        studentName: editValues.studentName,
        usn: editValues.usn,
        status: editValues.status,
        time: editValues.time,
      });
      setEditingId(null);
      await fetchRecords();
    } catch (err: any) {
      setError("Failed to update record: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?"))
      return;
    setDeleting(recordId);
    try {
      await deleteAttendanceRecord(recordId);
      await fetchRecords();
    } catch (err: any) {
      setError("Failed to delete record: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  // Section 11: Manual attendance entry
  const handleManualAttendance = async () => {
    if (!manualStudentId) {
      setError("Please select a student");
      return;
    }

    const student = students.find((s) => s.id === manualStudentId || s.name === manualStudentId);
    if (!student) {
      setError("Student not found");
      return;
    }

    setSavingManual(true);
    setError("");

    try {
      const timeStr = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      await markAttendance({
        studentName: student.name,
        usn: student.usn,
        department: student.department,
        status: manualStatus,
        date: manualDate,
        time: timeStr,
        timestamp: new Date(),
      });

      setShowManualForm(false);
      setManualStudentId("");
      setManualStatus("Present");
      await fetchRecords();
    } catch (err: any) {
      setError("Failed to save manual attendance: " + err.message);
    } finally {
      setSavingManual(false);
    }
  };

  // Section 12: Mark all absent
  const handleMarkAllAbsent = async () => {
    if (
      !confirm(
        `Mark all students without attendance on ${selectedDate} as Absent?`
      )
    )
      return;

    setMarkingAbsent(true);
    setError("");

    try {
      await markAllAbsent(selectedDate);
      await fetchRecords();
    } catch (err: any) {
      setError("Failed to mark absent: " + err.message);
    } finally {
      setMarkingAbsent(false);
    }
  };

  const exportCSV = () => {
    if (filteredRecords.length === 0) return;
    const headers = "Date,Student Name,USN,Department,Status,Time\n";
    const rows = filteredRecords
      .map(
        (r) =>
          `${r.date},${r.studentName || r.name},${r.usn},${r.department},${r.status},${r.time}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${selectedDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">
            Attendance Tracking
          </h2>
          <p className="text-[#64748B]">
            View, manage, and edit attendance records
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-xl text-sm transition-all font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Manual Entry
          </button>
          <button
            onClick={handleMarkAllAbsent}
            disabled={markingAbsent || loading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EF4444] to-[#F87171] hover:from-[#DC2626] hover:to-[#EF4444] disabled:from-[#CBD5E1] disabled:to-[#CBD5E1] text-white rounded-xl text-sm transition-all font-medium shadow-sm"
          >
            {markingAbsent ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
            Mark Absent
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] disabled:from-[#CBD5E1] disabled:to-[#CBD5E1] text-white rounded-xl text-sm transition-all font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl text-sm text-[#475569] transition-all font-medium"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#991B1B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="text-[#EF4444] hover:text-[#DC2626]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual Attendance Form (Section 11) */}
      {showManualForm && (
        <div className="mb-6 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#6366F1]" />
            Manual Attendance Entry
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                Student
              </label>
              <select
                value={manualStudentId}
                onChange={(e) => setManualStudentId(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] appearance-none transition-all"
              >
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.id || s.name} value={s.id || s.name}>
                    {s.name} ({s.usn})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                Date
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                Status
              </label>
              <select
                value={manualStatus}
                onChange={(e) =>
                  setManualStatus(e.target.value as "Present" | "Absent")
                }
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] appearance-none transition-all"
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
            <button
              onClick={handleManualAttendance}
              disabled={savingManual}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] disabled:from-[#CBD5E1] disabled:to-[#CBD5E1] text-white rounded-xl transition-all font-medium shadow-sm"
            >
              {savingManual ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Date Navigation */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-6 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div className="text-center flex-1">
            <p className="text-lg text-[#0F172A] font-bold">
              {formatDisplayDate(selectedDate)}
            </p>
            {selectedDate !== new Date().toISOString().split("T")[0] && (
              <button
                onClick={goToToday}
                className="text-xs text-[#6366F1] hover:text-[#4F46E5] font-medium mt-1"
              >
                Go to Today
              </button>
            )}
          </div>
          <button
            onClick={() => navigateDate(1)}
            disabled={selectedDate >= new Date().toISOString().split("T")[0]}
            className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <p className="text-2xl text-[#0F172A] font-bold">
                  {filteredRecords.length}
                </p>
                <p className="text-xs text-[#64748B]">Total Records</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-2xl text-[#0F172A] font-bold">
                  {presentCount}
                </p>
                <p className="text-xs text-[#64748B]">Present</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] flex items-center justify-center">
                <UserX className="w-5 h-5 text-[#EF4444]" />
              </div>
              <div>
                <p className="text-2xl text-[#0F172A] font-bold">
                  {absentCount}
                </p>
                <p className="text-xs text-[#64748B]">Absent</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] mb-6 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-[#475569] mb-2 font-medium">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or USN"
                className="w-full pl-10 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#475569] mb-2 font-medium">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#475569] mb-2 font-medium">
              Department
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] appearance-none transition-all"
              >
                <option>All</option>
                <option>AI & DS</option>
                <option>Computer Science</option>
                <option>Information Science</option>
                <option>Electronics</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#6366F1] animate-spin" />
            <span className="ml-3 text-[#64748B]">Loading records...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      USN
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredRecords.map((record) => {
                    const isEditing = editingId === record.id;
                    return (
                      <tr
                        key={record.id}
                        className={`transition-colors ${
                          isEditing ? "bg-[#EEF2FF]" : "hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm">
                          {isEditing ? (
                            <input
                              value={editValues.studentName}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  studentName: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-[#6366F1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6366F1] text-sm"
                            />
                          ) : (
                            <span className="text-[#0F172A] font-medium">
                              {record.studentName || record.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isEditing ? (
                            <input
                              value={editValues.usn}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  usn: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-[#6366F1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6366F1] text-sm"
                            />
                          ) : (
                            <span className="text-[#64748B]">
                              {record.usn}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#64748B]">
                          {record.department}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editValues.status}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  status: e.target.value as
                                    | "Present"
                                    | "Absent",
                                }))
                              }
                              className="px-2 py-1 border border-[#6366F1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6366F1] text-sm"
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                record.status === "Present"
                                  ? "bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 text-[#10B981]"
                                  : "bg-gradient-to-r from-[#EF4444]/10 to-[#F87171]/10 text-[#EF4444]"
                              }`}
                            >
                              {record.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isEditing ? (
                            <input
                              value={editValues.time}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  time: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1 border border-[#6366F1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#6366F1] text-sm"
                            />
                          ) : (
                            <span className="text-[#64748B]">
                              {record.time}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg transition-colors disabled:opacity-50"
                                title="Save"
                              >
                                {saving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-[#64748B] hover:bg-[#475569] text-white rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => startEdit(record)}
                                className="p-1.5 text-[#6366F1] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                                title="Edit record"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  record.id && handleDelete(record.id)
                                }
                                disabled={deleting === record.id}
                                className="p-1.5 text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg transition-colors disabled:opacity-50"
                                title="Delete record"
                              >
                                {deleting === record.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-[#64748B] font-medium">
                  No attendance records for this date
                </p>
                <p className="text-sm text-[#94A3B8] mt-1">
                  Records will appear here after face detection sessions
                </p>
              </div>
            )}

            {filteredRecords.length > 0 && (
              <div className="px-6 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-2xl flex items-center justify-between">
                <p className="text-xs text-[#94A3B8]">
                  Showing {filteredRecords.length} record
                  {filteredRecords.length !== 1 ? "s" : ""} for {selectedDate}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {presentCount} present · {absentCount} absent
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
