interface ProgressItemProps {
  repoUrl: string;
  status: "pending" | "scraping" | "rating" | "done" | "error";
  overallScore?: number;
  error?: string;
}

function repoLabel(url: string) {
  try {
    const parts = new URL(url).pathname.replace(/^\//, "").split("/");
    return parts.slice(0, 2).join("/") || url;
  } catch {
    return url;
  }
}

const STATUS_TEXT: Record<ProgressItemProps["status"], string> = {
  pending: "Waiting",
  scraping: "Scraping repository",
  rating: "Rating with Bob AI",
  done: "Done",
  error: "Error",
};

export default function ProgressItem({
  repoUrl,
  status,
  overallScore,
  error,
}: ProgressItemProps) {
  const isSpinning = status === "scraping" || status === "rating";

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* Status icon */}
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
        {isSpinning && (
          <svg
            className="animate-spin w-4 h-4 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {status === "done" && (
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "error" && (
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        {status === "pending" && (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto block" />
        )}
      </div>

      {/* Repo label */}
      <span className={`flex-1 text-sm font-mono truncate ${
        status === "pending" ? "text-slate-500" : "text-slate-300"
      }`}>
        {repoLabel(repoUrl)}
      </span>

      {/* Status text + score */}
      <div className="flex-shrink-0 text-xs flex items-center gap-2">
        <span className={
          status === "done" ? "text-slate-500" :
          status === "error" ? "text-red-400" :
          status === "pending" ? "text-slate-600" :
          "text-blue-400"
        }>
          {STATUS_TEXT[status]}
        </span>
        {status === "done" && overallScore !== undefined && (
          <span className="font-bold text-emerald-400 tabular-nums">{overallScore.toFixed(1)}</span>
        )}
        {status === "error" && error && (
          <span className="text-red-400/70 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
