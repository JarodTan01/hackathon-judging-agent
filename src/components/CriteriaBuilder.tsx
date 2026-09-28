"use client";

export interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

interface CriteriaBuilderProps {
  criteria: Criterion[];
  onChange: (criteria: Criterion[]) => void;
}

export default function CriteriaBuilder({
  criteria,
  onChange,
}: CriteriaBuilderProps) {
  function update(id: string, field: keyof Criterion, value: string | number) {
    onChange(
      criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function add() {
    onChange([
      ...criteria,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        weight: 1,
        maxScore: 10,
      },
    ]);
  }

  function remove(id: string) {
    if (criteria.length <= 1) return;
    onChange(criteria.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_1fr_72px_80px_36px] gap-2 px-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Weight</span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Max Score</span>
        <span />
      </div>

      {criteria.map((c) => (
        <div
          key={c.id}
          className="grid grid-cols-[1fr_1fr_72px_80px_36px] gap-2 items-center"
        >
          <input
            type="text"
            required
            placeholder="e.g. Innovation"
            value={c.name}
            onChange={(e) => update(c.id, "name", e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="text"
            placeholder="Optional description"
            value={c.description}
            onChange={(e) => update(c.id, "description", e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={c.weight}
            onChange={(e) =>
              update(c.id, "weight", parseFloat(e.target.value) || 1)
            }
            className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="number"
            min={1}
            step={1}
            value={c.maxScore}
            onChange={(e) =>
              update(c.id, "maxScore", parseInt(e.target.value, 10) || 10)
            }
            className="rounded-lg bg-slate-800 border border-slate-700 px-2 py-2 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            type="button"
            disabled={criteria.length <= 1}
            onClick={() => remove(c.id)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
            aria-label="Remove criterion"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="mt-1 inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Criterion
      </button>
    </div>
  );
}
