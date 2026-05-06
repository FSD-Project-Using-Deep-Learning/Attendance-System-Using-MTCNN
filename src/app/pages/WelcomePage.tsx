import { useNavigate } from "react-router";
import { Scan } from "lucide-react";
import Footer from "../components/Footer";

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#6366F1] rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#F59E0B] rounded-full blur-3xl"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="text-center">
          <div className="mb-12 inline-flex items-center justify-center w-32 h-32 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] shadow-2xl shadow-[#6366F1]/50">
            <Scan className="w-16 h-16 text-white" />
          </div>

          <h1 className="text-6xl mb-4 text-white font-bold bg-gradient-to-r from-white to-[#CBD5E1] bg-clip-text text-transparent">
            AI Attendance System
          </h1>

          <p className="text-xl text-[#CBD5E1] mb-12 max-w-xl mx-auto">
            Facial Recognition Based Student Attendance System
          </p>

          <p className="text-sm text-[#94A3B8] mb-8 font-medium">
            Department of Artificial Intelligence and Data Science
          </p>

          <button
            onClick={() => navigate("/detection")}
            className="px-12 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-xl transition-all text-lg font-medium shadow-lg shadow-[#6366F1]/30 hover:shadow-xl hover:shadow-[#6366F1]/40 hover:scale-105 transform"
          >
            Proceed
          </button>
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}