Paragraph 1 — Overall System Architecture

Design a frontend user interface that connects to a FastAPI backend running locally on localhost. The FastAPI backend will act as a bridge between the frontend and the Deep Learning facial recognition pipeline. The system will not be hosted online; it will run entirely on a local machine with GPU acceleration. The UI should assume that all requests such as adding faces, training models, and recognizing faces are handled through FastAPI endpoints.

Paragraph 2 — Add Face Feature Integration

The "Add Face" option in the UI must be directly linked to the Add Face code cell from the Deep Learning notebook. When the user clicks Add Face, the frontend should open a camera interface that captures multiple face images of the user. These captured images must be sent to a FastAPI endpoint responsible for running the Add Face pipeline, which includes face detection using MTCNN, augmentation, and embedding generation.

Paragraph 3 — Firestore Data Storage Requirement

When a new face is added, the system must store the user's metadata in Firebase Firestore. The stored data must include the user's Name, USN, and registration timestamp. The frontend should collect Name and USN through input fields before capturing images. Once the face images are processed, the FastAPI backend must save the user details to Firestore automatically and confirm successful registration back to the frontend.

Paragraph 4 — Automatic Training After Face Registration

After a new face is added and stored, the system must automatically retrieve the stored data from Firestore and trigger the Deep Learning training pipeline. The training must include dataset loading, augmentation, embedding generation using InceptionResnetV1, and classifier training using SVM. The frontend should display a progress indicator while training is happening, since the training process will run locally on the laptop GPU.

Paragraph 5 — Recognize Face / Attendance Feature

Design a "Recognize Face" or "Mark Attendance" option that activates the webcam and sends frames continuously to a FastAPI recognition endpoint. The backend will detect faces, generate embeddings, and compare them with trained models. If a match is found, the system must mark the student as Present and store attendance details with a timestamp. The frontend must display the detected name and attendance confirmation in real time.

Paragraph 6 — Localhost-Based System Behavior

All API calls must assume the backend runs on localhost using FastAPI, such as http://127.0.0.1:8000. The system must be optimized for local GPU execution, not cloud deployment. The UI should handle local response times and show loading indicators during heavy operations like training or embedding generation.

Paragraph 7 — UI Flow Requirements

The interface should include the following main sections:

Dashboard
Add Face
Train Model
Recognize Face
Attendance Records

Each section should trigger its respective FastAPI endpoint. Navigation should be simple and optimized for quick access to face registration and attendance marking.

Paragraph 8 — Data Retrieval and Synchronization

Whenever the application starts, the system should retrieve user records from Firestore and ensure that all registered users are available for recognition. The UI should reflect updated data automatically without requiring manual refresh. This ensures that newly added faces are always included in the recognition pipeline.

Paragraph 9 — Camera and GPU Workflow Expectations

The frontend camera component must support real-time video capture. The backend processing should utilize GPU acceleration for faster inference and training. The UI should visually indicate when the camera is active and when processing is ongoing to prevent user confusion during computation-heavy tasks.

Paragraph 10 — Error Handling and Status Feedback

Design the UI to handle backend responses such as:

Face not detected
Duplicate face detected
Training in progress
Firestore save successful
Recognition successful

