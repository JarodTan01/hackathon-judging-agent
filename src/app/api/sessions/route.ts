import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true, criteria: true } },
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, description, criteria } = body;

  if (!name || !criteria?.length) {
    return NextResponse.json({ error: "name and criteria are required" }, { status: 400 });
  }

  const session = await prisma.session.create({
    data: {
      name,
      description,
      criteria: {
        create: criteria.map((c: { name: string; description?: string; weight: number; maxScore: number }) => ({
          name: c.name,
          description: c.description,
          weight: c.weight,
          maxScore: c.maxScore,
        })),
      },
    },
    include: { criteria: true },
  });

  return NextResponse.json(session, { status: 201 });
}
