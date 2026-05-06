# ==============================================================================
# FASTAPI BACKEND - AI Attendance System
# ==============================================================================
# Endpoints:
#   GET  /health
#   POST /api/add-face
#   POST /api/train
#   GET  /api/training-status
#   POST /api/recognize
#   GET  /api/students/count
#   POST /api/attendance/start
#   POST /api/attendance/stop
# ==============================================================================

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

import base64
import numpy as np
import cv2
import os
import io
import uuid
import threading
from datetime import datetime
from PIL import Image

import torch
from facenet_pytorch import MTCNN, InceptionResnetV1

from fastapi import FastAPI # Add this import
from fastapi.responses import FileResponse
import os

# Initialize the app (This fixes the "app is not defined" error)
app = FastAPI() 

DATASET_PATH = "dataset"

@app.get("/api/student-image/{name}")
async def get_student_image(name: str):
    # Path to the specific student's folder
    person_folder_path = os.path.join(DATASET_PATH, name)

    if os.path.exists(person_folder_path) and os.path.isdir(person_folder_path):
        files = [f for f in os.listdir(person_folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        if files:
            files.sort()
            image_path = os.path.join(person_folder_path, files[0])
            return FileResponse(image_path)
            
    return {"error": "Image not found"}, 404

from training_pipeline import (
    run_full_pipeline, load_models, save_models,
    DATASET_DIR, CONFIDENCE_THRESHOLD, FACENET_SIZE, device,
)
from attendance_utils import mark_attendance, get_today_attendance

# ==============================================================================
# APP INIT
# ==============================================================================

app = FastAPI(title="AI Attendance System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# MODEL INITIALIZATION (GPU)
# ==============================================================================

print(f"[Server] Initializing models on {device}...")

mtcnn = MTCNN(
    image_size=FACENET_SIZE,
    margin=0,
    min_face_size=20,
    thresholds=[0.6, 0.7, 0.7],
    factor=0.709,
    post_process=True,
    keep_all=True,
    device=device,
)

resnet = InceptionResnetV1(pretrained="vggface2").eval().to(device)
resnet.classify = False

print(f"[Server] MTCNN initialized on {device}")
print(f"[Server] InceptionResnetV1 loaded (VGGFace2)")

# Load trained SVM model if available
svm_model, label_encoder = load_models()
if svm_model:
    print(f"[Server] SVM model loaded. Classes: {list(label_encoder.classes_)}")
else:
    print("[Server] No trained SVM model found. Train the model first via /api/train")

# Global training status
training_status = {
    "status": "idle",
    "progress": 0,
    "message": "Ready",
}

# Active attendance sessions
active_sessions = {}

# ==============================================================================
# REQUEST MODELS
# ==============================================================================

class StudentFaceData(BaseModel):
    name: str
    usn: str
    images: List[str]  # base64 encoded

class RecognitionRequest(BaseModel):
    image: str  # base64 encoded

class SessionRequest(BaseModel):
    sessionId: str

# ==============================================================================
# HELPER: Decode base64 image
# ==============================================================================

def decode_base64_image(b64_string: str) -> Image.Image:
    """Decode a base64 image string to PIL Image."""
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_data = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(img_data)).convert("RGB")

# ==============================================================================
# ENDPOINTS
# ==============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "device": str(device),
        "model_loaded": svm_model is not None,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }


@app.post("/api/add-face")
async def add_face(data: StudentFaceData):
    """
    Save face images locally for training.
    Frontend sends base64 images captured from multi-angle webcam.
    """
    try:
        person_dir = os.path.join(DATASET_DIR, data.name)
        os.makedirs(person_dir, exist_ok=True)

        saved_paths = []
        for idx, img_b64 in enumerate(data.images):
            img = decode_base64_image(img_b64)
            filename = f"{data.usn}_{idx}.jpg"
            filepath = os.path.join(person_dir, filename)
            img.save(filepath)
            saved_paths.append(filepath)

        print(f"[AddFace] Saved {len(saved_paths)} images for {data.name} ({data.usn})")

        # Student metadata is stored via Node.js -> MongoDB (not here)

        return {
            "success": True,
            "message": f"Registered {len(data.images)} images for {data.name}",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/train")
async def train_model_endpoint():
    """
    Trigger full training pipeline in background thread.
    Augment -> Extract embeddings -> Train SVM -> Save models
    """
    global training_status, svm_model, label_encoder

    if training_status["status"] == "training":
        return {"success": False, "message": "Training already in progress."}

    def _train():
        global training_status, svm_model, label_encoder
        try:
            training_status = {"status": "training", "progress": 0, "message": "Starting..."}

            # Dataset images are stored locally. Training uses local dataset/ folder.
            # Student metadata is in MongoDB via Node.js backend.
            training_status["message"] = "Loading local dataset..."
            training_status["progress"] = 2

            def progress_cb(pct):
                training_status["progress"] = pct
                if pct < 30:
                    training_status["message"] = "Augmenting dataset..."
                elif pct < 70:
                    training_status["message"] = "Extracting embeddings (GPU)..."
                elif pct < 90:
                    training_status["message"] = "Training SVM classifier..."
                else:
                    training_status["message"] = "Saving models..."

            result = run_full_pipeline(mtcnn, resnet, progress_callback=progress_cb)

            if result["success"]:
                # Reload models
                svm_model, label_encoder = load_models()
                training_status = {
                    "status": "completed",
                    "progress": 100,
                    "message": result["message"],
                }
            else:
                training_status = {
                    "status": "failed",
                    "progress": 0,
                    "message": result["message"],
                }

        except Exception as e:
            training_status = {
                "status": "failed",
                "progress": 0,
                "message": f"Training failed: {str(e)}",
            }
            print(f"[Train] ERROR: {e}")

    thread = threading.Thread(target=_train, daemon=True)
    thread.start()

    return {"success": True, "message": "Training started in background."}


@app.get("/api/training-status")
async def get_training_status():
    return training_status


@app.post("/api/recognize")
async def recognize_face(data: RecognitionRequest):
    """
    Recognize faces in a base64 image frame.
    1. Decode base64 -> PIL Image
    2. Detect faces with MTCNN
    3. Extract embeddings with FaceNet
    4. Classify with trained SVM
    5. Mark attendance if recognized
    Returns list of predictions.
    """
    try:
        img_pil = decode_base64_image(data.image)
        predictions = []

        if svm_model is None or label_encoder is None:
            return {"predictions": [{
                "name": "No Model",
                "confidence": 0.0,
                "isRecognized": False,
                "timestamp": datetime.now().isoformat(),
            }]}

        # Detect faces
        boxes, probs = mtcnn.detect(img_pil)

        if boxes is not None:
            # Extract aligned face tensors
            faces = mtcnn(img_pil)

            if faces is not None:
                # Handle single face (unsqueeze if needed)
                if faces.dim() == 3:
                    faces = faces.unsqueeze(0)

                for i, face_tensor in enumerate(faces):
                    face_tensor = face_tensor.to(device)

                    with torch.no_grad():
                        embedding = resnet(face_tensor.unsqueeze(0)).cpu().numpy()

                    # SVM prediction with probability
                    prob = svm_model.predict_proba(embedding)[0]
                    max_prob = float(np.max(prob))
                    pred_class = int(np.argmax(prob))
                    pred_name = label_encoder.inverse_transform([pred_class])[0]

                    is_recognized = max_prob >= CONFIDENCE_THRESHOLD

                    if is_recognized:
                        # Mark attendance (one per day)
                        att_result = mark_attendance(pred_name)
                        print(f"  [Recognize] {pred_name}: {max_prob:.2%} -> {att_result['message']}")

                    predictions.append({
                        "name": pred_name if is_recognized else "Unknown",
                        "confidence": round(max_prob, 4),
                        "isRecognized": is_recognized,
                        "timestamp": datetime.now().isoformat(),
                    })

        return {"predictions": predictions}

    except Exception as e:
        print(f"[Recognize] ERROR: {e}")
        return {"predictions": []}


@app.get("/api/students/count")
async def get_student_count():
    try:
        if not os.path.exists(DATASET_DIR):
            return {"count": 0}
        count = len([d for d in os.listdir(DATASET_DIR)
                     if os.path.isdir(os.path.join(DATASET_DIR, d))])
        return {"count": count}
    except Exception:
        return {"count": 0}


@app.post("/api/attendance/start")
async def start_attendance():
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        "started": datetime.now().isoformat(),
        "count": 0,
    }
    return {"success": True, "sessionId": session_id}


@app.post("/api/attendance/stop")
async def stop_attendance(data: SessionRequest):
    session = active_sessions.pop(data.sessionId, None)
    today = get_today_attendance()
    return {
        "success": True,
        "count": len(today),
    }


# ==============================================================================
# RUN SERVER
# ==============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)