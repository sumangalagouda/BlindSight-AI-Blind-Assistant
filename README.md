#  BlindSight — AI-Powered Blind Assistant  
A wearable AI system designed to assist visually impaired individuals using **YOLOv8**, **Flask**, **WebSockets**, and a **React frontend**.  
The system performs **walking assistance**, **obstacle detection**, **object identification**, and **Indian currency recognition** in real time.

---

##  Features

### 🧭 **Walking Assistant**
- Detects obstacles in real-time  
- Computes object **position** (left, center, right)  
- Estimates **distance** (far, near, very near)  
- Gives **instant safety warnings** for very close obstacles  
- Uses speech output (can be extended to bone-conduction speakers)

### 🔍 **Object Detection**
- Identifies objects in the environment  
- Speaks the names of detected items  
- Useful for indoor guidance and object awareness

### 💵 **Currency Detection**
- Custom-trained YOLOv8 model for **Indian currency notes**  
- Detects ₹10, ₹20, ₹50, ₹100, ₹200, ₹500, and ₹2000 notes  
- Provides voice feedback for safe financial handling

### ⌚ **Smartwatch Integration (Future Enhancement)**
- Control modes: Walking, Object, Currency, Stop  
- Vibration feedback for mode switching  
- Hands-free operation

---

## 🧠 Tech Stack

### **Frontend**
- React (Vite)
- Canvas-based rendering
- WebSockets (socket.io-client)
- Real-time bounding box overlays
- Text-to-speech output

### **Backend**
- Python + Flask
- Flask-SocketIO (real-time communication)
- YOLOv8 model inference
- OpenCV + PIL for image processing

### **Machine Learning**
- YOLOv8 custom model training  
- Roboflow dataset preparation  
- Real-time computer vision pipeline

---

## 🔄 Project Workflow (Simplified)
-- Camera Feed → Preprocessing → YOLO Model Inference → Risk/Distance Calculation →
-- Mode Logic → Speech Generation → Audio Output (Speaker)

# Installation & Setup

## **1. Clone the project**

- git clone https://github.com/sumangalagouda/BlindSight-AI-Blind-Assistant.git
- cd BlindSight-AI-Blind-Assistant

## Backend Setup (Flask + YOLO)
- cd backend
- python -m venv venv
- venv\Scripts\activate       # Windows
- source venv/bin/activate   # Mac/Linux
- pip install -r requirements.txt
- python app.py

## Frontend Setup (React + Vite)
- cd frontend
- npm install
- npm run dev
