import { useState, useEffect } from "react";
import { Users, UserCheck, UserX, ClipboardList, Loader2, RefreshCw } from "lucide-react";
import { getAttendanceStats, getAttendanceRecords, onAttendanceUpdated, type AttendanceRecord } from "../../services/attendanceService";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    totalRecords: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, records] = await Promise.all([
        getAttendanceStats(),
        getAttendanceRecords(),
      ]);
      setStats(statsData);
      // Show the 5 most recent records
      setRecentAttendance(records.slice(0, 5));
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const off = onAttendanceUpdated(fetchData);
    const poll = window.setInterval(fetchData, 15000);
    return () => {
      off();
      window.clearInterval(poll);
    };
  }, []);

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      bgColor: "bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]",
      textColor: "text-[#6366F1]",
    },
    {
      label: "Present Today",
      value: stats.presentToday.toLocaleString(),
      icon: UserCheck,
      bgColor: "bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0]",
      textColor: "text-[#10B981]",
    },
    {
      label: "Absent Today",
      value: stats.absentToday.toLocaleString(),
      icon: UserX,
      bgColor: "bg-gradient-to-br from-[#FEE2E2] to-[#FECACA]",
      textColor: "text-[#EF4444]",
    },
    {
      label: "Total Records",
      value: stats.totalRecords.toLocaleString(),
      icon: ClipboardList,
      bgColor: "bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A]",
      textColor: "text-[#F59E0B]",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">Dashboard</h2>
          <p className="text-[#64748B]">Overview of attendance data</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-xl text-sm text-[#475569] transition-all font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
          <span className="ml-3 text-[#64748B]">Loading dashboard...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center shadow-sm`}>
                      <Icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                  </div>
                  <div className="text-3xl text-[#0F172A] mb-1 font-bold">{stat.value}</div>
                  <div className="text-sm text-[#64748B] font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm">
            <div className="p-6 border-b border-[#E2E8F0]">
              <h3 className="text-xl text-[#0F172A] font-bold">Recent Attendance</h3>
              <p className="text-sm text-[#64748B] mt-1">Latest face detections</p>
            </div>
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
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-[#64748B] uppercase tracking-wider font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {recentAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#64748B]">
                        No attendance records yet. Start a detection session to record attendance.
                      </td>
                    </tr>
                  ) : (
                    recentAttendance.map((record) => (
                      <tr key={record.id || `${record.studentName}-${record.time}`} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-6 py-4 text-sm text-[#0F172A] font-medium">{record.studentName}</td>
                        <td className="px-6 py-4 text-sm text-[#64748B]">{record.usn}</td>
                        <td className="px-6 py-4 text-sm text-[#64748B]">{record.time}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            record.status === "Present"
                              ? "bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 text-[#10B981]"
                              : "bg-gradient-to-r from-[#EF4444]/10 to-[#F87171]/10 text-[#EF4444]"
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}