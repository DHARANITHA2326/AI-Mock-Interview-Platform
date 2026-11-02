import React, { useState, useEffect } from "react";
import { Calendar, ChevronRight, Award, Trash2, Clock, CheckCircle2, AlertCircle, RefreshCw, Eye } from "lucide-react";
import { InterviewSession } from "../types";

interface InterviewHistoryProps {
  authToken: string;
  onViewReport: (sessionId: string) => void;
}

export default function InterviewHistory({ authToken, onViewReport }: InterviewHistoryProps) {
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [authToken]);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/interview/history", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error("Failed to load your history.");
      }
    } catch (err: any) {
      console.error("Error fetching historical matches:", err);
      setError(err.message || "Unable to load interview history.");
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDeleteId(sessionId);
    setError("");
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingDeleteId(null);
  };

  const executeDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    setError("");
    try {
      const response = await fetch(`/api/interview/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        setHistory(prev => prev.filter(s => s.id !== sessionId));
        setConfirmingDeleteId(null);
        setActionMessage("Interview session deleted successfully.");
        setTimeout(() => setActionMessage(""), 4000);
      } else {
        const errData = await response.json();
        setError(errData.error || "Failed to delete the session.");
      }
    } catch (err: any) {
      console.error("Error deleting session:", err);
      setError("An error occurred while deleting the session.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-[#090d16]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium font-sans">Retrieving past mock results...</p>
      </div>
    );
  }

  return (
    <div id="interview-history-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Clock className="w-8 h-8 text-indigo-400" />
            Interview History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse through previous mock evaluations, verify status milestones, and delete stale sessions.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="max-w-6xl">
        {history.length > 0 ? (
          <div className="bg-[#0f172a]/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-950/20">
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Company</th>
                    <th className="px-6 py-4 font-semibold">Score</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {history.map((session) => {
                    const isCompleted = session.status === "completed" || session.status === "terminated_violation";
                    const isTerminated = session.status === "terminated_violation";
                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-[#1e293b]/20 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (isCompleted) {
                            onViewReport(session.id);
                          } else {
                            alert("This interview is still in progress. Complete the interview to generate the report!");
                          }
                        }}
                      >
                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {formatDate(session.createdAt)}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4 font-semibold text-slate-200">
                          {session.role || session.interviewType || "Software Developer"}
                        </td>

                        {/* Company */}
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {session.company || "General"}
                        </td>

                        {/* Score */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isCompleted && session.overallScore !== undefined ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center justify-center font-bold font-mono text-xs w-8 h-8 rounded-lg border ${
                                session.overallScore >= 85
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : session.overallScore >= 70
                                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                              }`}>
                                {session.overallScore}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">/100</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-xs font-mono">Pending</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            session.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isTerminated
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          }`}>
                            {session.status === "completed" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isTerminated ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {session.status === "completed" ? "Completed" : isTerminated ? "Terminated (Violation)" : "In Progress"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {confirmingDeleteId === session.id ? (
                              <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 p-1.5 rounded-xl">
                                <span className="text-[11px] text-red-300 font-medium px-1">Delete?</span>
                                <button
                                  type="button"
                                  disabled={deletingId === session.id}
                                  onClick={(e) => executeDelete(session.id, e)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                >
                                  {deletingId === session.id ? "..." : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelDelete}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                {isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={() => onViewReport(session.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    View Report
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-500 italic mr-2">Incomplete</span>
                                )}

                                <button
                                  type="button"
                                  disabled={deletingId === session.id}
                                  onClick={(e) => requestDelete(session.id, e)}
                                  className="inline-flex items-center justify-center p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all cursor-pointer disabled:opacity-40"
                                  title="Delete Interview"
                                >
                                  {deletingId === session.id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-[#0f172a]/20 border border-slate-900 rounded-2xl">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-md font-semibold text-slate-300">No previous sessions found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Looks like you haven't completed any interviews yet. Configure your interview parameters to begin your journey!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
