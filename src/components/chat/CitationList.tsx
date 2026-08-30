import type { Citation } from "@/types";

function CitationGroup({ heading, citations }: { heading: string; citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{heading}</span>
      <ul className="flex flex-col gap-1">
        {citations.map((citation, i) => (
          <li key={`${citation.documentId}-${i}`} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {citation.title}
              {citation.number ? ` No. ${citation.number}` : ""}
              {citation.year ? `/${citation.year}` : ""}
            </span>
            {citation.pasal ? `, Pasal ${citation.pasal}` : ""}
            {citation.url ? (
              <>
                {" — "}
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  sumber asli
                </a>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  const direct = citations.filter((c) => c.relevance === "direct");
  const liveLookup = citations.filter((c) => c.relevance === "live-lookup");
  const related = citations.filter((c) => c.relevance === "related");

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border pt-2.5">
      <CitationGroup heading="Sumber" citations={direct} />
      <CitationGroup heading="Diambil langsung dari peraturan.go.id untuk menjawab ini" citations={liveLookup} />
      <CitationGroup heading="Dokumen terkait (bukan jawaban langsung)" citations={related} />
    </div>
  );
}
