# ==============================================================================
# TRAINING PIPELINE - Converted from Jupyter Notebook
# ==============================================================================
# Modular functions for: augmentation, dataset loading, embedding extraction,
# SVM training, and model saving.
# All GPU-accelerated via CUDA.
# ==============================================================================

import os
import cv2
import numpy as np
import pickle
from PIL import Image

import torch
import torch.nn as nn
from torchvision import transforms
from facenet_pytorch import MTCNN, InceptionResnetV1

from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report

import albumentations as A

# ==============================================================================
# CONFIGURATION
# ==============================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
AUGMENTED_DIR = os.path.join(BASE_DIR, "dataset_augmented")
EMBEDDINGS_FILE = os.path.join(BASE_DIR, "embeddings.pkl")
SVM_MODEL_FILE = os.path.join(BASE_DIR, "svm_model.pkl")
LABEL_ENCODER_FILE = os.path.join(BASE_DIR, "label_encoder.pkl")

IMG_SIZE = (224, 224)
FACENET_SIZE = 160
BATCH_SIZE = 32
TEST_SIZE = 0.2
RANDOM_STATE = 42
NUM_AUGMENTATIONS = 29  # 50 raw * (29 aug + 1 orig) = 1500 per person
CONFIDENCE_THRESHOLD = 0.70

# Device - prefer CUDA
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[Training Pipeline] Using device: {device}")


# ==============================================================================
# STEP 1: AUGMENTATION
# ==============================================================================

def augment_dataset(dataset_dir: str = DATASET_DIR,
                    augmented_dir: str = AUGMENTED_DIR,
                    num_aug: int = NUM_AUGMENTATIONS,
                    progress_callback=None):
    """
    Augment images for new persons not yet in augmented_dir.
    Each raw image produces (num_aug + 1) versions (original + augmented).
    """
    print(f"\n[Augment] Checking for new un-augmented faces ({num_aug + 1}x per image)...")
    os.makedirs(augmented_dir, exist_ok=True)

    if not os.path.exists(dataset_dir):
        os.makedirs(dataset_dir)
        print("[Augment] No dataset directory found. Created empty one.")
        return

    people = [d for d in sorted(os.listdir(dataset_dir))
              if os.path.isdir(os.path.join(dataset_dir, d))]

    # Advanced augmentation pipeline (from notebook - optimized for twins & harsh conditions)
    transform = A.Compose([
        # Spatial
        A.HorizontalFlip(p=0.5),
        A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.1, rotate_limit=15, p=0.5),
        # Lighting & Color
        A.RandomBrightnessContrast(brightness_limit=0.3, contrast_limit=0.3, p=0.7),
        A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20, p=0.5),
        A.RandomGamma(gamma_limit=(80, 120), p=0.3),
        A.CLAHE(clip_limit=2.0, tile_grid_size=(8, 8), p=0.3),
        A.ToGray(p=0.2),
        # Blur
        A.OneOf([
            A.GaussianBlur(blur_limit=(3, 5), p=1.0),
            A.MotionBlur(blur_limit=(3, 5), p=1.0),
        ], p=0.3),
        # Noise
        A.OneOf([
            A.GaussNoise(var_limit=(10.0, 50.0), p=1.0),
            A.ISONoise(p=1.0),
            A.ImageCompression(quality_lower=60, quality_upper=100, p=1.0),
        ], p=0.4),
    ])

    new_data = False
    total_people = len(people)

    for idx, person in enumerate(people):
        orig_path = os.path.join(dataset_dir, person)
        aug_path = os.path.join(augmented_dir, person)

        if os.path.exists(aug_path):
            continue

        print(f"  [Augment] New person: {person}. Generating augmentations...")
        os.makedirs(aug_path, exist_ok=True)
        new_data = True

        images = [f for f in os.listdir(orig_path)
                  if f.lower().endswith((".png", ".jpg", ".jpeg"))]

        for img_name in images:
            img_path = os.path.join(orig_path, img_name)
            image = cv2.imread(img_path)
            if image is None:
                continue

            # Save original
            cv2.imwrite(os.path.join(aug_path, f"orig_{img_name}"), image)

            # Generate augmented versions
            for i in range(num_aug):
                augmented = transform(image=image)
                cv2.imwrite(os.path.join(aug_path, f"aug_{i}_{img_name}"), augmented["image"])

        if progress_callback:
            progress_callback(int(((idx + 1) / total_people) * 30))  # 0-30% for augmentation

    if not new_data:
        print("  [Augment] No new faces to augment.")
    else:
        print("  [Augment] Augmentation complete.")


