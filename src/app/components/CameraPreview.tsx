import { Camera, ScanFace } from "lucide-react";

interface CameraPreviewProps {
  onFaceDetected?: () => void;
}

export default function CameraPreview({ onFaceDetected }: CameraPreviewProps) {
  return (
    <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden aspect-video max-w-3xl mx-auto shadow-2xl">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <Camera className="w-24 h-24 text-[#475569] mx-auto mb-4" />
          <p className="text-[#64748B]">Camera Feed</p>
          <p className="text-[#475569] text-sm mt-2">Scanning for faces...</p>
        </div>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        Live
      </div>

      <div className="absolute inset-0 border-4 border-[#6366F1]/30 rounded-2xl" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <ScanFace className="w-32 h-32 text-[#6366F1]/40 animate-pulse" />
      </div>
    </div>
  );
}
