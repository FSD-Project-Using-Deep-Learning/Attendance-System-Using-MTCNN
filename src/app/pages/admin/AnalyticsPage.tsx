import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getAttendanceRecords, getStudents, onAttendanceUpdated, type AttendanceRecord, type Student } from "../../services/attendanceService";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dailyData, setDailyData] = useState<{ day: string; present: number; absent: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; attendance: number }[]>([]);
  const [departmentData, setDepartmentData] = useState<{ name: string; value: number }[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<{ student: string; percentage: number }[]>([]);

  const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444"];

  const fetchAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const [allRecords, allStudents] = await Promise.all([
        getAttendanceRecords(),
        getStudents(),
      ]);

      // --- Daily data (last 5 weekdays) ---
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dailyMap: Record<string, { present: number; date: string }> = {};
      const today = new Date();

      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayName = dayNames[d.getDay()];
        dailyMap[dateStr] = { present: 0, date: dayName };
      }

      allRecords.forEach((r) => {
        if (dailyMap[r.date] && r.status === "Present") {
          dailyMap[r.date].present++;
        }
      });

      const totalStudents = allStudents.length || 1;
      setDailyData(
        Object.entries(dailyMap).map(([, val]) => ({
          day: val.date,
          present: val.present,
          absent: Math.max(0, totalStudents - val.present),
        }))
      );

      // --- Monthly data (last 4 months) ---
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyMap: Record<string, { total: number; days: Set<string> }> = {};

      for (let i = 3; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyMap[key] = { total: 0, days: new Set() };
      }

      allRecords.forEach((r) => {
        if (r.status === "Present") {
          const monthKey = r.date.substring(0, 7);
          if (monthlyMap[monthKey]) {
            monthlyMap[monthKey].total++;
            monthlyMap[monthKey].days.add(r.date);
          }
        }
      });

      setMonthlyData(
        Object.entries(monthlyMap).map(([key, val]) => {
          const [year, month] = key.split("-");
          const daysInMonth = val.days.size || 1;
          const avgDaily = val.total / daysInMonth;
          const pct = totalStudents > 0 ? Math.round((avgDaily / totalStudents) * 100) : 0;
          return { month: monthNames[parseInt(month) - 1], attendance: Math.min(100, pct) };
        })
      );

      // --- Department distribution ---
      const deptMap: Record<string, number> = {};
      allStudents.forEach((s) => {
        const dept = s.department || "Unknown";
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });

      setDepartmentData(
        Object.entries(deptMap).map(([name, value]) => ({ name, value }))
      );

      // --- Student performance (top 5 by attendance %) ---
      if (allStudents.length > 0) {
        const totalDays = new Set(allRecords.map((r) => r.date)).size || 1;
        const studentAttMap: Record<string, number> = {};

        allRecords.forEach((r) => {
          if (r.status === "Present") {
            studentAttMap[r.studentName] = (studentAttMap[r.studentName] || 0) + 1;
          }
        });

        const perf = allStudents
          .map((s) => ({
            student: s.name.length > 12 ? s.name.substring(0, 12) + "." : s.name,
            percentage: Math.round(((studentAttMap[s.name] || 0) / totalDays) * 100),
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5);

        setStudentPerformance(perf);
      }
    } catch (err: any) {
      console.error("Analytics error:", err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const off = onAttendanceUpdated(fetchAnalytics);
    return () => off();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
        <span className="ml-3 text-[#64748B]">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">Analytics Dashboard</h2>
          <p className="text-[#64748B]">Attendance statistics and trends</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl text-sm text-[#475569] transition-all font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold">Daily Attendance (Last 5 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="present" fill="#10B981" name="Present" radius={[8, 8, 0, 0]} />
              <Bar dataKey="absent" fill="#EF4444" name="Absent" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold">Monthly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#6366F1"
                strokeWidth={3}
                name="Attendance %"
                dot={{ fill: "#6366F1", r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold">Department-wise Distribution</h3>
          {departmentData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#64748B]">
              No student data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold">Student Attendance Percentage</h3>
          {studentPerformance.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#64748B]">
              No attendance data yet
            </div>
          ) : (
            <div className="space-y-4">
              {studentPerformance.map((student, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[#475569] font-medium">{student.student}</span>
                    <span className="text-sm text-[#0F172A] font-bold">{student.percentage}%</span>
                  </div>
                  <div className="w-full bg-[#E2E8F0] rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        student.percentage >= 90
                          ? "bg-gradient-to-r from-[#10B981] to-[#34D399]"
                          : student.percentage >= 75
                          ? "bg-gradient-to-r from-[#6366F1] to-[#818CF8]"
                          : "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]"
                      }`}
                      style={{ width: `${student.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}