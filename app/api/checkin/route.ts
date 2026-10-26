import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../db";
import { checkins, sessions } from "../../../db/schema";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string; name?: string };
  const sessionId = body.sessionId?.trim();
  const name = body.name?.trim().replace(/\s+/g, " ");
  if (!sessionId || !name || name.length > 80) return NextResponse.json({ error: "Session and name are required" }, { status: 400 });

  const db = getDb();
  const session = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const checkedInAt = new Date().toISOString();
  await db.insert(checkins)
    .values({ sessionId, name, nameKey: name.toLocaleLowerCase(), checkedInAt })
    .onConflictDoUpdate({
      target: [checkins.sessionId, checkins.nameKey],
      set: { name, checkedInAt },
    });
  return NextResponse.json({ ok: true, name, checkedInAt });
}
