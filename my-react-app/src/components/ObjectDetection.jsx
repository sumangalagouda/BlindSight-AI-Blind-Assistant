import React, { useRef, useEffect } from "react";
import { io } from "socket.io-client";
import "./object.css"; // ADD THIS FILE

const socket = io("http://localhost:5000");

export default function ObjectDetection() {
  const videoRef = useRef(null);
  const hiddenRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    async function startCam() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    startCam();

    socket.on("detections", (obj) => {
      drawBoxes(obj);
      speakDetection(obj);
    });

    const interval = setInterval(() => sendFrame(), 1200);
    return () => clearInterval(interval);
  }, []);

  function sendFrame() {
    const video = videoRef.current;
    const canvas = hiddenRef.current;

    if (!video || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL("image/jpeg", 0.7);
    socket.emit("frame", imgData);
  }

  function speakDetection(objects) {
    if (!objects || objects.length === 0) return;

    const text = objects.map(o => o.label).join(", ");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function drawBoxes(objects) {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    const scaleX = video.clientWidth / video.videoWidth;
    const scaleY = video.clientHeight / video.videoHeight;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00ff99";
    ctx.fillStyle = "#00ff99";
    ctx.font = "18px Poppins";

    objects.forEach((obj) => {
      const [x1, y1, x2, y2] = obj.box;

      const sx1 = x1 * scaleX;
      const sy1 = y1 * scaleY;
      const w = (x2 - x1) * scaleX;
      const h = (y2 - y1) * scaleY;

      ctx.strokeRect(sx1, sy1, w, h);
      ctx.fillText(`${obj.label}`, sx1 + 5, sy1 + 20);
    });
  }

  return (
    <div className="object-container">
      <h1 className="object-title">🔍 Object Detection</h1>

      <div className="object-video-wrapper">
        <video ref={videoRef} autoPlay muted playsInline className="object-video" />
        <canvas ref={overlayRef} className="object-overlay" />
      </div>

      <canvas ref={hiddenRef} style={{ display: "none" }} />

      <div className="object-buttons">
        <button className="object-btn stop" onClick={() => window.speechSynthesis.cancel()}>
          ⛔ Stop Speech
        </button>

        <button className="object-btn back" onClick={() => window.history.back()}>
          ← Go Back
        </button>
      </div>
    </div>
  );
}
