# React to FastAPI Connection Workflow

This document explains how the React frontend communicates with the FastAPI AI
backend (running at `http://127.0.0.1:8000`) for face registration, model
training, and face recognition.

---

## 1. Overview

- **Frontend:** React + TypeScript + Tailwind
- **AI Backend:** FastAPI (Python)
- **Transport:** HTTP (JSON + `multipart/form-data`)
- **Client calls:** `fetch()` via `src/app/services/faceRecognitionService.ts`

FastAPI exposes three primary endpoints consumed by the frontend:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/add-face` | `POST` | Save captured images to the dataset folder |
| `/api/train` | `POST` | Train the SVM classifier on FaceNet embeddings |
| `/api/recognize` | `POST` | Detect + recognize faces from a single frame |

---

## 2. Step-by-Step Workflow

### Step 1 — User action in React
The user opens the **Add Face** or **Live Recognition** page. React accesses the
webcam via `navigator.mediaDevices.getUserMedia()` and draws each frame onto a
hidden `<canvas>`.

### Step 2 — Capturing the image
The canvas is serialized to a JPEG blob using
`canvas.toBlob(cb, "image/jpeg", 0.92)`. Raw bytes are never sent as a string;
the blob is wrapped in a `FormData` object.

### Step 3 — Sending the request
The frontend service issues a `fetch` with `FormData`:

```ts
const form = new FormData();
form.append("file", blob, "frame.jpg");
form.append("name", studentName);

await fetch("http://127.0.0.1:8000/api/add-face", {
  method: "POST",
  body: form,
});
```

`Content-Type` is auto-set by the browser with the correct multipart boundary.

### Step 4 — FastAPI receives the image
FastAPI handlers accept `UploadFile`:

```python
@app.post("/api/add-face")
async def add_face(file: UploadFile = File(...), name: str = Form(...)):
    contents = await file.read()
    np_img = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    ...
```

The bytes are decoded into an OpenCV `ndarray`.

### Step 5 — Processing on FastAPI

- **`/api/add-face`** → Detects the face with MTCNN, crops + resizes to
  160×160, and writes to `dataset/<student_name>/<timestamp>.jpg`.
- **`/api/train`** → Iterates over the dataset folder, extracts 512-D
  embeddings using `InceptionResnetV1` (FaceNet, pretrained on VGGFace2),
  trains an `SVC(kernel='linear', probability=True)`, and persists
  `model.pkl` + `labels.pkl`.
- **`/api/recognize`** → Detects faces, extracts embeddings, runs the SVM
  classifier, and optionally forwards `Present` records to the Node.js backend.

### Step 6 — Response returned to React
The endpoint returns JSON; React updates UI state:

```json
{
  "success": true,
  "predictions": [
    { "name": "Pratham",  "confidence": 0.94, "bbox": [x, y, w, h] },
    { "name": "Unknown",  "confidence": 0.41, "bbox": [x, y, w, h] }
  ]
}
```

React uses `predictions[].bbox` to draw green bounding boxes on the canvas and
the floating student card.

---

## 3. Example Round-Trip

### Request (Recognition)
```http
POST /api/recognize HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="file"; filename="frame.jpg"
Content-Type: image/jpeg

<binary JPEG bytes>
------X--
```

### Response
```json
{
  "success": true,
  "predictions": [
    {
      "name": "Rahul",
      "usn": "1AI22CS045",
      "confidence": 0.92,
      "bbox": [120, 88, 160, 160],
      "status": "Present"
    }
  ]
}
```

---

## 4. Data Movement Summary

```
Webcam frame ──▶ Canvas ──▶ Blob ──▶ FormData
        │
        ▼
React (fetch POST) ──▶ FastAPI UploadFile ──▶ OpenCV ndarray
        │                                           │
        │                                           ▼
        │                                MTCNN / FaceNet / SVM
        │                                           │
        ◀──────────── JSON predictions ◀────────────┘
```

---

## 5. Error Handling

- Non-200 responses are surfaced as toast errors in the UI.
- Timeouts use `AbortController` with a 10s budget for `/api/recognize`.
- `FormData` upload size is capped by FastAPI (default 100 MB, well above a
  single JPEG frame).
