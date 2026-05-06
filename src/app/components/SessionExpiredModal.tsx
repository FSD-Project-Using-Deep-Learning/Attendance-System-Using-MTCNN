import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface SessionExpiredModalProps {
  onRedirect: () => void;
}

export default function SessionExpiredModal({ onRedirect }: SessionExpiredModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-gradient-to-br from-[#FEF3C7] to-[#FED7AA] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
        </div>

        <h2 className="text-2xl text-[#0F172A] mb-2 font-bold">Session Expired</h2>
        <p className="text-[#64748B] mb-6">Please login again to continue</p>

        <button
          onClick={onRedirect}
          className="px-6 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#6366F1]/30"
        >
          Back to Detection
        </button>
      </motion.div>
    </div>
  );
}
