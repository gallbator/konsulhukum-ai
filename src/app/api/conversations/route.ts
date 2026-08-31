import { NextResponse } from "next/server";
import { createConversation, listConversations } from "@/lib/db/queries/conversations";

// GET reads no request-specific input, so Next.js would otherwise statically
// render/cache it — freezing the list instead of reflecting new/renamed/
// deleted conversations (same class of bug as api/documents' GET).
export const dynamic = "force-dynamic";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const conversation = await createConversation(body.title);
  return NextResponse.json({ conversation }, { status: 201 });
}
