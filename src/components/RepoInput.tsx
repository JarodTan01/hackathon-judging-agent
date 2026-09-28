"use client";

interface RepoInputProps {
  value: string;
  onChange: (value: string) => void;
  validCount: number;
  invalidUrls: string[];
}

export default function RepoInput({
  value,
  onChange,
  validCount,
  invalidUrls,
}: RepoInputProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          GitHub Repository URLs
        </label>
        <p className="text-xs text-slate-500">
          Paste one URL per line — or copy a column directly from Google Sheets
        </p>
      </div>
      <textarea
        rows={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"https://github.com/owner/repo1\nhttps://github.com/owner/repo2\nhttps://github.com/owner/repo3"}
        spellCheck={false}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3.5 py-3 font-mono text-sm text-white placeholder-slate-600 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y transition"
      />

      <div className="flex items-center gap-3 flex-wrap">
        {validCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {validCount} valid {validCount === 1 ? "repo" : "repos"} detected
          </span>
        )}
      </div>

      {invalidUrls.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs font-semibold text-amber-400 mb-2">
            {invalidUrls.length} line{invalidUrls.length > 1 ? "s" : ""} could not be parsed as GitHub URLs:
          </p>
          <ul className="space-y-0.5">
            {invalidUrls.map((url, i) => (
              <li key={i} className="font-mono text-xs text-amber-500/80 break-all">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
