import { createAgentUIStreamResponse } from "ai";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { createCoachAgent } from "@/ai/coach";
import { db } from "@/db";
import { users } from "@/db/schema";

const MAX_MESSAGES = 40;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  return createAgentUIStreamResponse({
    agent: createCoachAgent(user),
    uiMessages: body.messages.slice(-MAX_MESSAGES),
  });
}
