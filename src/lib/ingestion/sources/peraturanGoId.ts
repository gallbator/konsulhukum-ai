import * as cheerio from "cheerio";
import type {
  LegalDocumentMetadata,
  LegalSourceAdapter,
  RawDocumentContent,
  RawDocumentRef,
} from "@/lib/ingestion/types";
import { extractPdfText } from "@/lib/utils/pdf";
import { parseIndonesianDate } from "@/lib/utils/indonesianDate";

const BASE_URL = "https://peraturan.go.id";
// robots.txt on peraturan.go.id has no disallow rules for any user-agent (checked
// 2026-08-30) — unlike putusan3.mahkamahagung.go.id, which explicitly disallows
// AI crawlers including ClaudeBot. Identify honestly; keep requests sequential
// and rate-limited regardless, since this is a shared government server.
const USER_AGENT = "WebHukumIngestionBot/0.1 (alat riset hukum internal, non-komersial, satu pengguna)";
const REQUEST_DELAY_MS = 800;

// Conservative for MVP validation — raise deliberately via PERATURAN_MAX_DOCS,
// not by editing this default, so a bigger run is always an explicit choice.
const DEFAULT_MAX_DOCUMENTS = Number(process.env.PERATURAN_MAX_DOCS) || 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * peraturan.go.id occasionally resets the connection for no discernible
 * reason (observed in practice: "TypeError: fetch failed" / "other side
 * closed" on an otherwise-valid URL, confirmed reachable seconds later) — a
 * couple of retries absorbs that without treating a transient blip as "this
 * document doesn't exist".
 */
async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetchWithRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} saat mengambil ${url}`);
  return res.text();
}

interface CategoryConfig {
  path: string;
  sourceType: string;
  label: string;
}

const CATEGORIES = {
  uu: { path: "uu", sourceType: "uu", label: "Undang-Undang" },
  pp: { path: "pp", sourceType: "pp", label: "Peraturan Pemerintah" },
  perpres: { path: "perpres", sourceType: "perpres", label: "Peraturan Presiden" },
} satisfies Record<string, CategoryConfig>;

export type PeraturanGoIdCategory = keyof typeof CATEGORIES;
export const PERATURAN_GO_ID_CATEGORIES = Object.keys(CATEGORIES) as PeraturanGoIdCategory[];

/** Detail page URL pattern, confirmed against the live site 2026-08-30: /id/{category}-no-{number}-tahun-{year}. */
export function buildPeraturanGoIdDetailUrl(
  category: PeraturanGoIdCategory,
  number: string,
  year: number
): string {
  return `${BASE_URL}/id/${category}-no-${number}-tahun-${year}`;
}

/**
 * peraturan.go.id serves full text only as PDF (no inline HTML), so
 * fetchDocument downloads + extracts the PDF; the listing page already gives
 * us title/number/year (parseMetadata just merges that with what fetchDocument
 * found on the detail page — tanggal penetapan and the PDF URL itself).
 */
export function makePeraturanGoIdAdapter(categoryKey: PeraturanGoIdCategory): LegalSourceAdapter {
  const config = CATEGORIES[categoryKey];

  return {
    key: `peraturan-go-id-${categoryKey}`,
    name: `peraturan.go.id — ${config.label}`,
    defaultSourceType: config.sourceType,

    async *listDocuments(): AsyncGenerator<RawDocumentRef> {
      let page = 1;
      let yielded = 0;

      while (yielded < DEFAULT_MAX_DOCUMENTS) {
        const html = await fetchHtml(`${BASE_URL}/${config.path}?page=${page}`);
        const $ = cheerio.load(html);
        const wrappers = $(".wrapper").toArray();
        if (wrappers.length === 0) break;

        for (const el of wrappers) {
          if (yielded >= DEFAULT_MAX_DOCUMENTS) break;
          const $el = $(el);
          const link = $el.find('a[title="lihat detail"]').first();
          const href = link.attr("href");
          if (!href) continue;

          const title = link.text().trim();
          const summaryLine = $el.find("p").first().text().trim();
          const match = summaryLine.match(/Nomor\s+(\S+)\s+Tahun\s+(\d{4})/i);

          yield {
            externalId: href,
            url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
            metadataHint: {
              sourceType: config.sourceType,
              title: title || summaryLine,
              number: match?.[1],
              year: match ? Number(match[2]) : undefined,
            },
          };
          yielded++;
        }

        page++;
        await sleep(REQUEST_DELAY_MS);
      }
    },

    async fetchDocument(ref: RawDocumentRef): Promise<RawDocumentContent> {
      const html = await fetchHtml(ref.url);
      const $ = cheerio.load(html);

      const fields: Record<string, string> = {};
      $("table tr").each((_, row) => {
        const key = $(row).find("th").first().text().trim();
        const value = $(row).find("td").first().text().trim();
        if (key) fields[key] = value;
      });

      const pdfHref = $('th:contains("Dokumen Peraturan")').closest("tr").find("td a").first().attr("href");
      if (!pdfHref) {
        throw new Error(`Tidak menemukan tautan PDF di ${ref.url}`);
      }
      const pdfUrl = pdfHref.startsWith("http") ? pdfHref : `${BASE_URL}${pdfHref}`;

      await sleep(REQUEST_DELAY_MS);
      const pdfRes = await fetchWithRetry(pdfUrl, { headers: { "User-Agent": USER_AGENT } });
      if (!pdfRes.ok) throw new Error(`HTTP ${pdfRes.status} saat mengambil PDF ${pdfUrl}`);
      const text = await extractPdfText(new Uint8Array(await pdfRes.arrayBuffer()));

      return {
        text,
        sourceUrl: ref.url,
        fetchedAt: new Date().toISOString(),
        metadataHint: {
          tanggalPenetapan: parseIndonesianDate(fields["Ditetapkan Tanggal"] ?? ""),
          urlAsli: pdfUrl,
          title: fields["Tentang"],
        },
      };
    },

    parseMetadata(content: RawDocumentContent, ref: RawDocumentRef): LegalDocumentMetadata {
      const fromListing = (ref.metadataHint ?? {}) as Partial<LegalDocumentMetadata>;
      const fromDetail = (content.metadataHint ?? {}) as Partial<LegalDocumentMetadata>;
      return {
        sourceType: fromListing.sourceType ?? config.sourceType,
        title: fromDetail.title || fromListing.title || "(tanpa judul)",
        number: fromListing.number,
        year: fromListing.year,
        tanggalPenetapan: fromDetail.tanggalPenetapan,
        urlAsli: fromDetail.urlAsli,
      };
    },
  };
}
