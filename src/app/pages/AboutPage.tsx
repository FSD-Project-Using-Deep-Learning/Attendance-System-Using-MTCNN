import { useNavigate } from "react-router";
import { ArrowLeft, CheckCircle, Scan } from "lucide-react";

const FEATURES = [
  "Real-time Face Recognition",
  "Automated Attendance Logging",
  "Multi-Angle Face Registration",
  "Dataset Augmentation",
  "Admin Control Dashboard",
  "Attendance History Tracking",
  "Duplicate Prevention",
  "Manual Attendance Support",
  "MongoDB Integration",
  "GPU Training Support",
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl text-[#0F172A] font-bold">About Us</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl text-[#0F172A] mb-3 font-bold">
            AI-Based Smart Attendance System
          </h2>
          <p className="text-[#64748B] max-w-2xl mx-auto">
            A comprehensive facial recognition-based attendance management
            system developed for engineering college environments.
          </p>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm mb-8">
          <h3 className="text-2xl text-[#0F172A] mb-4 font-bold">
            Project Description
          </h3>
          <div className="space-y-4 text-[#475569]">
            <p>
              The AI-Based Smart Attendance System leverages deep learning and
              computer vision to automate the student attendance process. The
              system uses <strong>MTCNN (Multi-task Cascaded Convolutional Networks)</strong> for
              real-time face detection and <strong>InceptionResnetV1</strong> for
              high-accuracy facial feature extraction, combined with an{" "}
              <strong>SVM (Support Vector Machine)</strong> classifier for
              identity verification.
            </p>
            <p>
              Students are registered through a multi-angle face capture process
              (5 angles with 5 images each, totaling 25 images per student).
              These images undergo automated dataset augmentation to generate
              approximately 1,500 training samples per student, ensuring robust
              model performance across varying lighting conditions and facial
              expressions.
            </p>
            <p>
              The system features real-time face detection with green bounding
              boxes and instant attendance status overlays. When a face is
              recognized, the student's details (name, USN, branch) are
              displayed in a floating panel within the camera frame. Attendance
              is automatically logged to a <strong>MongoDB</strong> database via
              a Node.js Express backend, with duplicate detection preventing
              multiple entries per student per day.
            </p>
            <p>
              Administrators have full control through a dedicated dashboard that
              supports manual attendance entry, attendance editing, automatic
              absent marking, CSV export, and GPU-accelerated model training
              with overnight batch training capabilities. The system is designed
              to be scalable, secure, and efficient for institutional
              deployment.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm mb-8">
          <h3 className="text-2xl text-[#0F172A] mb-6 font-bold">
            Key Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl"
              >
                <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                <span className="text-[#0F172A] font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <h3 className="text-2xl text-[#0F172A] mb-6 font-bold">
            Technology Stack
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-4 bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-xl">
              <h4 className="text-[#4338CA] mb-2 font-bold">Frontend</h4>
              <ul className="text-sm text-[#475569] space-y-1">
                <li>React + TypeScript</li>
                <li>Tailwind CSS</li>
                <li>React Router</li>
              </ul>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] rounded-xl">
              <h4 className="text-[#065F46] mb-2 font-bold">AI Backend</h4>
              <ul className="text-sm text-[#475569] space-y-1">
                <li>FastAPI (Python)</li>
                <li>MTCNN + InceptionResnetV1</li>
                <li>SVM Classifier</li>
              </ul>
            </div>
            <div className="p-4 bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-xl">
              <h4 className="text-[#92400E] mb-2 font-bold">Database</h4>
              <ul className="text-sm text-[#475569] space-y-1">
                <li>Node.js + Express</li>
                <li>MongoDB</li>
                <li>bcrypt Authentication</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
