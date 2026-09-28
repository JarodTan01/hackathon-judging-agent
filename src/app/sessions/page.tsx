import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "text-slate-400 bg-slate-700/50 border-slate-700",
    running: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    completed: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
  const cls = map[status] ?? "text-slate-400 bg-slate-700/50 border-slate-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function SessionsPage() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Sessions</h1>
            <p className="text-sm text-slate-400 mt-0.5">All past screening runs</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 active:scale-[0.98] transition-all"
          >
            New Session →
          </Link>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <p className="text-slate-400 text-sm mb-2">No sessions yet.</p>
            <Link href="/" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
              Create your first session →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 flex items-center gap-4 flex-wrap hover:border-slate-700 transition-colors"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">
                      {session.name}
                    </span>
                    <StatusBadge status={session.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(session.createdAt).toLocaleString()} ·{" "}
                    {session._count.submissions}{" "}
                    {session._count.submissions === 1 ? "submission" : "submissions"}
                  </p>
                  {session.description && (
                    <p className="text-xs text-slate-500 truncate">{session.description}</p>
                  )}
                </div>

                <Link
                  href={`/sessions/${session.id}`}
                  className="flex-shrink-0 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View Results →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
