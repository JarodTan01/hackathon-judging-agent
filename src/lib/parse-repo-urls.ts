import { parseRepoUrl } from "./github";

export function parseRepoUrlList(raw: string): {
  valid: Array<{
    original: string;
    owner: string;
    repo: string;
    normalized: string;
  }>;
  invalid: string[];
} {
  const lines = raw
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter(Boolean);

  const valid: Array<{
    original: string;
    owner: string;
    repo: string;
    normalized: string;
  }> = [];
  const invalid: string[] = [];

  for (const line of lines) {
    const parsed = parseRepoUrl(line);
    if (parsed) {
      valid.push({
        original: line,
        owner: parsed.owner,
        repo: parsed.repo,
        normalized: `https://github.com/${parsed.owner}/${parsed.repo}`,
      });
    } else {
      invalid.push(line);
    }
  }

  return { valid, invalid };
}
