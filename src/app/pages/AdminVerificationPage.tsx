import { useState } from "react";
import { useNavigate } from "react-router";
import { Scan, User, Lock, Shield, AlertCircle } from "lucide-react";
import { API_BASE } from "../config/api";

export default function AdminVerificationPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/verify-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Invalid admin credentials. Unauthorized access denied.");
        setLoading(false);
        return;
      }

      navigate("/admin/register");
    } catch (err: any) {
      setError("Verification failed. Make sure the backend server is running.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#F59E0B] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#6366F1] rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F59E0B] to-[#FBBF24] mb-4 shadow-2xl shadow-[#F59E0B]/50">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl text-white mb-2 font-bold">Admin Verification</h1>
          <p className="text-[#CBD5E1]">Verify admin credentials to proceed</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 p-4 bg-gradient-to-r from-[#FEF3C7] to-[#FED7AA] border border-[#F59E0B] rounded-xl">
            <p className="text-sm text-[#78350F]">
              <strong>Security Check:</strong> Only authorized personnel with existing admin credentials can create new admin accounts.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">Admin Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent bg-[#F8FAFC] transition-all"
                  placeholder="Enter admin username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">Admin Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent bg-[#F8FAFC] transition-all"
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] hover:from-[#D97706] hover:to-[#F59E0B] disabled:from-[#CBD5E1] disabled:to-[#CBD5E1] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#F59E0B]/30 hover:shadow-xl hover:shadow-[#F59E0B]/40"
            >
              {loading ? "Verifying..." : "Verify Credentials"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/admin/login")}
              className="text-sm text-[#64748B] hover:text-[#0F172A]"
            >
              Back to Login
            </button>
          </div>

          <div className="mt-6 p-3 bg-[#F1F5F9] rounded-xl text-xs text-[#64748B] text-center">
            <p className="mb-1">Use existing admin credentials to verify</p>
            <p className="text-[#94A3B8]">Default: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
