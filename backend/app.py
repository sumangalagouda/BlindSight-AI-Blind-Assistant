import base64
import io
import time
from threading import Lock

import cv2
import numpy as np
from flask import Flask
from flask_socketio import SocketIO, emit
from ultralytics import YOLO
from PIL import Image

app = Flask(__name__)
app.config['SECRET_KEY'] = "255c223f53c4795c01720732577d2c02ef1931ea5b0b8faec4b57301af47f31b"

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet", logger=True, engineio_logger=True)

thread_lock = Lock()

# ---------------------------------------------------------
# LOAD MODELS (3 MODELS)
# ---------------------------------------------------------

print("Loading YOLO models...")

# 1. Walking assistant + object detection model
general_model = YOLO("yolov8n.pt")

# 2. Currency detection model (your trained model)
currency_model = YOLO("best (2).pt")

print("All models loaded successfully!")

# ---------------------------------------------------------
# Helper: Convert base64 → OpenCV image
# ---------------------------------------------------------

def b64_to_cv2_img(b64_string):
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_bytes = base64.b64decode(b64_string)
    np_img = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_img, cv2.IMREAD_COLOR)
    return img


# ---------------------------------------------------------
# 1) WALKING ASSISTANT — Event: "frame"
# ---------------------------------------------------------

@socketio.on("frame")
def handle_walking_frame(data):
    try:
        frame = b64_to_cv2_img(data)
        if frame is None:
            return

        results = general_model.predict(frame, conf=0.3, verbose=False)
        r = results[0]

        detections = []
        for box in r.boxes:
            cls = int(box.cls)
            label = r.names[cls]
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "label": label,
                "confidence": conf,
                "box": [x1, y1, x2, y2]
            })

        emit("detections", detections)

    except Exception as e:
        print("Walking assistant error:", e)
        emit("detections", [])


# ---------------------------------------------------------
# 2) OBJECT DETECTION — Event: "object_frame"
# ---------------------------------------------------------

@socketio.on("object_frame")
def handle_object_detection(data):
    try:
        frame = b64_to_cv2_img(data)
        if frame is None:
            return

        results = general_model.predict(frame, conf=0.3, verbose=False)
        r = results[0]

        detections = []
        for box in r.boxes:
            cls = int(box.cls)
            label = r.names[cls]
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "label": label,
                "confidence": conf,
                "box": [x1, y1, x2, y2]
            })

        emit("object_detections", detections)

    except Exception as e:
        print("Object detection error:", e)
        emit("object_detections", [])


# ---------------------------------------------------------
# 3) CURRENCY DETECTION — Event: "currency_frame"
# ---------------------------------------------------------

@socketio.on("currency_frame")
def handle_currency_detection(data):
    try:
        frame = b64_to_cv2_img(data)
        if frame is None:
            return

        results = currency_model.predict(frame, conf=0.35, verbose=False)
        r = results[0]

        detections = []
        for box in r.boxes:
            cls = int(box.cls)
            label = r.names[cls]
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detections.append({
                "label": label,
                "confidence": conf,
                "box": [x1, y1, x2, y2]
            })

        emit("currency_detections", {"detections": detections})

    except Exception as e:
        print("Currency error:", e)
        emit("currency_detections", {"detections": []})


# ---------------------------------------------------------
# Base route
# ---------------------------------------------------------
@app.route("/")
def home():
    return "Blind Assistant Backend Running (3 Models Active)!"


# ---------------------------------------------------------
# Start Server
# ---------------------------------------------------------
if __name__ == "__main__":
    print("Starting Flask-SocketIO on http://localhost:5000 ...")
    socketio.run(app, host="0.0.0.0", port=5000)
