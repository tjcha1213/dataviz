import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { checkins, sessions } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Session ID is required" }, { status: 400 });

  const db = getDb();
  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const names = await db.select({ id: checkins.id, name: checkins.name, checkedInAt: checkins.checkedInAt })
    .from(checkins)
    .where(eq(checkins.sessionId, id))
    .orderBy(asc(checkins.checkedInAt));
  return NextResponse.json({ ...session, checkins: names }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { course?: string };
  const course = body.course?.trim().replace(/\s+/g, " ");
  if (!course || course.length > 80) return NextResponse.json({ error: "Valid course name required" }, { status: 400 });

  const now = new Date();
  const session = {
    id: crypto.randomUUID(),
    course,
    classDate: now.toISOString().slice(0, 10),
    createdAt: now.toISOString(),
  };
  await getDb().insert(sessions).values(session);
  return NextResponse.json({ ...session, checkins: [] }, { status: 201 });
}
