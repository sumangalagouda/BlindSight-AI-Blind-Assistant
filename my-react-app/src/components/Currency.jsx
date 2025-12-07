import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./currency.css"; // ADD THIS CSS FILE

const socket = io("http://localhost:5000");

export default function CurrencyDetection() {
  const videoRef = useRef(null);
  const hiddenRef = useRef(null);
  const overlayRef = useRef(null);

  const [lastSpoken, setLastSpoken] = useState("");

  useEffect(() => {
    async function startCam() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    startCam();

    socket.on("currency_detections", (data) => {
      drawBoxes(data.detections);
      speakCurrency(data.detections);
    });

    const interval = setInterval(() => sendFrame(), 1000);
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
    socket.emit("currency_frame", imgData);
  }

  function speakCurrency(detections) {
    if (detections.length === 0) return;

    const labels = detections.map(d => d.label).join(", ");

    if (labels !== lastSpoken) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(labels));
      setLastSpoken(labels);
    }
  }

  function drawBoxes(detections) {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;

    const scaleX = video.clientWidth / video.videoWidth;
    const scaleY = video.clientHeight / video.videoHeight;

    ctx.strokeStyle = "#ffdd33";
    ctx.lineWidth = 3;
    ctx.font = "20px Poppins";
    ctx.fillStyle = "#ffdd33";

    detections.forEach((d) => {
      const [x1, y1, x2, y2] = d.box;

      const sx1 = x1 * scaleX;
      const sy1 = y1 * scaleY;
      const w = (x2 - x1) * scaleX;
      const h = (y2 - y1) * scaleY;

      ctx.strokeRect(sx1, sy1, w, h);
      ctx.fillText(`${d.label}`, sx1 + 5, sy1 + 25);
    });
  }

  return (
    <div className="currency-container">
      <h1 className="currency-title">💵 Currency Note Detection</h1>

      <div className="currency-video-wrapper">
        <video ref={videoRef} autoPlay muted playsInline className="currency-video" />
        <canvas ref={overlayRef} className="currency-overlay" />
      </div>

      <canvas ref={hiddenRef} style={{ display: "none" }} />

      <div className="currency-buttons">
        <button className="currency-btn stop" onClick={() => window.speechSynthesis.cancel()}>
          ⛔ Stop Speech
        </button>

        <button className="currency-btn back" onClick={() => window.history.back()}>
          ← Go Back
        </button>
      </div>
    </div>
  );
}
