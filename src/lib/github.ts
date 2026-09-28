export interface RepoData {
  owner: string;
  repo: string;
  repoUrl: string;
  description: string | null;
  language: string | null;
  starsCount: number;
  openIssuesCount: number;
  readme: string | null;
  fileTree: string[]; // top-level file/folder names
  packageJson: Record<string, unknown> | null;
  requirementsTxt: string | null;
}

export interface ScrapeError {
  error: string;
}

export type ScrapeResult = RepoData | ScrapeError;

export function isError(result: ScrapeResult): result is ScrapeError {
  return "error" in result;
}

export function parseRepoUrl(
  url: string
): { owner: string; repo: string } | null {
  // Strip trailing slash
  let cleaned = url.trim().replace(/\/+$/, "");

  // Add protocol if missing
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = "https://" + cleaned;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return null;
  }

  if (parsed.hostname !== "github.com") {
    return null;
  }

  // pathname looks like /owner/repo or /owner/repo/tree/main/...
  const parts = parsed.pathname.replace(/^\//, "").split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const owner = parts[0];
  const repo = parts[1];

  return { owner, repo };
}

export async function scrapeRepo(repoUrl: string): Promise<ScrapeResult> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return { error: `Invalid GitHub repository URL: ${repoUrl}` };
  }

  const { owner, repo } = parsed;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "hackathon-screener/1.0",
  };
  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // 1. Fetch repo metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });

  if (repoRes.status === 404) {
    return { error: `Repository not found: ${owner}/${repo}` };
  }
  if (repoRes.status === 403) {
    return {
      error: `Repository is private or access denied: ${owner}/${repo}`,
    };
  }
  if (repoRes.status === 429) {
    return {
      error:
        "GitHub API rate limit exceeded. Set GITHUB_TOKEN to increase limits.",
    };
  }
  if (!repoRes.ok) {
    return {
      error: `GitHub API error ${repoRes.status} for ${owner}/${repo}`,
    };
  }

  const repoJson = (await repoRes.json()) as {
    description: string | null;
    language: string | null;
    stargazers_count: number;
    open_issues_count: number;
  };

  const description = repoJson.description ?? null;
  const language = repoJson.language ?? null;
  const starsCount = repoJson.stargazers_count;
  const openIssuesCount = repoJson.open_issues_count;

  // 2. Fetch README
  let readme: string | null = null;
  const readmeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/readme`,
    { headers }
  );
  if (readmeRes.ok) {
    const readmeJson = (await readmeRes.json()) as { content: string };
    const decoded = Buffer.from(readmeJson.content, "base64").toString("utf-8");
    readme = decoded.slice(0, 8000);
  }

  // 3. Fetch top-level file tree
  let fileTree: string[] = [];
  const contentsRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/`,
    { headers }
  );
  if (contentsRes.ok) {
    const contentsJson = (await contentsRes.json()) as Array<{
      name: string;
      type: string;
    }>;
    fileTree = contentsJson.map(
      (item) => item.name + (item.type === "dir" ? "/" : "")
    );
  }

  // 4. Fetch package.json if present
  let packageJson: Record<string, unknown> | null = null;
  if (fileTree.includes("package.json")) {
    const pkgRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/package.json`,
      { headers }
    );
    if (pkgRes.ok) {
      const pkgJson = (await pkgRes.json()) as { content: string };
      try {
        const decoded = Buffer.from(pkgJson.content, "base64").toString(
          "utf-8"
        );
        packageJson = JSON.parse(decoded) as Record<string, unknown>;
      } catch {
        packageJson = null;
      }
    }
  }

  // 5. Fetch requirements.txt if present
  let requirementsTxt: string | null = null;
  if (fileTree.includes("requirements.txt")) {
    const reqRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/requirements.txt`,
      { headers }
    );
    if (reqRes.ok) {
      const reqJson = (await reqRes.json()) as { content: string };
      const decoded = Buffer.from(reqJson.content, "base64").toString("utf-8");
      requirementsTxt = decoded.slice(0, 2000);
    }
  }

  return {
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    description,
    language,
    starsCount,
    openIssuesCount,
    readme,
    fileTree,
    packageJson,
    requirementsTxt,
  };
}
