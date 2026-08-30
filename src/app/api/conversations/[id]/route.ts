import { NextResponse } from "next/server";
import { deleteConversation, renameConversation } from "@/lib/db/queries/conversations";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  const { title } = await req.json();
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const conversation = await renameConversation(id, title);
  return NextResponse.json({ conversation });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
