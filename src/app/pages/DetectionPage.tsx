import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Scan, Activity, Home } from "lucide-react";
import DigitalClock from "../components/DigitalClock";
import LiveRecognition from "../components/LiveRecognition";
import { checkBackendHealth } from "../services/faceRecognitionService";

export default function DetectionPage() {
  const navigate = useNavigate();
  const [backendConnected, setBackendConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkBackend = async () => {
      const isHealthy = await checkBackendHealth();
      setBackendConnected(isHealthy);
      setChecking(false);
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-[#0F172A] font-bold">AI Attendance System</h1>
              <p className="text-xs text-[#64748B]">Real-time Face Detection</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <DigitalClock />
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#6366F1] border border-[#6366F1]/20 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => navigate("/admin/login")}
              className="px-4 py-2 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-lg transition-all text-sm font-medium shadow-md shadow-[#6366F1]/20 hover:shadow-lg hover:shadow-[#6366F1]/30"
            >
              Admin Login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        {/* Backend Status Banner */}
        <div className="mb-6">
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            checking
              ? "bg-[#F8FAFC] border border-[#E2E8F0]"
              : backendConnected
              ? "bg-gradient-to-r from-[#D1FAE5] to-[#A7F3D0] border border-[#10B981]/20"
              : "bg-gradient-to-r from-[#FEE2E2] to-[#FECACA] border border-[#EF4444]/20"
          }`}>
            <Activity className={`w-5 h-5 ${
              checking
                ? "text-[#94A3B8] animate-pulse"
                : backendConnected
                ? "text-[#10B981]"
                : "text-[#EF4444]"
            }`} />
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                checking
                  ? "text-[#64748B]"
                  : backendConnected
                  ? "text-[#065F46]"
                  : "text-[#991B1B]"
              }`}>
                {checking && "Checking FastAPI backend..."}
                {!checking && backendConnected && "FastAPI Backend Connected - Live Recognition Active"}
                {!checking && !backendConnected && "FastAPI Backend Offline - Please start the backend server at http://127.0.0.1:8000"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">Live Attendance Monitoring</h2>
          <p className="text-[#64748B]">AI-powered facial recognition system</p>
        </div>

        {backendConnected ? (
          <LiveRecognition />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FEF3C7] to-[#FED7AA] rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-10 h-10 text-[#F59E0B]" />
            </div>
            <h3 className="text-2xl text-[#0F172A] mb-3 font-bold">Backend Not Connected</h3>
            <p className="text-[#64748B] mb-6 max-w-md mx-auto">
              The facial recognition backend is not running. Please start the FastAPI server to enable live attendance monitoring.
            </p>
            <div className="bg-[#F8FAFC] rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-sm text-[#475569] font-mono">
                python main.py
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
