import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { repoUrls } = await request.json();

  if (!repoUrls?.length) {
    return NextResponse.json({ error: "repoUrls array is required" }, { status: 400 });
  }

  const submissions = await prisma.$transaction(
    repoUrls.map((url: string) =>
      prisma.submission.create({
        data: {
          sessionId: id,
          repoUrl: url,
          repoName: url.replace("https://github.com/", ""),
        },
      })
    )
  );

  return NextResponse.json(submissions, { status: 201 });
}
