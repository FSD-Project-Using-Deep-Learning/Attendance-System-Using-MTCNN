import { useState, useRef, useEffect } from "react";
import {
  Camera,
  UserPlus,
  Check,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Play,
} from "lucide-react";
import {
  addFace,
  trainModel,
  getTrainingStatus,
} from "../../services/faceRecognitionService";
import { addStudent, getStudents } from "../../services/attendanceService";

const CAPTURE_DIRECTIONS = [
  { label: "Look STRAIGHT at camera", key: "Front" },
  { label: "Turn head SLIGHTLY LEFT", key: "Left" },
  { label: "Turn head SLIGHTLY RIGHT", key: "Right" },
  { label: "Tilt head UP slightly", key: "Up" },
  { label: "Tilt head DOWN slightly", key: "Down" },
];

const IMAGES_PER_DIRECTION = 5;
const TOTAL_IMAGES = CAPTURE_DIRECTIONS.length * IMAGES_PER_DIRECTION; // 25

const TRAINING_STAGES = [
  "Capturing Images",
  "Augmenting Dataset",
  "Extracting Embeddings",
  "Training Model",
  "Saving Model",
];

export default function AddFacePage() {
  // Student Information
  const [studentName, setStudentName] = useState("");
  const [studentUSN, setStudentUSN] = useState("");
  const [studentDepartment, setStudentDepartment] = useState("AI & DS");

  // Flow state
  const [step, setStep] = useState<
    | "form"
    | "consent"
    | "capture"
    | "processing"
    | "postCapture"
    | "training"
    | "success"
  >("form");

  // Camera & Capture State
  const [cameraStarted, setCameraStarted] = useState(false);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [currentDirection, setCurrentDirection] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingMessage, setTrainingMessage] = useState("");
  const [currentTrainingStage, setCurrentTrainingStage] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (step === "capture" && !cameraStarted) {
      startCamera();
    }

    return () => {
      if (step !== "capture" && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStarted(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Camera access denied or not available");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStarted(false);
  };

  // Section 8: Duplicate USN prevention
  const handleStartCapture = async () => {
    if (!studentName.trim() || !studentUSN.trim()) {
      setError("Please enter both Name and USN");
      return;
    }
    setError("");

    // Check for duplicate USN
    try {
      const existingStudents = await getStudents();
      const duplicate = existingStudents.find(
        (s) => s.usn.toLowerCase() === studentUSN.trim().toLowerCase()
      );
      if (duplicate) {
        setError("USN already registered. Duplicate registration is not allowed.");
        return;
      }
    } catch (err) {
      // If backend is down, proceed anyway (non-blocking)
      console.warn("Could not check for duplicate USN:", err);
    }

    setStep("consent");
  };

  const handleConsentAgree = () => {
    setStep("capture");
  };

  const handleConsentDecline = () => {
    setStep("form");
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.95);
  };

  const handleCapture = () => {
    const imageData = captureImage();
    if (!imageData) return;

    setIsCapturing(true);
    setCapturedImages((prev) => [...prev, imageData]);

    setTimeout(() => {
      setIsCapturing(false);
      const totalCaptured = capturedImages.length + 1;
      const imagesForCurrentDirection = totalCaptured % IMAGES_PER_DIRECTION;

      if (
        imagesForCurrentDirection === 0 &&
        currentDirection < CAPTURE_DIRECTIONS.length - 1
      ) {
        setCurrentDirection((prev) => prev + 1);
      }

      if (totalCaptured >= TOTAL_IMAGES) {
        // All images captured — send to backend, then show post-capture options
        uploadFaceData();
      }
    }, 300);
  };

  // Upload face data to FastAPI without auto-training (Section 6 & 9)
  const uploadFaceData = async () => {
    setStep("processing");
    setIsProcessing(true);
    setCurrentTrainingStage(0);
    setError("");

    try {
      stopCamera();

      setCurrentTrainingStage(0);
      setTrainingMessage("Images captured successfully");

      setCurrentTrainingStage(1);
      setTrainingMessage("Uploading and augmenting dataset...");

      const result = await addFace({
        name: studentName.trim(),
        usn: studentUSN.trim(),
        images: capturedImages,
      });

      if (result.success) {
        // Save student metadata to MongoDB
        try {
          await addStudent({
            name: studentName.trim(),
            usn: studentUSN.trim(),
            department: studentDepartment,
            imageCount: capturedImages.length,
            createdAt: new Date(),
          });
        } catch (mongoErr) {
          console.error("MongoDB save error (non-fatal):", mongoErr);
        }

        // Show post-capture options instead of auto-training
        setIsProcessing(false);
        setStep("postCapture");
      } else {
        setError(result.message || "Failed to register face");
        setStep("capture");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process face registration");
      setStep("capture");
    } finally {
      setIsProcessing(false);
    }
  };

  // Train model now
  const handleTrainNow = async () => {
    setStep("training");
    setTrainingProgress(0);
    setCurrentTrainingStage(2);
    setTrainingMessage("Extracting embeddings...");

    try {
      const trainResult = await trainModel();

      if (trainResult.success) {
        setCurrentTrainingStage(3);
        setTrainingMessage("Training model...");

        const statusInterval = setInterval(async () => {
          const status = await getTrainingStatus();
          setTrainingProgress(status.progress);
          setTrainingMessage(status.message);

          if (status.progress > 60) setCurrentTrainingStage(3);
          if (status.progress > 90) {
            setCurrentTrainingStage(4);
            setTrainingMessage("Saving model...");
          }

          if (status.status === "completed") {
            clearInterval(statusInterval);
            setCurrentTrainingStage(4);
            setStep("success");
            setTimeout(() => resetForm(), 3000);
          } else if (status.status === "failed") {
            clearInterval(statusInterval);
            setError("Training failed: " + status.message);
            setStep("postCapture");
          }
        }, 1000);
      }
    } catch (err: any) {
      setError("Training error: " + err.message);
      setStep("postCapture");
    }
  };

  // Add another face — reset form but keep training for later
  const handleAddAnother = () => {
    setStudentName("");
    setStudentUSN("");
    setStudentDepartment("AI & DS");
    setCapturedImages([]);
    setCurrentDirection(0);
    setStep("form");
    setError("");
    setCameraStarted(false);
    setTrainingProgress(0);
    setTrainingMessage("");
    setCurrentTrainingStage(0);
  };

  const resetForm = () => {
    handleAddAnother();
  };

  const progress = (capturedImages.length / TOTAL_IMAGES) * 100;

  // ── SUCCESS SCREEN ──
  if (step === "success") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-white rounded-2xl p-12 shadow-lg border border-[#E2E8F0] max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl text-[#0F172A] mb-2 font-bold">
            Registration Successful!
          </h2>
          <p className="text-[#64748B] mb-2">
            {studentName} ({studentUSN}) has been registered
          </p>
          <p className="text-sm text-[#10B981]">
            Model trained and ready for recognition
          </p>
          <p className="text-xs text-[#94A3B8] mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  // ── POST-CAPTURE OPTIONS (Section 6 & 9) ──
  if (step === "postCapture") {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">
            Face Data Saved
          </h2>
          <p className="text-[#64748B]">
            {studentName} ({studentUSN}) — {capturedImages.length} images
            uploaded successfully
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl text-[#0F172A] mb-2 font-bold">
              Images Saved Successfully
            </h3>
            <p className="text-[#64748B]">
              What would you like to do next?
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleAddAnother}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#6366F1]/30"
            >
              <UserPlus className="w-5 h-5" />
              Add Another Face
            </button>

            <button
              onClick={handleTrainNow}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#10B981]/30"
            >
              <Play className="w-5 h-5" />
              Start Training
            </button>
          </div>

          <p className="text-xs text-[#94A3B8] text-center mt-6">
            You can add multiple students before training. Start training
            when you are ready to update the recognition model.
          </p>
        </div>
      </div>
    );
  }

  // ── CONSENT SCREEN ──
  if (step === "consent") {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">Add Face</h2>
          <p className="text-[#64748B]">
            Register a new student for face recognition
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#6366F1] to-[#818CF8] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl text-[#0F172A] mb-2 font-bold">
              Ethical Consent Required
            </h3>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 mb-6">
            <p className="text-[#475569] text-center">
              This system collects facial data for attendance purposes. Your
              consent is required before capturing and storing your images.
            </p>
          </div>

          <div className="bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] border border-[#6366F1]/20 rounded-xl p-4 mb-8">
            <p className="text-sm text-[#4338CA]">
              <strong>Next Steps:</strong> You will capture images from 5
              different angles (5 per angle = 25 total). The system will
              augment these images for training.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleConsentAgree}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#10B981]/30"
            >
              <Check className="w-5 h-5" />I Agree
            </button>
            <button
              onClick={handleConsentDecline}
              className="flex items-center gap-2 px-8 py-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-xl transition-all font-medium"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PROCESSING / TRAINING SCREEN ──
  if (step === "processing" || step === "training") {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">
            {step === "training" ? "Training Model" : "Processing"}
          </h2>
          <p className="text-[#64748B]">
            Registering: {studentName} ({studentUSN})
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <div className="text-center mb-8">
            <Loader2 className="w-16 h-16 text-[#6366F1] animate-spin mx-auto mb-4" />
            <h3 className="text-xl text-[#0F172A] mb-2 font-bold">
              {step === "training"
                ? "Training Model"
                : "Processing Face Data"}
            </h3>
            <p className="text-[#64748B]">{trainingMessage}</p>
          </div>

          <div className="space-y-3 mb-8">
            {TRAINING_STAGES.map((stage, index) => (
              <div key={stage} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    index < currentTrainingStage
                      ? "bg-gradient-to-br from-[#10B981] to-[#34D399]"
                      : index === currentTrainingStage
                      ? "bg-gradient-to-br from-[#6366F1] to-[#818CF8] animate-pulse"
                      : "bg-[#E2E8F0]"
                  }`}
                >
                  {index < currentTrainingStage ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : index === currentTrainingStage ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <span className="text-xs text-[#94A3B8] font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    index <= currentTrainingStage
                      ? "text-[#0F172A] font-medium"
                      : "text-[#94A3B8]"
                  }`}
                >
                  {stage}
                </span>
                {index < currentTrainingStage && (
                  <Check className="w-4 h-4 text-[#10B981] ml-auto" />
                )}
              </div>
            ))}
          </div>

          {step === "training" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#475569] font-medium">
                  Overall Progress
                </span>
                <span className="text-[#0F172A] font-bold">
                  {trainingProgress}%
                </span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#6366F1] to-[#818CF8] transition-all duration-500"
                  style={{ width: `${trainingProgress}%` }}
                />
              </div>
              <p className="text-xs text-[#64748B] mt-2">
                25 images → Augment → ~1500 images → Train
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── FORM SCREEN ──
  if (step === "form") {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">Add Face</h2>
          <p className="text-[#64748B]">
            Register a new student for face recognition
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          <h3 className="text-xl text-[#0F172A] mb-6 font-bold">
            Student Information
          </h3>

          {error && (
            <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                Student Name
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] transition-all"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                USN (University Seat Number)
              </label>
              <input
                type="text"
                value={studentUSN}
                onChange={(e) => setStudentUSN(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] transition-all"
                placeholder="e.g., 1AI21CS001"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-[#475569] mb-2 font-medium">
                Department
              </label>
              <select
                value={studentDepartment}
                onChange={(e) => setStudentDepartment(e.target.value)}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent bg-[#F8FAFC] appearance-none transition-all"
              >
                <option>AI & DS</option>
                <option>Computer Science</option>
                <option>Information Science</option>
                <option>Electronics</option>
              </select>
            </div>

            <div className="bg-gradient-to-r from-[#EEF2FF] to-[#E0E7FF] border border-[#6366F1]/20 rounded-xl p-4">
              <p className="text-sm text-[#4338CA]">
                <strong>Next Steps:</strong> You will capture images from 5
                different angles (5 per angle = 25 total). After capture, you
                can add more students or train the model.
              </p>
            </div>

            <button
              onClick={handleStartCapture}
              className="w-full py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#6366F1]/30"
            >
              Start Face Capture
            </button>

            <div className="relative flex items-center my-2">
              <div className="flex-1 border-t border-[#E2E8F0]" />
              <span className="px-3 text-xs text-[#94A3B8]">or</span>
              <div className="flex-1 border-t border-[#E2E8F0]" />
            </div>

            <button
              onClick={handleTrainNow}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#10B981] to-[#34D399] hover:from-[#059669] hover:to-[#10B981] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#10B981]/30"
            >
              <Play className="w-5 h-5" />
              Start Training
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── CAPTURE SCREEN ──
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl text-[#0F172A] mb-2 font-bold">
          Capturing Face Data
        </h2>
        <p className="text-[#64748B]">
          Registering: {studentName} ({studentUSN})
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-sm">
          {/* Camera Feed */}
          <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden aspect-video mb-6 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <canvas ref={canvasRef} className="hidden" />

            {!cameraStarted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-[#64748B] mx-auto mb-3 animate-pulse" />
                  <p className="text-[#94A3B8]">Starting camera...</p>
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-[#10B981] to-[#34D399] text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Live
            </div>

            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <p className="text-white text-xs font-medium">
                Angle {currentDirection + 1} / {CAPTURE_DIRECTIONS.length} —{" "}
                {CAPTURE_DIRECTIONS[currentDirection].key}
              </p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm p-4 rounded-xl">
              <p className="text-white text-center text-lg font-medium">
                {CAPTURE_DIRECTIONS[currentDirection].label}
              </p>
              <p className="text-[#CBD5E1] text-center text-sm mt-2">
                Image {(capturedImages.length % IMAGES_PER_DIRECTION) + 1} of{" "}
                {IMAGES_PER_DIRECTION}
              </p>
            </div>

            {isCapturing && (
              <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                <div className="bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-full p-6 shadow-2xl">
                  <Check className="w-16 h-16 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#475569] font-medium">
                Capture Progress
              </span>
              <span className="text-[#0F172A] font-bold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300 bg-gradient-to-r from-[#6366F1] to-[#818CF8]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[#64748B] mt-2">
              {capturedImages.length} / {TOTAL_IMAGES} images captured
            </p>
          </div>

          {/* Angle indicators */}
          <div className="flex gap-2 mb-6 justify-center flex-wrap">
            {CAPTURE_DIRECTIONS.map((dir, index) => {
              const dirStart = index * IMAGES_PER_DIRECTION;
              const dirCaptured = Math.min(
                Math.max(capturedImages.length - dirStart, 0),
                IMAGES_PER_DIRECTION
              );
              const isComplete = dirCaptured >= IMAGES_PER_DIRECTION;
              const isCurrent = index === currentDirection;

              return (
                <div
                  key={dir.key}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    isComplete
                      ? "bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 text-[#10B981]"
                      : isCurrent
                      ? "bg-gradient-to-r from-[#6366F1]/10 to-[#818CF8]/10 text-[#6366F1]"
                      : "bg-[#F1F5F9] text-[#94A3B8]"
                  }`}
                >
                  {isComplete && <Check className="w-3 h-3" />}
                  {dir.key} ({dirCaptured}/{IMAGES_PER_DIRECTION})
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleCapture}
              disabled={isCapturing || !cameraStarted}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#4F46E5] hover:to-[#6366F1] disabled:from-[#CBD5E1] disabled:to-[#CBD5E1] text-white rounded-xl transition-all font-medium shadow-lg shadow-[#6366F1]/30"
            >
              <Camera className="w-5 h-5" />
              Capture
            </button>

            <button
              onClick={resetForm}
              className="flex items-center gap-2 px-8 py-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] rounded-xl transition-all font-medium"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}