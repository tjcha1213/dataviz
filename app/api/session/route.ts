import { asc, count, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { checkins, sessions } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id")?.trim();
  const db = getDb();

  if (!id) {
    const history = await db
      .select({
        id: sessions.id,
        course: sessions.course,
        classDate: sessions.classDate,
        createdAt: sessions.createdAt,
        attendanceCount: count(checkins.id),
      })
      .from(sessions)
      .leftJoin(checkins, eq(checkins.sessionId, sessions.id))
      .where(eq(sessions.ownerId, user.userId))
      .groupBy(sessions.id)
      .orderBy(desc(sessions.createdAt));
    return NextResponse.json(history, { headers: { "cache-control": "no-store" } });
  }

  const session = await db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.ownerId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const names = await db.select({ id: checkins.id, name: checkins.name, checkedInAt: checkins.checkedInAt })
    .from(checkins)
    .where(eq(checkins.sessionId, id))
    .orderBy(asc(checkins.checkedInAt));
  return NextResponse.json({ ...session, checkins: names }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { course?: string };
  const course = body.course?.trim().replace(/\s+/g, " ");
  if (!course || course.length > 80) return NextResponse.json({ error: "Valid course name required" }, { status: 400 });

  const now = new Date();
  const session = {
    id: crypto.randomUUID(),
    ownerId: user.userId,
    course,
    classDate: now.toISOString().slice(0, 10),
    createdAt: now.toISOString(),
  };
  await getDb().insert(sessions).values(session);
  return NextResponse.json({ ...session, checkins: [] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Session ID is required" }, { status: 400 });

  const db = getDb();
  const session = await db.select({ id: sessions.id, ownerId: sessions.ownerId })
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.ownerId !== user.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(checkins).where(eq(checkins.sessionId, id));
  await db.delete(sessions).where(eq(sessions.id, id));
  return NextResponse.json({ deleted: true, id });
}