# ==============================================================================
# STEP 2: LOAD DATASET
# ==============================================================================

def load_dataset(augmented_dir: str = AUGMENTED_DIR):
    """Load all augmented images and labels. Returns (images, labels, class_names)."""
    print("\n[Load] Loading augmented dataset...")

    all_faces = []
    all_labels = []

    persons = sorted([p for p in os.listdir(augmented_dir)
                      if os.path.isdir(os.path.join(augmented_dir, p))])

    if not persons:
        print("  [Load] No persons found in augmented directory.")
        return np.array([]), np.array([]), []

    for person in persons:
        person_dir = os.path.join(augmented_dir, person)
        images = [f for f in os.listdir(person_dir)
                  if f.lower().endswith((".jpg", ".jpeg", ".png"))]

        for img_name in images:
            img_path = os.path.join(person_dir, img_name)
            image = cv2.imread(img_path)
            if image is not None:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                image = cv2.resize(image, IMG_SIZE)
                all_faces.append(image)
                all_labels.append(person)

    print(f"  [Load] Loaded {len(all_faces)} images across {len(persons)} persons.")

    X = np.array(all_faces, dtype="float32") / 255.0
    y = np.array(all_labels)
    return X, y, persons


# ==============================================================================
# STEP 3: EXTRACT EMBEDDINGS
# ==============================================================================

def extract_embeddings(X_images: np.ndarray, mtcnn_model, resnet_model,
                       batch_size: int = BATCH_SIZE, progress_callback=None):
    """
    Extract 512-d FaceNet embeddings from images using MTCNN + InceptionResnetV1.
    All operations run on CUDA if available.
    Returns (embeddings, valid_indices).
    """
    print(f"\n[Embeddings] Extracting from {len(X_images)} images on {device}...")

    all_embeddings = []
    all_valid_indices = []

    img_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((FACENET_SIZE, FACENET_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])

    total = len(X_images)

    for i in range(0, total, batch_size):
        batch = X_images[i:i + batch_size]
        batch_tensors = []
        batch_indices = []

        for j, img in enumerate(batch):
            img_uint8 = (img * 255.0).astype(np.uint8)
            img_pil = Image.fromarray(img_uint8)
        
            face = mtcnn_model(img_pil)
        
            if face is not None:
        
                # If multiple faces detected → take first face
                if len(face.shape) == 4:
                    face = face[0]
        
                face = face.to(device)
        
                batch_tensors.append(face)
                batch_indices.append(i + j)

        if batch_tensors:
            batch_tensor = torch.stack(batch_tensors)
            with torch.no_grad():
                embeddings = resnet_model(batch_tensor)
            all_embeddings.append(embeddings.cpu().numpy())
            all_valid_indices.extend(batch_indices)

        processed = min(i + batch_size, total)
        print(f"\r  [Embeddings] {processed}/{total}", end="", flush=True)

        if progress_callback:
            # Embeddings = 30-70% of total progress
            pct = 30 + int((processed / total) * 40)
            progress_callback(pct)

    print()

    if not all_embeddings:
        return np.array([]), []

    return np.vstack(all_embeddings), all_valid_indices


# ==============================================================================
# STEP 4: TRAIN SVM
# ==============================================================================

def train_svm(X_train_emb: np.ndarray, y_train: np.ndarray,
              X_test_emb: np.ndarray = None, y_test: np.ndarray = None,
              progress_callback=None):
    """
    Train SVM classifier with GridSearchCV on face embeddings.
    Returns (best_model, label_encoder, accuracy).
    """
    print("\n[SVM] Training with GridSearchCV...")

    if progress_callback:
        progress_callback(75)

    param_grid = {
        "svm__C": [1, 10],
        "svm__gamma": ["scale", "auto"],
    }

    svm_pipeline = Pipeline([
        ("svm", SVC(
            kernel="rbf",
            probability=True,
            random_state=RANDOM_STATE,
        ))
    ])

    grid_search = GridSearchCV(
        estimator=svm_pipeline,
        param_grid=param_grid,
        cv=3,
        n_jobs=-1,
        verbose=1,
    )

    grid_search.fit(X_train_emb, y_train)

    print(f"  [SVM] Best params: {grid_search.best_params_}")
    print(f"  [SVM] Best CV score: {grid_search.best_score_:.4f}")

    best_model = grid_search.best_estimator_

    accuracy = 0.0
    if X_test_emb is not None and y_test is not None and len(X_test_emb) > 0:
        y_pred = best_model.predict(X_test_emb)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"  [SVM] Test accuracy: {accuracy:.4f}")

        # Classification report
        unique_labels = np.unique(np.concatenate((y_test, y_pred)))
        print("\n" + classification_report(y_test, y_pred, labels=unique_labels))

    if progress_callback:
        progress_callback(90)

    return best_model, accuracy


