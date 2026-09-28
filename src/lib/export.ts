export function exportToCsv(
  submissions: Array<{
    repoName: string | null;
    repoUrl: string;
    overallScore: number | null;
    scores: Array<{ criterion: { name: string }; score: number }>;
  }>,
  criteria: Array<{ name: string }>
): void {
  const headers = [
    "Rank",
    "Repository",
    "URL",
    "Overall Score",
    ...criteria.map((c) => c.name),
  ];

  const rows = submissions
    .filter((s) => s.overallScore !== null)
    .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
    .map((s, i) => {
      const criterionScores = criteria.map((c) => {
        const score = s.scores.find((sc) => sc.criterion.name === c.name);
        return score ? String(score.score) : "N/A";
      });
      return [
        String(i + 1),
        s.repoName ?? s.repoUrl,
        s.repoUrl,
        s.overallScore?.toFixed(2) ?? "N/A",
        ...criterionScores,
      ];
    });

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hackathon-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}
