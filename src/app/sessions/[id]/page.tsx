"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SubmissionCard from "@/components/SubmissionCard";
import ProgressItem from "@/components/ProgressItem";
import { exportToCsv } from "@/lib/export";

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  maxScore: number;
  weight: number;
}

interface CriterionScore {
  id: string;
  score: number;
  reasoning: string;
  criterion: Criterion;
}

interface Submission {
  id: string;
  repoUrl: string;
  repoName: string | null;
  overallScore: number | null;
  status: string;
  errorMessage: string | null;
  scores: CriterionScore[];
}

interface Session {
  id: string;
  name: string;
  description: string | null;
  status: string;
  criteria: Criterion[];
  submissions: Submission[];
}

export default function SessionResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError((body as { error?: string }).error ?? "Failed to load session.");
          return;
        }
        const data: Session = await res.json();
        setSession(data);
      } catch {
        setError("Network error. Could not load session.");
      }
    };

    fetchSession();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${id}`);
        if (!res.ok) return;
        const data: Session = await res.json();
        setSession(data);
        const allDone = data.submissions.every(
          (s) => s.status === "done" || s.status === "error"
        );
        if (allDone || data.status === "completed") {
          clearInterval(interval);
        }
      } catch {
        // silently ignore network hiccups during polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const isRunning =
    session?.status === "running" ||
    (session?.submissions.some(
      (s) => s.status === "pending" || s.status === "scraping" || s.status === "rating"
    ) ??
      false);

  const doneSubmissions = session?.submissions.filter((s) => s.status === "done") ?? [];
  const canExport = doneSubmissions.length > 0;

  const rankedSubmissions = session
    ? [...session.submissions].sort((a, b) => {
        if (a.overallScore !== null && b.overallScore !== null)
          return b.overallScore - a.overallScore;
        if (a.overallScore !== null) return -1;
        if (b.overallScore !== null) return 1;
        return 0;
      })
    : [];

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 max-w-md text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-slate-200 font-medium">{error}</p>
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            ← New Session
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading session…
        </div>
      </div>
    );
  }

  const completedCount = session.submissions.filter(s => s.status === "done" || s.status === "error").length;
  const totalCount = session.submissions.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            New Session
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-white">{session.name}</h1>
              {session.description && (
                <p className="text-sm text-slate-400">{session.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Status badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  session.status === "completed"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : session.status === "running"
                    ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                    : "bg-slate-700/50 border border-slate-700 text-slate-400"
                }`}
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Running
                  </>
                ) : (
                  <>
                    {session.status === "completed" && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </>
                )}
              </span>

              {/* Export CSV */}
              <button
                disabled={!canExport}
                onClick={() => exportToCsv(session.submissions, session.criteria)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Progress section */}
        {isRunning && (
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm font-semibold text-white">Rating in progress</span>
              </div>
              <span className="text-xs text-slate-500">{completedCount} / {totalCount}</span>
            </div>
            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="divide-y divide-slate-800/60">
              {session.submissions.map((sub) => (
                <ProgressItem
                  key={sub.id}
                  repoUrl={sub.repoUrl}
                  status={sub.status as "pending" | "scraping" | "rating" | "done" | "error"}
                  overallScore={sub.overallScore ?? undefined}
                  error={sub.errorMessage ?? undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results section */}
        {doneSubmissions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-base font-semibold text-white">Results</h2>
              <span className="text-sm text-slate-500">
                {doneSubmissions.length} / {session.submissions.length} repos rated
              </span>
            </div>

            <div className="space-y-2">
              {rankedSubmissions.map((sub, idx) => (
                <SubmissionCard
                  key={sub.id}
                  rank={idx + 1}
                  submission={sub}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isRunning && doneSubmissions.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-slate-400 text-sm">No results yet.</p>
            <Link href="/" className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Start a new screening run →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
