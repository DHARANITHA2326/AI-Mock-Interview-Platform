import React, { useState, useEffect } from "react";
import { UserProfile, InterviewSession } from "../types";
import { 
  Users, 
  Search, 
  Filter, 
  Award, 
  Brain, 
  ShieldCheck, 
  FileText, 
  ChevronRight, 
  Download, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Code2, 
  Users2, 
  RefreshCw,
  LogOut,
  Sparkles,
  BarChart3,
  TrendingUp,
  School
} from "lucide-react";

interface TeacherDashboardProps {
  user: UserProfile;
  authToken: string;
  onViewStudentReport: (sessionId: string) => void;
  onLogout: () => void;
}

export default function TeacherDashboard({
  user,
  authToken,
  onViewStudentReport,
  onLogout
}: TeacherDashboardProps) {
  const [reports, setReports] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "regNo">("date");

  const fetchStudentReports = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/student-reports", {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (!response.ok) {
        throw new Error("Failed to load student reports from server.");
      }
      const data = await response.json();
      setReports(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load student reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentReports();
  }, [authToken]);

  // Filtering and Searching
  const filteredReports = reports.filter((session) => {
    const regNo = (session.registerNumber || "").toLowerCase();
    const studentName = (session.candidateName || "").toLowerCase();
    const query = searchQuery.trim().toLowerCase();

    const matchesQuery = !query || regNo.includes(query) || studentName.includes(query);
    const matchesSubject = subjectFilter === "all" || (session.subject || "").toLowerCase().includes(subjectFilter.toLowerCase());
    const matchesRound = roundFilter === "all" || (session.interviewType || "").toLowerCase().includes(roundFilter.toLowerCase());
    
    let matchesScore = true;
    const score = session.overallScore || 0;
    if (scoreFilter === "high") matchesScore = score >= 85;
    else if (scoreFilter === "mid") matchesScore = score >= 70 && score < 85;
    else if (scoreFilter === "low") matchesScore = score < 70;

    return matchesQuery && matchesSubject && matchesRound && matchesScore;
  });

  // Sorting
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === "score") {
      return (b.overallScore || 0) - (a.overallScore || 0);
    }
    if (sortBy === "regNo") {
      return (a.registerNumber || "").localeCompare(b.registerNumber || "");
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Analytics Computations
  const totalSubmissions = reports.length;
  const completedSubmissions = reports.filter(r => r.status === "completed");
  const avgScore = completedSubmissions.length > 0 
    ? Math.round(completedSubmissions.reduce((acc, r) => acc + (r.overallScore || 0), 0) / completedSubmissions.length)
    : 0;
  const topPerformers = reports.filter(r => (r.overallScore || 0) >= 85).length;
  const needsAttention = reports.filter(r => (r.overallScore || 0) < 70).length;

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = ["Register Number", "Student Name", "Department", "Subject", "Round Type", "Overall Score", "Status", "Date"];
    const rows = sortedReports.map(r => [
      r.registerNumber || "N/A",
      `"${r.candidateName || "Student"}"`,
      `"${r.studentDepartment || "Engineering"}"`,
      r.subject || "Full Stack",
      `"${r.interviewType}"`,
      r.overallScore || 0,
      r.status,
      new Date(r.createdAt).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Student_Interview_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* 1. TOP TEACHER PORTAL NAVBAR */}
      <header className="bg-[#0c1221] border-b border-slate-900/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-md">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-display font-bold text-slate-100">Faculty & Teacher Portal</h1>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                STUDENT REPORTS ALONE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Department Placement & Technical Interview Evaluation Roster
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Teacher Badge */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
              {user.name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-200 text-xs">{user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {user.staffId || "Staff ID: FAC-CS-01"}
              </div>
            </div>
          </div>

          <button
            onClick={fetchStudentReports}
            title="Refresh Reports"
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* 2. MAIN TEACHER DASHBOARD WORKSPACE */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Banner with Clear Faculty Directive */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/50 to-blue-950/40 border border-indigo-500/20 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">
                Student Interview Performance & Proctoring Reports
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every mock interview taken by students is uniquely indexed by their <strong className="text-indigo-300">Register Number</strong>. Click any student row to inspect full answer transcripts, test cases passed, and candidate scores.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-400">Total Student Records:</span>
            <span className="ml-2 font-mono font-bold text-indigo-400 text-sm">{totalSubmissions}</span>
          </div>
        </div>

        {/* 3. METRIC CARDS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Submissions</span>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-display font-bold text-slate-100">{totalSubmissions}</div>
            <span className="text-[11px] text-slate-500">Student Mock Sessions</span>
          </div>

          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Class Average</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-display font-bold text-emerald-400">{avgScore}%</div>
            <span className="text-[11px] text-slate-500">Overall Accuracy Rate</span>
          </div>

          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Top Scorers</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-display font-bold text-amber-400">{topPerformers}</div>
            <span className="text-[11px] text-slate-500">Score &gt;= 85% (Placement Ready)</span>
          </div>

          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Need Guidance</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-display font-bold text-rose-400">{needsAttention}</div>
            <span className="text-[11px] text-slate-500">Score &lt; 70% (Remedial Action)</span>
          </div>
        </div>

        {/* 4. SEARCH & FILTER TOOLBAR */}
        <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Search Input by Register Number or Student Name */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Register Number (e.g. DEMO-2024-001) or Student Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Subject Stack Filter */}
            <div className="md:col-span-2">
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Subjects</option>
                <option value="Java">Java Stack</option>
                <option value="Python">Python Stack</option>
                <option value="SQL">SQL Stack</option>
                <option value="React">React Stack</option>
                <option value="HR">HR / Behavioral</option>
              </select>
            </div>

            {/* Round Type Filter */}
            <div className="md:col-span-2">
              <select
                value={roundFilter}
                onChange={(e) => setRoundFilter(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Round Types</option>
                <option value="Technical">Technical</option>
                <option value="HR">HR Round</option>
                <option value="Coding">Coding Test (Sandbox)</option>
              </select>
            </div>

            {/* Score Tier Filter */}
            <div className="md:col-span-2">
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-3 text-xs text-slate-300 outline-none transition-colors cursor-pointer"
              >
                <option value="all">All Scores</option>
                <option value="high">&gt;= 85% (Top)</option>
                <option value="mid">70% - 84%</option>
                <option value="low">&lt; 70% (Low)</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="md:col-span-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 px-2 text-xs text-slate-300 outline-none transition-colors cursor-pointer"
                title="Sort Order"
              >
                <option value="date">Date</option>
                <option value="score">Score</option>
                <option value="regNo">Reg No</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5. STUDENT REPORTS TABLE / ROSTER */}
        <div className="bg-[#0f172a]/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Student Mock Interview Roster ({sortedReports.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Showing filtered results by Register Number & Name
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Fetching student performance reports from database...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-xs">
              {error}
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs text-slate-400 font-semibold">No student reports match your search criteria.</p>
              <p className="text-[11px]">Try clearing search filters or searching with a different Register Number.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/40">
                    <th className="py-3 px-4 font-semibold">Register Number</th>
                    <th className="py-3 px-4 font-semibold">Student Name</th>
                    <th className="py-3 px-4 font-semibold">Subject / Tech Stack</th>
                    <th className="py-3 px-4 font-semibold">Round Type</th>
                    <th className="py-3 px-4 font-semibold text-center">Score</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {sortedReports.map((session) => {
                    const score = session.overallScore || 0;
                    const isHigh = score >= 85;
                    const isMid = score >= 70 && score < 85;
                    const isHR = /hr|behavioral/i.test(session.interviewType);
                    const isCoding = /coding/i.test(session.interviewType);

                    return (
                      <tr 
                        key={session.id} 
                        className="hover:bg-indigo-950/20 transition-colors group cursor-pointer"
                        onClick={() => onViewStudentReport(session.id)}
                      >
                        {/* Register Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                          <span className="bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                            {session.registerNumber || "DEMO-2024-001"}
                          </span>
                        </td>

                        {/* Student Name & Department */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">
                            {session.candidateName || "Student Candidate"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {session.studentDepartment || "Computer Science"} {session.studentYear ? `• ${session.studentYear}` : ""}
                          </div>
                        </td>

                        {/* Subject Tech Stack */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-medium">
                            {session.subject || (isHR ? "HR / Behavioral" : "Full Stack")}
                          </span>
                        </td>

                        {/* Round Type */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            {isCoding ? (
                              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                            ) : isHR ? (
                              <Users2 className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Brain className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            <span className="capitalize">{session.interviewType}</span>
                          </div>
                        </td>

                        {/* Overall Score */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            isHigh 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : isMid 
                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          }`}>
                            {score}%
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {new Date(session.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>

                        {/* Action Button */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewStudentReport(session.id);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            View Report
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
