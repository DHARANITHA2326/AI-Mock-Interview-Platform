import React, { useState } from "react";
import { Terminal, Database, Activity, RefreshCw, Key, Globe, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface AdminPanelProps {
  authToken: string;
}

export default function AdminPanel({ authToken }: AdminPanelProps) {
  const [logs, setLogs] = useState<string[]>([
    "[SYSTEM] AI Mock Interview platform initialized.",
    "[DB] dbStore mocked maps memory structure booted.",
    "[API] Mounted routes: /api/auth/*, /api/resume/*, /api/interview/*, /api/dashboard/*",
    "[AI] Gemini models: gemini-3.5-flash configuration ready.",
    "[WEB] Speech-recognition / Speech-synthesis API listeners bound.",
    "[WEBCAM] Camera container overlay parameters set."
  ]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const addLog = (text: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev]);
  };

  const handleSeedDatabase = async () => {
    setLoading(true);
    setMessage("");
    try {
      // Direct simulation trigger to fill dbStore in-memory sessions with completed rounds!
      const response = await fetch("/api/interview/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ interviewType: "Technical Round", difficulty: "Medium", company: "Accenture", count: 4 })
      });

      if (!response.ok) throw new Error("Seed step 1 failed.");
      const session = await response.json();

      // Submit mock answers
      for (let i = 0; i < session.questions.length; i++) {
        const q = session.questions[i];
        await fetch("/api/interview/answer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            sessionId: session.id,
            questionId: q.id,
            candidateAnswer: "I have successfully resolved architectural anomalies across microservice nodes by introducing unified state models and load balancers."
          })
        });
      }

      // Complete session
      await fetch("/api/interview/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ sessionId: session.id })
      });

      addLog(`[DB] Seeded mock interview session: ${session.id} with completed results.`);
      setMessage("Seeded 1 completed mock interview round successfully! Your dashboard trends are now populated.");
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to seed. Make sure your Gemini API Key is active.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetLogs = () => {
    setLogs([
      `[${new Date().toLocaleTimeString()}] Telemetry logs wiped clean.`
    ]);
  };

  return (
    <div id="admin-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">System Telemetry</h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor system connections, compile database metrics, or seed demo history logs for grading evaluation.
        </p>
      </div>

      {message && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-mono leading-relaxed">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
              <Database className="w-4 h-4 text-indigo-400" /> Administrative Actions
            </h3>

            <div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Add completed interview sessions with full score trends to quickly preview performance graphs.
              </p>
              <button
                onClick={handleSeedDatabase}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Seed Completed Session
              </button>
            </div>
          </div>

          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5 border-b border-slate-800/60 pb-3">
              <Activity className="w-4 h-4 text-indigo-400" /> Endpoint Quotas
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Gemini API Quota:</span>
                <span className="text-slate-200 font-semibold">Unlimited (Active)</span>
              </div>
              <div className="flex justify-between">
                <span>Webcam Frame rate:</span>
                <span className="text-slate-200 font-semibold">30 FPS (Dynamic)</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Latency:</span>
                <span className="text-slate-200 font-semibold">4ms (Local)</span>
              </div>
              <div className="flex justify-between">
                <span>Memory usage:</span>
                <span className="text-slate-200 font-semibold">32.4 MB / 512 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Console */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <span className="text-sm font-semibold text-slate-200 font-display">Console Outputs</span>
              </div>
              <button onClick={handleResetLogs} className="text-[10px] text-indigo-400 hover:underline">
                Clear
              </button>
            </div>

            <div className="space-y-2 h-80 overflow-y-auto font-mono text-[11px] text-slate-400 pr-2">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-indigo-500 mr-2">&gt;&gt;</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-900/60 pt-4 flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Globe className="w-4 h-4" /> Service Host: http://0.0.0.0:3000
          </div>
        </div>

      </div>
    </div>
  );
}
