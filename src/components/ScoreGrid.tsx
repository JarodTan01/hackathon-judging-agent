interface ScoreGridProps {
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
}

export default function ScoreGrid({ scores }: ScoreGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      {scores.map((s) => {
        const pct = s.score / s.criterion.maxScore;
        const barColor =
          pct >= 0.7
            ? "bg-emerald-500"
            : pct >= 0.4
            ? "bg-amber-400"
            : "bg-red-500";

        return (
          <div
            key={s.id}
            className="rounded-lg border border-slate-700/60 bg-slate-800/50 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-200">
                {s.criterion.name}
              </span>
              <span className="text-sm font-bold text-white tabular-nums">
                {s.score}<span className="text-slate-500 font-normal text-xs"> / {s.criterion.maxScore}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor} transition-all`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {s.reasoning}
            </p>
          </div>
        );
      })}
    </div>
  );
}
