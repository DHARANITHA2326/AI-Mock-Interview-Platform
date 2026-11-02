import React, { useState, useEffect } from "react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import ResumeAnalyzer from "./components/ResumeAnalyzer";
import InterviewSetup from "./components/InterviewSetup";
import InterviewHistory from "./components/InterviewHistory";
import InterviewStage from "./components/InterviewStage";
import FeedbackReport from "./components/FeedbackReport";
import SettingsView from "./components/SettingsView";
import TeacherDashboard from "./components/TeacherDashboard";
import { UserProfile, InterviewSession } from "./types";
import { LayoutDashboard, FileText, Brain, Play, History, LogOut, Menu, X, Video, Award, Settings, User } from "lucide-react";
import { motion } from "motion/react";

const DEFAULT_USER: UserProfile = {
  id: "demo-user-123",
  email: "student@example.com",
  name: "Alex Morgan",
  role: "student",
  registerNumber: "DEMO-2024-001",
  department: "Computer Science & Engineering",
  year: "3rd Year",
  experienceLevel: "Mid-Level Engineer",
  skills: ["Java", "Python", "SQL", "React", "Data Structures", "System Design"],
  streak: 5,
  lastActive: "Today",
  targetRole: "Full Stack Software Engineer",
  targetCompany: "Top Tech",
  preferredSubject: "Java",
  bio: "Passionate software engineer focused on building robust full-stack systems and high-performance applications."
};

const DEFAULT_AUTH_TOKEN = "demo-interview-token-2026";

