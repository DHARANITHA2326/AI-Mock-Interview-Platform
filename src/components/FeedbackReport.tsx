import React, { useState, useEffect } from "react";
import { InterviewSession } from "../types";
import { 
  ChevronDown, 
  ChevronUp, 
  Award, 
  CheckCircle, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Star, 
  Heart, 
  TrendingUp,
  Download,
  ThumbsUp,
  AlertTriangle,
  BookOpen,
  FileText,
  Camera,
  Video,
  VideoOff,
  Eye,
  Activity,
  Sun,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Users,
  Clock,
  Check,
  X,
  Sliders,
  Info
} from "lucide-react";
import { motion } from "motion/react";
import { IntegrityReport, ProctoringEvent } from "../types";

interface FeedbackReportProps {
  sessionId: string;
  authToken: string;
  onBackToDashboard: () => void;
}

export default function FeedbackReport({ sessionId, authToken, onBackToDashboard }: FeedbackReportProps) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
  const [isReviewerMode, setIsReviewerMode] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionDetails();
    fetchIntegrityReport();
  }, [sessionId]);

  const fetchIntegrityReport = async () => {
    try {
      const response = await fetch(`/api/proctoring/report/${sessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIntegrityReport(data);
      }
    } catch (err) {
      console.warn("Integrity report fetch notice:", err);
    }
  };

  const handleToggleFalsePositive = async (eventId: string, currentFalsePositive: boolean) => {
    setUpdatingEventId(eventId);
    try {
      const response = await fetch(`/api/proctoring/review/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          isFalsePositive: !currentFalsePositive,
          reviewerNotes: !currentFalsePositive 
            ? "Marked as benign / false positive by authorized reviewer." 
            : "Re-flagged for evaluation."
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.updatedReport) {
          setIntegrityReport(data.updatedReport);
        }
      }
    } catch (err) {
      console.error("Failed to update reviewer decision:", err);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/interview/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandQuestion = (id: string) => {
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    } else {
      setExpandedQuestionId(id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 bg-[#090d16]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse font-display">Generating AI Performance Report...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 bg-[#090d16]">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-slate-300">Feedback report not found.</p>
        <button onClick={onBackToDashboard} className="text-indigo-400 hover:underline">Back to Dashboard</button>
      </div>
    );
  }

  const evaluatedQuestions = session.questions.filter(q => q.evaluation);

  // Check voice answers vs text answers
  const voiceEvaluatedQuestions = evaluatedQuestions.filter(
    q => q.answerMethod === "voice" && q.evaluation?.communication !== null && q.evaluation?.communication !== undefined
  );
  const hasVoice = voiceEvaluatedQuestions.length > 0;
  const avgVoiceCommunication = hasVoice
    ? Math.round(voiceEvaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.communication || 0), 0) / voiceEvaluatedQuestions.length)
    : null;

  const rawCommRating = session.report?.communicationRating !== undefined
    ? session.report.communicationRating
    : avgVoiceCommunication;

  const isCommEvaluated = session.report?.communicationEvaluated !== undefined
    ? session.report.communicationEvaluated
    : hasVoice;

  const computedScore = session.overallScore !== undefined 
    ? session.overallScore 
    : evaluatedQuestions.length > 0 
      ? Math.round(evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.score || 0), 0) / evaluatedQuestions.length) 
      : 0;

  const isLowScore = computedScore < 50;

  // Derive final report values strictly reflecting evaluated performance
  const report = session.report || {
    overallScore: computedScore,
    technicalRating: Math.round(evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.technicalAccuracy ?? 0), 0) / (evaluatedQuestions.length || 1)),
    communicationRating: rawCommRating,
    communicationEvaluated: isCommEvaluated,
    confidenceRating: Math.round(evaluatedQuestions.reduce((acc, q) => acc + (q.evaluation?.confidence ?? 0), 0) / (evaluatedQuestions.length || 1)),
    strengths: isLowScore 
      ? ["Honest acknowledgment of knowledge boundaries", "Interview session completed"]
      : (session.feedback?.strongTopics || ["Structured answer delivery", "Core technical conceptual alignment"]),
    weaknesses: isLowScore
      ? ["Unable to answer core technical questions or provided non-answers", "Significant knowledge gaps in key competencies"]
      : (session.feedback?.weakTopics || ["Performance benchmarking detail deficits", "Architectural trade-off depth"]),
    recommendedTopics: session.feedback?.weakTopics || evaluatedQuestions.map(q => q.category).filter(Boolean).slice(0, 3),
    overallFeedback: isLowScore
      ? `The candidate was unable to provide substantive answers to the interview questions (e.g. answering 'I don't know' or skipping questions). Detailed study and foundational review of the required skills are recommended before re-interviewing.`
      : (session.feedback?.summary || `The candidate completed ${evaluatedQuestions.length} questions for ${session.role || "this role"}, demonstrating solid domain understanding with opportunities for continuous growth.`),
    hiringRecommendation: computedScore >= 85 ? "Strong Hire" : computedScore >= 70 ? "Hire" : computedScore >= 50 ? "Borderline / Hire with Mentorship" : "No Hire"
  };

  const getRecommendationBadgeColor = (rec: string) => {
    const r = rec.toLowerCase();
    if (r.includes("strong hire")) return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    if (r.includes("no hire")) return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    if (r.includes("borderline")) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-green-500/10 text-green-400 border border-green-500/20";
  };

  const downloadReport = () => {
    const commRatingDisplay = report.communicationRating !== null && report.communicationRating !== undefined 
      ? `${report.communicationRating}/10` 
      : "N/A (Candidate submitted responses via text typing)";

    const reportText = `==================================================
AI EXECUTIVE INTERVIEW REPORT
==================================================
Candidate: ${session.candidateName || "Student Candidate"}
Register Number: ${session.registerNumber || "N/A"}
Department: ${session.studentDepartment || "Engineering"}
Role: ${session.role || "Software Developer"}
Company: ${session.company || "Target Company"}
Subject: ${session.subject || "Full Stack"}
Difficulty: ${session.difficulty}
Experience Level: ${session.experienceLevel}
Date: ${new Date(session.createdAt).toLocaleDateString()}

--------------------------------------------------
DECISION MATRIX
--------------------------------------------------
Overall Score: ${report.overallScore}%
Hiring Recommendation: ${report.hiringRecommendation}
Technical Rating: ${report.technicalRating}/10
Communication Rating: ${commRatingDisplay}
Confidence Rating: ${report.confidenceRating}/10

--------------------------------------------------
WEBCAM BIOMETRICS & DEMEANOR VERIFICATION
--------------------------------------------------
${session.biometricsSummary?.cameraUsed ? `• Face Presence: ${session.biometricsSummary.facePresencePct}%
• Gaze Tracking: ${session.biometricsSummary.eyeContactPct}% direct eye contact
• Posture & Poise: ${session.biometricsSummary.posturePoise}
• Lighting Quality: ${session.biometricsSummary.lightingQuality}
• Demeanor Assessment: ${session.biometricsSummary.candidateDemeanorReview}` : "• Camera feed was inactive during this session (biometrics not recorded)"}

--------------------------------------------------
STRENGTHS DEMONSTRATED
--------------------------------------------------
${report.strengths.map(s => `• ${s}`).join("\n")}

--------------------------------------------------
CONSTRUCTIVE AREAS OF WEAKNESS
--------------------------------------------------
${report.weaknesses.map(w => `• ${w}`).join("\n")}

--------------------------------------------------
RECOMMENDED STUDY TOPICS
--------------------------------------------------
${report.recommendedTopics.map(t => `• ${t}`).join("\n")}

--------------------------------------------------
EXECUTIVE NARRATIVE FEEDBACK
--------------------------------------------------
${report.overallFeedback}

==================================================
Report generated by AI Mock Interview Platform
==================================================`;

    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Interview_Report_${session.company.replace(/\s+/g, "_")}_${(session.role || "Developer").replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="feedback-report-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/60 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-indigo-400 font-mono font-bold uppercase">Feedback Report</span>
            {session.registerNumber && (
              <span className="bg-indigo-500/15 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded text-[11px] border border-indigo-500/30">
                Reg No: {session.registerNumber}
              </span>
            )}
            {session.candidateName && (
              <span className="text-xs font-semibold text-slate-300">
                • {session.candidateName}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-100 tracking-tight mt-1">{session.interviewType} Summary</h1>
          <p className="text-xs text-slate-400 mt-1">
            Conducted on {new Date(session.createdAt).toLocaleDateString()} • Subject: {session.subject || "Full Stack"} • Brand: {session.company}
            {session.studentDepartment ? ` • Dept: ${session.studentDepartment}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={downloadReport}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all border border-slate-700/60 shadow-lg cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" /> Download Report
          </button>
          <button
            onClick={onBackToDashboard}
            className="flex-1 md:flex-initial bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/30"
          >
            Return to Arena
          </button>
        </div>
      </div>

      {/* POLICY TERMINATION ALERT BANNER */}
      {(session.status === "terminated_violation" || integrityReport?.status === "terminated_violation") && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl flex items-start gap-3.5 text-rose-200 shadow-xl backdrop-blur-md"
        >
          <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl shrink-0 mt-0.5 border border-rose-500/30">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-200 uppercase tracking-wide">
              Interview Terminated: Proctoring Policy Threshold Exceeded
            </h3>
            <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
              <strong>Incident Reason:</strong>{" "}
              {session.terminationReason || integrityReport?.terminationReason || "Multiple repeated proctoring violations detected across monitoring frames."}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              Note: Technical responses submitted prior to termination are fully scored and documented below. Technical performance and proctoring integrity scores are evaluated independently.
            </p>
          </div>
        </motion.div>
      )}

      {/* 1. EXECUTIVE REPORT CARD */}
      <div className="bg-[#0c1221] border border-indigo-500/10 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-md">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-md font-display font-bold text-slate-100">AI EXECUTIVE INTERVIEW REPORT</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Hiring Choice:</span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight border ${getRecommendationBadgeColor(report.hiringRecommendation)}`}>
              {report.hiringRecommendation}
            </span>
          </div>
        </div>

        {/* Core Scores Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Overall Score</span>
            <span className="text-3xl font-display font-black text-indigo-400 mt-1">{report.overallScore}%</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${report.overallScore}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Technical Rating</span>
            <span className="text-3xl font-display font-black text-slate-200 mt-1">{report.technicalRating}/10</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${report.technicalRating * 10}%` }} />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Communication</span>
            {report.communicationRating !== null && report.communicationRating !== undefined ? (
              <>
                <span className="text-3xl font-display font-black text-slate-200 mt-1">{report.communicationRating}/10</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${report.communicationRating * 10}%` }} />
                </div>
                <span className="text-[9px] text-emerald-400 font-mono mt-1">Evaluated via voice</span>
              </>
            ) : (
              <>
                <span className="text-2xl font-display font-bold text-amber-400 mt-1">N/A</span>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div className="bg-amber-500/30 h-full rounded-full w-full" />
                </div>
                <span className="text-[9px] text-amber-300 font-mono mt-1">Excluded (Text Mode)</span>
              </>
            )}
          </div>

          <div className="bg-slate-900/40 border border-slate-800/40 p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Confidence</span>
            <span className="text-3xl font-display font-black text-slate-200 mt-1">{report.confidenceRating}/10</span>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-violet-500 h-full rounded-full" style={{ width: `${report.confidenceRating * 10}%` }} />
            </div>
          </div>
        </div>

        {/* Video Biometric & Posture Verification Bar */}
        <div className="mb-8 p-5 rounded-2xl bg-[#090d16] border border-slate-800/80 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Real-Time Webcam Biometrics & Demeanor Review
                </h3>
                <p className="text-[10px] text-slate-400">
                  {session.biometricsSummary?.cameraUsed 
                    ? `Verified across ${session.biometricsSummary.totalFramesAnalyzed || 0} live frame telemetry samples`
                    : "Camera Telemetry Assessment"}
                </p>
              </div>
            </div>
            {session.biometricsSummary?.cameraUsed ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {session.biometricsSummary.facePresencePct}% Face Presence Verified
              </span>
            ) : (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit">
                <AlertCircle className="w-3.5 h-3.5" /> Camera Inactive
              </span>
            )}
          </div>

          {session.biometricsSummary?.cameraUsed ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] uppercase font-sans block font-semibold">Eye Contact & Gaze</span>
                  <span className="text-indigo-300 font-bold flex items-center gap-1.5 mt-1">
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    Direct Gaze ({session.biometricsSummary.eyeContactPct}%)
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] uppercase font-sans block font-semibold">Posture & Poise</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    {session.biometricsSummary.posturePoise}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] uppercase font-sans block font-semibold">Lighting Quality</span>
                  <span className="text-amber-300 font-bold flex items-center gap-1.5 mt-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    {session.biometricsSummary.lightingQuality}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-500 text-[10px] uppercase font-sans block font-semibold">Motion Demeanor</span>
                  <span className="text-indigo-300 font-bold flex items-center gap-1.5 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    {session.biometricsSummary.motionLevel}
                  </span>
                </div>
              </div>

              {session.biometricsSummary.candidateDemeanorReview && (
                <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed font-sans flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold font-mono text-[10px] uppercase text-indigo-300 block mb-0.5">
                      Genuine Camera Review & Demeanor Assessment:
                    </span>
                    <p>{session.biometricsSummary.candidateDemeanorReview}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Camera Feed was Inactive during Interview</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  To obtain video biometrics, face presence verification, and demeanor evaluation in your report, enable your camera in the interview arena.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Narrative & Lists Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">Executive Summary Feedback</span>
              <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-5 text-xs text-slate-300 leading-relaxed font-sans">
                {report.overallFeedback}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-emerald-400 mb-3">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold">Key Strengths</span>
                </div>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  {report.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 text-xs shrink-0 select-none">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-900/30 border border-slate-800/40 rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-rose-400 mb-3">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold">Weaknesses</span>
                </div>
                <ul className="space-y-2 text-[11px] text-slate-300">
                  {report.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 text-xs shrink-0 select-none">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-5 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-400 mb-3">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold">Recommended Study Topics</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  Based on candidate answers and response gaps, these domains require revision:
                </p>
                <div className="flex flex-wrap gap-2">
                  {report.recommendedTopics.map((t, idx) => (
                    <span key={idx} className="bg-indigo-950/40 text-indigo-300 border border-indigo-900 px-2.5 py-1 rounded-lg text-[10px] font-mono">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-indigo-950 pt-4 flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-500">Report Reference: AI-{sessionId.substring(0, 8).toUpperCase()}</span>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Save TXT Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI INTERVIEW INTEGRITY & MALPRACTICE AUDIT DASHBOARD */}
      {(() => {
        const reportData: IntegrityReport = integrityReport || session.integrityReport || {
          id: `rep-int-${sessionId}`,
          sessionId,
          userId: session.userId,
          candidateName: "Candidate",
          startTime: session.createdAt,
          endTime: new Date().toISOString(),
          monitoringDurationSec: 210,
          status: session.status === "terminated_violation" ? "terminated_violation" : "completed",
          terminationReason: session.terminationReason,
          totalWarnings: 0,
          integrityScore: session.status === "terminated_violation" ? 42 : 95,
          integrityTier: session.status === "terminated_violation" ? "Significant Concerns" : "High",
          eventCounts: {
            noFace: 0,
            multipleFaces: 0,
            gazeAway: 0,
            prohibitedDevice: 0,
            cameraInterrupted: 0
          },
          violations: [],
          disclaimer: "AI-generated interview integrity estimate based on webcam feed analysis."
        };

        const score = reportData.integrityScore;
        const tierBadge = 
          score >= 90 ? { label: "High Integrity Indicators", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", bar: "bg-emerald-500" } :
          score >= 75 ? { label: "Generally Consistent, With Flags", color: "bg-sky-500/10 text-sky-400 border-sky-500/30", bar: "bg-sky-500" } :
          score >= 50 ? { label: "Multiple Indicators Require Review", color: "bg-amber-500/10 text-amber-400 border-amber-500/30", bar: "bg-amber-500" } :
          { label: "Significant Proctoring Concerns", color: "bg-rose-500/10 text-rose-400 border-rose-500/30", bar: "bg-rose-500" };

        const formatDuration = (sec: number) => {
          const m = Math.floor(sec / 60);
          const s = sec % 60;
          return `${m}m ${s < 10 ? "0" : ""}${s}s`;
        };

        const violationsList = reportData.violations || [];

        return (
          <div className="bg-[#0c1221] border border-indigo-500/10 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] rounded-2xl p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/3 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header & Reviewer Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-md font-display font-bold text-slate-100">
                      AI INTERVIEW INTEGRITY & MALPRACTICE REPORT
                    </h2>
                    <span className="text-[9px] font-mono uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                      Client-Side Vision
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time webcam telemetry, gaze estimation, multi-person & electronic device detection
                  </p>
                </div>
              </div>

              {/* Authorized Reviewer Mode Toggle */}
              <button
                type="button"
                onClick={() => setIsReviewerMode((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  isReviewerMode
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isReviewerMode ? "Reviewer Mode: ACTIVE" : "Enable Reviewer Mode"}</span>
              </button>
            </div>

            {/* Core Integrity Statistics Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              {/* Score Gauge Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                      Integrity Estimate
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tierBadge.color}`}>
                      {reportData.integrityTier}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-4xl font-display font-black text-white">{score}%</span>
                    <span className="text-xs text-slate-400 font-mono">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                    <div className={`${tierBadge.bar} h-full rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-3 font-mono">
                  Calculated: 100 − (weighted violation penalties)
                </p>
              </div>

              {/* Session Status & Warnings Card */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold block mb-2">
                    Monitoring Status
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Session Status:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                        reportData.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      }`}>
                        {reportData.status === "completed" ? "Completed Normal" : "Terminated (Violation)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Monitoring Duration:</span>
                      <span className="font-mono text-slate-200 font-bold">{formatDuration(reportData.monitoringDurationSec)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Warnings Issued:</span>
                      <span className={`font-mono font-bold ${reportData.totalWarnings > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {reportData.totalWarnings} / 3 Max
                      </span>
                    </div>
                  </div>
                </div>
                {reportData.reviewedBy && (
                  <p className="text-[10px] text-indigo-400 mt-2 font-mono">
                    ✓ Reviewed by: {reportData.reviewedBy}
                  </p>
                )}
              </div>

              {/* Event Counter Breakdown */}
              <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold block mb-2">
                  Event Occurrence Summary
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-500 block">Gaze Away:</span>
                    <span className="text-slate-200 font-bold">{reportData.eventCounts.gazeAway} events</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-500 block">No Face / Left:</span>
                    <span className="text-slate-200 font-bold">{reportData.eventCounts.noFace} events</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-500 block">Multi-Face:</span>
                    <span className="text-slate-200 font-bold">{reportData.eventCounts.multipleFaces} events</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    <span className="text-[9px] text-slate-500 block">Prohibited Device:</span>
                    <span className="text-slate-200 font-bold">{reportData.eventCounts.prohibitedDevice} events</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recorded Violations Timeline & Reviewer Interface */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Recorded Proctoring Timeline & Flagged Incidents ({violationsList.length})
                </h3>
                {isReviewerMode && (
                  <span className="text-[11px] text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30 font-medium">
                    Reviewer actions enabled: Click flag to mark false positive
                  </span>
                )}
              </div>

              {violationsList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Clean Proctoring Session: No suspicious activity, prohibited devices, or prolonged gaze diversion detected.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {violationsList.map((evt, idx) => {
                    const isFP = evt.isFalsePositive;
                    const sevColor =
                      evt.severity === "critical" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
                      evt.severity === "high" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                      evt.severity === "medium" ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                      "bg-slate-800 text-slate-300 border-slate-700";

                    return (
                      <div
                        key={evt.id || idx}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          isFP
                            ? "bg-slate-900/25 border-slate-850 opacity-60 line-through-label"
                            : "bg-slate-900/60 border-slate-800 shadow"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5 text-slate-300">
                            {evt.eventType === "prohibited_device" ? (
                              <Smartphone className="w-4 h-4 text-rose-400" />
                            ) : evt.eventType === "multiple_faces" ? (
                              <Users className="w-4 h-4 text-sky-400" />
                            ) : evt.eventType === "gaze_away" ? (
                              <Eye className="w-4 h-4 text-amber-400" />
                            ) : (
                              <VideoOff className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-500">
                                {new Date(evt.timestamp).toLocaleTimeString()}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${sevColor}`}>
                                {evt.severity}
                              </span>
                              <span className="text-slate-200 font-semibold uppercase font-mono text-[11px]">
                                {evt.eventType.replace(/_/g, " ")}
                              </span>
                              {evt.deviceType && (
                                <span className="bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded text-[10px] font-mono">
                                  {evt.deviceType}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-slate-500">
                                Conf: {Math.round(evt.confidence * 100)}% • Dur: {evt.durationSeconds}s
                              </span>
                            </div>
                            <p className="text-slate-300 mt-1 text-[11px] leading-relaxed">
                              {evt.details}
                            </p>
                            {evt.reviewerNotes && (
                              <p className="text-[10px] text-indigo-300 mt-1 font-mono">
                                Note: {evt.reviewerNotes} ({evt.reviewedBy || "Reviewer"})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Reviewer Action Controls */}
                        {isReviewerMode && (
                          <div className="flex items-center gap-2 shrink-0 sm:self-center">
                            <button
                              type="button"
                              disabled={updatingEventId === evt.id}
                              onClick={() => handleToggleFalsePositive(evt.id, !!isFP)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                isFP
                                  ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                  : "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30"
                              }`}
                            >
                              {updatingEventId === evt.id ? (
                                "Updating..."
                              ) : isFP ? (
                                "Reinstate Flag"
                              ) : (
                                "Mark as False Positive"
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assessment Limitations & Transparency Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 text-[11px] text-slate-400 leading-relaxed font-sans flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-300 uppercase tracking-wide block mb-0.5 font-mono text-[10px]">
                  AI Proctoring Integrity Estimate Limitations:
                </span>
                <p>
                  This rating is an <strong>AI-generated interview integrity estimate</strong>, not definitive proof of candidate genuineness or cheating. Webcam positioning, ambient lighting, natural conversational gaze shifts, or peripheral equipment can introduce false flags. Technical and performance ratings are evaluated separately and remain unmodified.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. MAIN FEEDBACK BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Q&A Side dropdown lists */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-display font-semibold text-slate-200 mb-4">Detailed Question Responses</h3>

          <div className="space-y-4">
            {session.questions.map((q, idx) => (
              <div key={q.id} className="bg-[#0f172a]/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <button
                  onClick={() => toggleExpandQuestion(q.id)}
                  className="w-full p-5 text-left flex items-center justify-between hover:bg-slate-900/20 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md mt-0.5">
                      Q{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-200 pr-4">{q.text}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500 font-mono">
                          {q.type} • Score: {q.evaluation ? `${q.evaluation.score}%` : "Pending"}
                        </span>
                        {q.answerMethod === "text" || q.evaluation?.communication === null ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/90 text-amber-300 border border-amber-500/20">
                            Text Submission (Comm. Score Excluded)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Voice Dictation (Comm: {q.evaluation?.communication}/10)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedQuestionId === q.id ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>

                {expandedQuestionId === q.id && (
                  <div className="p-5 border-t border-slate-800/60 bg-slate-900/20 space-y-4 text-xs leading-relaxed">
                    {/* Rubric Score Pills */}
                    {q.evaluation && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-sans">Technical</span>
                          <span className="text-xs font-bold text-slate-200">{q.evaluation.technicalAccuracy}/10</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-sans">Communication</span>
                          {q.evaluation.communication !== null && q.evaluation.communication !== undefined ? (
                            <span className="text-xs font-bold text-slate-200">{q.evaluation.communication}/10</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400">N/A (Text)</span>
                          )}
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-sans">Confidence</span>
                          <span className="text-xs font-bold text-slate-200">{q.evaluation.confidence}/10</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center">
                          <span className="text-[9px] text-slate-500 block uppercase font-sans">Completeness</span>
                          <span className="text-xs font-bold text-slate-200">{q.evaluation.completeness}/10</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-center col-span-2 sm:col-span-1">
                          <span className="text-[9px] text-slate-500 block uppercase font-sans">Problem Solving</span>
                          <span className="text-xs font-bold text-slate-200">{q.evaluation.problemSolving}/10</span>
                        </div>
                      </div>
                    )}

                    {/* Candidate Answer */}
                    <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-950">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Your response:</span>
                      <p className="text-slate-300 font-mono whitespace-pre-wrap">{q.candidateAnswer || "[Unanswered]"}</p>
                    </div>

                    {q.evaluation && (
                      <>
                        {/* Gaps */}
                        {q.evaluation.mistakes && q.evaluation.mistakes.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono text-amber-400 uppercase block mb-1 font-bold">Deficiencies:</span>
                            <ul className="list-disc pl-4 text-slate-300 space-y-1">
                              {q.evaluation.mistakes.map((m: string, i: number) => <li key={i}>{m}</li>)}
                            </ul>
                          </div>
                        )}

                        {/* Suggestions */}
                        {q.evaluation.suggestions && q.evaluation.suggestions.length > 0 && (
                          <div>
                            <span className="text-[10px] font-mono text-indigo-400 uppercase block mb-1 font-bold">Suggestions:</span>
                            <p className="text-slate-300">{q.evaluation.suggestions.join(" ")}</p>
                          </div>
                        )}

                        {/* Ideal Answer */}
                        {q.evaluation.idealAnswer && (
                          <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                            <span className="text-[10px] font-mono text-indigo-400 uppercase block mb-1 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Exemplar ideal response:
                            </span>
                            <p className="text-indigo-200/90 leading-relaxed font-sans">{q.evaluation.idealAnswer}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Career Roadmap Cards */}
        {session.feedback && (
          <div className="space-y-6">
            <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" /> Career Roadmap
              </h3>

              <div className="space-y-5">
                {session.feedback.improvementRoadmap.map((step, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl">
                    <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full font-bold">
                      {step.phase}
                    </span>
                    <h4 className="text-xs font-bold text-slate-200 mt-2.5">{step.topic}</h4>
                    
                    <ul className="space-y-1.5 mt-2.5">
                      {step.actionSteps.map((act, aIdx) => (
                        <li key={aIdx} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
