import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  Camera, 
  Video, 
  VideoOff, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Eye, 
  Smartphone, 
  Users, 
  Clock, 
  Check, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProctoringConsentModalProps {
  isOpen: boolean;
  onAgreeAndStart: () => void;
  onCancel: () => void;
  interviewTitle?: string;
}

export default function ProctoringConsentModal({
  isOpen,
  onAgreeAndStart,
  onCancel,
  interviewTitle = "AI Technical Interview"
}: ProctoringConsentModalProps) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [cameraState, setCameraState] = useState<"checking" | "ready" | "denied" | "unavailable">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera preview
  const initCamera = async (deviceId?: string) => {
    setCameraState("checking");
    setErrorMessage(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam access is not supported by your browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraState("ready");

      // Enumerate devices
      if (navigator.mediaDevices.enumerateDevices) {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (err: any) {
      console.warn("Camera init error in modal:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraState("denied");
        setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings to proceed.");
      } else {
        // Fallback for sandboxed preview / environments without physical cameras
        setCameraState("ready"); // Allow continuation in virtual mode
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      initCamera(selectedDeviceId);
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, selectedDeviceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-display">AI Proctoring & Monitoring Policy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pre-interview hardware verification and candidate consent</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs rounded-full font-mono">
            {interviewTitle}
          </span>
        </div>

        {/* Camera Preview & Status */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative aspect-video bg-black/60 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            {cameraState === "ready" ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                {cameraState === "checking" ? (
                  <>
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs text-slate-400">Checking camera availability...</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="w-8 h-8 text-rose-400" />
                    <p className="text-xs text-rose-300 font-medium">Camera Not Available</p>
                    <p className="text-[11px] text-slate-400">{errorMessage || "Please connect a camera or grant permission."}</p>
                    <button
                      type="button"
                      onClick={() => initCamera(selectedDeviceId)}
                      className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition"
                    >
                      Retry Permission
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-md text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${cameraState === "ready" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {cameraState === "ready" ? "LIVE PREVIEW OK" : "CHECKING FEED"}
            </div>
          </div>

          {/* Monitored Indicators List */}
          <div className="space-y-2.5 text-xs">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" /> Monitored Real-Time Events
            </h4>
            
            <div className="p-2.5 rounded-lg bg-slate-850 border border-slate-800 space-y-2">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200 font-medium">Face & Multi-Person Presence</p>
                  <p className="text-[11px] text-slate-400">Flags when no face is visible for &gt;4s or additional individuals enter frame.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200 font-medium">Gaze & Eye Contact</p>
                  <p className="text-[11px] text-slate-400">Brief natural glances are normal; prolonged gaze away (&gt;3.5s) is recorded.</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-200 font-medium">Prohibited Device Detection</p>
                  <p className="text-[11px] text-slate-400">Local CV checks for mobile phones, tablets, or secondary screens.</p>
                </div>
              </div>
            </div>

            {devices.length > 1 && (
              <div className="mt-1">
                <label className="text-[11px] text-slate-400 block mb-1">Select Camera Device:</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    initCamera(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Policy & Fair Evaluation Notice */}
        <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-300 font-medium text-xs">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Fair Proctoring Policy & Automatic Escalation</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            • <strong>1st Violation:</strong> On-screen warning reminder.<br />
            • <strong>2nd Violation:</strong> Stronger warning with incident logged.<br />
            • <strong>Repeated / Critical Violations:</strong> The session terminates automatically, current responses are saved, and an integrity breakdown is generated.<br />
            • <strong>Score Independence:</strong> Your technical score is evaluated independently from the integrity report.
          </p>
        </div>

        {/* Informed Consent Agreement Checkbox */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col gap-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-slate-300 leading-snug">
              I understand and agree to the <strong>AI Proctoring Monitoring Policy</strong>. I consent to webcam-based gaze, presence, and device monitoring during the interview. I acknowledge that results are AI-generated integrity estimates, and my camera feed will be released immediately when the session ends.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasAgreed}
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getTracks().forEach((track) => track.stop());
                  streamRef.current = null;
                }
                onAgreeAndStart();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs transition shadow-lg ${
                hasAgreed
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              <Check className="w-4 h-4" />
              Agree & Begin Interview
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
