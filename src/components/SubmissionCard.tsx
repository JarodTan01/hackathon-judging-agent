"use client";

import { useState } from "react";
import ScoreGrid from "./ScoreGrid";

interface SubmissionCardProps {
  rank: number;
  submission: {
    id: string;
    repoUrl: string;
    repoName: string | null;
    overallScore: number | null;
    status: string;
    errorMessage: string | null;
    scores: Array<{
      id: string;
      score: number;
      reasoning: string;
      criterion: {
        id: string;
        name: string;
        description: string | null;
        maxScore: number;
        weight: number;
      };
    }>;
  };
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const [colorClass, bgClass] =
    score >= 7
      ? ["text-emerald-400", "bg-emerald-500/10 border-emerald-500/20"]
      : score >= 4
      ? ["text-amber-400", "bg-amber-500/10 border-amber-500/20"]
      : ["text-red-400", "bg-red-500/10 border-red-500/20"];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${colorClass} ${bgClass}`}>
      {score.toFixed(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "text-slate-400 bg-slate-700/50 border-slate-700",
    scraping: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    rating: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    done: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    error: "text-red-400 bg-red-500/10 border-red-500/20",
  };
  const cls = map[status] ?? "text-slate-400 bg-slate-700/50 border-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function SubmissionCard({ rank, submission }: SubmissionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const displayName = submission.repoName ?? submission.repoUrl;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-800/50 transition-colors"
      >
        {/* Rank badge */}
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
          {rank}
        </span>

        {/* Repo name */}
        <a
          href={submission.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline truncate transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {displayName}
        </a>

        {/* Badges + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ScoreBadge score={submission.overallScore} />
          <StatusBadge status={submission.status} />
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800">
          {submission.status === "error" ? (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-400">
              {submission.errorMessage ?? "An unknown error occurred."}
            </div>
          ) : submission.scores.length > 0 ? (
            <ScoreGrid scores={submission.scores} />
          ) : (
            <p className="mt-3 text-sm text-slate-500 italic">No scores available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
