import React, { useState, useEffect } from "react";
import { UserProfile, InterviewSession } from "../types";
import { 
  Sparkles, 
  FileText, 
  Play, 
  History, 
  ArrowRight, 
  UploadCloud, 
  CheckCircle, 
  XCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Bookmark,
  TrendingUp,
  Sliders,
  Calendar,
  Briefcase,
  AlertCircle,
  Trash2,
  Code2,
  Database
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  user: UserProfile;
  authToken: string;
  onNavigate: (tab: "dashboard" | "resume" | "setup" | "history" | "settings") => void;
  onViewReport: (sessionId: string) => void;
  onStartInterview: (session: InterviewSession) => void;
}

export default function Dashboard({ 
  user, 
  authToken, 
  onNavigate, 
  onViewReport, 
  onStartInterview 
}: DashboardProps) {
  
  // Storage States
  const [resume, setResume] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [recentInterviews, setRecentInterviews] = useState<InterviewSession[]>([]);
  
  // Loading States
  const [loadingResume, setLoadingResume] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState("");

  // Section 6 Config Form fields
  const [configRole, setConfigRole] = useState("Software Developer");
  const [configSubject, setConfigSubject] = useState("Java");
  const [configCompany, setConfigCompany] = useState("Zoho");
  const [configDifficulty, setConfigDifficulty] = useState("Medium");
  const [configInterviewType, setConfigInterviewType] = useState("Technical Round");
  const [configQuestionCount, setConfigQuestionCount] = useState(5);
  const [configTimePerQuestion, setConfigTimePerQuestion] = useState("2 Minutes");

  // Fetch all dashboard information on load
  useEffect(() => {
    fetchResume();
    fetchInsights();
    fetchRecentHistory();
  }, [authToken]);

  // Synchronize initial configuration fields if we have recommendation insights
  useEffect(() => {
    if (insights?.recommendedInterview) {
      setConfigRole(insights.recommendedInterview.role || "Software Developer");
      setConfigCompany(insights.recommendedInterview.company || "Zoho");
      setConfigDifficulty(insights.recommendedInterview.difficulty || "Medium");
      setConfigInterviewType(insights.recommendedInterview.interviewType || "Technical Round");
    }
  }, [insights]);

  const fetchResume = async () => {
    setLoadingResume(true);
    try {
      const res = await fetch("/api/resume/get", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setResume(data);
      } else {
        setResume(null);
      }
    } catch (err) {
      console.error("Error fetching resume:", err);
      setResume(null);
    } finally {
      setLoadingResume(false);
    }
  };

  const fetchInsights = async () => {
    setLoadingInsights(true);
    try {
      const res = await fetch("/api/dashboard/insights", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      } else {
        setInsights(null);
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
      setInsights(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchRecentHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/interview/history", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data: InterviewSession[] = await res.json();
        // Fetch latest three interviews
        setRecentInterviews(data.slice(0, 3));
      } else {
        setRecentInterviews([]);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setRecentInterviews([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Launch interview with configuration parameters
  const handleLaunchInterview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setStartingInterview(true);

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          role: configRole,
          company: configCompany,
          difficulty: configDifficulty,
          interviewType: configInterviewType,
          subject: configSubject,
          questionCount: configQuestionCount,
          timePerQuestion: configTimePerQuestion
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start interview.");
      }

      const session: InterviewSession = await res.json();
      onStartInterview(session);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong launching the AI interview session.");
    } finally {
      setStartingInterview(false);
    }
  };

  const handleDeleteRecentSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingSessionId(sessionId);
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        setRecentInterviews(prev => prev.filter(s => s.id !== sessionId));
        setConfirmDeleteId(null);
        setDeleteSuccessMessage("Interview deleted successfully.");
        setTimeout(() => setDeleteSuccessMessage(""), 3500);
      }
    } catch (err) {
      console.error("Delete session error:", err);
    } finally {
      setDeletingSessionId(null);
    }
  };

  // Populates recommendation settings and scrolls to config form
  const handleApplyRecommendation = () => {
    if (insights?.recommendedInterview) {
      setConfigRole(insights.recommendedInterview.role);
      setConfigCompany(insights.recommendedInterview.company);
      setConfigDifficulty(insights.recommendedInterview.difficulty);
      setConfigInterviewType(insights.recommendedInterview.interviewType);
      
      const element = document.getElementById("interview-config-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // SVG Circular progress calculator for Job Readiness
  const renderReadinessProgress = (score: number) => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Track circle */}
          <circle 
            cx="56" 
            cy="56" 
            r={radius} 
            className="text-slate-800" 
            strokeWidth="8" 
            stroke="currentColor" 
            fill="transparent" 
          />
          {/* Animated score circle */}
          <circle 
            cx="56" 
            cy="56" 
            r={radius} 
            className="text-purple-500 transition-all duration-1000 ease-out" 
            strokeWidth="8" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
            stroke="currentColor" 
            fill="transparent" 
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-100 tracking-tight font-display">{score}%</span>
          <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider font-mono">Ready</span>
        </div>
      </div>
    );
  };

  // Formatted date string
  const getTodayDateString = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-10 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background radial glowing effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* ====================================================
          SECTION 1: Welcome Card 
          ==================================================== */}
      <div className="relative bg-gradient-to-r from-purple-900/10 via-[#0f1424] to-[#0d1222] border border-purple-500/15 rounded-3xl p-8 shadow-2xl backdrop-blur-xl overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transition-transform duration-700 group-hover:scale-110">
          <Sparkles className="w-32 h-32 text-purple-400" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              AI Mock Interview Agent
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight text-slate-100">
              Welcome, <span className="bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">{user.name}</span>
            </h1>
            
            <p className="text-sm md:text-base text-slate-400 leading-relaxed font-sans">
              Upload your resume, let AI analyze your profile, generate personalized interview questions and receive AI-powered feedback.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-900/50 border border-slate-800/80 px-4 py-3 rounded-2xl md:self-center">
            <Calendar className="w-4 h-4 text-purple-400" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">Today's Date</span>
              <span className="text-xs font-semibold text-slate-300">{getTodayDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols in desktop) */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* ====================================================
              SECTION 2: AI Resume Summary 
              ==================================================== */}
          <section className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-slate-800/50 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">AI Resume Summary</h3>
              </div>
              
              {resume && (
                <button
                  onClick={() => onNavigate("resume")}
                  className="px-3.5 py-1.5 rounded-xl border border-purple-500/30 text-purple-300 hover:text-slate-100 hover:bg-purple-600/10 text-xs font-semibold tracking-wider transition-all cursor-pointer"
                >
                  Re-upload Resume
                </button>
              )}
            </div>

            {loadingResume ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Parsing resume data...</span>
              </div>
            ) : resume ? (
              <div className="space-y-6">
                
                {/* Status Indicator Bar */}
                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-wider block">Resume Status</span>
                      <span className="text-sm font-bold text-slate-200">Uploaded Successfully</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-mono">File Name</span>
                    <span className="text-xs font-semibold text-slate-300 truncate max-w-xs">{resume.fileName || "resume_profile.pdf"}</span>
                  </div>
                </div>

                {/* Sub Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1">Target Role</span>
                    <span className="text-sm font-bold text-slate-200 truncate block">
                      {resume.suggestedRoles?.[0] || resume.recommendedJobRoles?.[0] || "Software Engineer"}
                    </span>
                  </div>
                  
                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1">Projects Count</span>
                    <span className="text-sm font-bold text-slate-200 block">
                      {resume.projects?.length || 0} Professional Project{(resume.projects?.length || 0) === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-1">Experience Level</span>
                    <span className="text-sm font-bold text-slate-200 block">
                      {resume.internships?.length > 0 ? "Experienced / Professional" : "Freshers / Entry-Level"}
                    </span>
                  </div>
                </div>

                {/* Education Box */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-2">Education Background</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {typeof resume.education === "string" 
                      ? resume.education 
                      : resume.education && resume.education.length > 0
                        ? `${resume.education[0].degree} - ${resume.education[0].institution} (${resume.education[0].year || "N/A"})`
                        : "B.S. in Computer Science or technical background"}
                  </p>
                </div>

                {/* Extracted Skills List */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block mb-3">Extracted Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {(resume.skills || []).length > 0 ? (
                      (resume.skills || []).map((skill: string, index: number) => (
                        <span 
                          key={index}
                          className="px-2.5 py-1 text-[11px] font-medium font-mono bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-md transition-colors hover:bg-purple-500/20"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No skills specified</span>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4">
                <UploadCloud className="w-10 h-10 text-slate-500" />
                <div>
                  <h4 className="text-sm font-bold text-slate-300">No resume uploaded</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                    Upload your resume to let Gemini extract your credentials, skills, experience level, and generate smart recommended interview sessions.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("resume")}
                  className="bg-purple-600 hover:bg-purple-500 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-colors cursor-pointer"
                >
                  Upload Resume
                </button>
              </div>
            )}
          </section>

          {/* ====================================================
              SECTION 3: AI Resume Insights 
              ==================================================== */}
          <section className="space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">AI Resume Insights</h3>
            </div>

            {loadingInsights ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Synthesizing profile insights...</span>
              </div>
            ) : resume && insights ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all group hover:-translate-y-1 duration-300">
                  <div className="flex items-center gap-2.5 text-purple-400 mb-3.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs uppercase font-bold tracking-wider font-mono text-emerald-400">Strengths</span>
                  </div>
                  <ul className="space-y-2">
                    {((resume.strengths || insights.strengths || []) as string[]).slice(0, 3).map((s, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas to Improve */}
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all group hover:-translate-y-1 duration-300">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span className="text-xs uppercase font-bold tracking-wider font-mono text-amber-400">Areas To Improve</span>
                  </div>
                  <ul className="space-y-2">
                    {((resume.weakAreas || resume.areasToImprove || insights.areasToImprove || []) as string[]).slice(0, 3).map((w, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Skills */}
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all group hover:-translate-y-1 duration-300">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs uppercase font-bold tracking-wider font-mono text-rose-400">Missing Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((resume.missingSkills || insights.missingSkills || []) as string[]).slice(0, 5).map((m, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/5 border border-rose-500/15 text-rose-300 rounded-md">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Job Roles */}
                <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all group hover:-translate-y-1 duration-300">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <span className="text-xs uppercase font-bold tracking-wider font-mono text-blue-400">Suggested Job Roles</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((resume.suggestedRoles || resume.recommendedJobRoles || insights.suggestedJobRoles || []) as string[]).slice(0, 5).map((sr, idx) => (
                      <span key={idx} className="px-2.5 py-0.5 text-[10px] font-semibold bg-blue-500/5 border border-blue-500/15 text-blue-300 rounded-md">
                        {sr}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-6 bg-slate-900/10 border border-slate-850 rounded-2xl text-center">
                <p className="text-xs text-slate-500 italic">Insights are compiled automatically once your resume is analyzed.</p>
              </div>
            )}
          </section>

          {/* ====================================================
              SECTION 6: Interview Configuration
              ==================================================== */}
          <section id="interview-config-section" className="bg-[#0b101c] border border-slate-800/70 rounded-3xl p-6 relative">
            <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
              <Sliders className="w-16 h-16 text-purple-400" />
            </div>

            <div className="flex items-center gap-2.5 border-b border-slate-800/50 pb-4 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-200">Interview Configuration</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Customize variables below or use AI recommendations to initialize</p>
              </div>
            </div>

            <form onSubmit={handleLaunchInterview} className="space-y-6">
              {errorMessage && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-semibold">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Role field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Target Role</label>
                  <input
                    type="text"
                    required
                    value={configRole}
                    onChange={(e) => setConfigRole(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all font-semibold"
                    placeholder="e.g. Java Developer, React Developer"
                  />
                </div>

                {/* Subject / Tech Stack selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Subject / Tech Stack</label>
                  <select
                    value={configSubject}
                    onChange={(e) => setConfigSubject(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 transition-all font-semibold cursor-pointer"
                  >
                    <option value="Java">Java (JVM, OOPs, Collections, Spring Boot)</option>
                    <option value="Python">Python (Core, AsyncIO, Data Structures, FastAPI)</option>
                    <option value="SQL">SQL (Queries, Joins, Indexes, Transactions, Normalization)</option>
                    <option value="JavaScript">JavaScript & TypeScript (ES6+, DOM, Promises)</option>
                    <option value="React">React.js (Hooks, Virtual DOM, State, Performance)</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms (Trees, Graphs, DP)</option>
                    <option value="Full Stack">Full Stack Web (MERN / APIs / Databases)</option>
                    <option value="C++">C++ / Systems Programming (Pointers, Memory, STL)</option>
                  </select>
                </div>

                {/* Company field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Company Context</label>
                  <input
                    type="text"
                    required
                    value={configCompany}
                    onChange={(e) => setConfigCompany(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all font-semibold"
                    placeholder="e.g. Zoho, Google, Microsoft"
                  />
                </div>

                {/* Difficulty Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Difficulty</label>
                  <select
                    value={configDifficulty}
                    onChange={(e) => setConfigDifficulty(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 transition-all font-semibold"
                  >
                    <option value="Easy">Easy (Conceptual)</option>
                    <option value="Medium">Medium (Applied Mechanics)</option>
                    <option value="Hard">Hard (Performance & Scale)</option>
                  </select>
                </div>

                {/* Interview Type Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Interview Round Type</label>
                  <select
                    value={configInterviewType}
                    onChange={(e) => setConfigInterviewType(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 transition-all font-semibold"
                  >
                    <option value="Technical Round">Technical Round (Subject Focused)</option>
                    <option value="HR Round">HR Round (Basic HR & Behavioral Only)</option>
                    <option value="Coding Test">Coding Test (Type Code & Pass Test Cases)</option>
                    <option value="Mixed Round">Mixed Round (60% Tech + 40% HR)</option>
                  </select>
                </div>

                {/* Number of Questions field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Number Of Questions</label>
                  <select
                    value={configQuestionCount}
                    onChange={(e) => setConfigQuestionCount(Number(e.target.value))}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 transition-all font-semibold"
                  >
                    <option value={3}>3 Questions (Fast-Tracked)</option>
                    <option value={5}>5 Questions (Standard Eval)</option>
                    <option value={8}>8 Questions (Heavy Drilling)</option>
                  </select>
                </div>

                {/* Time Per Question field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Time Limit per Question</label>
                  <select
                    value={configTimePerQuestion}
                    onChange={(e) => setConfigTimePerQuestion(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-purple-500/50 transition-all font-semibold"
                  >
                    <option value="1.5 Minutes">1.5 Minutes</option>
                    <option value="2 Minutes">2 Minutes</option>
                    <option value="3 Minutes">3 Minutes</option>
                    <option value="5 Minutes">5 Minutes (Extended)</option>
                  </select>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between gap-4">
                <span className="text-[10px] text-slate-500 leading-relaxed max-w-md">
                  On launch, Gemini processes your resume and parameters to build dynamic real-time challenges tailored directly to your criteria.
                </span>
                
                <button
                  type="submit"
                  disabled={startingInterview}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 text-slate-100 font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-purple-600/10"
                >
                  {startingInterview ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                      Constructing AI Interview...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Generate AI Interview
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

        </div>

        {/* Right Column (4 cols in desktop) */}
        <div className="lg:col-span-4 space-y-10">

          {/* ====================================================
              SECTION 4: Job Readiness Score
              ==================================================== */}
          <section className="bg-[#0b101c]/90 border border-purple-500/15 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-800/50 pb-4 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Job Readiness</h3>
            </div>

            {loadingInsights ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Calculating readiness metrics...</span>
              </div>
            ) : resume && insights ? (
              <div className="flex flex-col items-center text-center space-y-6">
                
                {renderReadinessProgress(insights.jobReadinessScore || 78)}

                <div className="w-full text-left bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-3">
                  <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider block">AI Evaluator Reason</span>
                  <ul className="space-y-2">
                    {(insights.jobReadinessReasons || []).map((reason: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 italic leading-relaxed">
                  Upload your resume to calculate your custom job readiness score and deep-dive evaluation.
                </p>
              </div>
            )}
          </section>

          {/* ====================================================
              SECTION 5: AI Recommended Interview
              ==================================================== */}
          <section className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 relative">
            <div className="flex items-center gap-2.5 border-b border-slate-800/50 pb-4 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">AI Recommendation</h3>
            </div>

            {loadingInsights ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Synthesizing recommended arena...</span>
              </div>
            ) : resume && insights?.recommendedInterview ? (
              <div className="space-y-4">
                
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/10 px-2 py-0.5 rounded-md font-bold">
                      {insights.recommendedInterview.interviewType || "Technical Round"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 font-mono">
                      {insights.recommendedInterview.difficulty || "Medium"}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{insights.recommendedInterview.role || "Java Developer"}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Target Company: <strong className="text-slate-300 font-semibold">{insights.recommendedInterview.company || "Zoho"}</strong></p>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/40 pt-2 font-sans italic">
                    "{insights.recommendedInterview.reason || "Based on your core skills."}"
                  </p>
                </div>

                <button
                  onClick={handleApplyRecommendation}
                  className="w-full bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 hover:text-slate-100 text-purple-300 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Configure Personalized Interview
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-slate-500 italic leading-relaxed">
                  Recommended job role, target context, and complexity settings are generated dynamically based on your uploaded resume.
                </p>
              </div>
            )}
          </section>

          {/* ====================================================
              SECTION 8: Today's AI Learning Suggestion
              ==================================================== */}
          <section className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6">
            <div className="flex items-center gap-2.5 border-b border-slate-800/50 pb-4 mb-5">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Bookmark className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">AI Practice Suggestions</h3>
            </div>

            {loadingInsights ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Analyzing syllabus suggestions...</span>
              </div>
            ) : resume && insights?.learningSuggestions ? (
              <div className="space-y-3">
                {insights.learningSuggestions.map((topic: string, index: number) => (
                  <div 
                    key={index} 
                    className="p-3 bg-[#0c1120] border border-slate-800 rounded-xl hover:border-purple-500/20 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-bold flex items-center justify-center border border-purple-500/20 shrink-0">
                        0{index + 1}
                      </div>
                      <span className="text-xs font-semibold text-slate-200 truncate pr-2">{topic}</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase font-mono tracking-widest shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Syllabus</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {["System Design Core Mechanics", "SQL Indexing & Optimization", "Client State workflows"].map((topic, index) => (
                  <div key={index} className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-slate-400 text-xs">
                    {topic}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>

      {/* ====================================================
          SECTION 7: Recent Interviews 
          ==================================================== */}
      <section className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-6 relative">
        <div className="flex items-center gap-2.5 border-b border-slate-800/50 pb-4 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <History className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Recent Interviews</h3>
        </div>

        {deleteSuccessMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
        )}

        {loadingHistory ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-mono">Loading previous sessions...</span>
          </div>
        ) : recentInterviews.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 font-mono font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3.5 pl-2">Date</th>
                  <th className="pb-3.5">Role</th>
                  <th className="pb-3.5">Company</th>
                  <th className="pb-3.5">Status</th>
                  <th className="pb-3.5">AI Score</th>
                  <th className="pb-3.5 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {recentInterviews.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3.5 pl-2 font-mono text-slate-400 text-[11px]">
                      {session.createdAt 
                        ? new Date(session.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                        : "N/A"}
                    </td>
                    <td className="py-3.5 font-semibold text-slate-200">{session.role || "Software Developer"}</td>
                    <td className="py-3.5 text-slate-300">{session.company || "General Industry"}</td>
                    <td className="py-3.5">
                      {session.status === "completed" ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                          Completed
                        </span>
                      ) : session.status === "terminated_violation" ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-semibold">
                          Terminated (Violation)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-semibold">
                          Active Arena
                        </span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {session.overallScore !== undefined && session.overallScore !== null ? (
                        <span className="text-purple-400 font-extrabold text-sm">{session.overallScore}%</span>
                      ) : (
                        <span className="text-slate-500 font-semibold font-mono">In Progress</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <div className="flex items-center justify-end gap-2">
                        {session.status === "completed" || session.status === "terminated_violation" ? (
                          <button
                            onClick={() => onViewReport(session.id)}
                            className="px-3 py-1 bg-purple-600/10 hover:bg-purple-600 border border-purple-500/20 hover:border-purple-500 hover:text-slate-100 text-purple-300 rounded-xl transition-colors font-bold text-[11px] cursor-pointer"
                          >
                            View Report
                          </button>
                        ) : (
                          <span className="text-slate-600 italic">No Report</span>
                        )}

                        {confirmDeleteId === session.id ? (
                          <div className="flex items-center gap-1 bg-red-950/80 border border-red-500/40 p-1 rounded-lg">
                            <button
                              type="button"
                              disabled={deletingSessionId === session.id}
                              onClick={(e) => handleDeleteRecentSession(session.id, e)}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              {deletingSessionId === session.id ? "..." : "Delete"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(session.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete this interview"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 border border-slate-800/40 rounded-2xl flex flex-col items-center justify-center text-center gap-3">
            <History className="w-8 h-8 text-slate-600" />
            <div className="text-slate-400 text-xs font-semibold">No recent mock interviews found</div>
            <p className="text-[11px] text-slate-500 max-w-sm">Use the configuration panel above to generate and initiate your very first mock interview round.</p>
          </div>
        )}
      </section>

      {/* ====================================================
          SECTION 9: Quick Actions 
          ==================================================== */}
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-200">Quick Actions</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Upload Resume */}
          <button
            onClick={() => onNavigate("resume")}
            className="group p-5 bg-[#0b101c]/60 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl text-left transition-all hover:bg-[#0f1526] hover:-translate-y-0.5 shadow-md flex justify-between items-start"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 inline-block">
                <FileText className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Upload Resume</h4>
              <p className="text-[10px] text-slate-500">Provide credentials PDF/DOCX</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </button>

          {/* Card 2: Resume Analysis */}
          <button
            onClick={() => onNavigate("resume")}
            className="group p-5 bg-[#0b101c]/60 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl text-left transition-all hover:bg-[#0f1526] hover:-translate-y-0.5 shadow-md flex justify-between items-start"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 inline-block">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Resume Analysis</h4>
              <p className="text-[10px] text-slate-500">Evaluate skills & extract metrics</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </button>

          {/* Card 3: Start Interview */}
          <button
            onClick={() => onNavigate("setup")}
            className="group p-5 bg-[#0b101c]/60 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl text-left transition-all hover:bg-[#0f1526] hover:-translate-y-0.5 shadow-md flex justify-between items-start"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 inline-block">
                <Play className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Start Interview</h4>
              <p className="text-[10px] text-slate-500">Launch standard mock session</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </button>

          {/* Card 4: Interview History */}
          <button
            onClick={() => onNavigate("history")}
            className="group p-5 bg-[#0b101c]/60 border border-slate-800/80 hover:border-purple-500/40 rounded-2xl text-left transition-all hover:bg-[#0f1526] hover:-translate-y-0.5 shadow-md flex justify-between items-start"
          >
            <div className="space-y-2">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 inline-block">
                <History className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-200">Interview History</h4>
              <p className="text-[10px] text-slate-500">View past mock scores & feedback</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </button>

        </div>
      </section>

    </div>
  );
}