export default function App() {
  // Authentication states with default user to ensure instant home page preview
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem("auth_user");
      return cached ? JSON.parse(cached) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("auth_token") || DEFAULT_AUTH_TOKEN;
    } catch {
      return DEFAULT_AUTH_TOKEN;
    }
  });

  // Active workspace states
  const [activeTab, setActiveTab] = useState<"dashboard" | "resume" | "setup" | "history" | "settings">("dashboard");
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Mobile drawer states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Ensure default user and token are cached if not present
    if (!localStorage.getItem("auth_user")) {
      localStorage.setItem("auth_user", JSON.stringify(DEFAULT_USER));
    }
    if (!localStorage.getItem("auth_token")) {
      localStorage.setItem("auth_token", DEFAULT_AUTH_TOKEN);
    }
  }, []);

  const handleAuthSuccess = (u: UserProfile, token: string) => {
    setUser(u);
    setAuthToken(token);
    localStorage.setItem("auth_user", JSON.stringify(u));
    localStorage.setItem("auth_token", token);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthToken(null);
    setActiveSession(null);
    setActiveReportId(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  };

  if (!user || !authToken) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // TEACHER PORTAL: Teachers can view the reports of students alone
  if (user.role === "teacher") {
    if (activeReportId) {
      return (
        <FeedbackReport
          sessionId={activeReportId}
          authToken={authToken}
          onBackToDashboard={() => setActiveReportId(null)}
        />
      );
    }
    return (
      <TeacherDashboard
        user={user}
        authToken={authToken}
        onViewStudentReport={(sessionId) => setActiveReportId(sessionId)}
        onLogout={handleLogout}
      />
    );
  }

  // Handle active workspace views (Students)
  const renderWorkspace = () => {
    if (activeSession) {
      return (
        <InterviewStage
          session={activeSession}
          authToken={authToken}
          onComplete={() => {
            // Once the session is marked completed, let's load the completed report!
            setActiveReportId(activeSession.id);
            setActiveSession(null);
          }}
        />
      );
    }

    if (activeReportId) {
      return (
        <FeedbackReport
          sessionId={activeReportId}
          authToken={authToken}
          onBackToDashboard={() => {
            setActiveReportId(null);
            setActiveTab("dashboard");
          }}
        />
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            user={user}
            authToken={authToken}
            onNavigate={(tab) => {
              setActiveTab(tab);
              setMobileMenuOpen(false);
            }}
            onViewReport={(sessionId) => {
              setActiveReportId(sessionId);
            }}
            onStartInterview={(session) => {
              setActiveSession(session);
            }}
          />
        );
      case "resume":
        return (
          <ResumeAnalyzer
            authToken={authToken}
            onContinue={() => {
              setActiveTab("setup");
              setMobileMenuOpen(false);
            }}
          />
        );
      case "setup":
        return (
          <InterviewSetup
            user={user}
            authToken={authToken}
            onStartInterview={(session) => {
              setActiveSession(session);
            }}
          />
        );
      case "history":
        return (
          <InterviewHistory
            authToken={authToken}
            onViewReport={(sessionId) => {
              setActiveReportId(sessionId);
            }}
          />
        );
      case "settings":
        return (
          <SettingsView
            user={user}
            authToken={authToken}
            onUpdateUser={(updated) => {
              setUser(updated);
              localStorage.setItem("auth_user", JSON.stringify(updated));
            }}
            onBackToDashboard={() => setActiveTab("dashboard")}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center min-h-[50vh]">
            <p className="text-slate-400">Section pending integration.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. SIDE NAVIGATION BAR (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-[#0c1221] border-r border-slate-900/60 p-6 relative justify-between z-30 shadow-2xl">
        <div className="space-y-8">
          {/* Logo container */}
          <div className="flex items-center gap-3 px-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-display font-bold text-slate-200 leading-tight">InterviewMaster AI</h2>
              <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider">PREP & EVAL SUITE</span>
            </div>
          </div>

          {/* Navigation Links matching requirements precisely */}
          <nav className="space-y-1.5">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setActiveSession(null);
                setActiveReportId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "dashboard" && !activeSession && !activeReportId
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("resume");
                setActiveSession(null);
                setActiveReportId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "resume" && !activeSession && !activeReportId
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <FileText className="w-4 h-4" />
              Resume Upload
            </button>

            <button
              onClick={() => {
                setActiveTab("setup");
                setActiveSession(null);
                setActiveReportId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "setup" && !activeSession && !activeReportId
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <Play className="w-4 h-4" />
              Interview Setup
            </button>

            <button
              onClick={() => {
                if (activeSession) {
                  // Keep it on active stage
                } else {
                  // Direct user to start an interview in the setup tab
                  setActiveTab("setup");
                  setActiveSession(null);
                  setActiveReportId(null);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeSession
                  ? "bg-indigo-600/50 text-indigo-200 border border-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Video className="w-4 h-4" />
              Interview Session {activeSession ? "• Active" : ""}
            </button>

            <button
              onClick={() => {
                if (activeReportId) {
                  // Keep current active report
                } else {
                  // Direct to history to pick an interview report to load
                  setActiveTab("history");
                  setActiveSession(null);
                  setActiveReportId(null);
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeReportId
                  ? "bg-indigo-600/50 text-indigo-200 border border-indigo-500/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Award className="w-4 h-4" />
              Interview Report {activeReportId ? "• Active" : ""}
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                setActiveSession(null);
                setActiveReportId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "history" && !activeSession && !activeReportId
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <History className="w-4 h-4" />
              Interview History
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                setActiveSession(null);
                setActiveReportId(null);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === "settings" && !activeSession && !activeReportId
                  ? "bg-indigo-600 text-slate-100 shadow-lg shadow-indigo-600/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <Settings className="w-4 h-4" />
              Voice & Profile Settings
            </button>
          </nav>
        </div>

        {/* User context footer */}
        <div className="border-t border-slate-900/60 pt-4 mt-6">
          <button
            onClick={() => {
              setActiveTab("settings");
              setActiveSession(null);
              setActiveReportId(null);
            }}
            className="w-full flex items-center gap-3 px-2 mb-4 p-2 rounded-xl hover:bg-slate-900/60 transition-colors text-left group cursor-pointer"
            title="Edit Profile & Voice"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 text-xs font-bold font-display text-indigo-400 shrink-0 group-hover:border-indigo-400/50">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">{user.name}</h4>
              <p className="text-[10px] text-indigo-400 font-mono truncate">{user.registerNumber ? `Reg: ${user.registerNumber}` : user.email}</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* 2. MOBILE NAVIGATION DRAWER */}
      <header className="md:hidden flex items-center justify-between bg-[#0c1221] border-b border-slate-900/60 p-4 relative z-40">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-display font-bold text-slate-100">InterviewMaster AI</span>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-300 p-1 hover:bg-slate-900/40 rounded">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {mobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-[#0c1221] border-b border-slate-900/60 p-4 space-y-2 flex flex-col shadow-2xl">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setActiveSession(null);
                setActiveReportId(null);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === "dashboard" && !activeSession && !activeReportId ? "bg-indigo-600 text-slate-100" : "text-slate-400"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setActiveTab("resume");
                setActiveSession(null);
                setActiveReportId(null);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === "resume" && !activeSession && !activeReportId ? "bg-indigo-600 text-slate-100" : "text-slate-400"
              }`}
            >
              <FileText className="w-4 h-4" />
              Resume Upload
            </button>
            <button
              onClick={() => {
                setActiveTab("setup");
                setActiveSession(null);
                setActiveReportId(null);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === "setup" && !activeSession && !activeReportId ? "bg-indigo-600 text-slate-100" : "text-slate-400"
              }`}
            >
              <Play className="w-4 h-4" />
              Interview Setup
            </button>
            <button
              onClick={() => {
                if (activeSession) {
                  // Stay
                } else {
                  setActiveTab("setup");
                  setActiveSession(null);
                  setActiveReportId(null);
                }
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeSession ? "bg-indigo-600/50 text-indigo-200" : "text-slate-500"
              }`}
            >
              <Video className="w-4 h-4" />
              Interview Session {activeSession ? "• Active" : ""}
            </button>
            <button
              onClick={() => {
                if (activeReportId) {
                  // Stay
                } else {
                  setActiveTab("history");
                  setActiveSession(null);
                  setActiveReportId(null);
                }
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeReportId ? "bg-indigo-600/50 text-indigo-200" : "text-slate-500"
              }`}
            >
              <Award className="w-4 h-4" />
              Interview Report {activeReportId ? "• Active" : ""}
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setActiveSession(null);
                setActiveReportId(null);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === "history" && !activeSession && !activeReportId ? "bg-indigo-600 text-slate-100" : "text-slate-400"
              }`}
            >
              <History className="w-4 h-4" />
              Interview History
            </button>
            <button
              onClick={() => {
                setActiveTab("settings");
                setActiveSession(null);
                setActiveReportId(null);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold ${
                activeTab === "settings" && !activeSession && !activeReportId ? "bg-indigo-600 text-slate-100" : "text-slate-400"
              }`}
            >
              <Settings className="w-4 h-4" />
              Voice & Profile Settings
            </button>
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* 3. WORKSPACE CONTAINER */}
      <main className="flex-1 bg-[#090d16] min-h-screen overflow-y-auto">
        {renderWorkspace()}
      </main>

    </div>
  );
}
