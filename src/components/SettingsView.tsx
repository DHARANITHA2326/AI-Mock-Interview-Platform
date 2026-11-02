import React, { useState, useEffect } from "react";
import { UserProfile, VoiceSettings } from "../types";
import { 
  Volume2, 
  User, 
  Sliders, 
  Check, 
  Sparkles, 
  Building2, 
  Briefcase, 
  Award, 
  Layers, 
  Play, 
  Square, 
  Save, 
  RefreshCw,
  Camera,
  Mail,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus
} from "lucide-react";
import { motion } from "motion/react";

interface SettingsViewProps {
  user: UserProfile;
  authToken: string;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onBackToDashboard: () => void;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: "",
  voiceName: "Natural System Voice",
  lang: "en-US",
  pitch: 1.0,
  rate: 1.0,
  volume: 1.0,
};

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face"
];

export default function SettingsView({ user, authToken, onUpdateUser, onBackToDashboard }: SettingsViewProps) {
  // Voice states
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [pitch, setPitch] = useState<number>(1.0);
  const [rate, setRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [voiceSaveToast, setVoiceSaveToast] = useState<string>("");

  // Profile states
  const [name, setName] = useState<string>(user.name || "");
  const [email] = useState<string>(user.email || "");
  const [experienceLevel, setExperienceLevel] = useState<string>(user.experienceLevel || "Freshers");
  const [targetRole, setTargetRole] = useState<string>(user.targetRole || "Software Developer");
  const [targetCompany, setTargetCompany] = useState<string>(user.targetCompany || "Zoho");
  const [preferredSubject, setPreferredSubject] = useState<string>(user.preferredSubject || "Java");
  const [bio, setBio] = useState<string>(user.bio || "Aspiring software engineer eager to tackle full-stack and systems engineering challenges.");
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || AVATAR_PRESETS[0]);
  const [skills, setSkills] = useState<string[]>(user.skills || ["Java", "Python", "SQL", "React"]);
  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessToast, setProfileSuccessToast] = useState<string>("");
  const [profileErrorToast, setProfileErrorToast] = useState<string>("");

  // Active tab inside settings
  const [activeSettingsTab, setActiveSettingsTab] = useState<"voice" | "profile">("voice");

  // Load voices from browser SpeechSynthesis API
  useEffect(() => {
    const loadVoices = () => {
      if ("speechSynthesis" in window) {
        const availableVoices = window.speechSynthesis.getVoices();
        // Prioritize English voices or natural ones
        const englishVoices = availableVoices.filter(v => v.lang.startsWith("en"));
        const displayVoices = englishVoices.length > 0 ? englishVoices : availableVoices;
        setVoices(displayVoices);

        // Load saved voice preferences
        const savedSettingsRaw = localStorage.getItem("interview_voice_settings");
        if (savedSettingsRaw) {
          try {
            const parsed: VoiceSettings = JSON.parse(savedSettingsRaw);
            setSelectedVoiceURI(parsed.voiceURI || "");
            setPitch(parsed.pitch ?? 1.0);
            setRate(parsed.rate ?? 1.0);
            setVolume(parsed.volume ?? 1.0);
            return;
          } catch {}
        }

        // Default selection
        const defaultV = displayVoices.find(v => 
          v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.default
        ) || displayVoices[0];

        if (defaultV) {
          setSelectedVoiceURI(defaultV.voiceURI);
        }
      }
    };

    loadVoices();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Save Voice Settings
  const handleSaveVoiceSettings = () => {
    const selectedVoiceObj = voices.find(v => v.voiceURI === selectedVoiceURI);
    const settings: VoiceSettings = {
      voiceURI: selectedVoiceURI,
      voiceName: selectedVoiceObj ? selectedVoiceObj.name : "System Voice",
      lang: selectedVoiceObj ? selectedVoiceObj.lang : "en-US",
      pitch,
      rate,
      volume
    };

    localStorage.setItem("interview_voice_settings", JSON.stringify(settings));
    setVoiceSaveToast("Interviewer voice preferences saved successfully!");
    setTimeout(() => setVoiceSaveToast(""), 3500);
  };

  // Test current selected voice
  const handleTestVoice = () => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isPlayingTest) {
      window.speechSynthesis.cancel();
      setIsPlayingTest(false);
      return;
    }

    window.speechSynthesis.cancel();
    const testText = "Hello! I am your AI interviewer. My voice and articulation pacing are now calibrated. Let's practice and elevate your skills!";
    const utterance = new SpeechSynthesisUtterance(testText);

    const voiceObj = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (voiceObj) utterance.voice = voiceObj;
    utterance.pitch = pitch;
    utterance.rate = rate;
    utterance.volume = volume;

    utterance.onstart = () => setIsPlayingTest(true);
    utterance.onend = () => setIsPlayingTest(false);
    utterance.onerror = () => setIsPlayingTest(false);

    window.speechSynthesis.speak(utterance);
  };

  // Add a new skill chip
  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed]);
      setNewSkillInput("");
    }
  };

  // Remove a skill chip
  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  };

  // Save Candidate Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessToast("");
    setProfileErrorToast("");

    const updatedUser: UserProfile = {
      ...user,
      name: name.trim() || user.name,
      experienceLevel,
      targetRole: targetRole.trim(),
      targetCompany: targetCompany.trim(),
      preferredSubject,
      bio: bio.trim(),
      avatarUrl,
      skills
    };

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          name: updatedUser.name,
          experienceLevel: updatedUser.experienceLevel,
          skills: updatedUser.skills,
          targetRole: updatedUser.targetRole,
          targetCompany: updatedUser.targetCompany,
          preferredSubject: updatedUser.preferredSubject,
          bio: updatedUser.bio,
          avatarUrl: updatedUser.avatarUrl
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save profile changes.");
      }

      onUpdateUser(updatedUser);
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      setProfileSuccessToast("Profile information updated successfully!");
      setTimeout(() => setProfileSuccessToast(""), 4000);
    } catch (err: any) {
      setProfileErrorToast(err.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background glow decorations */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs text-indigo-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Preferences & Account
          </span>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-100 mt-1">
            Settings & Profile
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Change the interviewer's voice and customize your candidate profile for tailored mock rounds.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          className="self-start sm:self-auto px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-[#0f172a]/90 p-1.5 rounded-2xl border border-slate-800/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveSettingsTab("voice")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === "voice"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Volume2 className="w-4 h-4" />
          Interviewer Voice Settings
        </button>
        <button
          type="button"
          onClick={() => setActiveSettingsTab("profile")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSettingsTab === "profile"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <User className="w-4 h-4" />
          Candidate Profile
        </button>
      </div>

      {/* TAB 1: INTERVIEWER VOICE SETTINGS */}
      {activeSettingsTab === "voice" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          <div className="lg:col-span-8 bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Interviewer Voice Configuration</h3>
                  <p className="text-xs text-slate-400">Choose speech synthesis voice, accent, pitch, and speed</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold uppercase">
                {voices.length} Voices Detected
              </span>
            </div>

            {voiceSaveToast && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{voiceSaveToast}</span>
              </div>
            )}

            {/* Voice Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Select Interviewer Voice
              </label>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}) {v.default ? " [System Default]" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Tip: Natural and Google voices offer realistic cadence for tech questions.
              </p>
            </div>

            {/* Audio Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Pitch Slider */}
              <div className="bg-[#090d16]/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Pitch (Tone)</span>
                  <span className="font-mono text-indigo-400 font-bold">{pitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Deeper</span>
                  <span>Normal (1.0)</span>
                  <span>Higher</span>
                </div>
              </div>

              {/* Rate / Speed Slider */}
              <div className="bg-[#090d16]/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Speed (Rate)</span>
                  <span className="font-mono text-indigo-400 font-bold">{rate.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Slow</span>
                  <span>Normal (1.0)</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Volume Slider */}
              <div className="bg-[#090d16]/80 p-4 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Volume</span>
                  <span className="font-mono text-indigo-400 font-bold">{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Soft</span>
                  <span>Medium</span>
                  <span>Full</span>
                </div>
              </div>
            </div>

            {/* Test Voice & Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleTestVoice}
                className={`w-full sm:w-auto px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                  isPlayingTest
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
              >
                {isPlayingTest ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current text-indigo-400" />}
                {isPlayingTest ? "Stop Voice Sample" : "Test Interviewer Voice"}
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setPitch(1.0);
                    setRate(1.0);
                    setVolume(1.0);
                  }}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveVoiceSettings}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Voice Settings
                </button>
              </div>
            </div>
          </div>

          {/* Quick Voice Preview Info Card */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
              <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Voice Calibration Info
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you click <strong>Read Aloud</strong> in the interview arena, the interviewer will speak the question text with your configured voice, pitch, and speed.
              </p>
              <div className="p-4 bg-[#090d16] rounded-xl border border-slate-800/60 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Voice:</span>
                  <span className="text-slate-200 font-mono text-[11px] truncate max-w-[140px]">
                    {voices.find(v => v.voiceURI === selectedVoiceURI)?.name || "System Voice"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speech Rate:</span>
                  <span className="text-indigo-400 font-mono font-bold">{rate.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Speech Pitch:</span>
                  <span className="text-indigo-400 font-mono font-bold">{pitch.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: CANDIDATE PROFILE SETTINGS */}
      {activeSettingsTab === "profile" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
        >
          <div className="lg:col-span-8 bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Candidate Profile Details</h3>
                  <p className="text-xs text-slate-400">Manage your target role, experience level, and preferred stack</p>
                </div>
              </div>
            </div>

            {profileSuccessToast && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{profileSuccessToast}</span>
              </div>
            )}

            {profileErrorToast && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <span>{profileErrorToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Avatar Selection */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Profile Avatar
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        avatarUrl === preset
                          ? "border-indigo-500 ring-2 ring-indigo-500/40 scale-105"
                          : "border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={preset} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                      {avatarUrl === preset && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors"
                    placeholder="Your Name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Email Address (Registered)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-[#090d16]/50 border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Experience Level & Target Company Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Experience Level
                  </label>
                  <select
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
                  >
                    <option value="Freshers">Fresher / College Graduate</option>
                    <option value="1-3 Years">Junior Professional (1 - 3 Years)</option>
                    <option value="3-5 Years">Mid-Level Engineer (3 - 5 Years)</option>
                    <option value="5+ Years">Senior / Lead Engineer (5+ Years)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Target Company
                  </label>
                  <input
                    type="text"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors"
                    placeholder="e.g. Zoho, TCS, Amazon, Google"
                  />
                </div>
              </div>

              {/* Target Role & Preferred Subject Stack Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Target Job Role
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors"
                    placeholder="e.g. Java Developer, Python Specialist"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Preferred Tech Stack / Subject
                  </label>
                  <select
                    value={preferredSubject}
                    onChange={(e) => setPreferredSubject(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-colors cursor-pointer"
                  >
                    <option value="Java">Java (Core, Collections, Concurrency, Spring)</option>
                    <option value="Python">Python (OOP, AsyncIO, Data Structures, FastAPI)</option>
                    <option value="SQL">SQL (Queries, Joins, Indexing, Transactions)</option>
                    <option value="JavaScript">JavaScript & TypeScript (ES6+, DOM, Promises)</option>
                    <option value="React">React (Components, Hooks, State, Performance)</option>
                    <option value="Data Structures & Algorithms">Data Structures & Algorithms</option>
                    <option value="Full Stack">Full Stack Web (MERN / Relational)</option>
                  </select>
                </div>
              </div>

              {/* Professional Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Professional Bio / About Me
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-sm text-slate-200 outline-none transition-colors resize-none leading-relaxed"
                  placeholder="Share a brief overview of your background, career targets, and key strengths..."
                />
              </div>

              {/* Skills Tags Manager */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Technical Skills & Competencies
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove skill"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    placeholder="Add a new skill (e.g. Docker, GraphQL, Redis)..."
                    className="flex-1 bg-[#090d16] border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Skill
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center gap-2"
                >
                  {isSavingProfile ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Profile Card Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl text-center space-y-4">
              <div className="relative inline-block mx-auto">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40 shadow-xl"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0f172a]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100">{name || "Candidate"}</h3>
                <p className="text-xs text-indigo-400 font-medium mt-0.5">{targetRole}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{targetCompany} Target Candidate</p>
              </div>

              <div className="p-3.5 bg-[#090d16] rounded-xl border border-slate-800 text-left space-y-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Experience</span>
                  <span className="text-slate-200 font-semibold">{experienceLevel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Primary Stack</span>
                  <span className="text-slate-200 font-semibold">{preferredSubject}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-mono block">Bio</span>
                  <p className="text-slate-400 text-[11px] italic line-clamp-3 leading-relaxed mt-0.5">
                    "{bio}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
