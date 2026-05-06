Create structured Markdown (.md) documentation files explaining how the system components are connected and how the data flows across the system.

Important:
Do NOT generate UI code.
Do NOT modify application files.
Only create documentation (.md files).

These files will be used for presentation, viva explanation, and technical documentation.

The system architecture includes:

Frontend → React  
AI Backend → FastAPI  
Database Backend → Node.js  
Database → MongoDB  
Face Detection → MTCNN and YOLO  
Face Recognition → FaceNet + SVM  

--------------------------------------------------

FILE 1 — react_fastapi_connection.md

Title:
React to FastAPI Connection Workflow

Explain clearly:

1. How React frontend sends requests to FastAPI
2. How captured images are sent using API calls
3. How FastAPI receives image data
4. How FastAPI processes images
5. How prediction results are returned to React
6. Which endpoints are used:

POST /api/add-face  
POST /api/train  
POST /api/recognize  

Include:

- Step-by-step numbered explanation
- Example request-response flow
- Clear data movement explanation

--------------------------------------------------

FILE 2 — fastapi_node_connection.md

Title:
FastAPI to Node.js Communication

Explain:

1. How recognition results move from FastAPI
2. How attendance data is forwarded
3. How Node.js receives attendance information
4. How attendance is validated
5. How duplicate attendance is prevented

Explain interaction logic between:

FastAPI → Node.js → MongoDB

Include:

Data flow diagram in text format.

--------------------------------------------------

FILE 3 — mongodb_connection.md

Title:
MongoDB Database Connection and Usage

Explain:

1. How MongoDB is connected using Mongoose
2. How .env file stores Mongo URI
3. How mongoose.connect() works
4. How collections are created automatically
5. How schemas are defined

Include schemas explanation for:

Admin  
Student  
Attendance  

Explain:

How data is inserted  
How data is fetched  
How updates happen  

--------------------------------------------------

FILE 4 — system_architecture_overview.md

Title:
Complete System Architecture Overview

Explain:

Overall system architecture.

Components:

React  
FastAPI  
Node.js  
MongoDB  
Dataset Folder  

Explain:

Responsibilities of each component.

Include:

Step-by-step working flow:

Add Face Flow  
Training Flow  
Recognition Flow  
Attendance Flow  

Include:

Text-based architecture diagram:

React → FastAPI → Node.js → MongoDB

--------------------------------------------------

FILE 5 — dataset_training_flow.md

Title:
Dataset Creation and Training Pipeline

Explain:

1. How images are captured
2. Multi-angle capture process
3. Dataset folder structure
4. Data augmentation process
5. Embedding generation using FaceNet
6. Model training using SVM
7. Model saving (.pkl files)

Explain:

Why augmentation is used  
Why embeddings are required  

--------------------------------------------------

FILE 6 — yolo_vs_mtcnn_workflow.md

Title:
YOLO vs MTCNN Face Detection Workflow

Explain:

1. How MTCNN detects faces
2. How YOLO detects faces
3. Differences in detection methods
4. Speed comparison concept
5. Accuracy comparison concept

Explain:

Why both models are compared.

Include:

Comparison points:

Speed  
Accuracy  
Real-time capability  
Robustness  

--------------------------------------------------

FILE 7 — attendance_data_flow.md

Title:
Attendance Recording Data Flow

Explain:

1. How recognition triggers attendance marking
2. How duplicate attendance is prevented
3. How daily attendance is stored
4. How absent marking works
5. How attendance is retrieved

Explain:

How Dashboard, Attendance, and Analytics pages fetch data.

--------------------------------------------------

FILE 8 — api_endpoints_reference.md

Title:
API Endpoints Reference Guide

List all endpoints used in system.

FastAPI:

POST /api/add-face  
POST /api/train  
POST /api/recognize  
GET /api/students/count  

Node.js:

POST /api/login  
POST /api/verify-admin  
POST /api/mark-attendance  
GET /api/students  
GET /api/attendance  

Explain:

Purpose of each endpoint.

--------------------------------------------------

FORMATTING REQUIREMENTS

Each file must:

Use Markdown format (.md)

Include:

Headings (#, ##)  
Bullet points  
Numbered steps  
Code blocks for examples  

Content must be:

Clear  
Technical  
Structured  
Suitable for presentation explanation  

Avoid:

Very short explanations  
Incomplete steps  

--------------------------------------------------

FINAL OUTPUT REQUIREMENT

Create these files inside:

/docs

Folder structure:

/docs
 ├── react_fastapi_connection.md
 ├── fastapi_node_connection.md
 ├── mongodb_connection.md
 ├── system_architecture_overview.md
 ├── dataset_training_flow.md
 ├── yolo_vs_mtcnn_workflow.md
 ├── attendance_data_flow.md
 └── api_endpoints_reference.md

These files must explain the system architecture clearly for academic presentation and documentation use.