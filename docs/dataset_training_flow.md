# Dataset Creation and Training Pipeline

This document describes how face data is captured, organized, augmented, and
used to train the SVM classifier that powers recognition.

---

## 1. Image Capture

### 1.1 Webcam access in React

The browser streams the webcam via:

```ts
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
videoRef.current.srcObject = stream;
```

Each frame is painted on a hidden `<canvas>` and converted to a JPEG blob:

```ts
canvas.toBlob(blob => upload(blob), "image/jpeg", 0.92);
```

### 1.2 Multi-Angle Capture

To improve robustness, 25 images are captured in **5 poses × 5 frames each**:

1. **Front** — user looks straight at the camera.
2. **Left tilt** — head turned ~30° left.
3. **Right tilt** — head turned ~30° right.
4. **Up tilt** — chin raised slightly.
5. **Down tilt** — chin lowered slightly.

A guided UI prompts the user between poses and shows a countdown overlay so the
frames aren't blurred by motion.

---

## 2. Dataset Folder Structure

All captures are saved server-side by FastAPI:

```
dataset/
├── Pratham/
│   ├── 20260422_100312_0.jpg
│   ├── 20260422_100312_1.jpg
│   └── ...
├── Rahul/
│   └── ...
└── Sneha/
    └── ...
```

- Folder name = student `name` (spaces replaced with `_`).
- Each file is a 160×160 cropped face (MTCNN output).
- The folder count is the **source of truth for Total Students**.

---

## 3. Data Augmentation

To generalize better from only 25 images per student, FastAPI augments each
embedding input with:

| Technique | Purpose |
|---|---|
| Horizontal flip | Symmetric invariance |
| ±10° rotation | Pose robustness |
| Brightness jitter (±20%) | Lighting invariance |
| Gaussian noise (σ ≈ 0.01) | Sensor noise robustness |

Augmentation happens **in-memory** during training. Augmented frames are
**not** written back to disk — this keeps the dataset folder small and the
single source of truth clean.

**Why augmentation?** A linear SVM is a small-data classifier, but FaceNet
embeddings are sensitive to illumination and pose. Augmentation expands the
effective training set ~6× and reduces overfitting.

---

## 4. Embedding Generation (FaceNet)

For each training image:

```python
from facenet_pytorch import InceptionResnetV1
resnet = InceptionResnetV1(pretrained="vggface2").eval()

aligned = mtcnn(img)              # 1 × 3 × 160 × 160
embedding = resnet(aligned)       # 1 × 512  (L2-normalized)
```

- **Model:** `InceptionResnetV1`, pretrained on VGGFace2 (~3.3M images).
- **Output:** 512-dimensional, L2-normalized vector.
- **Property:** Same person ≈ cosine similarity > 0.7; different person ≈ < 0.3.

**Why embeddings?** Raw pixels are high-dimensional (160 × 160 × 3 = 76 800
features) and sensitive to lighting. A 512-D FaceNet embedding is a **compact
identity signature** that is already robust to pose/lighting.

---

## 5. SVM Training

The collected embeddings become the training matrix:

```python
from sklearn.svm import SVC

X = np.stack(all_embeddings)       # (N_samples, 512)
y = np.array(all_labels)           # (N_samples,)

clf = SVC(kernel="linear", probability=True)
clf.fit(X, y)
```

- **Kernel:** linear — FaceNet embeddings are already linearly separable.
- **probability=True** → enables `predict_proba()` for confidence scores.
- Classes = distinct student names.

---

## 6. Model Persistence (.pkl files)

After training, FastAPI pickles two artifacts:

```python
import joblib
joblib.dump(clf,    "model.pkl")   # trained SVM
joblib.dump(labels, "labels.pkl")  # index → student name
```

At startup (or after retraining), FastAPI loads both:

```python
clf    = joblib.load("model.pkl")
labels = joblib.load("labels.pkl")
```

`joblib` (a scikit-learn-aware pickle variant) handles NumPy arrays more
efficiently than plain `pickle`.

---

## 7. End-to-End Training Timeline

```
 1. Admin clicks Train
 2. FastAPI scans  dataset/<name>/
 3. For each image:  MTCNN  →  align  →  FaceNet embed
 4. Stack (X, y)   +   augment
 5. Fit SVC(linear)
 6. Save model.pkl + labels.pkl
 7. Global training_status = "done"
 8. React polls /api/training-status and shows success
```

---

## 8. Key Design Decisions

- **Why SVM (not a full deep classifier)?** With only 5 students × 25 images,
  a CNN would overfit. SVM on top of frozen FaceNet embeddings is the standard
  "small-data face recognition" recipe.
- **Why save only raw captures to disk?** The training folder stays the
  durable truth; any number of augmented epochs can be regenerated at will.
