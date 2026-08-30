export interface RawDocumentRef {
  externalId: string;
  url: string;
  metadataHint?: Record<string, unknown>;
}

export interface RawDocumentContent {
  text: string;
  sourceUrl: string;
  fetchedAt: string; // ISO timestamp
  // Extra fields an adapter discovered while fetching the document itself
  // (e.g. tanggal penetapan, PDF URL) that parseMetadata can merge with
  // whatever it already knew from listDocuments' ref.metadataHint.
  metadataHint?: Record<string, unknown>;
}

export interface LegalDocumentMetadata {
  sourceType: string;
  title: string;
  number?: string;
  year?: number;
  tanggalPenetapan?: string;
  urlAsli?: string;
}

export interface LegalSourceAdapter {
  key: string;
  name: string;
  defaultSourceType: string;
  listDocuments(ctx: { since?: string }): AsyncGenerator<RawDocumentRef>;
  fetchDocument(ref: RawDocumentRef): Promise<RawDocumentContent>;
  parseMetadata(
    content: RawDocumentContent,
    ref: RawDocumentRef
  ): LegalDocumentMetadata | Promise<LegalDocumentMetadata>;
}
