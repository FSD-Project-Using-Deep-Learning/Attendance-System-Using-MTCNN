import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, UserCheck, AlertCircle, User } from "lucide-react";
import { recognizeFace } from "../services/faceRecognitionService";
import { markAttendance, getStudentByName } from "../services/attendanceService";
import { FASTAPI_BASE } from "../config/api";
import StudentDetailsCard from "./StudentDetailsCard";

const NITTE_LOGO_URL = "/assets/logo.png";

// Replace this URL with your custom logo/image
// Configurable placeholder image URL (Section 5)
const PLACEHOLDER_IMAGE_URL = NITTE_LOGO_URL;

interface RecognizedFace {
  name: string;
  usn: string;
  department: string;
  confidence: number;
  timestamp: string;
  imageUrl: string | null;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectionOverlay {
  name: string;
  bbox: BoundingBox | null;
  status: "marked" | "already";
}

export default function LiveRecognition() {
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [error, setError] = useState("");
  const [attendedToday, setAttendedToday] = useState<Set<string>>(new Set());
  const [frameCount, setFrameCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionOverlay, setDetectionOverlay] = useState<DetectionOverlay | null>(null);
  const [studentCard, setStudentCard] = useState<{
    name: string;
    usn: string;
    department: string;
    time: string;
    imageUrl: string | null;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  // Auto-start on mount (Section 4)
  useEffect(() => {
    startRecognition();
    return () => {
      stopRecognition();
    };
  }, []);

  const startRecognition = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      streamRef.current = stream;
      isActiveRef.current = true;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start recognition loop every 2 seconds
      intervalRef.current = setInterval(async () => {
        if (isActiveRef.current) {
          await processFrame();
        }
      }, 2000);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to access camera. Please allow camera permissions.");
    }
  };

  const stopRecognition = () => {
    isActiveRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const drawBoundingBox = useCallback((bbox: BoundingBox | null, label: string, color: string) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!bbox) return;

    // Scale bbox to canvas
    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);

    const x = bbox.x * scaleX;
    const y = bbox.y * scaleY;
    const w = bbox.width * scaleX;
    const h = bbox.height * scaleY;

