// FastAPI Backend Integration for Face Recognition System
const API_BASE_URL = "http://127.0.0.1:8000";

export interface StudentFaceData {
  name: string;
  usn: string;
  images: string[]; // Base64 encoded images
}

export interface RecognitionResult {
  name: string;
  confidence: number;
  isRecognized: boolean;
  timestamp: string;
  bbox?: number[]; // [x, y, width, height] from MTCNN
  face_image?: string; // base64 front-facing image from dataset
}

export interface TrainingStatus {
  status: "idle" | "training" | "completed" | "failed";
  progress: number;
  message: string;
}

// Add new face to the system
export const addFace = async (faceData: StudentFaceData): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/add-face`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(faceData),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error adding face:", error);
    throw new Error("Failed to add face. Make sure FastAPI backend is running.");
  }
};

// Trigger model training
export const trainModel = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/train`, {
      method: "POST",
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error training model:", error);
    throw new Error("Failed to train model. Check backend connection.");
  }
};

// Get training status
export const getTrainingStatus = async (): Promise<TrainingStatus> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training-status`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error getting training status:", error);
    return {
      status: "failed",
      progress: 0,
      message: "Cannot connect to backend",
    };
  }
};

// Recognize face from image
export const recognizeFace = async (imageData: string): Promise<RecognitionResult[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recognize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: imageData }),
    });

    const result = await response.json();
    return result.predictions || [];
  } catch (error) {
    console.error("Error recognizing face:", error);
    return [];
  }
};

// Start live attendance monitoring
export const startLiveAttendance = async (): Promise<{ success: boolean; sessionId: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/start`, {
      method: "POST",
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error starting live attendance:", error);
    throw new Error("Failed to start attendance session");
  }
};

// Stop live attendance monitoring
export const stopLiveAttendance = async (sessionId: string): Promise<{ success: boolean; count: number }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error stopping attendance:", error);
    throw new Error("Failed to stop attendance session");
  }
};

// Check backend health
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
};

// Get registered students count
export const getRegisteredCount = async (): Promise<number> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/students/count`);
    const result = await response.json();
    return result.count || 0;
  } catch (error) {
    console.error("Error getting registered count:", error);
    return 0;
  }
};