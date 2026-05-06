import { CheckCircle, User, Hash, Building2, Clock } from "lucide-react";
import { motion } from "motion/react";

interface StudentDetailsCardProps {
  name: string;
  usn: string;
  department: string;
  time: string;
  onClose: () => void;
}

export default function StudentDetailsCard({
  name,
  usn,
  department,
  time,
  onClose,
}: StudentDetailsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-8 right-8 bg-white rounded-2xl shadow-2xl p-6 max-w-md border-l-4 border-[#10B981] z-50"
    >
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <User className="w-12 h-12 text-[#64748B]" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[#10B981]" />
            <span className="text-[#10B981] font-semibold">Attendance Marked</span>
          </div>

          <h3 className="text-xl text-[#0F172A] mb-3 font-bold">{name}</h3>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[#64748B]">
              <Hash className="w-4 h-4" />
              <span>{usn}</span>
            </div>
            <div className="flex items-center gap-2 text-[#64748B]">
              <Building2 className="w-4 h-4" />
              <span>{department}</span>
            </div>
            <div className="flex items-center gap-2 text-[#64748B]">
              <Clock className="w-4 h-4" />
              <span>{time}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
