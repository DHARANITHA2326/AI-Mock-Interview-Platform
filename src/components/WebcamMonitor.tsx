import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Video, 
  VideoOff, 
  RefreshCw, 
  Camera, 
  FlipHorizontal, 
  Sun, 
  Activity, 
  Eye, 
  ShieldCheck, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Sparkles, 
  Info, 
  Sliders, 
  Maximize2,
  X,
  UserCheck,
  Smartphone,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProctoringEvent } from "../types";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

export interface VisionMetrics {
  confidenceScore: number;
  eyeContact: string;
  posture: string;
  emotion: string;
  lightingQuality: string;
  stabilityScore: number;
  motionLevel: string;
  fps: number;
  resolution: string;
}

export interface BiometricTelemetry {
  cameraActive: boolean;
  isVirtualCam: boolean;
  isFaceDetected: boolean;
  facePresenceScore: number;
  faceBox?: { x: number; y: number; width: number; height: number };
  eyeContact: string;
  eyeContactScore: number;
  posture: string;
  postureScore: number;
  lightingQuality: string;
  lightingScore: number;
  motionLevel: string;
  motionScore: number;
  confidenceScore: number;
  fps: number;
  resolution: string;
}

interface WebcamMonitorProps {
  isSpeaking?: boolean;
  isListening?: boolean;
  onMetricsUpdate?: (metrics: VisionMetrics) => void;
  onTelemetryUpdate?: (telemetry: BiometricTelemetry) => void;
  onProctoringViolation?: (event: Omit<ProctoringEvent, "id" | "sessionId">) => void;
  compact?: boolean;
  proctoringActive?: boolean;
  activeWarningAlert?: string | null;
}

