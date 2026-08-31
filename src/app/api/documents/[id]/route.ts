import { NextResponse } from "next/server";
import { deleteDocument } from "@/lib/db/queries/documents";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  try {
    await deleteDocument(id);
  } catch (err) {
    // Postgres 23503 = foreign key violation — happens if an older version
    // of this same document (previous_version_id) still points at it.
    const code = (err as { code?: string } | null)?.code;
    if (code === "23503") {
      return NextResponse.json(
        { error: "Dokumen ini masih dirujuk sebagai versi sebelumnya dari dokumen lain, tidak bisa dihapus." },
        { status: 409 }
      );
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
