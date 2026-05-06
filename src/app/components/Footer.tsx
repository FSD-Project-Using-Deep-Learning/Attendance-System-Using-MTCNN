import { Link } from "react-router";

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] border-t border-[#1E293B] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6">
            <Link
              to="/about"
              className="text-[#CBD5E1] hover:text-white transition-colors font-medium"
            >
              About Us
            </Link>
            <Link
              to="/contact"
              className="text-[#CBD5E1] hover:text-white transition-colors font-medium"
            >
              Contact Us
            </Link>
          </div>
        </div>
        <div className="border-t border-[#1E293B] pt-6 text-center space-y-1">
          <p className="text-[#94A3B8] text-sm">
            &copy; 2026 AI Attendance System
          </p>
          <p className="text-[#64748B] text-xs">
            Department of AI & Data Science
          </p>
          <p className="text-[#64748B] text-xs">
            NMAM Institute of Technology
          </p>
        </div>
      </div>
    </footer>
  );
}
