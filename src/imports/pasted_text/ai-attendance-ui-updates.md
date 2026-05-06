Update the existing AI Attendance System UI and workflow with the following functional and visual improvements.

Do NOT redesign the UI layout. 
Only enhance behavior, visual feedback, and workflow logic.

The current system already supports:
- React frontend
- FastAPI face recognition backend (port 8000)
- MongoDB backend (port 5000)
- Face detection using MTCNN
- Face recognition using FaceNet + SVM

--------------------------------------------------

SECTION 1 — LOGO DISPLAY BEHAVIOR

Always display a placeholder logo when no face is detected.

Requirements:

1. If no face is detected:
   - Display a placeholder image.
   - Use one image randomly from a predefined set.
   - Name the placeholder image as:

       NitteLogo

2. The placeholder logo must:
   - Be centered
   - Be clearly visible
   - Remain visible until a face is detected

3. Once a face is detected:
   - Hide the placeholder logo automatically.

--------------------------------------------------

SECTION 2 — FACE DETECTION VISUAL FEEDBACK

When a face is detected:

1. Draw a GREEN bounding box around the detected face.

2. If attendance is successfully marked:
   Display message:

       "Attendance Marked"

3. If the same person is detected again on the same day:
   Display message:

       "Already Logged In"

This message must appear near the detected face.

--------------------------------------------------

SECTION 3 — SHOW STUDENT DETAILS AFTER RECOGNITION

After a face is successfully recognized:

Display:

1. One front-facing image from the dataset folder
2. Student details:

   - Name
   - USN
   - Branch (Department)

The displayed face image should:

- Be selected from dataset/<person_name>/
- Prefer images labeled as front-facing
- If not available, select the first image

Layout:

Show:

[ Student Image ]
Name: ______
USN: ______
Branch: ______

--------------------------------------------------

SECTION 4 — AUTO START DETECTION

When camera starts:

System must automatically:

1. Start detecting faces
2. Start recognition
3. Automatically mark attendance

No manual trigger required.

Recognition must run continuously.

--------------------------------------------------

SECTION 5 — ADD FACE WORKFLOW UPDATE

Modify Add Face flow.

Current flow captures 50 images.

Update it to:

Capture images from 5 different angles.

New Capture Plan:

Angle 1 — Front → 5 images  
Angle 2 — Left → 5 images  
Angle 3 — Right → 5 images  
Angle 4 — Up → 5 images  
Angle 5 — Down → 5 images  

Total:

25 images per person

Then:

System must automatically:

1. Save images to dataset folder
2. Perform augmentation
3. Generate augmented dataset
4. Train model

Training Flow:

25 images → Augment → ~1500 images → Train

Display progress during training.

--------------------------------------------------

SECTION 6 — ETHICAL CONSENT BEFORE CAPTURE

Before capturing any face images:

Display an ethical consent message.

Message:

"This system collects facial data for attendance purposes. 
Your consent is required before capturing and storing your images."

User must:

Click:

✔ I Agree

Only after agreement:

Allow camera access.

If user does NOT agree:

Cancel capture process.

--------------------------------------------------

SECTION 7 — TRAINING WORKFLOW MESSAGE

After Add Face:

Display instruction:

"Next Steps:
You will capture images from 5 different angles (5 per angle).
The system will automatically augment these images and train the model."

Also display:

Training Progress Bar:

Stages:

Capturing Images  
Augmenting Dataset  
Extracting Embeddings  
Training Model  
Saving Model  

--------------------------------------------------

SECTION 8 — DATASET IMAGE SELECTION

When displaying recognized face:

Select:

1 image from:

dataset/<person_name>/

Prefer:

Images labeled:

front_*.jpg

If not available:

Use:

first image in folder

--------------------------------------------------

SECTION 9 — ATTENDANCE STATUS DISPLAY

During recognition:

If new attendance:

Show:

"Attendance Marked"

If duplicate attendance:

Show:

"Already Logged In"

Use:

Green color → Attendance Marked  
Yellow color → Already Logged In  

--------------------------------------------------

SECTION 10 — MAINTAIN EXISTING BACKEND CONNECTIONS

Do NOT change backend logic.

Continue using:

FastAPI:

http://127.0.0.1:8000

Endpoints:

POST /api/add-face  
POST /api/train  
POST /api/recognize  

Node.js Mongo:

http://localhost:5000

Endpoints:

POST /api/login  
POST /api/verify-admin  
POST /api/mark-attendance  

--------------------------------------------------

FINAL EXPECTED RESULT

System behavior should be:

No Face Detected:
→ Show NitteLogo placeholder

Face Detected:
→ Draw green box
→ Recognize person
→ Display Name + USN + Branch
→ Show dataset image
→ Mark attendance automatically

Duplicate Detection:
→ Show "Already Logged In"

Add Face:
→ Ask ethical consent
→ Capture 25 images (5 angles × 5 images)
→ Augment automatically
→ Train automatically
→ Show training progress