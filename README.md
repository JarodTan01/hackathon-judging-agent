# Hackathon Screener

AI-powered GitHub repository screening for hackathon organizers. Paste a list of GitHub repo URLs, define judging criteria, and let **Bob AI** rate every submission automatically — then view a ranked results dashboard and export to CSV.

## Demo flow

1. **Create a session** — give it a name and define judging criteria (name, description, weight, max score)
2. **Paste GitHub URLs** — one per line, or copy a column straight from Google Sheets
3. **Start Screening** — Bob scrapes each repo (README, file tree, dependencies, stars, issues) and rates it against your criteria
4. **View ranked results** — expandable per-criterion scores with Bob's reasoning, plus a progress bar while rating runs
5. **Export CSV** — download results as a spreadsheet

## Prerequisites

- **Node.js 18+**
- **Bob Shell** installed and on your `PATH` — [install instructions](https://bob.ibm.com)
- A **Bob Shell API key** with **Inference scope** — create one at the Bob web portal
- Accept the Bob Shell license once interactively:
  ```bash
  bob --accept-license -p "hello"
  ```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your key
cp .env.example .env.local
# Edit .env.local:
#   BOBSHELL_API_KEY=your-bob-api-key-here
#   GITHUB_TOKEN=optional-github-token  (raises rate limits from 60 → 5000 req/hr)

# 3. Set up the database
npx prisma@5 migrate dev --name init

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BOBSHELL_API_KEY` | ✅ Yes | Bob Shell API key (Inference scope) |
| `GITHUB_TOKEN` | No | GitHub PAT to raise API rate limits |
| `DATABASE_URL` | Auto | Set by Prisma — `file:./dev.db` |

## Architecture

```
Browser (Next.js React)
    │
    │  REST + polling
    ▼
Next.js API Routes (Node.js)
    │           │
    │           ▼
    │     Prisma ORM ──► SQLite (prisma/dev.db)
    │
    ├── src/lib/github.ts ──► GitHub REST API
    │
    └── src/lib/bob-rater.ts ──► child_process.spawn("bob -p ...")
                                        │
                                        ▼
                                 Bob Shell CLI
                                 (BOBSHELL_API_KEY auth)
```

## Tech stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** (dark theme)
- **Prisma 5 + SQLite** (zero-infra persistence)
- **Bob Shell** (AI rating via non-interactive CLI)
- **GitHub REST API** (repo scraping)

## How Bob rates repos

Each repo is scraped for: README, top-level file tree, `package.json` / `requirements.txt` dependencies, star count, and open issue count. This data is assembled into a structured prompt that instructs Bob to return a JSON object with per-criterion scores (0–maxScore) and reasoning. The overall score is a weighted average across all criteria.

Bob is invoked as:
```bash
bob -p "<prompt>" --hide-intermediary-output --auth-method api-key
```
