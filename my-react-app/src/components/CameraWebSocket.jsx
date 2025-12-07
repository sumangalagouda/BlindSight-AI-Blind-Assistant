import React, { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./assistant.css"; 


const socket = io("http://localhost:5000");

export default function CameraWebSocket() {
  const videoRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    async function startCam() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    startCam();

    socket.on("detections", (objects) => {
      drawBoxes(objects);
      speackDetections(objects);
    });

    const interval = setInterval(() => sendFrame(), 1500);
    const handleVisibility = () => {
      if (document.hidden) {
        window.speechSynthesis.cancel();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.speechSynthesis.cancel();
      socket.off("detections");
      const v = videoRef.current;
      if (v && v.srcObject) {
        const tracks = v.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
        v.srcObject = null;
      }
    };
  }, []);

  function sendFrame() {
    const video = videoRef.current;
    const canvas = hiddenCanvasRef.current;

    if (!video || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL("image/jpeg", 0.7);
    socket.emit("frame", imgData);
  }

  function getPosition(video, x1, x2) {
    const objCenter = (x1 + x2) / 2;
    const frameWidth = video.videoWidth;

    const leftzone = frameWidth * 0.33;
    const rightzone = frameWidth * 0.66;

    if (objCenter < leftzone) return "left";
    else if (objCenter > rightzone) return "right";
    else return "center";
  }

  function getDistance(video, y1, y2) {
    const boxHeight = y2 - y1;
    const relHeight = boxHeight / video.videoHeight;

    if (relHeight > 0.65) return "very near";
    if (relHeight > 0.45) return "near";
    if (relHeight > 0.25) return "far";
    return "very far";
  }

  const lastSpokenRef = useRef({ text: "", at: 0 });
  const lastSummaryRef = useRef({ summary: "", at: 0 });

  function speackDetections(objects) {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const summary = summarizeScene(objects, video);
    const warnings = generateWarnings(objects, video);
    const now = Date.now();

    // If any urgent warnings exist (e.g., very near), speak immediately (no debounce)
    const urgent = warnings.some((w) => /very near|Obstacle/.test(w));

    // Debounce only non-urgent chatter
    const minGapMs = 1200;
    const shouldDebounce = !urgent && (summary === lastSummaryRef.current.summary || now - lastSummaryRef.current.at < minGapMs);
    if (shouldDebounce) return;

    const summaryText = summary.length === 0 ? "no object" : summary.join("; ");

    // Always speak warnings first with a comfortable rate
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    if (warnings.length > 0) {
      const warnUtter = new SpeechSynthesisUtterance(warnings.join("; "));
      warnUtter.rate = 0.95; // slower, clearer
      window.speechSynthesis.speak(warnUtter);
    }

    // Then speak the summary after a short delay so warnings finish
    if (summaryText && summaryText !== "no object") {
      const delayMs = warnings.length > 0 ? 500 : 0;
      setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          // allow current speech to continue; don't cancel here
        }
        const sumUtter = new SpeechSynthesisUtterance(summaryText);
        sumUtter.rate = urgent ? 1.0 : 1.05; 
        sumUtter.onend = () => {
          const t = Date.now();
          lastSpokenRef.current = { text: `${warnings.join("; ")}${warnings.length ? "; " : ""}${summaryText}`.trim(), at: t };
          lastSummaryRef.current = { summary, at: t };
        };
        window.speechSynthesis.speak(sumUtter);
      }, delayMs);
    } else {
      // If only "no object" and no warnings, speak gently
      if (warnings.length === 0) {
        const noUtter = new SpeechSynthesisUtterance("no object");
        noUtter.rate = 1.0;
        noUtter.onend = () => {
          const t = Date.now();
          lastSpokenRef.current = { text: "no object", at: t };
          lastSummaryRef.current = { summary, at: t };
        };
        window.speechSynthesis.speak(noUtter);
      }
    }
  }

  function summarizeScene(objects, video) {
    if (!video || !objects) return [];
    const parts = objects.map((o) => {
      const [x1, y1, x2, y2] = o.box;
      const pos = getPosition(video, x1, x2);
      const distance = getDistance(video, y1, y2);
      return `${o.label}:${pos}:${distance}`;
    });
    parts.sort();
    return parts;
  }

  function generateWarnings(objects, video) {
    const notices = [];
    objects.forEach((o) => {
      const [x1, y1, x2, y2] = o.box;
      const pos = getPosition(video, x1, x2);
      const distance = getDistance(video, y1, y2);

      if (distance === "very near") {
        if (pos === "center") notices.push("Obstacle ahead, move left or right");
        if (pos === "left") notices.push("Obstacle on left, move right");
        if (pos === "right") notices.push("Obstacle on right, move left");
      } else if (distance === "near" && pos === "center") {
        notices.push("Obstacle ahead, caution");
      }
    });
    return Array.from(new Set(notices));
  }

  function drawBoxes(objects) {
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
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

      const pos = getPosition(video, x1, x2);
      const distance = getDistance(video, y1, y2);
      ctx.fillText(`${obj.label} • ${pos} • ${distance}`, sx1 + 5, sy1 + 20);
    });
  }

  return (
    <div className="assistant-container">
      <h1 className="assistant-title">🧭 Walking Assistant</h1>

      <div className="video-wrapper">
        <video ref={videoRef} autoPlay muted playsInline className="video-feed" />
        <canvas ref={overlayCanvasRef} className="overlay-canvas" />
      </div>

      <canvas ref={hiddenCanvasRef} style={{ display: "none" }} />

      <div className="button-row">
        <button className="control-btn stop" onClick={() => window.speechSynthesis.cancel()}>
          ⛔ Stop Speech
        </button>

        <button
          className="control-btn back"
          onClick={() => {
            window.speechSynthesis.cancel();
            window.history.back();
          }}
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
}
