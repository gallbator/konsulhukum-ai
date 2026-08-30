import { NextResponse } from "next/server";
import { listMessages } from "@/lib/db/queries/messages";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const messages = await listMessages(id);
  return NextResponse.json({ messages });
}
