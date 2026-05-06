Update the existing AI Attendance System with the following functional and UI enhancements.

Important:
Do NOT redesign the overall layout.
Only enhance behavior, workflow logic, and add required pages.

Current System:

Frontend → React (localhost:5173)  
AI Backend → FastAPI (127.0.0.1:8000)  
Database Backend → Node.js + MongoDB (localhost:5000)

Existing features already working:
- Face registration
- Face recognition
- Attendance marking
- MongoDB storage
- Training pipeline

--------------------------------------------------

SECTION 1 — HOME PAGE FOOTER

Add a footer at the bottom of the /home page.

Footer must include:

- About Us
- Contact Us
- Copyright text
Only these three things formatted and appeared neatly.
Example Footer Items:

About Us  
Contact Us  
© 2026 AI Attendance System  
Department of AI & Data Science  
NMAM Institute of Technology

Footer must remain visible ONLY ON /home page.

--------------------------------------------------

SECTION 2 — ABOUT US PAGE

When user clicks:

About Us

Navigate to:

/about

Create a detailed About Us page.

Content must include:

PROJECT TITLE  
AI-Based Smart Attendance System

Project Description:

Explain clearly:

- Face Recognition based attendance
- Real-time detection
- Automatic marking
- MongoDB storage
- GPU-based training
- Dataset augmentation
- Multi-angle face capture
- Admin dashboard
- Manual attendance support

Features Section:

Include:

✔ Real-time Face Recognition  
✔ Automated Attendance Logging  
✔ Multi-Angle Face Registration  
✔ Dataset Augmentation  
✔ Admin Control Dashboard  
✔ Attendance History Tracking  
✔ Duplicate Prevention  
✔ Manual Attendance Support  
✔ MongoDB Integration  
✔ GPU Training Support  

Keep text:

Detailed  
Technical  
Precise  
Readable  

--------------------------------------------------

SECTION 3 — CONTACT US PAGE

When user clicks:

Contact Us

Navigate to:

/contact

Display developer information.

Each developer card must contain:

Developer Image  
Name  
Phone Number  
Email  
Personal Quote  

Layout:

[ Developer Photo ]

Name: ______  
Phone: ______  
Email: ______  

Quote:
"Technology should simplify life, not complicate it."

Make a total of 4 developers.

Design:

Card-based layout  
Clean professional style  

--------------------------------------------------

SECTION 4 — REMOVE PLACEHOLDER LOGO

Remove placeholder logo behavior completely.

New behavior:

When face is detected:

Open a floating window inside the camera frame.

This window must:

Match camera scale  
Appear beside detected face  
Display student details  

Display:

Student Image  
Name  
USN  
Branch  

Layout:

Camera View

[Face Box]

[Floating Details Window]

Student Image  
Name  
USN  
Branch  

--------------------------------------------------

SECTION 5 — GREEN FACE DETECTION BOX

When face detected:

Draw:

GREEN bounding box

Around detected face.

If attendance marked:

Display:

"Attendance Marked"

If duplicate:

Display:

"Already Logged In"

Color Coding:

Green → Attendance Marked  
Yellow → Already Logged In  

--------------------------------------------------

SECTION 6 — ADD FACE WORKFLOW IMPROVEMENTS

Modify Add Face page behavior.

After capturing images:

Ask:

"Do you want to add another face?"

Provide buttons:

Add Another Face  
Train Model Overnight  

Important Rules:

✔ Do NOT train model automatically every time  
✔ Allow batch additions  
✔ Allow overnight training option  

--------------------------------------------------

SECTION 7 — MULTI-ANGLE FACE CAPTURE UPDATE

Update capture process.

Capture:

5 angles

Each angle:

5 images

Angles:

Front  
Left  
Right  
Up  
Down  

Total:

25 images per student

Display instructions during capture:

"Look Front"  
"Look Left"  
"Look Right"  
"Look Up"  
"Look Down"

Show capture progress.

--------------------------------------------------

SECTION 8 — PREVENT DUPLICATE USN

Before saving student:

Check MongoDB:

students collection

If USN exists:

Show:

"USN already registered"

Do NOT allow duplicate registration.

--------------------------------------------------

SECTION 9 — TRAIN MODEL OVERNIGHT OPTION

Add option:

Train Model Overnight

Behavior:

Store all new faces  
Delay training  
Run training manually later  

Training button options:

Train Now  
Train Overnight  

Training uses:

/api/train

--------------------------------------------------

SECTION 10 — TODAY'S ATTENDANCE DISPLAY FIX

On:

/detection page

Today's Attendance list must:

Show each student:

Only once

Even if detected multiple times.

Remove duplicates.

Logic:

Unique Name per Date.

--------------------------------------------------

SECTION 11 — MANUAL ATTENDANCE (ADMIN FEATURE)

Add new feature:

Manual Attendance Entry

Admin must be able to:

Select Student  
Select Date  
Select Status:

Present  
Absent  

Then:

Save manually.

Use MongoDB:

attendance collection.

--------------------------------------------------

SECTION 12 — AUTOMATIC ABSENT MARKING

At end of day:

Students who did NOT mark attendance:

Must be marked:

Absent.

Logic:

If student exists  
But no attendance entry for date  

→ Insert:

Status: Absent

--------------------------------------------------

SECTION 13 — ADMIN ATTENDANCE CONTROL PANEL

Inside:

Attendance Section

Admin must be able to:

✔ View today's attendance  
✔ Add attendance manually  
✔ Edit attendance  
✔ Mark absent manually  

Display:

Table Format:

Name  
USN  
Department  
Date  
Status  

--------------------------------------------------

SECTION 14 — DATA DISPLAY INSIDE CAMERA

When face recognized:

Show floating panel inside camera.

Panel must contain:

Student Image  
Name  
USN  
Branch  

This panel must:

Remain visible for few seconds  
Disappear after recognition  

--------------------------------------------------

SECTION 15 — KEEP EXISTING BACKEND CONNECTIONS

Do NOT change backend endpoints.

Continue using:

FastAPI:

http://127.0.0.1:8000

Endpoints:

/api/add-face  
/api/train  
/api/recognize  

Mongo Backend:

http://localhost:5000

Endpoints:

/api/login  
/api/verify-admin  
/api/add-student  
/api/mark-attendance  

--------------------------------------------------

FINAL EXPECTED RESULT

System must support:

✔ Footer navigation  
✔ About page  
✔ Contact page  
✔ Green face box detection  
✔ Floating student info window  
✔ Duplicate attendance prevention  
✔ Manual attendance entry  
✔ Automatic absent marking  
✔ Overnight training  
✔ Duplicate USN prevention  
✔ Multi-angle face capture  
✔ Admin attendance editing  

All existing UI must remain unchanged.
Only enhance logic and behavior.
