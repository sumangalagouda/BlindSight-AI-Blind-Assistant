import CameraWebSocket from "./components/CameraWebSocket";
import ObjectDetection from "./components/ObjectDetection";
import Currency from "./components/Currency";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import "./index.css"; // ADD THIS

function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <h1 className="title">Blind Assistant</h1>

      <p className="subtitle">
        Choose a mode below. The assistant will guide and speak for you.
      </p>

      <div className="button-group">
        <button className="action-btn" onClick={() => navigate("/objdetection")}>
          🔍 Object Detection
        </button>

        <button className="action-btn" onClick={() => navigate("/walking_ass")}>
          🧭 Walking Assistant
        </button>

        <button className="action-btn" onClick={() => navigate("/currency")}>
          💵 Currency Note Detection
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/objdetection" element={<ObjectDetection />} />
        <Route path="/walking_ass" element={<CameraWebSocket />} />
        <Route path="/currency" element={<Currency />} />
      </Routes>
    </BrowserRouter>
  );
}
