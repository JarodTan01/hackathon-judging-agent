import { prisma } from "@/lib/prisma";
import { scrapeRepo, isError as isScrapeError } from "@/lib/github";
import { rateRepo } from "@/lib/bob-rater";
import type { RatingCriterion } from "@/lib/bob-rater";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      criteria: true,
      submissions: { where: { status: "pending" } },
    },
  });

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
  }

  // Update session status to running
  await prisma.session.update({ where: { id }, data: { status: "running" } });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const criteria: RatingCriterion[] = session.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        weight: c.weight,
        maxScore: c.maxScore,
      }));

      for (const submission of session.submissions) {
        try {
          // Step 1: Scraping
          await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "scraping" },
          });
          send("progress", { submissionId: submission.id, status: "scraping", repoUrl: submission.repoUrl });

          const scrapeResult = await scrapeRepo(submission.repoUrl);

          if (isScrapeError(scrapeResult)) {
            await prisma.submission.update({
              where: { id: submission.id },
              data: { status: "error", errorMessage: scrapeResult.error },
            });
            send("progress", { submissionId: submission.id, status: "error", error: scrapeResult.error });
            continue;
          }

          // Step 2: Rating
          await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "rating" },
          });
          send("progress", { submissionId: submission.id, status: "rating" });

          const rateResult = await rateRepo(scrapeResult, criteria);

          if ("error" in rateResult) {
            await prisma.submission.update({
              where: { id: submission.id },
              data: { status: "error", errorMessage: rateResult.error },
            });
            send("progress", { submissionId: submission.id, status: "error", error: rateResult.error });
            continue;
          }

          // Step 3: Save scores
          await prisma.$transaction([
            ...rateResult.scores.map((s) =>
              prisma.criterionScore.create({
                data: {
                  submissionId: submission.id,
                  criterionId: s.criterionId,
                  score: s.score,
                  reasoning: s.reasoning,
                },
              })
            ),
            prisma.submission.update({
              where: { id: submission.id },
              data: {
                status: "done",
                overallScore: rateResult.overallScore,
                ratedAt: new Date(),
                repoName: scrapeResult.owner + "/" + scrapeResult.repo,
              },
            }),
          ]);

          send("progress", {
            submissionId: submission.id,
            status: "done",
            overallScore: rateResult.overallScore,
            repoName: scrapeResult.owner + "/" + scrapeResult.repo,
          });

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.submission.update({
            where: { id: submission.id },
            data: { status: "error", errorMessage: msg },
          });
          send("progress", { submissionId: submission.id, status: "error", error: msg });
        }
      }

      await prisma.session.update({ where: { id }, data: { status: "completed" } });
      send("complete", { sessionId: id });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
