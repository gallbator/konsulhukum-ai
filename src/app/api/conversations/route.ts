import { NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/db/queries/conversations";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const conversation = await createConversation(body.title);
  return NextResponse.json({ conversation }, { status: 201 });
}
