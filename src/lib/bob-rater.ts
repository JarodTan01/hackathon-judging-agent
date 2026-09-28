import { spawn } from "child_process";
import type { RepoData } from "./github";

export interface RatingCriterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number;
}

export interface CriterionRating {
  criterionId: string;
  score: number; // 0 to maxScore
  reasoning: string;
}

export interface RatingResult {
  scores: CriterionRating[];
  overallScore: number; // weighted average, 0-10 normalised
  overallSummary: string;
}

export interface RatingError {
  error: string;
}

export type RateResult = RatingResult | RatingError;

export function buildPrompt(
  repoData: RepoData,
  criteria: RatingCriterion[]
): string {
  const { owner, repo, repoUrl, description, language, starsCount, openIssuesCount, fileTree, readme, packageJson, requirementsTxt } = repoData;

  return `You are a hackathon judge evaluating a GitHub repository submission.

## Repository: ${owner}/${repo}
URL: ${repoUrl}
Description: ${description ?? "Not provided"}
Primary Language: ${language ?? "Not specified"}
Stars: ${starsCount} | Open Issues: ${openIssuesCount}

## File Structure (top-level)
${fileTree.join("\n")}

## README
${readme ?? "No README found"}

${packageJson ? `## package.json (dependencies)\n${JSON.stringify((packageJson as Record<string, unknown>).dependencies ?? {}, null, 2)}\n\n## package.json (devDependencies)\n${JSON.stringify((packageJson as Record<string, unknown>).devDependencies ?? {}, null, 2)}` : ""}

${requirementsTxt ? `## requirements.txt\n${requirementsTxt}` : ""}

---

## Judging Criteria

Please evaluate this repository against the following criteria:

${criteria.map((c) => `### ${c.name} (max score: ${c.maxScore}, weight: ${c.weight})\n${c.description ?? ""}`).join("\n\n")}

---

## Instructions

Evaluate the repository against each criterion above. Be thorough and fair.

Respond with ONLY a valid JSON object in this exact format (no markdown fences, no extra text):
{
  "scores": [
    {
      "criterionId": "<criterion id>",
      "score": <number between 0 and maxScore>,
      "reasoning": "<2-3 sentence explanation>"
    }
  ],
  "overallScore": <weighted average score normalised to 0-10, using the weight field>,
  "overallSummary": "<3-5 sentence overall summary of the project>"
}`;
}

function invokeBob(
  prompt: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("Bob Shell timed out after 90 seconds"));
    }, 90_000);

    const child = spawn(
      "bob",
      ["-p", prompt, "--hide-intermediary-output", "--auth-method", "api-key"],
      {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(
            `Bob Shell exited with code ${code}. stderr: ${stderr.slice(0, 500)}`
          )
        );
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function parseRatingOutput(
  stdout: string,
  criteria: RatingCriterion[]
): RatingResult {
  let parsed: unknown;

  // 1. Try direct parse first
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    // 2. Extract JSON object between first '{' and last '}'
    const firstBrace = stdout.indexOf("{");
    const lastBrace = stdout.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error(
        `Bob Shell returned no parseable JSON. Output: ${stdout.slice(0, 300)}`
      );
    }
    try {
      parsed = JSON.parse(stdout.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new Error(
        `Bob Shell returned malformed JSON. Output: ${stdout.slice(0, 300)}`
      );
    }
  }

  // 3. Validate shape
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).scores) ||
    typeof (parsed as Record<string, unknown>).overallSummary !== "string"
  ) {
    throw new Error(
      `Bob Shell JSON missing required fields 'scores' or 'overallSummary'. Got: ${JSON.stringify(parsed).slice(0, 300)}`
    );
  }

  const raw = parsed as {
    scores: Array<{ criterionId: string; score: number; reasoning: string }>;
    overallSummary: string;
    overallScore?: unknown;
  };

  // 4. Clamp scores to [0, criterion.maxScore]
  const criterionMap = new Map(criteria.map((c) => [c.id, c]));
  const scores: CriterionRating[] = raw.scores.map((s) => {
    const criterion = criterionMap.get(s.criterionId);
    const maxScore = criterion?.maxScore ?? 10;
    return {
      criterionId: s.criterionId,
      score: Math.min(Math.max(Number(s.score) || 0, 0), maxScore),
      reasoning: s.reasoning ?? "",
    };
  });

  // 5. Compute overallScore if missing or invalid
  let overallScore: number;
  if (typeof raw.overallScore === "number" && isFinite(raw.overallScore)) {
    overallScore = raw.overallScore;
  } else {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (totalWeight === 0) {
      overallScore = 0;
    } else {
      overallScore =
        scores.reduce((sum, s) => {
          const criterion = criterionMap.get(s.criterionId);
          if (!criterion) return sum;
          const normalised = (s.score / criterion.maxScore) * 10;
          return sum + normalised * criterion.weight;
        }, 0) / totalWeight;
    }
  }

  return {
    scores,
    overallScore,
    overallSummary: raw.overallSummary,
  };
}

export async function rateRepo(
  repoData: RepoData,
  criteria: RatingCriterion[]
): Promise<RateResult> {
  try {
    const prompt = buildPrompt(repoData, criteria);
    const { stdout } = await invokeBob(prompt);
    const result = parseRatingOutput(stdout, criteria);
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
