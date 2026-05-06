# FastAPI Backend Setup Guide

## Overview
This document explains how to set up the FastAPI backend server for the AI Attendance System with facial recognition capabilities.

## Prerequisites
- Python 3.8 or higher
- CUDA-capable GPU (recommended for faster processing)
- Webcam access

## Installation Steps

### 1. Install Python Dependencies

```bash
pip install fastapi uvicorn python-multipart
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
pip install facenet-pytorch
pip install opencv-python pillow numpy pandas
pip install scikit-learn albumentations
pip install firebase-admin
```

### 2. Create Backend Server

Create a file named `main.py` in your project root:

```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import base64
import numpy as np
import cv2
from PIL import Image
import io
import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
import pickle
import os
from datetime import datetime

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(image_size=160, margin=0, device=device)
resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# Data models
class StudentFaceData(BaseModel):
    name: str
    usn: str
    images: List[str]

class RecognitionRequest(BaseModel):
    image: str

# Global state
training_status = {
    "status": "idle",
    "progress": 0,
    "message": ""
}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "device": str(device)}

@app.post("/api/add-face")
async def add_face(data: StudentFaceData):
    try:
        # Save images to dataset
        person_dir = f"dataset/{data.name}"
        os.makedirs(person_dir, exist_ok=True)
        
        for idx, img_b64 in enumerate(data.images):
            # Decode base64 image
            img_data = base64.b64decode(img_b64.split(',')[1])
            img = Image.open(io.BytesIO(img_data))
            img.save(f"{person_dir}/{data.usn}_{idx}.jpg")
        
        return {"success": True, "message": f"Registered {len(data.images)} images for {data.name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
async def train_model():
    global training_status
    try:
        training_status = {"status": "training", "progress": 10, "message": "Loading dataset..."}
        
        # Load dataset and train model
        # (Implement your training pipeline here based on the notebook code)
        
        training_status = {"status": "completed", "progress": 100, "message": "Training complete"}
        return {"success": True, "message": "Model trained successfully"}
    except Exception as e:
        training_status = {"status": "failed", "progress": 0, "message": str(e)}
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/training-status")
async def get_training_status():
    return training_status

@app.post("/api/recognize")
async def recognize_face(data: RecognitionRequest):
    try:
        # Decode image
        img_data = base64.b64decode(data.image.split(',')[1])
        img = Image.open(io.BytesIO(img_data))
        
        # Detect faces
        boxes, probs = mtcnn.detect(img)
        predictions = []
        
        if boxes is not None:
            # Extract faces and generate embeddings
            faces = mtcnn.extract(img, boxes, None)
            
            if faces is not None:
                for face in faces:
                    with torch.no_grad():
                        embedding = resnet(face.unsqueeze(0).to(device)).cpu().numpy()
                    
                    # Predict using trained SVM model
                    # (Load your trained model and make predictions)
                    
                    predictions.append({
                        "name": "Unknown",  # Replace with actual prediction
                        "confidence": 0.0,
                        "isRecognized": False,
                        "timestamp": datetime.now().isoformat()
                    })
        
        return {"predictions": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/students/count")
async def get_student_count():
    try:
        dataset_dir = "dataset"
        if not os.path.exists(dataset_dir):
            return {"count": 0}
        
        count = len([d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))])
        return {"count": count}
    except Exception as e:
        return {"count": 0}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

### 3. Run the Backend

```bash
python main.py
```

The server will start at `http://127.0.0.1:8000`

### 4. Test the Connection

Visit `http://127.0.0.1:8000/health` in your browser. You should see:
```json
{
  "status": "healthy",
  "device": "cuda:0"  // or "cpu"
}
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status and device info

### Add Face
- **POST** `/api/add-face`
- Body: `{ name, usn, images[] }`
- Stores face images for training

### Train Model
- **POST** `/api/train`
- Triggers model training pipeline

### Training Status
- **GET** `/api/training-status`
- Returns current training progress

### Recognize Face
- **POST** `/api/recognize`
- Body: `{ image }`
- Returns recognized faces with confidence

### Student Count
- **GET** `/api/students/count`
- Returns number of registered students

## Directory Structure

```
project-root/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── training_pipeline.py # DL training (augment, embed, SVM)
│   ├── firebase_config.py   # Firestore integration (no Storage)
│   ├── attendance_utils.py  # CSV + Firestore attendance
│   ├── firestore.rules      # Security rules for Firestore
│   ├── serviceAccountKey.json # Firebase Admin SDK key
│   ├── dataset/             # Raw face images (local only)
│   ├── dataset_augmented/   # Augmented images
│   ├── embeddings.pkl       # Cached embeddings
│   ├── svm_model.pkl        # Trained SVM model
│   ├── label_encoder.pkl    # Label encoder
│   └── attendance.csv       # Local attendance backup
```

## GPU Acceleration

If you have a CUDA-capable GPU:
1. Install CUDA Toolkit 11.8 or higher
2. Install PyTorch with CUDA support
3. The system will automatically use GPU for faster processing

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

### CUDA Out of Memory
- Reduce batch size in training
- Use CPU instead: Set `device = torch.device('cpu')`

### CORS Errors
- Ensure frontend URL is in `allow_origins` list
- Default: `http://localhost:5173` (Vite)

## Integration with Frontend

The React frontend automatically connects to the FastAPI backend at `http://127.0.0.1:8000`. Make sure the backend is running before using face recognition features.

## Next Steps

1. Implement complete training pipeline
2. Add model persistence and loading
3. Integrate Firebase Firestore for student data
4. Add confidence threshold tuning
5. Implement attendance deduplication