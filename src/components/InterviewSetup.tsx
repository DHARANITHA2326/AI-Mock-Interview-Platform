import React, { useState } from "react";
import { 
  Play, 
  Sparkles, 
  Brain, 
  Clock, 
  HelpCircle, 
  Layers, 
  Building2, 
  UserCheck, 
  Camera, 
  CheckCircle2, 
  ShieldCheck, 
  Video,
  Code2,
  Database,
  Users2,
  FileCode,
  Info,
  User,
  GraduationCap,
  BadgeCheck
} from "lucide-react";
import { motion } from "motion/react";
import { InterviewSession, UserProfile } from "../types";
import WebcamMonitor from "./WebcamMonitor";

interface InterviewSetupProps {
  authToken: string;
  user?: UserProfile;
  onStartInterview: (session: InterviewSession) => void;
}

export default function InterviewSetup({ authToken, user, onStartInterview }: InterviewSetupProps) {
  // Student identification required so teachers can uniquely identify reports
  const [candidateName, setCandidateName] = useState(user?.name || "");
  const [registerNumber, setRegisterNumber] = useState(user?.registerNumber || "");
  const [department, setDepartment] = useState(user?.department || "Computer Science & Engineering");
  const [year, setYear] = useState(user?.year || "3rd Year");

  const [role, setRole] = useState("Full Stack Developer");
  const [customRole, setCustomRole] = useState("");
  const [subject, setSubject] = useState("Java");
  const [customSubject, setCustomSubject] = useState("");
  const [company, setCompany] = useState("Zoho");
  const [customCompany, setCustomCompany] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [interviewType, setInterviewType] = useState("Technical");
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState("2 Minutes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLaunchInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!candidateName.trim()) {
      setError("Please provide your Full Name.");
      setLoading(false);
      return;
    }

    if (!registerNumber.trim()) {
      setError("Please provide your Register Number / Roll No (e.g. DEMO-2024-001) so teachers can identify your report.");
      setLoading(false);
      return;
    }

    const finalRole = role === "Other" ? (customRole.trim() || "Software Developer") : role;
    const finalCompany = company === "Other" ? (customCompany.trim() || "General Corporate") : company;
    const finalSubject = subject === "Other" ? (customSubject.trim() || "Full Stack") : subject;

    try {
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          candidateName: candidateName.trim(),
          registerNumber: registerNumber.trim().toUpperCase(),
          studentDepartment: department.trim(),
          studentYear: year.trim(),
          role: finalRole,
          company: finalCompany,
          difficulty,
          interviewType,
          subject: finalSubject,
          questionCount,
          timePerQuestion
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start interview.");
      }

      onStartInterview(data);
    } catch (err: any) {
      setError(err.message || "Failed to launch interview session. Check API configurations.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isHRSelected = interviewType === "HR";
  const isCodingSelected = interviewType === "Coding Test";

  return (
    <div id="interview-setup-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          Configure Your Interview Arena
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Select your subject tech stack, interview round type (Technical, HR, or Coding Test with test cases), and company context.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-start">
        {/* Left Column: Configuration Form */}
        <div className="lg:col-span-7 bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-8 shadow-xl backdrop-blur-md">
          <form onSubmit={handleLaunchInterview} className="space-y-6">
            
            {/* Student Candidate Identification Card */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Student Candidate Identification
                  </span>
                </div>
                <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  Required for Teacher Reports
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Student Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      className="w-full bg-[#0c1221] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Register Number / Roll No <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <BadgeCheck className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. DEMO-2024-001"
                      value={registerNumber}
                      onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                      className="w-full bg-[#0c1221] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition-colors font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Department / Branch
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Computer Science & Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-[#0c1221] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-1">
                    Year of Study
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-[#0c1221] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 px-3 text-xs text-slate-200 outline-none transition-colors cursor-pointer"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="Final Year">Final Year</option>
                    <option value="Graduated">Graduated / Alum</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Faculty uniquely track and evaluate each student's interview score and proctoring integrity report via your Register Number.
              </p>
            </div>

            {/* Round Type Selector Bar */}
            <div className="space-y-2">
              <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                Interview Round Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#090d16] p-1.5 rounded-xl border border-slate-800">
                {[
                  { id: "Technical", label: "Technical", icon: Brain, desc: "Subject Theory & Internals" },
                  { id: "HR", label: "HR Round", icon: Users2, desc: "Basic HR & Behavioral Only" },
                  { id: "Coding Test", label: "Coding Test", icon: Code2, desc: "Type Code & Pass Tests" },
                  { id: "Mixed", label: "Mixed", icon: Layers, desc: "60% Tech + 40% HR" }
                ].map((type) => {
                  const Icon = type.icon;
                  const isSelected = interviewType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setInterviewType(type.id)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                        isSelected 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-bold">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Notification on Round Type */}
              {isHRSelected && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block">HR Round Active:</span>
                    <span>Only basic, essential HR questions will be asked (Self Introduction, strengths, weaknesses, teamwork, conflict resolution, career goals). Technical coding questions are disabled.</span>
                  </div>
                </div>
              )}

              {isCodingSelected && (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-2.5 text-indigo-300 text-xs">
                  <Code2 className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                  <div>
                    <span className="font-bold block">Coding Test Sandbox Active:</span>
                    <span>Interactive code typing in Python, JavaScript, Java, C++, or SQL with real test cases. Your score will be directly awarded based on the percentage of passed test cases!</span>
                  </div>
                </div>
              )}
            </div>

            {/* SUBJECT & ROLE ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Subject / Tech Stack Column */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  Subject / Tech Stack
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
                >
                  <option value="Java">Java (JVM, OOPs, Collections, Spring Boot)</option>
                  <option value="Python">Python (Data Structures, OOP, AsyncIO, FastAPI)</option>
                  <option value="SQL">SQL (Queries, Joins, Indexes, Transactions, Normalization)</option>
                  <option value="JavaScript">JavaScript & TypeScript (ES6+, DOM, Async/Await)</option>
                  <option value="React">React.js (Hooks, Virtual DOM, State, Performance)</option>
                  <option value="Data Structures & Algorithms">Data Structures & Algorithms (Trees, Graphs, DP)</option>
                  <option value="Full Stack">Full Stack Web (MERN / APIs / Databases)</option>
                  <option value="C++">C++ / Systems Programming (Pointers, Memory, STL)</option>
                  <option value="Other">Other (Custom Subject)</option>
                </select>
                {subject === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom subject (e.g. Golang, Flutter, AWS)..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full mt-2 bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-300 outline-none transition-colors"
                  />
                )}
                <span className="text-[11px] text-slate-500 block">
                  Questions in Technical and Coding rounds will focus directly on this subject.
                </span>
              </div>

              {/* Target Job Role */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Target Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
                >
                  <option value="Java Developer">Java Developer</option>
                  <option value="Python Developer">Python Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="Frontend Engineer">Frontend Engineer</option>
                  <option value="Backend Architect">Backend Architect</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="Other">Other (Custom Role)</option>
                </select>
                {role === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom role title..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full mt-2 bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-300 outline-none transition-colors"
                  />
                )}
              </div>
            </div>

            {/* COMPANY & DIFFICULTY ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Target Corporate Brand */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Target Company
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
                >
                  <option value="Zoho">Zoho</option>
                  <option value="TCS">TCS</option>
                  <option value="Infosys">Infosys</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Google">Google</option>
                  <option value="Accenture">Accenture</option>
                  <option value="Microsoft">Microsoft</option>
                  <option value="Other">Other (Custom Corporate)</option>
                </select>
                {company === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter custom company name..."
                    value={customCompany}
                    onChange={(e) => setCustomCompany(e.target.value)}
                    className="w-full mt-2 bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-300 outline-none transition-colors"
                  />
                )}
              </div>

              {/* Complexity Level */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Difficulty / Level
                </label>
                <div className="flex bg-[#090d16] p-1.5 rounded-xl border border-slate-800">
                  {["Easy", "Medium", "Hard"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setDifficulty(lvl)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        difficulty === lvl ? "bg-indigo-600 text-slate-100 shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* COUNT & TIME ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Question Count Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  Question Count
                </label>
                <div className="flex bg-[#090d16] p-1.5 rounded-xl border border-slate-800">
                  {[3, 5, 8, 10].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        questionCount === cnt ? "bg-indigo-600 text-slate-100 shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cnt} Qs
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Per Question Selector */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Time Per Question
                </label>
                <div className="flex bg-[#090d16] p-1.5 rounded-xl border border-slate-800">
                  {["1 Minute", "2 Minutes", "3 Minutes", "5 Minutes"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setTimePerQuestion(time)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        timePerQuestion === time ? "bg-indigo-600 text-slate-100 shadow-md" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {time.split(" ")[0]}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
                Pressing launch begins your live session with real-time video evaluation, speech dictation, audio recording, and instant rubric grading.
              </span>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#1e1b4b] text-slate-100 font-semibold px-8 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Launch Interview Arena
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Pre-Flight Camera & Audio Verification Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-slate-200">Pre-Flight Hardware Check</h2>
            </div>
            <p className="text-xs text-slate-400">
              Verify your camera feed, framing, and microphone before entering the session.
            </p>
          </div>

          {/* Embedded Live Webcam Monitor */}
          <WebcamMonitor compact={true} />

          {/* System Readiness Checklist */}
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> System Readiness Checklist
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Selected Subject Focus</span>
                <span className="text-indigo-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {isHRSelected ? "Basic HR Behavioral" : subject}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Voice Recording & Dictation</span>
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> MediaRecorder Ready
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Coding Sandbox & Test Engine</span>
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Test Cases Active
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Gemini 3.8 Flash AI Model</span>
                <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
