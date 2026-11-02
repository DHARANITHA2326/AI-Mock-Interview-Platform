import React, { useState } from "react";
import { UserProfile } from "../types";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  School, 
  BadgeCheck, 
  Building2, 
  Calendar 
} from "lucide-react";
import { motion } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile, token: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  // Role selector: 'student' or 'teacher'
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Freshers");

  // Student specific fields
  const [registerNumber, setRegisterNumber] = useState("");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [year, setYear] = useState("3rd Year");

  // Teacher specific fields
  const [staffId, setStaffId] = useState("");
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please provide a valid email address (e.g., name@domain.com).");
      setLoading(false);
      return;
    }

    if (!password) {
      setError("Password is required.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (!trimmedName) {
        setError("Full Name is required.");
        setLoading(false);
        return;
      }
      if (selectedRole === "student" && !registerNumber.trim()) {
        setError("Register Number / Roll No is required for students.");
        setLoading(false);
        return;
      }
      if (selectedRole === "teacher" && !staffId.trim()) {
        setError("Staff / Faculty ID is required for teachers.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your typing.");
        setLoading(false);
        return;
      }
    }

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const payload = isLogin
        ? { email: trimmedEmail, password, role: selectedRole }
        : { 
            name: trimmedName, 
            email: trimmedEmail, 
            password, 
            confirmPassword, 
            role: selectedRole,
            registerNumber: selectedRole === "student" ? registerNumber.trim().toUpperCase() : undefined,
            staffId: selectedRole === "teacher" ? staffId.trim() : undefined,
            department: department.trim(),
            year: selectedRole === "student" ? year.trim() : undefined,
            experienceLevel: selectedRole === "teacher" ? "Faculty" : experienceLevel 
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (!otpSent) {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setOtpSent(true);
        setMessage(`OTP code generated for testing: ${data.otp}`);
      } else {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: otpCode, newPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setMessage("Password updated successfully! Please log in.");
        setIsForgot(false);
        setOtpSent(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDemoLogin = () => {
    onAuthSuccess(
      {
        id: "demo-user-123",
        email: "student@example.com",
        name: "Alex Morgan",
        role: "student",
        registerNumber: "DEMO-2024-001",
        department: "Computer Science & Engineering",
        year: "3rd Year",
        experienceLevel: "Freshers",
        skills: ["Java", "Python", "SQL", "React", "Node.js"],
        streak: 5,
        lastActive: new Date().toISOString(),
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
      },
      "demo-student-token"
    );
  };

  const handleTeacherDemoLogin = () => {
    onAuthSuccess(
      {
        id: "faculty-user-01",
        email: "faculty@interviewmaster.edu",
        name: "Prof. Ananya Sharma",
        role: "teacher",
        staffId: "FAC-CS-01",
        department: "Computer Science & Engineering",
        experienceLevel: "Senior Faculty & Placement Coordinator",
        skills: ["Placement Training", "Curriculum Design", "Interview Evaluation"],
        streak: 12,
        lastActive: new Date().toISOString(),
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop"
      },
      "demo-faculty-token"
    );
  };

  return (
    <div id="auth-container" className="min-h-screen flex items-center justify-center bg-[#090d16] px-4 py-12 relative overflow-hidden font-sans">
      {/* Background radial overlays */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_50%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_50%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg bg-[#0f172a]/95 border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative backdrop-blur-md"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 text-indigo-400 rounded-xl mb-3 border border-indigo-500/20 shadow-indigo-500/10 shadow-lg">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-100 tracking-tight">
            InterviewMaster AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Mock Interview, Coding Arena & Academic Evaluation Suite
          </p>
        </div>

        {/* 1. DUAL LOGIN TYPE SELECTOR (STUDENTS vs TEACHERS) */}
        <div className="mb-6">
          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-2 text-center">
            Select Your Portal
          </label>
          <div className="grid grid-cols-2 gap-2 bg-[#090d16] p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSelectedRole("student");
                setError("");
                setMessage("");
              }}
              className={`py-3 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedRole === "student"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Students Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole("teacher");
                setError("");
                setMessage("");
              }}
              className={`py-3 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                selectedRole === "teacher"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <School className="w-4 h-4" />
              <span>Teachers Login</span>
            </button>
          </div>

          {/* Portal Information Badge */}
          <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            {selectedRole === "student" ? (
              <>
                <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Student Portal:</strong> Practice Technical, HR, and Coding Test rounds with real test cases and voice recording. Your Register Number identifies your submission for teachers.
                </span>
              </>
            ) : (
              <>
                <School className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Teacher Portal:</strong> View, filter, and inspect student performance reports alone. Identify students uniquely by Register Number.
                </span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs leading-relaxed">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-lg text-xs leading-relaxed font-mono">
            {message}
          </div>
        )}

        {/* 2. FORGOT PASSWORD BLOCK */}
        {isForgot ? (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <h3 className="text-md font-semibold text-slate-200">Reset Security Credentials</h3>
            {!otpSent ? (
              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Enter OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 px-4 text-slate-200 text-sm outline-none text-center font-mono tracking-widest text-lg"
                    placeholder="000000"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-medium py-2 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {loading ? "Processing..." : otpSent ? "Update Password" : "Send Reset Code"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setOtpSent(false);
                  setError("");
                  setMessage("");
                }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          /* 3. STANDARD LOGIN / SIGNUP FORM */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            {/* Additional Registration Fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">
                    {selectedRole === "teacher" ? "Faculty Full Name" : "Student Full Name"}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors"
                      placeholder={selectedRole === "teacher" ? "Prof. Ananya Sharma" : "Alex Morgan"}
                    />
                  </div>
                </div>

                {/* Role Specific Identification: Register No for Students, Staff ID for Teachers */}
                {selectedRole === "student" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">
                        Register Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <BadgeCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={registerNumber}
                          onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                          className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-3 text-slate-200 text-sm outline-none transition-colors font-mono"
                          placeholder="DEMO-2024-001"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">
                        Year of Study
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-3 text-slate-200 text-sm outline-none transition-colors"
                        >
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="Final Year">Final Year</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">
                      Staff / Faculty ID <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <BadgeCheck className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                        className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors font-mono"
                        placeholder="FAC-CS-01"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Department / Branch</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors"
                      placeholder="Computer Science & Engineering"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-4 text-slate-200 text-sm outline-none transition-colors"
                  placeholder={selectedRole === "teacher" ? "faculty@interviewmaster.edu" : "student@university.edu"}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="block text-xs text-slate-400 uppercase font-semibold">Password</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgot(true);
                      setError("");
                      setMessage("");
                    }}
                    className="text-xs text-indigo-400 hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-10 text-slate-200 text-sm outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs text-slate-400 uppercase font-semibold mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-lg py-2 pl-10 pr-10 text-slate-200 text-sm outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer mt-2"
            >
              {loading ? "Processing..." : isLogin ? `Sign In to ${selectedRole === "teacher" ? "Faculty Portal" : "Student Arena"}` : `Register as ${selectedRole === "teacher" ? "Teacher" : "Student"}`}
            </button>

            <div className="relative my-4 text-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-slate-800 -translate-y-1/2" />
              <span className="relative bg-[#0f172a] px-3 text-xs text-slate-500 uppercase font-semibold">Or Direct Demo</span>
            </div>

            {/* Direct Demonstration Buttons for Both Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleStudentDemoLogin}
                className="w-full bg-[#1e293b] hover:bg-slate-700/80 border border-slate-800 text-slate-200 font-medium py-2.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Mock student interview arena with code sandbox & voice test"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                Student Demo
              </button>

              <button
                type="button"
                onClick={handleTeacherDemoLogin}
                className="w-full bg-[#1e293b] hover:bg-slate-700/80 border border-slate-800 text-slate-200 font-medium py-2.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Faculty portal to view and inspect student reports alone"
              >
                <School className="w-3.5 h-3.5 text-indigo-400" />
                Teacher Demo
              </button>
            </div>

            <div className="text-center mt-4 text-xs text-slate-400">
              {isLogin ? "Need a new account?" : "Already registered?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setError("");
                  setMessage("");
                }}
                className="text-indigo-400 hover:underline font-semibold ml-1 cursor-pointer"
              >
                {isLogin ? `Create ${selectedRole === "teacher" ? "Teacher" : "Student"} account` : "Back to login"}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
