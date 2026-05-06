# YOLO vs MTCNN Face Detection Workflow

Face detection is the **first stage** of the recognition pipeline. This project
compares two detectors: **MTCNN** (the default) and **YOLO** (a faster
alternative). This document explains how each works, how they differ, and why
both are evaluated.

---

## 1. MTCNN (Multi-Task Cascaded Convolutional Networks)

### 1.1 How it works

MTCNN uses a **three-stage cascade** of shallow CNNs, each rejecting non-face
regions early:

| Stage | Network | Role |
|---|---|---|
| P-Net | Proposal Network | Scans the image pyramid for candidate face boxes |
| R-Net | Refinement Network | Filters false positives, refines bounding boxes |
| O-Net | Output Network | Outputs final box + 5 facial landmarks |

### 1.2 Pipeline

```
Input image
 → Image pyramid (multi-scale)
 → P-Net: candidate boxes + bounding-box regression
 → R-Net: NMS + box refinement
 → O-Net: final boxes + landmarks (eyes, nose, mouth corners)
 → Aligned face crop (160×160) for FaceNet
```

### 1.3 Strengths

- Very **accurate** on frontal and near-frontal faces.
- Emits **5 landmarks** — makes downstream face alignment trivial.
- No training data required (pretrained).

### 1.4 Weaknesses

- **Slow** at high resolution (cascade + image pyramid).
- Struggles on **heavy occlusion** and **extreme angles** (> 60°).

---

## 2. YOLO (You Only Look Once)

### 2.1 How it works

YOLO is a **single-stage** object detector. It divides the input into a grid
and predicts all bounding boxes + class probabilities in **one forward pass**.

### 2.2 Pipeline

```
Input image (e.g., 640×640)
 → Single CNN forward pass
 → Grid of anchor boxes + class scores
 → Non-Maximum Suppression
 → Face bounding boxes (no landmarks)
```

### 2.3 Strengths

- **Very fast** — suitable for real-time video.
- Handles **occlusion and profile faces** better than MTCNN.
- Scales to multi-face scenes (classrooms) with almost no slowdown.

### 2.4 Weaknesses

- No facial landmarks → alignment must be handled separately.
- Requires a face-specific weights file (e.g., `yolov8n-face.pt`).
- Slightly lower precision on tiny faces compared to MTCNN.

---

## 3. Side-by-Side Comparison

| Dimension | MTCNN | YOLO (YOLOv8-face) |
|---|---|---|
| **Architecture** | 3-stage CNN cascade | 1-stage unified CNN |
| **Speed (720p)** | ~80–120 ms/frame | ~15–25 ms/frame |
| **Accuracy (frontal)** | Excellent | Very good |
| **Accuracy (profile/occluded)** | Moderate | Very good |
| **Real-time capability** | Marginal (~8 FPS) | Excellent (~40 FPS) |
| **Landmarks** | 5 built-in | Not provided |
| **Robustness (lighting, blur)** | Moderate | Strong |
| **Multi-face scenes** | Good but slows | Excellent |
| **Memory footprint** | ~30 MB | ~6–25 MB (n/s/m variants) |

---

## 4. Why Compare Both?

1. **Trade-off study** — Accuracy (MTCNN) vs. latency (YOLO) is a classic
   engineering trade-off worth demonstrating in an academic project.
2. **Deployment flexibility** — The college may deploy on low-spec hardware
   (use YOLO-n) or a GPU server (either works).
3. **Classroom scenes** — Multi-student detection benefits from YOLO's single
   forward pass.
4. **Robustness** — Students wearing caps, masks, or sitting at angles stress
   MTCNN; YOLO holds up better.

---

## 5. Decision Matrix

| Requirement | Recommended Detector |
|---|---|
| Highest accuracy, single front-facing student | **MTCNN** |
| Real-time feed at 25+ FPS | **YOLO** |
| Classroom with 10+ students | **YOLO** |
| CPU-only deployment, needs landmarks | **MTCNN** |

The system keeps MTCNN as the default (higher precision) but can be switched
to YOLO via a configuration flag, enabling quantitative comparison in reports.