The interface should display clear status messages and success confirmations to ensure smooth user interaction.
# ==============================================================================
# PROJECT REFERENCE: FACIAL RECOGNITION PIPELINE TECH STACK
# ==============================================================================
# 
# 1. DEEP LEARNING ARCHITECTURES (CNNs)
# ---------------------------------------------------------
# * MTCNN (Multi-task Cascaded Convolutional Networks): 
#   - Used as the Face Detector.
#   - Upgraded with `keep_all=True` to detect MULTIPLE faces simultaneously.
#   - It locates faces in the raw image, extracts exact bounding box coordinates, 
#     and crops them out perfectly.
#
# * Inception-ResNet-v1:
#   - Used as the Feature Extractor.
#   - Pre-trained on the 'VGGFace2' dataset.
#   - It takes the cropped faces from MTCNN and converts each into a 
#     512-dimensional numerical array (an "embedding") representing 
#     unique facial features.
#
# 2. MACHINE LEARNING CLASSIFIER
# ---------------------------------------------------------
# * SVM (Support Vector Machine):
#   - Used to classify the 512-dimensional embeddings into specific people.
#   - Utilizes `predict_proba` alongside a dynamic Confidence Threshold. 
#     *Note: While typically high (0.90+), the threshold is lowered (e.g., ~0.80) 
#     when the dataset contains identical/similar twins to prevent false "Unknown" 
#     rejections due to highly overlapping facial embeddings.*
#   - Optimized using GridSearchCV to find the best hyperparameters 
#     ('svm__C' and 'svm__gamma') for the RBF kernel pipeline.
#
# 3. CORE LIBRARIES & TOOLS
# ---------------------------------------------------------
# * PyTorch (torch) & facenet-pytorch: Powered the deep learning CNN models 
#   and handled GPU (CUDA) acceleration.
# * Scikit-Learn (sklearn): Handled the LabelEncoding, SVM classification, 
#   GridSearchCV, and performance metrics (accuracy, classification report).
# * Streamlit: Used to generate the interactive web application interface (app.py).
# * Pandas (pd): Handled the creation, formatting, and deduplication of the 
#   daily 'attendance.csv' records.
# * OpenCV (cv2): Handled image reading/writing, color conversions (BGR to RGB), 
#   the live webcam feed, and the interactive on-screen UI (including 
#   duplicate registration prevention).
# * Albumentations: Powered the data augmentation (flipping, rotating, 
#   brightness/contrast) to synthetically expand the training dataset.
# * NumPy & PIL (Pillow): Handled the mathematical array transformations 
#   and image formatting required to feed data into the neural networks safely.
#
# ==============================================================================

# ============================================================
# ATTENDANCE MONITORING SYSTEM - Face Recognition
# ============================================================

import os
import sys
import numpy as np
import pandas as pd
import cv2
from PIL import Image
import pickle
import warnings
warnings.filterwarnings('ignore')

# Deep Learning
import torch
import torch.nn as nn
from torchvision import transforms

# Face Recognition
from facenet_pytorch import MTCNN, InceptionResnetV1

# Data Processing
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns

# Augmentation
import albumentations as A
from albumentations.pytorch import ToTensorV2

# ============================================================
# CONFIGURATION
# ============================================================

# Paths
BASE_DIR = r"C:\Users\Pratham M Prabhu\Desktop\Attendance_System - Pratham"  # CHANGE THIS
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
AUGMENTED_DIR = os.path.join(BASE_DIR, "dataset_augmented")
EMBEDDINGS_FILE = os.path.join(BASE_DIR, "embeddings.pkl")
MODEL_FILE = os.path.join(BASE_DIR, "svm_model.pkl")
ATTENDANCE_FILE = os.path.join(BASE_DIR, "attendance.csv")

# Create directories
os.makedirs(AUGMENTED_DIR, exist_ok=True)

# Augmentation flag - THIS IS THE KEY SOLUTION
AUGMENTATION_COMPLETED = os.path.exists(os.path.join(AUGMENTED_DIR, ".augmentation_complete"))

# Hyperparameters
IMG_SIZE = 160  # FaceNet input size
BATCH_SIZE = 32
TEST_SIZE = 0.2
RANDOM_STATE = 42
NUM_AUGMENTATIONS = 19  # Each image + 19 augmented = 20 total
CONFIDENCE_THRESHOLD = 0.70

# Device configuration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

# ==============================================================================
# STEP 1.5: INTERACTIVE FACE REGISTRATION (IN-WINDOW UI) & SMART AUGMENTATION
# ==============================================================================
import os
import cv2
import albumentations as A
import numpy as np