    // Green bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Label background
    ctx.font = "bold 16px sans-serif";
    const textWidth = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 28, textWidth + 16, 28);

    // Label text
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(label, x + 8, y - 8);
  }, []);

  const getStudentImageUrl = (name: string): string => {
    // Construct URL for front-facing image from dataset folder served by FastAPI
    return `${FASTAPI_BASE}/api/student-image/${encodeURIComponent(name)}`;
  };

  const processFrame = async () => {
    const frameData = captureFrame();
    if (!frameData) return;

    setFrameCount((prev) => prev + 1);

    try {
      const results = await recognizeFace(frameData);

      if (results && results.length > 0) {
        setFaceDetected(true);

        for (const result of results) {
          const bbox: BoundingBox | null = result.bbox
            ? { x: result.bbox[0], y: result.bbox[1], width: result.bbox[2], height: result.bbox[3] }
            : null;

          if (result.isRecognized && result.confidence >= 0.95) {
            const alreadyMarked = attendedToday.has(result.name);

            if (alreadyMarked) {
              // Already logged in
              drawBoundingBox(bbox, "Already Logged In", "#EAB308");
              setDetectionOverlay({ name: result.name, bbox, status: "already" });
            } else {
              // New attendance
              drawBoundingBox(bbox, "Attendance Marked", "#10B981");
              setDetectionOverlay({ name: result.name, bbox, status: "marked" });

              // Look up student details
              let usn = "";
              let department = "AI & DS";
              try {
                const student = await getStudentByName(result.name);
                if (student) {
                  usn = student.usn;
                  department = student.department;
                }
              } catch (e) {
                console.error("Student lookup error:", e);
              }

              // Mark attendance in MongoDB
              const today = new Date().toISOString().split("T")[0];
              const timeStr = new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              try {
                await markAttendance({
                  studentName: result.name,
                  usn,
                  department,
                  status: "Present",
                  date: today,
                  time: timeStr,
                  timestamp: new Date(),
                });
              } catch (attErr) {
                console.error("Attendance marking error:", attErr);
              }

              setAttendedToday((prev) => new Set(prev).add(result.name));

              // Show student details card
              const imageUrl = getStudentImageUrl(result.name);
              setStudentCard({
                name: result.name,
                usn,
                department,
                time: timeStr,
                imageUrl,
              });

              setRecognizedFaces((prev) => [
                {
                  name: result.name,
                  usn,
                  department,
                  confidence: result.confidence,
                  timestamp: timeStr,
                  imageUrl,
                },
                ...prev.slice(0, 19),
              ]);

              // Clear student card after 5 seconds
              setTimeout(() => {
                setStudentCard(null);
              }, 5000);
            }

            // Clear overlay after 3 seconds
            setTimeout(() => {
              setDetectionOverlay(null);
              if (overlayCanvasRef.current) {
                const ctx = overlayCanvasRef.current.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
              }
            }, 3000);
          }
        }
      } else {
        setFaceDetected(false);
        // Clear bounding box
        if (overlayCanvasRef.current) {
          const ctx = overlayCanvasRef.current.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
        }
      }
    } catch (err) {
      console.error("Recognition error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Feed */}
      <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden aspect-video shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay canvas for bounding boxes */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Placeholder image when no face detected (Sections 3, 4, 5) */}
        {!faceDetected && (
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={PLACEHOLDER_IMAGE_URL}
              alt="Placeholder"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          Live Recognition
        </div>

        {/* Attendance status overlay (Section 2 & 9) */}
        {detectionOverlay && (
          <div
            className={`absolute bottom-4 left-4 right-4 p-4 rounded-xl shadow-2xl ${
              detectionOverlay.status === "marked"
                ? "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white"
                : "bg-gradient-to-r from-[#EAB308] to-[#FACC15] text-[#422006]"
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6" />
              <div>
                <p className="font-bold text-lg">{detectionOverlay.name}</p>
                <p className="text-sm opacity-90">
                  {detectionOverlay.status === "marked" ? "Attendance Marked" : "Already Logged In"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p className="text-white text-sm font-medium">
            Present Today: {attendedToday.size}
          </p>
        </div>

        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <p className="text-[#94A3B8] text-xs">Frames: {frameCount}</p>
        </div>
      </div>

      {/* Student Details Card (Section 3) */}
      {studentCard && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-lg">
          <div className="flex items-center gap-6">
            {/* Student Image */}
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] flex-shrink-0 shadow-md">
              <img
                src={studentCard.imageUrl || ""}
                alt={studentCard.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>';
                }}
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[#10B981] text-sm font-medium">Recognized</span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[#0F172A]">
                  <span className="text-[#64748B] text-sm">Name:</span>{" "}
                  <span className="font-bold">{studentCard.name}</span>
                </p>
                <p className="text-[#0F172A]">
                  <span className="text-[#64748B] text-sm">USN:</span>{" "}
                  <span className="font-bold">{studentCard.usn || "N/A"}</span>
                </p>
                <p className="text-[#0F172A]">
                  <span className="text-[#64748B] text-sm">Branch:</span>{" "}
                  <span className="font-bold">{studentCard.department}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Recent Recognitions */}
      {recognizedFaces.length > 0 && (() => {
        // Deduplicate: show each student only once (Section 10)
        const uniqueFaces = recognizedFaces.filter(
          (face, index, arr) => arr.findIndex((f) => f.name === face.name) === index
        );
        return (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg text-[#0F172A] mb-4 font-bold">
            Today's Attendance ({uniqueFaces.length} students)
          </h3>
          <div className="space-y-3">
            {uniqueFaces.map((face) => (
              <div
                key={face.name}
                className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[#0F172A] font-medium">{face.name}</p>
                    <p className="text-xs text-[#64748B]">
                      {face.usn ? `${face.usn} · ` : ""}{face.department} · {face.timestamp}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 text-[#10B981] font-medium">
                    {Math.round(face.confidence * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}