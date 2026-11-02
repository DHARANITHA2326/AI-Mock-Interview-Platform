import React, { useState, useEffect, useRef } from "react";
import { ResumeAnalysis } from "../types";
import { FileText, Sparkles, UploadCloud, Check, UserCheck, ChevronRight, List, AlertCircle, Award, FileSpreadsheet, Play } from "lucide-react";
import { motion } from "motion/react";

interface ResumeAnalyzerProps {
  authToken: string;
  onContinue: () => void;
}

export default function ResumeAnalyzer({ authToken, onContinue }: ResumeAnalyzerProps) {
  const [resume, setResume] = useState<ResumeAnalysis | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resume Optimizer Advice card state
  const [improverAdvice, setImproverAdvice] = useState<any | null>(null);
  const [improverLoading, setImproverLoading] = useState(false);

  useEffect(() => {
    fetchSavedResume();
  }, [authToken]);

  const fetchSavedResume = async () => {
    try {
      const response = await fetch("/api/resume/get", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setResume(data);
        fetchImprovementAdvice();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchImprovementAdvice = async () => {
    setImproverLoading(true);
    try {
      const response = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setImproverAdvice(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setImproverLoading(false);
    }
  };

  // Handle direct API file upload
  const uploadFile = async (file: File) => {
    if (!file) return;

    // Check file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["pdf", "docx", "doc", "txt", "md"];
    if (!ext || !validExts.includes(ext)) {
      setError("Please upload a PDF, DOCX, DOC, or TXT resume file.");
      return;
    }

    setLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process resume file.");

      setResume(data.resume);
      fetchImprovementAdvice();
    } catch (err: any) {
      setError(err.message || "Failed to parse file. You can also paste the resume text in the box on the right.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleTextAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          textContent: pastedText,
          fileName: fileName || "Pasted_Resume_Profile.pdf"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setResume(data.resume);
      fetchImprovementAdvice();
    } catch (err: any) {
      setError(err.message || "Failed to analyze resume text. Check API connections.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="resume-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">AI Resume Analyzer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload your PDF/DOCX resume file or copy-paste text. Gemini extracts structured fields for custom-targeted mock questions.
          </p>
        </div>

        {/* Continue button enabled after successful upload */}
        {resume && (
          <button
            onClick={onContinue}
            className="bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
          >
            Continue to Interview Setup
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. INPUT ZONE IF NO RESUME ANALYZED */}
      {!resume ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Real desktop file upload drop zone */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
            />
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/5 shadow-inner"
                  : "border-slate-800 hover:border-indigo-500/50 bg-slate-900/10 hover:bg-slate-900/20"
              }`}
            >
              <UploadCloud className="w-12 h-12 text-slate-500 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-md font-semibold text-slate-200">Drag & Drop Resume</h3>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs leading-relaxed">
                Accepts <strong className="text-indigo-400">PDF</strong>, <strong className="text-indigo-400">DOCX</strong>, <strong className="text-indigo-400">DOC</strong>, or <strong className="text-indigo-400">TXT</strong> files.
              </p>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileInput();
                }}
                className="mt-5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10 border border-indigo-500/30"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Select File from Computer
              </button>

              {fileName && (
                <span className="mt-4 text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full">
                  Selected: {fileName}
                </span>
              )}
              {loading && (
                <div className="absolute inset-0 bg-[#06080e]/90 flex flex-col items-center justify-center gap-3 rounded-2xl">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-indigo-400 font-semibold font-mono">Extracting text & analyzing profile...</p>
                </div>
              )}
            </div>
          </div>

          {/* Copy paste text box */}
          <form onSubmit={handleTextAnalyze} className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs text-slate-400 uppercase font-semibold">Or Paste Resume Text</label>
              <button
                type="button"
                onClick={() => {
                  setPastedText(`Alex Morgan\nEmail: alex.morgan@example.com\nEducation: B.Tech in Information Technology (2025)\n\nSkills: Python, React, JavaScript, HTML5, CSS3, SQL, Git, REST APIs, Node.js\n\nProjects:\n• AI Mock Interview Platform: Built an intelligent interview preparation web application with real-time feedback, speech recognition, and custom question generation.\n• Student Portal Management System: Developed database management portal using Python and SQL with role-based access control.\n\nInternships:\n• Web Development Intern at Tech Solutions (3 Months): Developed responsive UI components in React and optimized backend API routes.`);
                  setFileName("Demo_Resume.txt");
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
              >
                Insert Sample Resume
              </button>
            </div>

            <textarea
              required
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste details of your background, experience, projects, and education..."
              className="w-full h-64 bg-slate-900/40 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-slate-200 outline-none transition-colors resize-none font-mono text-xs"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
                  Analyzing Resume profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze with Gemini AI
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* 2. MAIN BENTO SUMMARY SHOWING PARSED RESULTS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Parsed stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-400" />
                  <div>
                    <h2 className="text-md font-semibold text-slate-200">{resume.fileName}</h2>
                    <p className="text-xs text-slate-500">Processed on {new Date(resume.uploadedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setResume(null);
                    setFileName("");
                    setPastedText("");
                  }}
                  className="text-xs text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Re-upload Different
                </button>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Skills & Technologies */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <List className="w-4 h-4 text-indigo-400" /> Extracted Core Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.skills.map((skill, idx) => (
                        <span key={idx} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs px-2.5 py-1 rounded-lg">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-400" /> Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {resume.strengths.map((str, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Internships & Education */}
                <div className="space-y-6">
                  {resume.internships && resume.internships.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-400" /> Internships
                      </h3>
                      {resume.internships.map((int, idx) => (
                        <div key={idx} className="text-xs text-slate-300 pl-3 border-l-2 border-slate-800 py-1 mb-3">
                          <span className="font-semibold text-slate-200">{int.role}</span>
                          <p className="text-slate-500">{int.company} ({int.duration || "N/A"})</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Academic Credentials
                    </h3>
                    {resume.education.map((edu, idx) => (
                      <div key={idx} className="text-xs text-slate-300 pl-3 border-l-2 border-slate-800 py-1">
                        <span className="font-semibold text-slate-200">{edu.degree}</span>
                        <p className="text-slate-500">{edu.institution} {edu.year ? `• ${edu.year}` : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Projects section */}
              <div className="border-t border-slate-800/60 mt-6 pt-6">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Core Highlighted Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resume.projects.map((proj, idx) => (
                    <div key={idx} className="p-4 bg-slate-900/30 border border-slate-800/40 rounded-xl">
                      <h4 className="text-sm font-semibold text-slate-200">{proj.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{proj.description}</p>
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {proj.technologies.map((tech, tIdx) => (
                            <span key={tIdx} className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Resume Optimizer / Areas To Improve side advice card */}
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-md font-semibold text-slate-200">AI Resume Optimizer</h3>
              </div>

              {improverLoading ? (
                <div className="space-y-4 py-8 text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-medium animate-pulse">Analyzing optimization metrics...</p>
                </div>
              ) : improverAdvice ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2.5">Suggested Adjustments</h4>
                    <ul className="space-y-2">
                      {improverAdvice.resumeImprovements.slice(0, 3).map((tip: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                          <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-slate-800/60 pt-4">
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      Areas To Improve
                    </h4>
                    <ul className="space-y-2">
                      {resume.weakAreas.slice(0, 3).map((weak: string, idx: number) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Analysis metrics are pending...</p>
              )}
            </div>

            <div className="mt-6 border-t border-slate-800/60 pt-4 text-[11px] text-slate-500 leading-snug">
              These suggestions are customized based on current corporate grading rubrics and recruitment pipelines.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
