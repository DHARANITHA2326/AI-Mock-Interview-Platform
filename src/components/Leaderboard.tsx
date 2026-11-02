import React, { useState, useEffect } from "react";
import { LeaderboardEntry } from "../types";
import { Award, Flame, User, Trophy, Medal, Star, Shield, ArrowUp, Zap } from "lucide-react";
import { motion } from "motion/react";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/leaderboard");
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="font-mono text-sm font-semibold text-slate-500">{rank}</span>;
  };

  return (
    <div id="leaderboard-view" className="space-y-8 bg-[#090d16] min-h-screen text-slate-100 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="border-b border-slate-800/60 pb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Leaderboard Standing</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compete against peers and maintain daily practice streaks to secure top badges.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4 py-12 text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Gathering scoreboard statistics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main ranking list */}
          <div className="lg:col-span-2 bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl space-y-4">
            <h3 className="text-md font-semibold text-slate-200 mb-4 flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-amber-400" /> Active Ranks
            </h3>

            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`p-4 rounded-xl flex items-center justify-between border transition-all ${
                    entry.name === "Alex Morgan"
                      ? "bg-indigo-500/10 border-indigo-500/30"
                      : "bg-slate-900/40 border-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                        {entry.name}
                        {entry.name === "Alex Morgan" && (
                          <span className="text-[9px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.2 rounded-full font-bold uppercase">
                            You
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{entry.experienceLevel}</span>
                        <span>•</span>
                        <span>{entry.interviewsCount} Rounds Completed</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Streak</p>
                      <span className="text-xs font-bold text-amber-500 flex items-center gap-1 justify-end mt-0.5">
                        <Flame className="w-3.5 h-3.5 fill-current" /> {entry.streak} Days
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Avg Score</p>
                      <span className="text-sm font-black text-indigo-400 mt-0.5 block">
                        {entry.averageScore}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges explanation side card */}
          <div className="bg-[#0f172a]/80 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-indigo-400" /> Skill Badges
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 mt-0.5">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Elite Articulator</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Unlocked by achieving an average Communication structure score of over 9.2/10 across three sessions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 mt-0.5">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Consistency Master</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Unlocked by maintaining a daily mock interview solution practice streak of over 7 consecutive days.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 mt-0.5">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">System Designer</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Unlocked by successfully answering highly complex architectural queries with optimal scoring metrics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800/60 pt-4 text-[10px] text-slate-500">
              Rank updates and badge criteria synchronize every night.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