# ==============================================================================
# STEP 5: SAVE / LOAD MODELS
# ==============================================================================

def save_models(model, label_encoder,
                model_path: str = SVM_MODEL_FILE,
                encoder_path: str = LABEL_ENCODER_FILE,
                embeddings_data: dict = None,
                embeddings_path: str = EMBEDDINGS_FILE):
    """Save trained SVM model, label encoder, and optionally embeddings cache."""
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "label_encoder": label_encoder}, f)
    print(f"  [Save] SVM model -> {model_path}")

    with open(encoder_path, "wb") as f:
        pickle.dump(label_encoder, f)
    print(f"  [Save] Label encoder -> {encoder_path}")

    if embeddings_data:
        with open(embeddings_path, "wb") as f:
            pickle.dump(embeddings_data, f)
        print(f"  [Save] Embeddings cache -> {embeddings_path}")


def load_models(model_path: str = SVM_MODEL_FILE,
                encoder_path: str = LABEL_ENCODER_FILE):
    """Load trained SVM model and label encoder. Returns (model, label_encoder) or (None, None)."""
    if not os.path.exists(model_path):
        print(f"  [Load] Model file not found: {model_path}")
        return None, None

    with open(model_path, "rb") as f:
        data = pickle.load(f)

    model = data.get("model")
    label_encoder = data.get("label_encoder")

    if label_encoder is None and os.path.exists(encoder_path):
        with open(encoder_path, "rb") as f:
            label_encoder = pickle.load(f)

    print(f"  [Load] Model loaded from {model_path}")
    return model, label_encoder


# ==============================================================================
# FULL TRAINING PIPELINE (called by /api/train)
# ==============================================================================

def run_full_pipeline(mtcnn_model, resnet_model, progress_callback=None):
    """
    Execute the complete training pipeline:
    1. Augment dataset
    2. Load dataset
    3. Extract embeddings
    4. Train SVM
    5. Save models
    Returns dict with status info.
    """
    def update(pct):
        if progress_callback:
            progress_callback(pct)

    # Step 1: Augment
    update(5)
    augment_dataset(progress_callback=update)

    # Step 2: Load
    update(30)
    X, y, class_names = load_dataset()

    if len(X) == 0:
        return {"success": False, "message": "No training data found.", "accuracy": 0}

    # Label encode
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=y_encoded,
    )

    print(f"  [Pipeline] Train: {len(X_train)}, Test: {len(X_test)}")

    # Step 3: Extract embeddings
    update(35)
    X_train_emb, train_indices = extract_embeddings(X_train, mtcnn_model, resnet_model,
                                                     progress_callback=update)
    y_train_final = y_train[train_indices]

    X_test_emb, test_indices = extract_embeddings(X_test, mtcnn_model, resnet_model)
    y_test_final = y_test[test_indices]

    if len(X_train_emb) == 0:
        return {"success": False, "message": "No faces detected in training images.", "accuracy": 0}

    # Step 4: Train SVM
    update(70)
    best_model, accuracy = train_svm(X_train_emb, y_train_final,
                                      X_test_emb, y_test_final,
                                      progress_callback=update)

    # Step 5: Save
    update(95)
    save_models(
        model=best_model,
        label_encoder=label_encoder,
        embeddings_data={
            "X_train_emb": X_train_emb,
            "X_test_emb": X_test_emb,
            "y_train": y_train_final,
            "y_test": y_test_final,
            "train_indices": train_indices,
            "test_indices": test_indices,
        },
    )

    update(100)
    return {
        "success": True,
        "message": f"Training complete. Accuracy: {accuracy:.2%}",
        "accuracy": float(accuracy),
        "num_classes": len(class_names),
        "class_names": class_names,
    }