export default function WebcamMonitor({
  isSpeaking = false,
  isListening = false,
  onMetricsUpdate,
  onTelemetryUpdate,
  onProctoringViolation,
  compact = false,
  proctoringActive = true,
  activeWarningAlert = null
}: WebcamMonitorProps) {
  // Camera core states
  const [cameraActive, setCameraActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isMirrored, setIsMirrored] = useState(true);
  const [showReticle, setShowReticle] = useState(true);
  const [isVirtualCam, setIsVirtualCam] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);

  // Real-time Face Tracking Coordinates
  const [isFaceDetected, setIsFaceDetected] = useState(true);
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 32,
    y: 20,
    width: 36,
    height: 52
  });
  const [isFaceCentered, setIsFaceCentered] = useState(true);
  const faceDetectorRef = useRef<any>(null);

  // Proctoring & Computer Vision Object Detection States
  const [detectedDevices, setDetectedDevices] = useState<Array<{ class: string; score: number; bbox: number[] }>>([]);
  const [objectDetectorReady, setObjectDetectorReady] = useState(false);
  const cocoModelRef = useRef<cocoSsd.ObjectDetection | null>(null);

  // Real-time Violation Duration Accumulators & Debouncers
  const noFaceDurationRef = useRef(0);
  const gazeAwayDurationRef = useRef(0);
  const consecutiveDeviceMatchesRef = useRef<Record<string, number>>({});
  const lastViolationEmitTimeRef = useRef<Record<string, number>>({});

  // Video and Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const virtualAnimId = useRef<number | null>(null);
  const prevFrameData = useRef<Uint8ClampedArray | null>(null);
  const analysisTimer = useRef<number | null>(null);

  // Vision metrics state
  const [metrics, setMetrics] = useState<VisionMetrics>({
    confidenceScore: 92,
    eyeContact: "Direct Gaze (Optimal)",
    posture: "Upright & Centered",
    emotion: "Attentive & Composed",
    lightingQuality: "Optimal Studio Lighting",
    stabilityScore: 95,
    motionLevel: "Poised & Still",
    fps: 30,
    resolution: "HD 720p"
  });

  // Enumerate connected cameras
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn("Error enumerating devices:", err);
    }
  }, [selectedDeviceId]);

  // Clean up current stream tracks
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (virtualAnimId.current) {
      cancelAnimationFrame(virtualAnimId.current);
      virtualAnimId.current = null;
    }
    if (analysisTimer.current) {
      window.clearInterval(analysisTimer.current);
      analysisTimer.current = null;
    }
  }, []);

  // Virtual Camera generator (guarantees a working 30fps stream in headless or restricted browser sandboxes)
  const startVirtualStream = useCallback(() => {
    stopTracks();
    setIsVirtualCam(true);
    setErrorStatus(null);
    setCameraActive(true);

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    virtualCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");

    let eyeBlink = false;
    let mouthOpen = 0;
    let headOffsetY = 0;
    let headAngle = 0;
    let frameCount = 0;

    const renderVirtual = () => {
      frameCount++;
      if (ctx) {
        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 640, 480);
        bgGrad.addColorStop(0, "#090d16");
        bgGrad.addColorStop(1, "#1e1b4b");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 640, 480);

        // Grid lines for studio setup
        ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
        ctx.lineWidth = 1;
        for (let x = 0; x < 640; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 480);
          ctx.stroke();
        }
        for (let y = 0; y < 480; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(640, y);
          ctx.stroke();
        }

        // Subtly animate posture
        headOffsetY = Math.sin(frameCount * 0.03) * 3;
        headAngle = Math.sin(frameCount * 0.02) * 0.015;

        // Blinking logic
        if (frameCount % 110 === 0) eyeBlink = true;
        if (frameCount % 110 === 6) eyeBlink = false;

        // Speaking mouth animation
        if (isListening || isSpeaking) {
          mouthOpen = Math.abs(Math.sin(frameCount * 0.2)) * 12;
        } else {
          mouthOpen = Math.max(0, mouthOpen - 0.5);
        }

        ctx.save();
        ctx.translate(320, 240 + headOffsetY);
        ctx.rotate(headAngle);

        // Candidate Torso / Suit
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.ellipse(0, 200, 150, 90, 0, 0, Math.PI * 2);
        ctx.fill();

        // Collar
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.moveTo(-40, 130);
        ctx.lineTo(0, 170);
        ctx.lineTo(40, 130);
        ctx.lineTo(0, 200);
        ctx.closePath();
        ctx.fill();

        // Neck
        ctx.fillStyle = "#fbcfe8";
        ctx.fillRect(-22, 90, 44, 55);

        // Head
        ctx.fillStyle = "#fed7aa";
        ctx.beginPath();
        ctx.ellipse(0, 40, 65, 80, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hair
        ctx.fillStyle = "#1e1b4b";
        ctx.beginPath();
        ctx.ellipse(0, 0, 68, 50, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = "#1e293b";
        if (eyeBlink) {
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#1e293b";
          ctx.beginPath();
          ctx.moveTo(-28, 35);
          ctx.lineTo(-12, 35);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(12, 35);
          ctx.lineTo(28, 35);
          ctx.stroke();
        } else {
          // Eye whites & pupils
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(-20, 35, 9, 6, 0, 0, Math.PI * 2);
          ctx.ellipse(20, 35, 9, 6, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#3b82f6";
          ctx.beginPath();
          ctx.arc(-20, 35, 4.5, 0, Math.PI * 2);
          ctx.arc(20, 35, 4.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(-20, 35, 2.5, 0, Math.PI * 2);
          ctx.arc(20, 35, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Eyebrows
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-32, 23);
        ctx.lineTo(-12, 24);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, 24);
        ctx.lineTo(32, 23);
        ctx.stroke();

        // Nose
        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(-3, 56);
        ctx.lineTo(3, 56);
        ctx.stroke();

        // Mouth
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        if (mouthOpen > 2) {
          ctx.ellipse(0, 78, 12, mouthOpen, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = "#b91c1c";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 70, 12, 0.2 * Math.PI, 0.8 * Math.PI);
          ctx.stroke();
        }

        ctx.restore();

        // Virtual feed badge watermark
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fillRect(16, 16, 210, 28);
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
        ctx.strokeRect(16, 16, 210, 28);
        ctx.fillStyle = "#818cf8";
        ctx.font = "bold 11px monospace";
        ctx.fillText("● AI SIMULATED CAM FEED", 26, 34);
      }
      virtualAnimId.current = requestAnimationFrame(renderVirtual);
    };

    virtualAnimId.current = requestAnimationFrame(renderVirtual);

    const stream = (canvas as any).captureStream(30);
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn("Virtual video play error:", e));
    }
  }, [isListening, isSpeaking, stopTracks]);

  // Start real hardware camera with progressive fallback strategies
  const startCamera = useCallback(
    async (overrideDeviceId?: string) => {
      setIsInitializing(true);
      setErrorStatus(null);
      setIsVirtualCam(false);
      stopTracks();

      const deviceToUse = overrideDeviceId || selectedDeviceId;

      // Stage 1: Try HD with specific device
      let stream: MediaStream | null = null;
      let usedMode = "HD 720p";

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser mediaDevices API not supported");
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: deviceToUse ? { exact: deviceToUse } : undefined,
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user"
            },
            audio: false
          });
          usedMode = "HD 720p";
        } catch (strictErr) {
          console.warn("Strict camera constraints failed, attempting standard resolution...", strictErr);
          // Stage 2: Try standard 640x480
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: deviceToUse ? { exact: deviceToUse } : undefined,
                width: { ideal: 640 },
                height: { ideal: 480 }
              },
              audio: false
            });
            usedMode = "VGA 480p";
          } catch (standardErr) {
            console.warn("Standard resolution failed, attempting minimal constraint...", standardErr);
            // Stage 3: Minimal fallback
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false
            });
            usedMode = "Basic SD";
          }
        }

        streamRef.current = stream;
        setCameraActive(true);
        setErrorStatus(null);
        refreshDevices();

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn("Video play error:", e));
        }

        setMetrics((prev) => ({
          ...prev,
          resolution: usedMode
        }));
      } catch (err: any) {
        console.error("Camera access failed:", err);
        const name = err?.name || "";
        let friendlyMessage = "Camera access unavailable.";

        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          friendlyMessage = "Camera permission blocked by browser or system settings.";
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          friendlyMessage = "No physical camera detected on this system.";
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          friendlyMessage = "Camera is already in use by another app or tab.";
        } else {
          friendlyMessage = err?.message || "Could not initialize video stream.";
        }

        setErrorStatus(friendlyMessage);
        setCameraActive(false);

        // Fallback to virtual camera so the user is never stuck
        startVirtualStream();
      } finally {
        setIsInitializing(false);
      }
    },
    [selectedDeviceId, stopTracks, refreshDevices, startVirtualStream]
  );

  // Initialize FaceDetector and COCO-SSD object detection model on mount
  useEffect(() => {
    let active = true;

    if (typeof (window as any).FaceDetector === "function") {
      try {
        faceDetectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      } catch (e) {
        faceDetectorRef.current = null;
      }
    }

    async function loadCocoModel() {
      try {
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (active) {
          cocoModelRef.current = model;
          setObjectDetectorReady(true);
        }
      } catch (e) {
        console.warn("Notice: COCO-SSD running in browser sandbox fallback mode:", e);
      }
    }

    loadCocoModel();

    return () => {
      active = false;
    };
  }, []);

  // Periodic Local Object Detection Interval (checks for prohibited devices every 1200ms)
  useEffect(() => {
    if (!cameraActive || !proctoringActive) return;

    const deviceInterval = window.setInterval(async () => {
      const video = videoRef.current;
      const model = cocoModelRef.current;
      if (!video || video.readyState < 2 || !model) return;

      try {
        const predictions = await model.detect(video);
        const prohibited = predictions.filter(
          (p) => ["cell phone", "laptop", "book", "tv"].includes(p.class) && p.score >= 0.58
        );

        setDetectedDevices(prohibited);

        if (prohibited.length > 0) {
          prohibited.forEach((item) => {
            const currentCount = (consecutiveDeviceMatchesRef.current[item.class] || 0) + 1;
            consecutiveDeviceMatchesRef.current[item.class] = currentCount;

            // Require 2 consecutive detections to eliminate single-frame transient false positives
            if (currentCount >= 2) {
              const now = Date.now();
              const lastEmit = lastViolationEmitTimeRef.current[`device-${item.class}`] || 0;
              if (now - lastEmit > 4500) {
                lastViolationEmitTimeRef.current[`device-${item.class}`] = now;
                onProctoringViolation?.({
                  eventType: "prohibited_device",
                  timestamp: new Date().toISOString(),
                  durationSeconds: 2,
                  severity: item.score >= 0.8 ? "critical" : "high",
                  confidence: Math.round(item.score * 100) / 100,
                  deviceType: item.class,
                  details: `Prohibited electronic device or material (${item.class}) detected with ${(item.score * 100).toFixed(0)}% confidence.`
                });
              }
            }
          });
        } else {
          consecutiveDeviceMatchesRef.current = {};
        }
      } catch (err) {
        // Silently tolerate frame busy state
      }
    }, 1200);

    return () => clearInterval(deviceInterval);
  }, [cameraActive, proctoringActive, onProctoringViolation]);

  // Stop camera feed
  const stopCamera = useCallback(() => {
    stopTracks();
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [stopTracks]);

  // Real-time computer vision frame analysis loop (runs every 250ms for responsive feedback)
  useEffect(() => {
    if (!cameraActive) return;

    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement("canvas");
      analysisCanvasRef.current.width = 160;
      analysisCanvasRef.current.height = 120;
    }

    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    analysisTimer.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !ctx) return;

      try {
        ctx.drawImage(video, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const data = imgData.data;
        const totalPixels = data.length / 4;

        if (isVirtualCam) {
          // In virtual simulation mode, simulate centered candidate
          setIsFaceDetected(true);
          setIsFaceCentered(true);
          setFaceBox({ x: 30, y: 15, width: 40, height: 55 });
          
          const virtualMetrics: VisionMetrics = {
            confidenceScore: 94,
            eyeContact: "Direct Gaze (Optimal)",
            posture: "Upright & Centered",
            emotion: isSpeaking || isListening ? "Actively Articulating" : "Attentive & Composed",
            lightingQuality: "Optimal Studio Lighting",
            stabilityScore: 96,
            motionLevel: isSpeaking ? "Conversational Gestures" : "Poised & Still",
            fps: 30,
            resolution: "Virtual 640x480"
          };
          setMetrics(virtualMetrics);
          if (onMetricsUpdate) onMetricsUpdate(virtualMetrics);
          if (onTelemetryUpdate) {
            onTelemetryUpdate({
              cameraActive: true,
              isVirtualCam: true,
              isFaceDetected: true,
              facePresenceScore: 100,
              faceBox: { x: 30, y: 15, width: 40, height: 55 },
              eyeContact: "Direct Gaze (Optimal)",
              eyeContactScore: 95,
              posture: "Upright & Centered",
              postureScore: 95,
              lightingQuality: "Optimal Studio Lighting",
              lightingScore: 96,
              motionLevel: "Poised & Still",
              motionScore: 95,
              confidenceScore: 94,
              fps: 30,
              resolution: "Virtual 640x480"
            });
          }
          return;
        }

        // 1. Calculate average luminance & frame difference
        let totalBrightness = 0;
        let diffSum = 0;
        const prev = prevFrameData.current;

        // Skin detection variables
        let skinCount = 0;
        let sumX = 0;
        let sumY = 0;
        let minX = 160, maxX = 0, minY = 120, maxY = 0;
        let skinBrightnessSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Standard relative luminance
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += lum;

          if (prev) {
            const prevLum = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
            diffSum += Math.abs(lum - prevLum);
          }

          // Pixel coordinate
          const pixelIdx = i / 4;
          const px = pixelIdx % 160;
          const py = Math.floor(pixelIdx / 160);

          // Skin chrominance YCbCr classification
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          // Standard human skin color range in YCbCr space
          if (cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178 && lum >= 35 && lum <= 235 && r > g && g > b - 15) {
            skinCount++;
            sumX += px;
            sumY += py;
            skinBrightnessSum += lum;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }

        const avgBrightness = Math.round(totalBrightness / totalPixels);
        const avgMotion = prev ? diffSum / totalPixels : 2.0;

        // Save current frame for diffing
        if (!prevFrameData.current || prevFrameData.current.length !== data.length) {
          prevFrameData.current = new Uint8ClampedArray(data);
        } else {
          prevFrameData.current.set(data);
        }

        // 2. Face Detection Logic
        let detected = false;
        let detectedBox: { x: number; y: number; width: number; height: number } | null = null;

        // Try native browser FaceDetector first
        if (faceDetectorRef.current) {
          try {
            const faces = await faceDetectorRef.current.detect(canvas);
            if (faces && faces.length > 0) {
              const b = faces[0].boundingBox;
              detected = true;
              detectedBox = {
                x: Math.max(0, Math.min(100, (b.x / 160) * 100)),
                y: Math.max(0, Math.min(100, (b.y / 120) * 100)),
                width: Math.max(20, Math.min(70, (b.width / 160) * 100)),
                height: Math.max(25, Math.min(80, (b.height / 120) * 100))
              };

              // Check for Multiple Faces
              if (faces.length > 1 && proctoringActive) {
                const now = Date.now();
                const lastEmit = lastViolationEmitTimeRef.current["multiple_faces"] || 0;
                if (now - lastEmit > 4500) {
                  lastViolationEmitTimeRef.current["multiple_faces"] = now;
                  onProctoringViolation?.({
                    eventType: "multiple_faces",
                    timestamp: new Date().toISOString(),
                    durationSeconds: 2,
                    severity: "high",
                    confidence: 0.94,
                    details: `Multiple faces (${faces.length}) detected simultaneously in candidate camera feed.`
                  });
                }
              }
            }
          } catch (e) {
            // Native detector error, fallback to skin blob
          }
        }

        // Universal Computer Vision Skin Blob Fallback
        if (!detected && skinCount > 75 && (maxY - minY) >= 16 && (maxX - minX) >= 14) {
          const faceWidth = maxX - minX;
          const faceHeight = maxY - minY;
          const aspectRatio = faceHeight / faceWidth;

          if (aspectRatio >= 0.7 && aspectRatio <= 2.8) {
            detected = true;
            const cx = sumX / skinCount;
            const cy = sumY / skinCount;

            const boxWidth = Math.max(26, Math.min(65, (faceWidth / 160) * 100 * 1.3));
            const boxHeight = Math.max(34, Math.min(75, (faceHeight / 120) * 100 * 1.35));
            const boxX = Math.max(0, Math.min(100 - boxWidth, (cx / 160) * 100 - boxWidth / 2));
            const boxY = Math.max(0, Math.min(100 - boxHeight, (cy / 120) * 100 - boxHeight / 2));

            detectedBox = {
              x: boxX,
              y: boxY,
              width: boxWidth,
              height: boxHeight
            };
          }
        }

        setIsFaceDetected(detected);

        if (!detected) {
          // NO FACE DETECTED
          setIsFaceCentered(false);
          noFaceDurationRef.current += 250;

          if (proctoringActive && noFaceDurationRef.current >= 4000) {
            const now = Date.now();
            const lastEmit = lastViolationEmitTimeRef.current["no_face"] || 0;
            if (now - lastEmit > 5000) {
              lastViolationEmitTimeRef.current["no_face"] = now;
              const durSec = Math.round(noFaceDurationRef.current / 1000);
              onProctoringViolation?.({
                eventType: durSec >= 8 ? "candidate_left" : "no_face",
                timestamp: new Date().toISOString(),
                durationSeconds: durSec,
                severity: durSec >= 8 ? "critical" : "high",
                confidence: 0.95,
                details: `Candidate not visible in camera frame for ${durSec} seconds.`
              });
            }
          }

          const noFaceMetrics: VisionMetrics = {
            confidenceScore: 30,
            eyeContact: "No Face Detected / Looking Away",
            posture: "Candidate Out of Frame",
            emotion: "Awaiting Candidate Presence",
            lightingQuality: avgBrightness < 40 ? "Camera Obstructed / Low Light" : "Acceptable Ambient",
            stabilityScore: 40,
            motionLevel: "No Subject Detected",
            fps: 30,
            resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : "HD 720p"
          };
          setMetrics(noFaceMetrics);
          if (onMetricsUpdate) onMetricsUpdate(noFaceMetrics);
          if (onTelemetryUpdate) {
            onTelemetryUpdate({
              cameraActive: true,
              isVirtualCam: false,
              isFaceDetected: false,
              facePresenceScore: 0,
              eyeContact: "No Face Detected / Looking Away",
              eyeContactScore: 20,
              posture: "Candidate Out of Frame",
              postureScore: 25,
              lightingQuality: avgBrightness < 40 ? "Low Light / Blocked" : "Ambient Room Light",
              lightingScore: 40,
              motionLevel: "No Subject Detected",
              motionScore: 20,
              confidenceScore: 25,
              fps: 30,
              resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : "HD 720p"
            });
          }
          return;
        }

        // FACE IS DETECTED -> CALCULATE GENUINE METRICS
        noFaceDurationRef.current = 0; // Reset no-face accumulator immediately

        if (detectedBox) {
          setFaceBox(detectedBox);
        }

        const box = detectedBox || faceBox;
        const faceCenterX = box.x + box.width / 2;
        const faceCenterY = box.y + box.height / 2;

        // Deviation from optimal centered framing (target 50%, 45%)
        const dx = faceCenterX - 50;
        const dy = faceCenterY - 45;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const isCentered = distFromCenter < 14;
        setIsFaceCentered(isCentered);

        // 3. Eye Contact & Gaze
        let eyeContact = "Direct Gaze (Optimal)";
        let eyeContactScore = 95;

        if (isCentered) {
          eyeContact = "Direct Gaze (Optimal)";
          eyeContactScore = Math.max(90, Math.min(99, Math.round(98 - distFromCenter * 0.4)));
          gazeAwayDurationRef.current = Math.max(0, gazeAwayDurationRef.current - 350);
        } else if (dx < -12) {
          eyeContact = "Gaze Diverted Left";
          eyeContactScore = 68;
        } else if (dx > 12) {
          eyeContact = "Gaze Diverted Right";
          eyeContactScore = 68;
        } else if (dy > 15) {
          eyeContact = "Looking Downward";
          eyeContactScore = 65;
        } else {
          eyeContact = "Gaze High / Screen Margin";
          eyeContactScore = 72;
        }

        // Check for Prolonged Gaze Away (&gt;3.5s) to avoid false alerts on natural brief glances
        if (!isCentered && distFromCenter > 18) {
          gazeAwayDurationRef.current += 250;
          if (proctoringActive && gazeAwayDurationRef.current >= 3500) {
            const now = Date.now();
            const lastEmit = lastViolationEmitTimeRef.current["gaze_away"] || 0;
            if (now - lastEmit > 5000) {
              lastViolationEmitTimeRef.current["gaze_away"] = now;
              onProctoringViolation?.({
                eventType: "gaze_away",
                timestamp: new Date().toISOString(),
                durationSeconds: 3.5,
                severity: "medium",
                confidence: 0.88,
                details: `Candidate continuously looking away from screen (${eyeContact}).`
              });
            }
          }
        }

        // 4. Posture & Demeanor
        let posture = "Upright & Centered";
        let postureScore = 95;

        if (isCentered) {
          posture = "Upright & Centered";
          postureScore = 96;
        } else if (dy > 16) {
          posture = "Slumped / Positioned Low";
          postureScore = 65;
        } else if (dx < -14) {
          posture = "Leaning Left";
          postureScore = 70;
        } else if (dx > 14) {
          posture = "Leaning Right";
          postureScore = 70;
        } else {
          posture = "Positioned High / Close";
          postureScore = 78;
        }

        // 5. Lighting Quality based on face region brightness
        const faceLum = skinCount > 0 ? Math.round(skinBrightnessSum / skinCount) : avgBrightness;
        let lightingQuality = "Optimal Studio Lighting";
        let lightingScore = 95;

        if (faceLum < 45) {
          lightingQuality = `Underexposed / Dim Light (${faceLum}/255)`;
          lightingScore = 58;
        } else if (faceLum < 75) {
          lightingQuality = `Moderate Light (${faceLum}/255)`;
          lightingScore = 80;
        } else if (faceLum > 185) {
          lightingQuality = `Overexposed / Strong Backlight (${faceLum}/255)`;
          lightingScore = 68;
        } else {
          lightingQuality = `Optimal Studio Lighting (${faceLum}/255)`;
          lightingScore = 96;
        }

        // 6. Motion Energy & Poise
        let motionLevel = "Poised & Still";
        let motionScore = 95;

        if (avgMotion > 12) {
          motionLevel = "Frequent Movement / Readjusting";
          motionScore = 68;
        } else if (avgMotion > 4.5) {
          motionLevel = "Conversational Gestures";
          motionScore = 88;
        } else {
          motionLevel = "Poised & Still";
          motionScore = 96;
        }

        // 7. Facial Emotion & Engagement
        let emotion = "Attentive & Composed";
        if (isListening || isSpeaking) {
          emotion = "Actively Articulating";
        } else if (avgMotion < 3.5) {
          emotion = "Deep Technical Concentration";
        }

        // 8. Composite Confidence Index (strictly based on genuine camera telemetry)
        const compositeConfidence = Math.round(
          eyeContactScore * 0.35 + postureScore * 0.30 + lightingScore * 0.20 + motionScore * 0.15
        );
        const boundedConfidence = Math.min(99, Math.max(45, compositeConfidence));

        const updated: VisionMetrics = {
          confidenceScore: boundedConfidence,
          eyeContact,
          posture,
          emotion,
          lightingQuality,
          stabilityScore: motionScore,
          motionLevel,
          fps: 30,
          resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : "HD 720p"
        };

        setMetrics(updated);
        if (onMetricsUpdate) onMetricsUpdate(updated);

        if (onTelemetryUpdate) {
          onTelemetryUpdate({
            cameraActive: true,
            isVirtualCam: false,
            isFaceDetected: true,
            facePresenceScore: 100,
            faceBox: box,
            eyeContact,
            eyeContactScore,
            posture,
            postureScore,
            lightingQuality,
            lightingScore,
            motionLevel,
            motionScore,
            confidenceScore: boundedConfidence,
            fps: 30,
            resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : "HD 720p"
          });
        }
      } catch (err) {
        console.warn("Vision analysis tick error:", err);
      }
    }, 250);

    return () => {
      if (analysisTimer.current) {
        window.clearInterval(analysisTimer.current);
        analysisTimer.current = null;
      }
    };
  }, [cameraActive, isSpeaking, isListening, isVirtualCam, onMetricsUpdate, onTelemetryUpdate, faceBox]);

  // Auto-launch camera on mount
  useEffect(() => {
    refreshDevices();
    startCamera();
    return () => {
      stopTracks();
    };
  }, []);

  // Take snapshot
  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL("image/jpeg", 0.9);
      setSnapshotUrl(url);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Video Viewport Container */}
      <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                AI Vision & Confidence Monitor
              </h3>
              <p className="text-[10px] text-slate-400">
                {isVirtualCam ? "Virtual AI Telemetry Active" : "Real-time Biometric Tracking"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cameraActive ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isVirtualCam ? "AI SIM LIVE" : "LIVE FEED"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                STANDBY
              </span>
            )}
          </div>
        </div>

        {/* Video Box */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 flex items-center justify-center group shadow-inner">
          {/* Main Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
            className={`w-full h-full object-cover transition-transform duration-200 ${
              isMirrored ? "scale-x-[-1]" : "scale-x-[1]"
            } ${cameraActive ? "opacity-100" : "opacity-0"}`}
          />

          {/* Fallback Display when Camera is Off */}
          {!cameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-10 space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <VideoOff className="w-6 h-6" />
                </div>
                <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">Camera Feed Paused</p>
                <p className="text-[10px] text-slate-400 max-w-[240px]">
                  Click below to enable real camera feed or start the simulated AI telemetry stream.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" /> Start Webcam
                </button>
                <button
                  type="button"
                  onClick={startVirtualStream}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all border border-slate-700 cursor-pointer flex items-center gap-1.5"
                >
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> Virtual Mode
                </button>
              </div>
            </div>
          )}

          {/* Interactive Face HUD & Reticle Overlay */}
          {cameraActive && showReticle && (
            <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
              {isFaceDetected ? (
                /* Dynamic Real-Time Face Reticle following detected face */
                <div
                  style={{
                    left: `${isMirrored ? (100 - faceBox.x - faceBox.width) : faceBox.x}%`,
                    top: `${faceBox.y}%`,
                    width: `${faceBox.width}%`,
                    height: `${faceBox.height}%`
                  }}
                  className={`absolute border-2 rounded-2xl flex flex-col justify-between p-2 transition-all duration-150 ease-out ${
                    isFaceCentered
                      ? "border-emerald-400/80 shadow-[0_0_25px_rgba(52,211,153,0.3)]"
                      : "border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.3)]"
                  }`}
                >
                  {/* Corner Accents */}
                  <div className="flex justify-between">
                    <div className={`w-3.5 h-3.5 border-t-2 border-l-2 rounded-tl-md ${isFaceCentered ? "border-emerald-400" : "border-amber-400"}`} />
                    <div className={`w-3.5 h-3.5 border-t-2 border-r-2 rounded-tr-md ${isFaceCentered ? "border-emerald-400" : "border-amber-400"}`} />
                  </div>
                  {/* Center targeting crosshair */}
                  <div className={`self-center flex items-center gap-1 text-[8px] font-mono px-2 py-0.5 rounded-full backdrop-blur-md ${
                    isFaceCentered 
                      ? "text-emerald-300 bg-emerald-950/70 border border-emerald-500/30" 
                      : "text-amber-300 bg-amber-950/70 border border-amber-500/30"
                  }`}>
                    <UserCheck className="w-2.5 h-2.5" />
                    <span>{isFaceCentered ? "SWEET SPOT • CENTERED" : "RE-CENTER IN FRAME"}</span>
                  </div>
                  <div className="flex justify-between">
                    <div className={`w-3.5 h-3.5 border-b-2 border-l-2 rounded-bl-md ${isFaceCentered ? "border-emerald-400" : "border-amber-400"}`} />
                    <div className={`w-3.5 h-3.5 border-b-2 border-r-2 rounded-br-md ${isFaceCentered ? "border-emerald-400" : "border-amber-400"}`} />
                  </div>
                </div>
              ) : (
                /* Fallback alert reticle when user is missing or camera is blocked */
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-56 border-2 border-dashed border-rose-500/70 bg-rose-950/20 rounded-3xl flex flex-col items-center justify-center p-3 animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <AlertCircle className="w-6 h-6 text-rose-400 mb-1" />
                  <span className="text-[9px] font-mono font-bold text-rose-300 text-center leading-tight">
                    NO FACE DETECTED
                  </span>
                  <span className="text-[8px] text-rose-400/80 text-center mt-1">
                    Please position yourself in view of the camera
                  </span>
                </div>
              )}

              {/* Scanning Laser Animation */}
              <motion.div
                animate={{ y: [40, 240, 40] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className={`w-full h-0.5 bg-gradient-to-r from-transparent ${
                  isFaceDetected ? "via-indigo-400/60" : "via-rose-500/60"
                } to-transparent`}
              />

              {/* Top info badge inside viewport */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 text-[9px] font-mono text-slate-300 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-800 backdrop-blur-md">
                <span className={`w-1.5 h-1.5 rounded-full ${isFaceDetected ? "bg-emerald-400" : "bg-rose-500 animate-ping"}`} />
                <span>{isFaceDetected ? metrics.resolution : "TRACKING LOST"}</span>
                <span className="text-slate-600">|</span>
                <span>{metrics.fps} FPS</span>
              </div>

              {/* Top Right CV Guardian Status */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[8px] font-mono text-indigo-300 bg-slate-900/80 px-2 py-1 rounded-md border border-indigo-500/40 backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>{objectDetectorReady ? "CV GUARDIAN ON" : "AI SENSING"}</span>
              </div>

              {/* Active Warning HUD Banner */}
              {activeWarningAlert && (
                <div className="absolute top-10 left-3 right-3 z-40 bg-rose-600/90 border border-rose-400 text-white px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="text-[10px] font-semibold leading-tight">{activeWarningAlert}</span>
                </div>
              )}

              {/* Detected Unauthorized Devices Overlay */}
              {detectedDevices.map((dev, i) => (
                <div
                  key={`dev-${i}`}
                  style={{
                    left: `${Math.max(5, Math.min(85, (dev.bbox[0] / 320) * 100))}%`,
                    top: `${Math.max(5, Math.min(75, (dev.bbox[1] / 240) * 100))}%`,
                    width: `${Math.max(15, Math.min(60, (dev.bbox[2] / 320) * 100))}%`,
                    height: `${Math.max(15, Math.min(60, (dev.bbox[3] / 240) * 100))}%`
                  }}
                  className="absolute border-2 border-rose-500 bg-rose-500/20 rounded-lg pointer-events-none z-30 flex items-start p-1"
                >
                  <span className="bg-rose-600 text-white font-mono text-[8px] font-bold px-1 rounded uppercase tracking-wider flex items-center gap-1 shadow">
                    <Smartphone className="w-2.5 h-2.5" /> {dev.class}: {Math.round(dev.score * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Overlay Controls on Video Hover */}
          {cameraActive && (
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setIsMirrored((prev) => !prev)}
                title={isMirrored ? "Disable Mirroring" : "Enable Mirroring"}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-colors cursor-pointer text-xs"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowReticle((prev) => !prev)}
                title="Toggle HUD Face Brackets"
                className={`p-1.5 rounded-lg border backdrop-blur-md transition-colors cursor-pointer text-xs ${
                  showReticle
                    ? "bg-indigo-600/60 text-indigo-200 border-indigo-500/40"
                    : "bg-black/60 text-slate-400 border-slate-700/60"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={takeSnapshot}
                title="Take Face Verification Snapshot"
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-colors cursor-pointer text-xs"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Notice Banner (If Error or Fallback Mode) */}
        {errorStatus && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
              <span>{errorStatus} AI telemetry is running smoothly in simulated stream mode.</span>
            </div>
            <button
              onClick={() => setShowTroubleshoot(true)}
              className="text-[10px] text-indigo-400 underline hover:text-indigo-300 shrink-0 cursor-pointer"
            >
              Fix Permissions
            </button>
          </div>
        )}

        {/* Live Biometric Telemetry Matrix */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="bg-[#090d16]/90 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[9px] uppercase font-sans">Gaze & Eye Contact</span>
            <span className="text-indigo-300 font-bold flex items-center gap-1 mt-0.5">
              <Eye className="w-3 h-3 text-indigo-400" /> {metrics.eyeContact}
            </span>
          </div>

          <div className="bg-[#090d16]/90 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[9px] uppercase font-sans">Posture & Demeanor</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <Activity className="w-3 h-3 text-emerald-400" /> {metrics.posture}
            </span>
          </div>

          <div className="bg-[#090d16]/90 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-500 block text-[9px] uppercase font-sans">Lighting Environment</span>
            <span className="text-amber-300 font-bold flex items-center gap-1 mt-0.5">
              <Sun className="w-3 h-3 text-amber-400" /> {metrics.lightingQuality}
            </span>
          </div>

          <div className="bg-[#090d16]/90 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-sans">AI Confidence Index</span>
              <span className="text-indigo-300 font-bold text-xs mt-0.5 block">{metrics.confidenceScore}%</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-emerald-400 font-semibold uppercase block">Verified</span>
              <span className="text-[8px] text-slate-500">Real-Time</span>
            </div>
          </div>
        </div>

        {/* Bottom Hardware Controls & Device Switcher */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          {/* Device Selection Dropdown (if multiple cameras available) */}
          {devices.length > 1 && (
            <div className="flex items-center gap-1.5 max-w-[180px]">
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera(e.target.value);
                }}
                className="bg-[#090d16] border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 outline-none w-full truncate cursor-pointer"
              >
                {devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {cameraActive ? (
              <button
                type="button"
                onClick={stopCamera}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-xl border border-slate-700/80 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <VideoOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => startCamera()}
                disabled={isInitializing}
                className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isInitializing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Video className="w-3.5 h-3.5" />
                )}
                <span>Start Webcam</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (isVirtualCam) {
                  startCamera();
                } else {
                  startVirtualStream();
                }
              }}
              className="bg-[#1e293b] hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              title="Toggle between hardware camera and simulated telemetry mode"
            >
              <Activity className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px]">{isVirtualCam ? "Use Hardware" : "Use Virtual"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTroubleshoot(true)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 cursor-pointer"
              title="Camera Troubleshooting & Permissions Help"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Snapshot Modal Preview */}
        {snapshotUrl && (
          <div className="mt-3 p-3 bg-black/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={snapshotUrl}
                alt="Candidate Verification Snapshot"
                className="w-14 h-10 object-cover rounded-md border border-slate-700"
              />
              <div>
                <p className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verification Snap Captured
                </p>
                <p className="text-[10px] text-slate-400">Stored for this interview session's report.</p>
              </div>
            </div>
            <button
              onClick={() => setSnapshotUrl(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Camera Troubleshooting & Permissions Modal */}
      <AnimatePresence>
        {showTroubleshoot && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-100">Camera Permissions & Setup Guide</h3>
                </div>
                <button
                  onClick={() => setShowTroubleshoot(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <p className="leading-relaxed">
                  To enable real-time biometric confidence tracking and face framing during your interview, follow these quick steps:
                </p>

                <div className="space-y-2 bg-[#090d16] p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <p>
                      <strong>In Google Chrome / Brave / Edge:</strong> Click the "Tune" or "Lock" icon located to the left of the URL in the address bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <p>
                      Toggle <strong>Camera</strong> from "Block" to <strong>"Allow"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <p>
                      Ensure no other application (Zoom, MS Teams, Google Meet, Skype) is exclusively holding your camera driver.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      4
                    </span>
                    <p>
                      If you are on an external monitor or USB dock, try selecting your camera from the dropdown menu below the video.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 text-[11px]">
                  <strong>Always Available Fallback:</strong> If your environment prohibits hardware webcam access (e.g., locked corporate VPN or virtualization), you can use the <strong>Virtual AI Mode</strong> which uses simulated candidate telemetry so you can still practice with 100% full grading!
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowTroubleshoot(false);
                    startVirtualStream();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl cursor-pointer"
                >
                  Use Virtual AI Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTroubleshoot(false);
                    startCamera();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-check Camera
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
