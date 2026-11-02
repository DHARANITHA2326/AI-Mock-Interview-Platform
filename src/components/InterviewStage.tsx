import React, { useState, useRef, useEffect, useCallback } from "react";
import { InterviewSession, Question, BiometricSummary, TestCase, TestCaseDetail } from "../types";
import WebcamMonitor, { BiometricTelemetry } from "./WebcamMonitor";
import { 
  Mic, 
  MicOff, 
  Play, 
  Volume2, 
  Video, 
  VideoOff, 
  Send, 
  HelpCircle, 
  Code, 
  CheckCircle, 
  ArrowRight, 
  PlaySquare, 
  Award, 
  Sparkles, 
  Activity, 
  Eye, 
  Smile, 
  Check, 
  RefreshCw,
  Keyboard,
  Info,
  ShieldCheck,
  AlertTriangle,
  Square,
  RotateCcw,
  Code2,
  CheckCircle2,
  XCircle,
  FileCode,
  Flame,
  Radio
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProctoringEvent } from "../types";
import ProctoringConsentModal from "./ProctoringConsentModal";

interface InterviewStageProps {
  session: InterviewSession;
  authToken: string;
  onComplete: () => void;
}

export default function InterviewStage({ session, authToken, onComplete }: InterviewStageProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(session.questions || []);
  const currentQuestion = questions[currentIdx] || session.questions[0];

  // AI Proctoring States
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [proctoringStarted, setProctoringStarted] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [activeWarning, setActiveWarning] = useState<string | null>(null);
  const [isTerminated, setIsTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);

  // User input answers
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Answer Submission Mode (Voice vs Text)
  const [answerMode, setAnswerMode] = useState<"voice" | "text">("text");
  const [hasUsedVoiceForCurrentQuestion, setHasUsedVoiceForCurrentQuestion] = useState(false);

  // Voice Recording & Web Audio States
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioVolumeBars, setAudioVolumeBars] = useState<number[]>([15, 20, 35, 25, 45, 30, 20, 15]);
  const [isPlayingRecordedAudio, setIsPlayingRecordedAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Text-To-Speech (Interviewer Voice)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Determine initial code language based on question or target role/subject
  const getInitialCodeLang = () => {
    const subj = (currentQuestion?.subject || session.subject || session.role || "").toLowerCase();
    if (subj.includes("java") && !subj.includes("javascript")) return "java";
    if (subj.includes("python")) return "python";
    if (subj.includes("sql")) return "sql";
    if (subj.includes("c++") || subj.includes("cpp")) return "cpp";
    return "javascript";
  };

  // Coding States
  const [codeLanguage, setCodeLanguage] = useState<string>(getInitialCodeLang);
  const [code, setCode] = useState<string>("");
  const [runningCode, setRunningCode] = useState(false);
  const [activeTestCaseTab, setActiveTestCaseTab] = useState<number>(1);
  const [testResults, setTestResults] = useState<{
    passed: number;
    total: number;
    percentage: number;
    details: TestCaseDetail[];
  } | null>(null);

  // Vision & Confidence Metrics from Webcam Monitor
  const [visionMetrics, setVisionMetrics] = useState<any>(null);

  // Session-wide Biometric Telemetry Accumulator for Genuine Review
  const telemetryLogRef = useRef<{
    totalTicks: number;
    faceDetectedTicks: number;
    eyeContactScores: number[];
    postureScores: number[];
    lightingScores: number[];
    motionScores: number[];
    confidenceScores: number[];
    lightingLabels: string[];
    postureLabels: string[];
    motionLabels: string[];
    cameraActive: boolean;
    isVirtual: boolean;
  }>({
    totalTicks: 0,
    faceDetectedTicks: 0,
    eyeContactScores: [],
    postureScores: [],
    lightingScores: [],
    motionScores: [],
    confidenceScores: [],
    lightingLabels: [],
    postureLabels: [],
    motionLabels: [],
    cameraActive: false,
    isVirtual: false
  });

  const handleTelemetryUpdate = useCallback((telemetry: BiometricTelemetry) => {
    const log = telemetryLogRef.current;
    log.totalTicks += 1;
    if (telemetry.isFaceDetected) {
      log.faceDetectedTicks += 1;
      log.eyeContactScores.push(telemetry.eyeContactScore);
      log.postureScores.push(telemetry.postureScore);
      log.lightingScores.push(telemetry.lightingScore);
      log.motionScores.push(telemetry.motionScore);
      log.confidenceScores.push(telemetry.confidenceScore);
      log.lightingLabels.push(telemetry.lightingQuality);
      log.postureLabels.push(telemetry.posture);
      log.motionLabels.push(telemetry.motionLevel);
    }
    log.cameraActive = telemetry.cameraActive;
    log.isVirtual = telemetry.isVirtualCam;
  }, []);

  // Timer States based on configured Time Per Question
  const getTimeInSeconds = () => {
    if (!session.timePerQuestion) return 120;
    const match = session.timePerQuestion.match(/\d+/);
    if (match) {
      return parseInt(match[0]) * 60;
    }
    return 120;
  };

  const [timeLeft, setTimeLeft] = useState(getTimeInSeconds());
  useEffect(() => {
    setTimeLeft(getTimeInSeconds());
  }, [currentIdx, session.timePerQuestion]);

  // Load language templates for Coding round
  const loadLanguageTemplate = (lang: string) => {
    if (currentQuestion?.starterTemplates && currentQuestion.starterTemplates[lang]) {
      setCode(currentQuestion.starterTemplates[lang]);
      return;
    }
    if (lang === "javascript" && currentQuestion?.codingTemplate) {
      setCode(currentQuestion.codingTemplate);
      return;
    }

    const fnName = currentQuestion?.functionName || "solve";
    const pyFnName = fnName.replace(/([A-Z])/g, "_$1").toLowerCase();

    let template = "";
    if (lang === "javascript") {
      template = `// Implement your solution below\nfunction ${fnName}(...args) {\n  // Write your logic here\n  return args[0];\n}\n`;
    } else if (lang === "python") {
      template = `# Implement your solution below\ndef ${pyFnName}(*args):\n    # Write your logic here\n    return args[0] if args else None\n`;
    } else if (lang === "java") {
      template = `// Implement your solution in Java\nclass Solution {\n    public static Object ${fnName}(Object... args) {\n        // Write your logic here\n        return args != null && args.length > 0 ? args[0] : null;\n    }\n}\n`;
    } else if (lang === "cpp") {
      template = `// Implement your solution in C++\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint ${fnName}() {\n    // Write your solution here\n    return 0;\n}\n`;
    } else if (lang === "sql") {
      template = `-- Write your SQL query below\nSELECT d.name AS Department, e.name AS Employee, e.salary AS Salary\nFROM Employee e\nJOIN Department d ON e.department_id = d.id;\n`;
    }
    setCode(template);
  };

  // Reset state on question change
  useEffect(() => {
    if (currentQuestion?.type === "Coding") {
      const initialLang = getInitialCodeLang();
      setCodeLanguage(initialLang);
      loadLanguageTemplate(initialLang);
      setTestResults(null);
    } else {
      setAnswer("");
    }
    setEvaluation(null);
    setErrorMessage("");
    setRecordedAudioUrl(null);
    setIsRecordingAudio(false);
    setRecordingSeconds(0);
    setHasUsedVoiceForCurrentQuestion(false);
    setAnswerMode("text");
  }, [currentIdx]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // -----------------------------------------------------
  // SPEECH SYNTHESIS (INTERVIEWER VOICE CUSTOMIZATION)
  // -----------------------------------------------------
  const speakQuestion = () => {
    if (!currentQuestion) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Load user voice preferences from Settings (localStorage)
      const settingsRaw = localStorage.getItem("interview_voice_settings");
      let pitch = 1.0;
      let rate = 1.0;
      let volume = 1.0;
      let targetVoiceURI = "";

      if (settingsRaw) {
        try {
          const parsed = JSON.parse(settingsRaw);
          pitch = parsed.pitch ?? 1.0;
          rate = parsed.rate ?? 1.0;
          volume = parsed.volume ?? 1.0;
          targetVoiceURI = parsed.voiceURI || "";
        } catch {}
      }

      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.volume = volume;

      const voices = window.speechSynthesis.getVoices();
      if (targetVoiceURI) {
        const found = voices.find(v => v.voiceURI === targetVoiceURI);
        if (found) utterance.voice = found;
      } else {
        const naturalVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural"));
        if (naturalVoice) utterance.voice = naturalVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  // -----------------------------------------------------
  // CANDIDATE VOICE RECORDING & TRANSCRIPTION
  // -----------------------------------------------------
  const startVoiceRecording = async () => {
    if (isRecordingAudio) return;
    setErrorMessage("");
    audioChunksRef.current = [];
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);

    try {
      // 1. Capture microphone audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      // 2. Setup Web Audio API Analyser for real-time waveform bars
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateWaveform = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const bars = Array.from(dataArray.slice(0, 8)).map(val => Math.max(15, Math.min(65, (val / 255) * 65)));
          setAudioVolumeBars(bars);
          animFrameRef.current = requestAnimationFrame(updateWaveform);
        };
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      } catch (audioCtxErr) {
        console.warn("AudioContext visualization warning:", audioCtxErr);
      }

      // 3. Setup MediaRecorder to save actual voice audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setAnswerMode("voice");
      setHasUsedVoiceForCurrentQuestion(true);

      // Duration timer
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // 4. Concurrently run SpeechRecognition for live transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const r = new SpeechRecognition();
          r.continuous = true;
          r.interimResults = true;
          r.lang = "en-US";

          r.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            setAnswer(prev => (prev ? prev + " " + transcript : transcript));
          };

          r.onerror = () => {};
          recognitionRef.current = r;
          r.start();
        } catch {}
      }
    } catch (err: any) {
      console.warn("Microphone access error:", err);
      setErrorMessage("Could not access microphone for voice recording. Please allow microphone permissions or use Text Mode.");
      setIsRecordingAudio(false);
    }
  };

  const stopVoiceRecording = () => {
    if (!isRecordingAudio) return;
    setIsRecordingAudio(false);

    // Stop duration timer
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }

    // Stop audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }

    // Stop speech recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  };

  const toggleRecordedAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingRecordedAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingRecordedAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingRecordedAudio(true);
    }
  };

  // -----------------------------------------------------
  // CODING TEST CASE RUNNER & SCORE EVALUATION
  // -----------------------------------------------------
  // -----------------------------------------------------
  // CODING TEST CASE RUNNER & SCORE EVALUATION (REAL EXECUTION)
  // -----------------------------------------------------
  const executeCodeTestCases = async (): Promise<any> => {
    const cases: TestCase[] = currentQuestion?.testCases && currentQuestion.testCases.length > 0 
      ? currentQuestion.testCases
      : [
          { id: 1, input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]", description: "Sample standard case" },
          { id: 2, input: "[3, 2, 4], 6", expectedOutput: "[1, 2]", description: "Unsorted indices" },
          { id: 3, input: "[3, 3], 6", expectedOutput: "[0, 1]", description: "Duplicate elements" },
          { id: 4, input: "[1, 5, 8, 3], 11", expectedOutput: "[2, 3]", description: "Boundary indices" }
        ];

    try {
      const res = await fetch("/api/interview/execute-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          code,
          language: codeLanguage,
          testCases: cases,
          questionId: currentQuestion?.id,
          functionName: currentQuestion?.functionName
        })
      });

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      console.warn("Server runner call issue, running strict client-side engine:", e);
    }

    // Strict client-side fallback where correct logic passes and wrong code fails
    let passedCount = 0;
    const details: TestCaseDetail[] = [];

    // Candidates to invoke
    const candidates: string[] = [];
    if (currentQuestion?.functionName) candidates.push(currentQuestion.functionName);
    const fnDeclRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>))/g;
    let m;
    while ((m = fnDeclRegex.exec(code)) !== null) {
      const name = m[1] || m[2];
      if (name && !candidates.includes(name)) candidates.push(name);
    }
    const commonNames = ["twoSum", "isPalindrome", "isValid", "maxSubArray", "maxProfit", "containsDuplicate", "isAnagram", "climbStairs", "singleNumber", "reverseString", "search", "moveZeroes", "lengthOfLastWord", "plusOne", "longestCommonPrefix", "maxArea", "lengthOfLongestSubstring", "rob", "reverseWords", "fizzBuzz", "solve"];
    for (const cn of commonNames) {
      if (!candidates.includes(cn)) candidates.push(cn);
    }

    for (const tc of cases) {
      let isPass = false;
      let actualOutput = "";
      let errorMsg: string | undefined = undefined;

      try {
        if (codeLanguage === "javascript") {
          // Clean input arguments (strip nums = ..., target = ...)
          let cleanedInput = (tc.input || "").trim();
          cleanedInput = cleanedInput.replace(/(?:^|,\s*)[a-zA-Z0-9_]+\s*=\s*/g, (match) => match.startsWith(",") ? ", " : "").trim();

          const wrappedCode = `
            ${code}
            return (function() {
              const candidateNames = ${JSON.stringify(candidates)};
              let fn = null;
              for (const name of candidateNames) {
                try {
                  const val = eval(name);
                  if (typeof val === 'function') { fn = val; break; }
                } catch(e) {}
              }
              if (!fn) {
                try {
                  if (typeof Solution === 'function' || typeof Solution === 'object') {
                    const inst = typeof Solution === 'function' ? new Solution() : Solution;
                    for (const name of candidateNames) {
                      if (typeof inst[name] === 'function') { fn = inst[name].bind(inst); break; }
                    }
                  }
                } catch(e) {}
              }
              if (!fn) throw new Error("No callable solution function defined in code");
              const args = [${cleanedInput}];
              return fn(...args);
            })();
          `;
          const runner = new Function(wrappedCode);
          const result = runner();
          actualOutput = result !== undefined ? (typeof result === 'object' && result !== null ? JSON.stringify(result) : String(result)) : "undefined";

          // Normalized comparison
          const normExpected = String(tc.expectedOutput).trim().replace(/\\s+/g, "").toLowerCase();
          const normActual = actualOutput.trim().replace(/\\s+/g, "").toLowerCase();

          isPass = (normActual === normExpected);
          if (!isPass) {
            // Strip string wrapping quotes
            let se = normExpected.replace(/^["']|["']$/g, "");
            let sa = normActual.replace(/^["']|["']$/g, "");
            if (se === sa) isPass = true;
          }
          if (!isPass && !isNaN(Number(actualOutput)) && !isNaN(Number(tc.expectedOutput))) {
            isPass = Number(actualOutput) === Number(tc.expectedOutput);
          }
          if (!isPass) {
            errorMsg = `Output mismatch: expected ${tc.expectedOutput}, got ${actualOutput}`;
          }
        } else {
          actualOutput = "Execution requires server runner (running now...)";
          isPass = false;
          errorMsg = "Server runner offline";
        }
      } catch (err: any) {
        actualOutput = "Error: " + (err.message || "Execution failed");
        isPass = false;
        errorMsg = err.message;
      }

      if (isPass) passedCount++;
      details.push({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: actualOutput,
        passed: isPass,
        error: errorMsg
      });
    }

    const total = cases.length;
    const percentage = Math.round((passedCount / total) * 100);

    return {
      passed: passedCount,
      total,
      percentage,
      details
    };
  };

  const runTestCases = async () => {
    setRunningCode(true);
    try {
      const results = await executeCodeTestCases();
      setTestResults(results);
    } catch (err: any) {
      console.error("Test execution failed:", err);
    } finally {
      setRunningCode(false);
    }
  };

  // -----------------------------------------------------
  // SUBMIT CURRENT RESPONSE (VOICE, TEXT, OR CODE)
  // -----------------------------------------------------
  const handleSubmitCurrentQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || evaluation) return;

    const isCoding = currentQuestion?.type === "Coding";
    if (isCoding && !code.trim()) {
      setErrorMessage("Please write your code solution before submitting.");
      return;
    }
    if (!isCoding && !answer.trim() && !recordedAudioUrl) {
      setErrorMessage("Please type or record your answer before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload: any = {
        sessionId: session.id,
        questionId: currentQuestion.id,
        candidateAnswer: isCoding ? code : answer,
        answerMethod: hasUsedVoiceForCurrentQuestion || answerMode === "voice" ? "voice" : "text",
      };

      if (isCoding) {
        payload.candidateCode = code;
        payload.selectedLanguage = codeLanguage;
        // Strictly execute test cases if not already executed
        let finalResults = testResults;
        if (!finalResults) {
          finalResults = await executeCodeTestCases();
          setTestResults(finalResults);
        }
        payload.testResults = finalResults;
      }

      if (recordedAudioUrl) {
        payload.audioRecordingUrl = recordedAudioUrl;
      }

      const response = await fetch("/api/interview/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to evaluate response.");
      setEvaluation(data.evaluation);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting || evaluation) return;
    setIsSubmitting(true);
    setErrorMessage("");
    const skippedAnswer = "(Skipped: Candidate chose to skip this question.)";

    try {
      const response = await fetch("/api/interview/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          sessionId: session.id,
          questionId: currentQuestion.id,
          candidateAnswer: skippedAnswer,
          answerMethod: "text"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to skip question.");
      setEvaluation(data.evaluation);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to skip question.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------
  // ADVANCE OR FINALIZE INTERVIEW
  // -----------------------------------------------------
  const handleNextStep = async () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setEvaluation(null);
      setAnswer("");
      setCode("");
      setTestResults(null);
      setErrorMessage("");
      setRecordedAudioUrl(null);
      setIsRecordingAudio(false);
      setHasUsedVoiceForCurrentQuestion(false);
      setAnswerMode("text");
      setTimeLeft(getTimeInSeconds());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIsSubmitting(true);
      try {
        const log = telemetryLogRef.current;
        let biometricsSummary: BiometricSummary | undefined = undefined;

        if (log.totalTicks > 0) {
          const facePresencePct = Math.round((log.faceDetectedTicks / log.totalTicks) * 100);
          const avgEyeContact = log.eyeContactScores.length > 0 
            ? Math.round(log.eyeContactScores.reduce((a, b) => a + b, 0) / log.eyeContactScores.length) 
            : 0;
          const avgPosture = log.postureScores.length > 0
            ? Math.round(log.postureScores.reduce((a, b) => a + b, 0) / log.postureScores.length)
            : 0;
          const avgLighting = log.lightingScores.length > 0
            ? Math.round(log.lightingScores.reduce((a, b) => a + b, 0) / log.lightingScores.length)
            : 0;
          const avgConfidence = log.confidenceScores.length > 0
            ? Math.round(log.confidenceScores.reduce((a, b) => a + b, 0) / log.confidenceScores.length)
            : 0;

          const getDominant = (arr: string[], fallback: string) => {
            if (arr.length === 0) return fallback;
            const counts: Record<string, number> = {};
            arr.forEach(item => { counts[item] = (counts[item] || 0) + 1; });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
          };

          const dominantLighting = getDominant(log.lightingLabels, "Optimal Studio Lighting");
          const dominantPosture = getDominant(log.postureLabels, "Upright & Centered");
          const dominantMotion = getDominant(log.motionLabels, "Poised & Still");

          let demeanorNarrative = "";
          if (!log.cameraActive) {
            demeanorNarrative = "Camera feed was not active during this interview session.";
          } else if (facePresencePct >= 85) {
            demeanorNarrative = `Maintained steady presence in ${facePresencePct}% of frames with ${dominantPosture.toLowerCase()} and forward focus (${avgEyeContact}% eye contact).`;
          } else {
            demeanorNarrative = `Candidate visible in ${facePresencePct}% of frames with occasional shifts outside the camera center.`;
          }

          biometricsSummary = {
            cameraUsed: log.cameraActive,
            isVirtual: log.isVirtual,
            facePresencePct,
            eyeContactPct: avgEyeContact,
            lightingQuality: dominantLighting,
            lightingScore: avgLighting,
            posturePoise: dominantPosture,
            postureScore: avgPosture,
            motionLevel: dominantMotion,
            confidenceIndex: avgConfidence,
            totalFramesAnalyzed: log.totalTicks,
            candidateDemeanorReview: demeanorNarrative
          };
        }

        await fetch("/api/proctoring/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ sessionId: session.id, status: "completed" })
        });

        await fetch("/api/interview/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ sessionId: session.id, biometricsSummary })
        });

        onComplete();
      } catch (err) {
        console.error("Complete session error:", err);
        onComplete();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isLastQuestion = currentIdx === questions.length - 1;
  const isCodingQuestion = currentQuestion?.type === "Coding";

  return (
    <div id="interview-stage-view" className="space-y-6 bg-[#090d16] min-h-screen text-slate-100 p-4 md:p-10 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Pre-Interview Camera & AI Proctoring Consent Modal */}
      <ProctoringConsentModal
        isOpen={showConsentModal}
        onAgreeAndStart={() => {
          setShowConsentModal(false);
          setProctoringStarted(true);
        }}
        onCancel={() => onComplete()}
        interviewTitle={session.role || session.interviewType}
      />

      {/* Header bar: Round details, progress & timer */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/60 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-400 font-mono font-bold tracking-widest uppercase">
              {session.interviewType}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 font-semibold">
              Subject: <strong className="text-indigo-300">{currentQuestion?.subject || session.subject || session.role}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-100 tracking-tight mt-1">
            Question {currentIdx + 1} of {questions.length}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">
            Company: <strong className="text-slate-200">{session.company}</strong>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <span className="text-xs text-slate-400">
            Difficulty: <strong className="text-indigo-400">{currentQuestion?.difficulty || session.difficulty || "Medium"}</strong>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />

          {/* Time Remaining Badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            timeLeft < 30
              ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse"
              : "bg-slate-900 border-slate-800 text-slate-300"
          }`}>
            <span>Time:</span>
            <span>{Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? "0" : ""}{timeLeft % 60}</span>
          </div>
        </div>
      </div>

      {/* Proctoring Warning Banner */}
      {activeWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl flex items-center justify-between gap-3 text-rose-200 text-xs shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 animate-bounce" />
            <span className="font-semibold">{activeWarning}</span>
          </div>
          <button
            onClick={() => setActiveWarning(null)}
            className="text-[10px] text-rose-300 hover:text-white uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded bg-rose-900/50 cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden relative border border-slate-900">
        <div 
          className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          style={{ width: `${((currentIdx + (evaluation ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      {/* NOTIFICATION: Answer evaluated banner */}
      {evaluation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 font-bold text-sm">
              {evaluation.score}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Response Evaluated ({evaluation.score}/100)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {isCodingQuestion && evaluation.passedTestsNote
                  ? evaluation.passedTestsNote
                  : `Question ${currentIdx + 1} completed. Proceed to next challenge whenever you're ready.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleNextStep}
            className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
          >
            {isLastQuestion ? "Finish & View Final Report" : `Proceed to Question ${currentIdx + 2}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} className="text-red-300 font-bold text-sm ml-2">×</button>
        </div>
      )}

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Workspace Left: Question & Input Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Question Box */}
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl relative">
            <div className="flex items-center justify-between mb-3">
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold">
                {currentQuestion?.type || "Technical"} Round • {currentQuestion?.category || currentQuestion?.subject || session.role}
              </span>
              
              <button
                onClick={speakQuestion}
                disabled={isSpeaking}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Read aloud using your configured interviewer voice"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "text-indigo-400 animate-bounce" : ""}`} />
                {isSpeaking ? "Speaking..." : "Read Aloud"}
              </button>
            </div>

            <div className="flex items-start gap-3 mt-1">
              <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-slate-100 font-medium font-display leading-relaxed text-base">
                  {currentQuestion?.text}
                </p>
                {currentQuestion?.expectedOutput && !isCodingQuestion && (
                  <p className="text-xs text-slate-500 italic mt-1 font-mono">
                    Focus: {currentQuestion.expectedOutput}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================
              VIEW A: CODING TEST COMPONENT (WITH TEST CASES & AUTO-SCORING)
              ========================================================= */}
          {isCodingQuestion ? (
            <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-5">
              
              {/* Language Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-3 gap-3">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Interactive Coding Sandbox</h3>
                    <p className="text-[11px] text-slate-500">Solve the challenge and verify against the test suite</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={codeLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setCodeLanguage(newLang);
                      loadLanguageTemplate(newLang);
                    }}
                    disabled={!!evaluation}
                    className="bg-[#090d16] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-indigo-300 font-mono font-semibold outline-none cursor-pointer"
                  >
                    <option value="javascript">JavaScript (Node / ES6)</option>
                    <option value="python">Python 3</option>
                    <option value="java">Java 17/21</option>
                    <option value="cpp">C++ (GCC)</option>
                    <option value="sql">SQL / Relational</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => loadLanguageTemplate(codeLanguage)}
                    disabled={!!evaluation}
                    className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                    title="Reset to starter template"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code Editor Area */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b13]">
                <div className="flex items-center justify-between bg-slate-950/80 px-4 py-2 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    solution.{codeLanguage === "javascript" ? "js" : codeLanguage === "python" ? "py" : codeLanguage === "java" ? "java" : codeLanguage === "cpp" ? "cpp" : "sql"}
                  </span>
                  <span>UTF-8 • Monospaced</span>
                </div>
                <textarea
                  disabled={!!evaluation}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-72 bg-[#070b13] p-4 font-mono text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500/40 resize-none leading-relaxed disabled:opacity-60"
                  placeholder="// Type your code solution here..."
                />
              </div>

              {/* Test Cases Panel */}
              <div className="space-y-3 bg-[#090d16]/90 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                      Test Cases Suite
                    </span>
                  </div>

                  {testResults && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                        testResults.percentage === 100
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : testResults.percentage >= 50
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}>
                        Score: {testResults.percentage}% ({testResults.passed}/{testResults.total} Passed)
                      </span>
                    </div>
                  )}
                </div>

                {/* Test Cases Tabs */}
                <div className="flex flex-wrap gap-2">
                  {(testResults?.details || currentQuestion.testCases || [
                    { id: 1, input: "[2, 7, 11, 15], 9", expected: "[0, 1]", passed: false },
                    { id: 2, input: "[3, 2, 4], 6", expected: "[1, 2]", passed: false },
                    { id: 3, input: "[3, 3], 6", expected: "[0, 1]", passed: false }
                  ]).map((tc: any) => {
                    const isPassed = tc.passed;
                    const isRun = testResults !== null;
                    return (
                      <button
                        key={tc.id}
                        type="button"
                        onClick={() => setActiveTestCaseTab(tc.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          activeTestCaseTab === tc.id
                            ? "bg-indigo-600 text-white border-indigo-500"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {isRun ? (
                          isPassed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )
                        ) : null}
                        Case {tc.id}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Test Case Content Box */}
                {(() => {
                  const casesList: any[] = testResults?.details || currentQuestion.testCases || [
                    { id: 1, input: "[2, 7, 11, 15], 9", expected: "[0, 1]", expectedOutput: "[0, 1]" },
                    { id: 2, input: "[3, 2, 4], 6", expected: "[1, 2]", expectedOutput: "[1, 2]" },
                    { id: 3, input: "[3, 3], 6", expected: "[0, 1]", expectedOutput: "[0, 1]" }
                  ];
                  const activeCase = casesList.find((c: any) => c.id === activeTestCaseTab) || casesList[0];

                  return (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Input:</span>
                        <span className="text-slate-300">{activeCase?.input || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block">Expected Output:</span>
                        <span className="text-emerald-400">{activeCase?.expected || activeCase?.expectedOutput || "N/A"}</span>
                      </div>
                      {activeCase?.actual !== undefined && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase block">Your Output:</span>
                          <span className={activeCase?.passed ? "text-emerald-400" : "text-rose-400 font-bold"}>
                            {activeCase?.actual || "[No output returned]"}
                          </span>
                        </div>
                      )}
                      {activeCase?.error && (
                        <div className="text-rose-400 text-[11px]">
                          Error: {activeCase.error}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={runTestCases}
                    disabled={runningCode || !!evaluation}
                    className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PlaySquare className="w-4 h-4 text-emerald-400" />
                    {runningCode ? "Testing..." : "Run Test Cases"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSubmitting || !!evaluation}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Skip
                  </button>
                </div>

                {evaluation ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    {isLastQuestion ? "Finish Interview & View Report" : `Next Question (${currentIdx + 2}/${questions.length})`}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmitCurrentQuestion()}
                    disabled={isSubmitting || !code.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1e1b4b] text-slate-100 text-xs font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                        Grading Code Solution...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Code Solution
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* =========================================================
                VIEW B: VERBAL / STAR RESPONSE INTERFACE (VOICE RECORDING & TEXT)
                ========================================================= */
            <form onSubmit={handleSubmitCurrentQuestion} className="space-y-4">
              <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
                
                {/* Header: Mode Selector & Recording Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/60 pb-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    <span className="text-sm font-semibold text-slate-200">Candidate Response</span>
                  </div>

                  {/* Submission Mode Selector */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-slate-800 text-[11px] font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          setAnswerMode("text");
                          if (isRecordingAudio) stopVoiceRecording();
                        }}
                        disabled={!!evaluation}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                          answerMode === "text" && !recordedAudioUrl
                            ? "bg-indigo-600 text-white font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Keyboard className="w-3 h-3" /> Text Mode
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAnswerMode("voice");
                          if (!isRecordingAudio && !recordedAudioUrl) startVoiceRecording();
                        }}
                        disabled={!!evaluation}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                          answerMode === "voice" || recordedAudioUrl
                            ? "bg-indigo-600 text-white font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <Mic className="w-3 h-3 text-emerald-400" /> Voice Recording
                      </button>
                    </div>

                    {/* Start / Stop Voice Recording Button */}
                    {!evaluation && (
                      <button
                        type="button"
                        onClick={isRecordingAudio ? stopVoiceRecording : startVoiceRecording}
                        disabled={isSubmitting}
                        className={`text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                          isRecordingAudio
                            ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                            : "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                        }`}
                      >
                        {isRecordingAudio ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            Stop Recording ({recordingSeconds}s)
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            {recordedAudioUrl ? "Re-record Voice" : "Record Voice Answer"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Real-Time Live Audio Waveform & Recording Indicator */}
                {isRecordingAudio && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 bg-slate-950 rounded-xl border border-red-500/30 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-mono font-bold text-red-400">
                        Recording Voice: 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                      </span>
                    </div>

                    {/* Animated Volume Waveform Bars */}
                    <div className="flex items-center gap-1.5 h-8">
                      {audioVolumeBars.map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}px` }}
                          className="w-1.5 bg-gradient-to-t from-red-500 to-indigo-400 rounded-full transition-all duration-75"
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      Done Speaking
                    </button>
                  </motion.div>
                )}

                {/* Recorded Audio Playback Card */}
                {recordedAudioUrl && !isRecordingAudio && (
                  <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                        <Radio className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-200 block">Voice Answer Recorded ({recordingSeconds}s)</span>
                        <span className="text-[11px] text-slate-400">AI will evaluate articulation, clarity, and technical correctness</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <audio ref={audioPlayerRef} src={recordedAudioUrl} onEnded={() => setIsPlayingRecordedAudio(false)} className="hidden" />
                      <button
                        type="button"
                        onClick={toggleRecordedAudioPlayback}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {isPlayingRecordedAudio ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current text-indigo-400" />}
                        {isPlayingRecordedAudio ? "Pause" : "Play Recording"}
                      </button>
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        disabled={!!evaluation}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Re-record
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode Explanation Notice */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-900">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {hasUsedVoiceForCurrentQuestion || answerMode === "voice" || recordedAudioUrl ? (
                      <span className="text-emerald-300">
                        <strong>Voice Mode:</strong> Spoken communication and articulation clarity will be scored based on your voice.
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        <strong>Text Mode:</strong> Communication score is avoided/excluded. Technical accuracy & problem-solving will be evaluated.
                      </span>
                    )}
                  </span>
                </div>

                <textarea
                  required
                  disabled={!!evaluation}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    evaluation
                      ? "Answer submitted! Review the AI assessment below or click Proceed to advance."
                      : isRecordingAudio
                      ? "Listening to your voice... (Live speech transcript will appear here)"
                      : "Type your response with technical clarity, or click 'Record Voice Answer' above to speak."
                  }
                  className="w-full h-44 bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-sm text-slate-200 outline-none transition-colors resize-none leading-relaxed disabled:opacity-60"
                />

                <div className="flex justify-between items-center w-full pt-1">
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSubmitting || !!evaluation}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Skip Question
                  </button>

                  {evaluation ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                    >
                      {isLastQuestion ? "Finish Interview & View Final Report" : `Proceed to Question ${currentIdx + 2}`}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting || (!answer.trim() && !recordedAudioUrl)}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1e1b4b] text-slate-100 font-semibold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                          Evaluating Answer...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          {recordedAudioUrl ? "Submit Recorded Answer" : "Submit Answer"}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* -----------------------------------------------------
              IMMEDIATE EVALUATION DISPLAY
              ----------------------------------------------------- */}
          {evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl space-y-5 backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 font-mono text-3xl font-black text-indigo-500/10 pointer-events-none">
                {evaluation.score}/100
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold font-display text-slate-200">
                    Real-time Assessment (Score: {evaluation.score}/100)
                  </h3>
                </div>
                <button
                  onClick={handleNextStep}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-4 py-2 rounded-xl text-slate-100 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isLastQuestion ? "Complete Session" : "Next Question"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rubric Score Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Technical</span>
                  <span className="text-sm font-bold text-slate-200">{evaluation.technicalAccuracy}/10</span>
                </div>
                <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Communication</span>
                  {evaluation.communication !== null && evaluation.communication !== undefined ? (
                    <span className="text-sm font-bold text-slate-200">{evaluation.communication}/10</span>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-amber-400">N/A</span>
                      <span className="text-[8px] text-slate-400 block font-mono">
                        {isCodingQuestion ? "Coding Test" : "Text Mode"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Confidence</span>
                  <span className="text-sm font-bold text-slate-200">{evaluation.confidence}/10</span>
                </div>
                <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Completeness</span>
                  <span className="text-sm font-bold text-slate-200">{evaluation.completeness}/10</span>
                </div>
                <div className="bg-[#090d16]/80 p-2.5 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                  <span className="text-[9px] text-slate-500 uppercase block font-semibold">Problem Solving</span>
                  <span className="text-sm font-bold text-slate-200">{evaluation.problemSolving}/10</span>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#090d16]/40 p-4 rounded-xl border border-emerald-500/10">
                  <span className="font-semibold text-emerald-400 block mb-1.5 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Strengths:
                  </span>
                  {evaluation.strengths && evaluation.strengths.length > 0 ? (
                    <ul className="list-disc pl-4 text-slate-300 space-y-1">
                      {evaluation.strengths.map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic">No specific strengths noted in this response.</p>
                  )}
                </div>
                <div className="bg-[#090d16]/40 p-4 rounded-xl border border-red-500/10">
                  <span className="font-semibold text-red-400 block mb-1.5">Constructive Areas:</span>
                  {evaluation.weaknesses && evaluation.weaknesses.length > 0 ? (
                    <ul className="list-disc pl-4 text-slate-300 space-y-1">
                      {evaluation.weaknesses.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic">No critical errors observed.</p>
                  )}
                </div>
              </div>

              {/* Identified Mistakes / Gaps */}
              {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                <div className="text-xs bg-[#090d16]/40 p-4 rounded-xl border border-amber-500/10">
                  <span className="font-semibold text-amber-400 block mb-1.5">Identified Gaps or Failed Cases:</span>
                  <ul className="list-disc pl-4 text-slate-300 space-y-1">
                    {evaluation.mistakes.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Exemplar Ideal Answer */}
              {evaluation.idealAnswer && (
                <div className="text-xs bg-[#090d16]/60 p-4 rounded-xl border border-indigo-500/15">
                  <span className="font-semibold text-indigo-300 block mb-1.5 font-mono">Expert Exemplar Response:</span>
                  <p className="text-slate-300 italic whitespace-pre-line leading-relaxed">{evaluation.idealAnswer}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Workspace Right Panel: Webcam & Real-Time Confidence Monitor */}
        <div className="space-y-6">
          <WebcamMonitor 
            isSpeaking={isSpeaking}
            isListening={isRecordingAudio}
            onMetricsUpdate={(m) => setVisionMetrics(m)}
            onTelemetryUpdate={handleTelemetryUpdate}
            onProctoringViolation={async (event) => {
              if (isTerminated || !proctoringStarted) return;
              try {
                const res = await fetch("/api/proctoring/events", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${authToken}`
                  },
                  body: JSON.stringify({ sessionId: session.id, event })
                });
                const data = await res.json();
                if (data.totalWarnings !== undefined) setWarningCount(data.totalWarnings);
                setActiveWarning(`Warning: ${event.details}`);
                setTimeout(() => setActiveWarning(null), 6000);
              } catch {}
            }}
            proctoringActive={proctoringStarted && !isTerminated}
            activeWarningAlert={activeWarning}
          />

          {/* Quick Round Advisor Card */}
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-3">
            <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" /> Round Advisor Tips
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {currentQuestion?.type === "Coding" ? (
                <span>In this Coding Test, implement your logic and click <strong>Run Test Cases</strong> to verify your solution. Your final score will be awarded based on passed test cases!</span>
              ) : currentQuestion?.type === "Behavioral" ? (
                <span>This is an HR question. Answer with honest self-reflection using the STAR structure (Situation, Task, Action, Result).</span>
              ) : (
                <span>Subject: <strong className="text-slate-200">{currentQuestion?.subject || session.subject || session.role}</strong>. Mention technical mechanisms, runtime complexities, and production trade-offs.</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