def capture_new_face(dataset_dir):
    """Opens webcam, allows on-screen typing, and guides user to capture face."""
    
    # 1. Ensure we know EXACTLY where this folder is going
    abs_dataset_dir = os.path.abspath(dataset_dir)
    print("=" * 60)
    print(f"FACE REGISTRATION (Saving to: {abs_dataset_dir})")
    print("=" * 60)
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot access webcam.")
        return False

    name = ""
    input_mode = True
    warning_msg = ""  # <-- NEW: Variable to hold our warning message
    
    # ---------------------------------------------------------
    # PHASE 1: IN-WINDOW TEXT INPUT
    # ---------------------------------------------------------
    print("Please type the new person's name directly in the webcam window...")
    while input_mode:
        ret, frame = cap.read()
        if not ret: break
        
        display_frame = frame.copy()
        
        # Draw a dark semi-transparent box for readability
        overlay = display_frame.copy()
        # Increased the box height slightly to fit the warning text
        cv2.rectangle(overlay, (20, 20), (600, 150), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, display_frame, 0.3, 0, display_frame)
        
        # Draw Instructions and User Input
        cv2.putText(display_frame, "Type Name & Press ENTER (Press ESC to cancel):", (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(display_frame, name + "_", (30, 95), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        
        # <-- NEW: Display the warning message in red if it exists
        if warning_msg:
            cv2.putText(display_frame, warning_msg, (30, 135), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
        
        cv2.imshow("Register New Face", display_frame)
        
        key = cv2.waitKey(1)
        if key != -1: # If a key was actually pressed
            warning_msg = "" # Clear the warning the moment they start typing again
            
            if key in [13, 10]:  # ENTER key
                clean_name = name.strip()
                if clean_name: # Don't allow empty names
                    # <-- NEW: Check if the folder already exists
                    check_path = os.path.join(abs_dataset_dir, clean_name)
                    if os.path.exists(check_path):
                        warning_msg = f"'{clean_name}' already exists! Type a new name."
                    else:
                        input_mode = False # Proceed to phase 2
            elif key in [8, 127]:  # BACKSPACE key
                name = name[:-1]
            elif key == 27:  # ESC key
                print("Registration cancelled by user.")
                cap.release()
                cv2.destroyAllWindows()
                return False
            elif 32 <= key <= 126:  # Printable characters (A-Z, a-z, 0-9, space)
                name += chr(key)

    # Sanitize name and create folder
    name = name.strip()
    person_dir = os.path.join(abs_dataset_dir, name)
    os.makedirs(person_dir, exist_ok=True)
    print(f"\nCreated folder for '{name}' at: {person_dir}")

    # ---------------------------------------------------------
    # PHASE 2: GUIDED IMAGE CAPTURE
    # ---------------------------------------------------------
    directions = [
        ("Look STRAIGHT at camera", 10),
        ("Turn head SLIGHTLY LEFT <--", 10),
        ("Turn head SLIGHTLY RIGHT -->", 10),
        ("Tilt head UP ^", 10),
        ("Tilt head DOWN v", 10)
    ]
    
    direction_idx = 0
    img_count = 0
    
    while direction_idx < len(directions):
        instruction, target_count = directions[direction_idx]
        
        ret, frame = cap.read()
        if not ret: break
            
        display_frame = frame.copy()
        
        # Draw Capture UI
        cv2.putText(display_frame, instruction, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.putText(display_frame, f"Captured: {img_count} / {target_count}", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(display_frame, "Press 'c' to Capture photo", (30, 400), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_frame, "Press 'q' to Quit early", (30, 440), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow("Register New Face", display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('c'):
            img_path = os.path.join(person_dir, f"{name}_{direction_idx}_{img_count}.jpg")
            cv2.imwrite(img_path, frame)
            img_count += 1
            print(f"  -> Saved: {img_path}")
            
            if img_count >= target_count:
                direction_idx += 1
                img_count = 0 
                
        elif key == ord('q'):
            print("Capture cancelled by user.")
            break
            
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n✓ Successfully captured raw faces for {name}.")
    return True


def smart_augment(dataset_dir, augmented_dir, num_aug=29):
    """
    Augments folders that exist in dataset_dir but NOT in augmented_dir.
    num_aug=29 will generate 1500 total images per person (assuming 50 raw images).
    """
    print(f"\nChecking for new un-augmented faces to generate {num_aug + 1}x variations...")
    
    if not os.path.exists(dataset_dir):
        os.makedirs(dataset_dir)
        
    people = [d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))]
    
    # ADVANCED AUGMENTATION PIPELINE FOR TWINS & HARSH CONDITIONS
    transform = A.Compose([
        # 1. Spatial Transformations (Slight angles to simulate head movements)
        A.HorizontalFlip(p=0.5),
        A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.1, rotate_limit=15, p=0.5),
        
        # 2. Lighting & Color (Forces model to ignore shadows and rely on facial structure)
        A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.7),
        A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20, p=0.5),
        A.RandomGamma(gamma_limit=(80, 120), p=0.3),
        A.CLAHE(clip_limit=2.0, tile_grid_size=(8, 8), p=0.3), # Histogram equalization for harsh shadows
        A.ToGray(p=0.2), # Grayscaling to force reliance on structure over skin tone
        
        # 3. Blur & Focus Issues (Simulates bad webcams or movement)
        A.OneOf([
            A.GaussianBlur(blur_limit=(3, 5), p=1.0),
            A.MotionBlur(blur_limit=(3, 5), p=1.0),
        ], p=0.3),
        
        # 4. Noise & Compression (Simulates low-light sensor noise)
        A.OneOf([
            A.GaussNoise(var_limit=(10.0, 50.0), p=1.0),
            A.ISONoise(p=1.0),
            A.ImageCompression(quality_lower=60, quality_upper=100, p=1.0),
        ], p=0.4)
    ])
    
    new_data_processed = False
    
    for person in people:
        orig_path = os.path.join(dataset_dir, person)
        aug_path = os.path.join(augmented_dir, person)
        
        if not os.path.exists(aug_path):
            print(f"  ↳ New person detected: {person}. Generating {num_aug} augmentations per image...")
            os.makedirs(aug_path, exist_ok=True)
            new_data_processed = True
            
            images = [f for f in os.listdir(orig_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            
            for img_name in images:
                img_path = os.path.join(orig_path, img_name)
                image = cv2.imread(img_path)
                if image is None: continue
                
                # Save the original image
                cv2.imwrite(os.path.join(aug_path, f"orig_{img_name}"), image)
                
                # Generate 'num_aug' augmented versions
                for i in range(num_aug):
                    augmented = transform(image=image)
                    cv2.imwrite(os.path.join(aug_path, f"aug_{i}_{img_name}"), augmented['image'])
                    
    if not new_data_processed:
        print("  ✓ No new faces to augment. Skipping to save time.")
    else:
        print("  ✓ Augmentation complete for new users.")

# ==============================================================================
# EXECUTE WORKFLOW
# ==============================================================================
# 1. Run the interactive capture
capture_new_face(DATASET_DIR)

# 2. Augment to reach ~1500 images per person
# Note: 50 raw images * (29 augmented + 1 original) = 1500 images
NUM_AUGMENTATIONS = 29 
smart_augment(DATASET_DIR, AUGMENTED_DIR, NUM_AUGMENTATIONS)

# ============================================================
# STEP 2: LOAD AUGMENTED DATASET
# ============================================================
import cv2
import os
import numpy as np

# Define your standard model input size
IMG_SIZE = (224, 224) 

def load_dataset():
    """Load all augmented images and labels."""
    print("=" * 60)
    print("LOADING: Loading augmented dataset...")
    print("=" * 60)
    
    all_faces = []
    all_labels = []
    
    persons = sorted([p for p in os.listdir(AUGMENTED_DIR) 
                      if os.path.isdir(os.path.join(AUGMENTED_DIR, p))])
    
    for person in persons:
        person_dir = os.path.join(AUGMENTED_DIR, person)
        images = [f for f in os.listdir(person_dir) 
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        for img_name in images:
            img_path = os.path.join(person_dir, img_name)
            image = cv2.imread(img_path)
            
            if image is not None:
                # 1. Convert color
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                # 2. FORCE RESIZE to make every image identical in shape
                image = cv2.resize(image, IMG_SIZE)
                
                all_faces.append(image)
                all_labels.append(person)
    
    print(f"  Loaded {len(all_faces)} images")
    print(f"  Persons: {persons}")
    
    # Class distribution
    unique, counts = np.unique(all_labels, return_counts=True)
    print("\n  Class distribution:")
    for name, count in zip(unique, counts):
        print(f"    {name}: {count} images")
    
    return all_faces, all_labels, persons

all_faces, all_labels, class_names = load_dataset()

# Convert to numpy arrays - This will now work flawlessly!
X_images = np.array(all_faces)
y_labels = np.array(all_labels)

# Normalize pixel values (highly recommended for neural networks)
X_images = X_images.astype('float32') / 255.0

print(f"\nDataset shape: {X_images.shape}")

# ============================================================
# STEP 3: TRAIN/TEST SPLIT
# ============================================================

# Stratified split
X_train, X_test, y_train, y_test = train_test_split(
    X_images, y_labels,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y_labels
)

print("=" * 60)
print("TRAIN/TEST SPLIT")
print("=" * 60)
print(f"Training set: {len(X_train)} images")
print(f"Test set: {len(X_test)} images")

# Verify stratification
print("\nTraining set distribution:")
unique, counts = np.unique(y_train, return_counts=True)
for name, count in zip(unique, counts):
    print(f"  {name}: {count}")

print("\nTest set distribution:")
unique, counts = np.unique(y_test, return_counts=True)
for name, count in zip(unique, counts):
    print(f"  {name}: {count}")

# ============================================================
# STEP 4: LABEL ENCODING
# ============================================================

label_encoder = LabelEncoder()
y_train_enc = label_encoder.fit_transform(y_train)
y_test_enc = label_encoder.transform(y_test)

print("=" * 60)
print("LABEL ENCODING")
print("=" * 60)
print("Label mapping:")
for idx, name in enumerate(label_encoder.classes_):
    print(f"  {idx}: {name}")

# Save label encoder
with open(os.path.join(BASE_DIR, "label_encoder.pkl"), "wb") as f:
    pickle.dump(label_encoder, f)

print(f"\n✓ Label encoder saved to: {os.path.join(BASE_DIR, 'label_encoder.pkl')}")

# ============================================================
# STEP 5: EMBEDDING EXTRACTION
# ============================================================

# Initialize FaceNet model
print("=" * 60)
print("INITIALIZING: FaceNet model...")
print("=" * 60)

mtcnn = MTCNN(
    image_size=160,
    margin=0,
    min_face_size=20,
    thresholds=[0.6, 0.7, 0.7],
    factor=0.709,
    post_process=True,
    device=device
)

resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)

# Remove classification layer to get embeddings
resnet.classify = False

print(f"✓ MTCNN initialized on {device}")
print(f"✓ InceptionResnetV1 loaded (pretrained on VGGFace2)")

def extract_embeddings_batch(images, batch_size=BATCH_SIZE):
    """Extract face embeddings in batches."""
    all_embeddings = []
    all_valid_indices = []
    
    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
    ])
    
    for i in range(0, len(images), batch_size):
        batch = images[i:i+batch_size]
        batch_tensors = []
        batch_indices = []
        
        for j, img in enumerate(batch):
            img_uint8 = (img * 255.0).astype(np.uint8)
            img_pil = Image.fromarray(img_uint8)
            
            face = mtcnn(img_pil)
            
            if face is not None:
                face = face.to(device)
                batch_tensors.append(face)
                batch_indices.append(i + j)
        
        if batch_tensors:
            batch_tensor = torch.stack(batch_tensors)
            
            with torch.no_grad():
                embeddings = resnet(batch_tensor)
            
            all_embeddings.append(embeddings.cpu().numpy())
            all_valid_indices.extend(batch_indices)
        
        processed = min(i + batch_size, len(images))
        print(f"\r  Processing: {processed}/{len(images)} images", end="", flush=True)
    
    print()  
    
    if not all_embeddings:
        return np.array([]), []
        
    return np.vstack(all_embeddings), all_valid_indices

# ==========================================
# NEW: CACHE VALIDATION LOGIC
# ==========================================
cache_valid = False
if os.path.exists(EMBEDDINGS_FILE):
    print("\n✓ Found cached embeddings. Checking validity...")
    with open(EMBEDDINGS_FILE, "rb") as f:
        cached = pickle.load(f)
    
    # Check if the cache matches our current dataset size/classes
    unique_cached_classes = len(np.unique(cached["y_train"]))
    current_classes = len(label_encoder.classes_)
    
    if unique_cached_classes == current_classes:
        cache_valid = True
        X_train_emb = cached["X_train_emb"]
        X_test_emb = cached["X_test_emb"]
        y_train_final = cached["y_train"]
        y_test_final = cached["y_test"]
        print(f"  Loaded {len(X_train_emb)} training, {len(X_test_emb)} test embeddings")
    else:
        print(f"  [!] Cache mismatch ({unique_cached_classes} cached classes vs {current_classes} current classes).")
        print("  [!] Invalidating old cache and regenerating embeddings...")

if not cache_valid:
    print("\nExtracting training embeddings...")
    X_train_emb, train_indices = extract_embeddings_batch(X_train)
    y_train_final = y_train_enc[train_indices]
    
    print("\nExtracting test embeddings...")
    X_test_emb, test_indices = extract_embeddings_batch(X_test)
    y_test_final = y_test_enc[test_indices]
    
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump({
            "X_train_emb": X_train_emb,
            "X_test_emb": X_test_emb,
            "y_train": y_train_final,
            "y_test": y_test_final,
            "train_indices": train_indices,
            "test_indices": test_indices
        }, f)
    
    print(f"\n✓ Embeddings cached to: {EMBEDDINGS_FILE}")

print(f"\nTraining embeddings shape: {X_train_emb.shape}")
print(f"Test embeddings shape: {X_test_emb.shape}")

# ============================================================
# STEP 6: TRAIN SVM CLASSIFIER
# ============================================================

# Required Imports (ADD THESE if not already imported)
import numpy as np
import pickle

from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import accuracy_score, classification_report

# Ensure RANDOM_STATE exists
RANDOM_STATE = 42

print("=" * 60)
print("TRAINING: SVM Classifier with GridSearchCV...")
print("=" * 60)

# Parameter Grid
param_grid = {
    'svm__C': [1, 10],
    'svm__gamma': ['scale', 'auto'], 
}

# Pipeline
svm_pipeline = Pipeline([
    ('svm', SVC(
        kernel='rbf',
        probability=True,
        random_state=RANDOM_STATE
    ))
])

print("Running GridSearchCV (this may take a few minutes)...")

# GridSearch
grid_search = GridSearchCV(
    estimator=svm_pipeline,
    param_grid=param_grid,
    cv=3,
    n_jobs=-1,
    verbose=1
)

# Train model
grid_search.fit(X_train_emb, y_train_final)

print(f"\nBest parameters: {grid_search.best_params_}")
print(f"Best CV score: {grid_search.best_score_:.4f}")

# Best Model
best_model = grid_search.best_estimator_

# Predictions
y_pred = best_model.predict(X_test_emb)

# Accuracy
test_accuracy = accuracy_score(y_test_final, y_pred)

print(f"\n{'=' * 60}")
print("MODEL EVALUATION")
print("=" * 60)
print(f"Test Accuracy: {test_accuracy:.4f}")

# ==========================================
# DYNAMIC CLASSIFICATION REPORT
# ==========================================

print("\nClassification Report:")

# Get only used labels
unique_labels = np.unique(
    np.concatenate((y_test_final, y_pred))
)

# Convert labels to names safely
target_names = label_encoder.inverse_transform(unique_labels)

print(
    classification_report(
        y_test_final,
        y_pred,
        labels=unique_labels,
        target_names=target_names
    )
)

# ==========================================
# SAVE MODEL
# ==========================================

MODEL_FILE = "svm_face_recognition.pkl"

with open(MODEL_FILE, "wb") as f:
    pickle.dump({
        "model": best_model,
        "label_encoder": label_encoder,
    }, f)

print(f"\n✓ Model saved to: {MODEL_FILE}")

# ============================================================
# VISUALIZATION: CONFUSION MATRIX
# ============================================================

cm = confusion_matrix(y_test_final, y_pred)

plt.figure(figsize=(10, 8))
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=label_encoder.classes_,
    yticklabels=label_encoder.classes_
)
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title(f'Confusion Matrix - Test Accuracy: {test_accuracy:.2%}')
plt.tight_layout()
plt.savefig(os.path.join(BASE_DIR, "confusion_matrix.png"), dpi=150)
plt.show()

print(f"\n✓ Confusion matrix saved to: {os.path.join(BASE_DIR, 'confusion_matrix.png')}")

# ============================================================
# STEP 7: ATTENDANCE LOGGING
# ============================================================

from datetime import datetime

def mark_attendance(name):
    """
    Mark attendance for a person.
    Creates one entry per person per day (deduplication).
    """
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    
    # Check if attendance already marked today
    if os.path.exists(ATTENDANCE_FILE):
        df_existing = pd.read_csv(ATTENDANCE_FILE)
        existing = df_existing[
            (df_existing['Name'] == name) & 
            (df_existing['Date'] == today)
        ]
        if not existing.empty:
            print(f"  ↳ {name} already marked present today")
            return False
    else:
        # Create new file with headers
        df_existing = pd.DataFrame(columns=['Name', 'Date', 'Time'])
    
    # Add new entry
    new_entry = pd.DataFrame({
        'Name': [name],
        'Date': [today],
        'Time': [current_time]
    })
    df_updated = pd.concat([df_existing, new_entry], ignore_index=True)
    df_updated.to_csv(ATTENDANCE_FILE, index=False)
    
    print(f"  ✓ Marked present: {name} at {current_time}")
    return True

def show_attendance():
    """Display today's attendance."""
    if os.path.exists(ATTENDANCE_FILE):
        df = pd.read_csv(ATTENDANCE_FILE)
        today = datetime.now().strftime("%Y-%m-%d")
        today_attendance = df[df['Date'] == today]
        print(f"\n📋 Attendance for {today}:")
        print(today_attendance.to_string(index=False))
        return today_attendance
    else:
        print("No attendance records found.")
        return None

# Test attendance function
print("Testing attendance logging:")
mark_attendance(class_names[0])
show_attendance()

# ============================================================
# STEP 8: LIVE WEBCAM INFERENCE (TIMER WITH STRICT RESET)
# ============================================================
import cv2
import torch
from PIL import Image
import numpy as np
import os
import time  
from datetime import datetime
import pickle
from facenet_pytorch import MTCNN

# 1. RAISE THRESHOLD HERE (Try 0.85 or 0.90 to reject unknowns)
CONFIDENCE_THRESHOLD = 0.80 

# Load model for inference
with open(MODEL_FILE, "rb") as f:
    model_data = pickle.load(f)
    
inference_model = model_data["model"]
inference_encoder = model_data["label_encoder"]

# Get the total number of expected attendees based on trained classes
TOTAL_EXPECTED = len(inference_encoder.classes_)

# Re-initialize MTCNN specifically for live inference to allow multiple faces
print("Initializing Multi-Face MTCNN...")
mtcnn_live = MTCNN(
    image_size=160, 
    margin=14, 
    keep_all=True,  
    device=device   
)

def get_live_prediction(frame, mtcnn_model, resnet_model, svm_model, encoder, conf_threshold):
    """Get multiple face predictions with actual bounding boxes."""
    predictions = []
    
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(img_rgb)
    
    boxes, probs = mtcnn_model.detect(img_pil)
    
    if boxes is not None:
        faces = mtcnn_model.extract(img_pil, boxes, None)
        
        if faces is not None:
            for i, face in enumerate(faces):
                with torch.no_grad():
                    embedding = resnet_model(face.unsqueeze(0).to(device)).cpu().numpy()
                
                pred = svm_model.predict(embedding)[0]
                proba = svm_model.predict_proba(embedding)[0]
                
                confidence = proba[pred]
                pred_name = encoder.inverse_transform([pred])[0]
                
                is_recognized = confidence >= conf_threshold
                
                predictions.append({
                    'name': pred_name if is_recognized else "Unknown",
                    'confidence': confidence,
                    'is_recognized': is_recognized,
                    'box': boxes[i].astype(int) 
                })
    
    return predictions

def run_live_attendance():
    print("=" * 60)
    print("LIVE ATTENDANCE SYSTEM (STRICT TIMER RESET)")
    print("=" * 60)
    print(f"Total Enrolled Students: {TOTAL_EXPECTED}")
    print("Press 'q' to quit")
    print("=" * 60)
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot access webcam")
        return
    
    attended_today = set() 
    pending_logs = {}  
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        
        predictions = get_live_prediction(
            frame, mtcnn_live, resnet, 
            inference_model, inference_encoder,
            CONFIDENCE_THRESHOLD
        )
        
        # NEW: Keep track of who we actually see in THIS specific frame
        faces_in_current_frame = set()
        
        for pred in predictions:
            x1, y1, x2, y2 = pred['box']
            name = pred['name']
            conf = pred['confidence']
            
            if pred['is_recognized']:
                # Add to our current frame tracker
                faces_in_current_frame.add(name)
                
                if name in attended_today:
                    # ALREADY LOGGED IN
                    color = (0, 255, 0) # Green
                    label = f"{name} - Logged In"
                else:
                    # NOT YET LOGGED IN - CHECK TIMER
                    current_time = time.time()
                    
                    if name not in pending_logs:
                        pending_logs[name] = current_time
                        
                    time_elapsed = current_time - pending_logs[name]
                    
                    if time_elapsed >= 3.0:
                        # 3 SECONDS HAVE PASSED -> FINALIZE LOG
                        attended_today.add(name)
                        print(f"Logged attendance for {name}")
                        mark_attendance(name) 
                        
                        color = (0, 255, 0) # Green
                        label = f"{name} - Logged In"
                    else:
                        # STILL COUNTING DOWN
                        color = (0, 255, 255) # Yellow
                        label = f"{name} ({conf * 100:.0f}%) - Logging In..."
            else:
                # UNKNOWN
                color = (0, 0, 255) # Red
                label = f"Unknown ({conf * 100:.0f}%)"
            
            # Draw rectangle and label
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            
        # ====================================================
        # NEW: STRICT TIMER RESET LOGIC
        # ====================================================
        # Check everyone who is currently timing down
        for pending_name in list(pending_logs.keys()):
            # If they are NOT in the current frame, and NOT already fully logged in
            if pending_name not in faces_in_current_frame and pending_name not in attended_today:
                # Delete their timer! They have to start over.
                del pending_logs[pending_name]
        # ====================================================
        
        # Display Progress Info
        progress_text = f"Attendees Logged: {len(attended_today)}/{TOTAL_EXPECTED} | Press 'q' to quit"
        cv2.putText(frame, progress_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        cv2.imshow("Attendance System - Live", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()
    print("\n✓ Live attendance stopped")
    print(f"Final Attendance Count: {len(attended_today)}/{TOTAL_EXPECTED}")

# Run it!
run_live_attendance()