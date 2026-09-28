"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import CriteriaBuilder, { type Criterion } from "@/components/CriteriaBuilder";
import RepoInput from "@/components/RepoInput";
import { parseRepoUrlList } from "@/lib/parse-repo-urls";
import Link from "next/link";

const DEFAULT_CRITERIA: Omit<Criterion, "id">[] = [
  {
    name: "Innovation",
    description: "Originality and novelty of the idea",
    weight: 3,
    maxScore: 10,
  },
  {
    name: "Technical Execution",
    description: "Code quality, architecture, and completeness",
    weight: 3,
    maxScore: 10,
  },
  {
    name: "Documentation & Presentation",
    description: "README clarity, setup instructions, demo",
    weight: 2,
    maxScore: 10,
  },
];

function makeId() {
  return crypto.randomUUID();
}

export default function HomePage() {
  const router = useRouter();

  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>(() =>
    DEFAULT_CRITERIA.map((c) => ({ ...c, id: makeId() }))
  );
  const [repoUrlsRaw, setRepoUrlsRaw] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { valid: validRepos, invalid: invalidUrls } = useMemo(
    () => parseRepoUrlList(repoUrlsRaw),
    [repoUrlsRaw]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sessionName.trim()) {
      setError("Session name is required.");
      return;
    }
    if (criteria.every((c) => !c.name.trim())) {
      setError("At least one criterion with a name is required.");
      return;
    }
    if (validRepos.length === 0) {
      setError("At least one valid GitHub repository URL is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sessionName.trim(),
          description: sessionDescription.trim(),
          criteria: criteria
            .filter((c) => c.name.trim())
            .map(({ id: _id, ...rest }) => rest),
        }),
      });

      if (!sessionRes.ok) {
        const body = await sessionRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Failed to create session (${sessionRes.status})`
        );
      }

      const session = (await sessionRes.json()) as { id: string };

      const submissionsRes = await fetch(
        `/api/sessions/${session.id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoUrls: validRepos.map((v) => v.normalized),
          }),
        }
      );

      if (!submissionsRes.ok) {
        const body = await submissionsRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Failed to add repositories (${submissionsRes.status})`
        );
      }

      fetch(`/api/sessions/${session.id}/run`, { method: "POST" }).catch(() => {});

      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              {/* Bob-powered pill */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                Powered by Bob AI
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Hackathon Screener
            </h1>
            <p className="mt-1.5 text-slate-400">
              AI-powered GitHub repository screening for hackathon organizers
            </p>
          </div>
          <Link
            href="/sessions"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors mt-1"
          >
            Past sessions →
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Session Details */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Session Details
            </h2>
            <div className="space-y-1.5">
              <label
                htmlFor="session-name"
                className="block text-sm font-medium text-slate-200"
              >
                Session Name <span className="text-red-400">*</span>
              </label>
              <input
                id="session-name"
                type="text"
                required
                placeholder="e.g. Spring 2025 Hackathon"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="session-desc"
                className="block text-sm font-medium text-slate-200"
              >
                Description{" "}
                <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="session-desc"
                type="text"
                placeholder="Brief notes about this screening run"
                value={sessionDescription}
                onChange={(e) => setSessionDescription(e.target.value)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Section 2: Judging Criteria */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">
              Judging Criteria
            </h2>
            <CriteriaBuilder criteria={criteria} onChange={setCriteria} />
          </div>

          {/* Section 3: Repository URLs */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">
              Repository URLs
            </h2>
            <RepoInput
              value={repoUrlsRaw}
              onChange={setRepoUrlsRaw}
              validCount={validRepos.length}
              invalidUrls={invalidUrls}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Starting…" : "Start Screening →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
