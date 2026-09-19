/**
 * Search lokal Knowledge Base — MVP chatbot tanpa LLM.
 * Skor sederhana: judul > kategori > konten.
 */

export type KbSearchDoc = {
  id: string;
  title: string;
  category: string;
  content: string;
};

export type KbSearchHit = {
  id: string;
  title: string;
  category: string;
  score: number;
  excerpt: string;
  href: string;
};

const STOP = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dari",
  "dengan",
  "ada",
  "tidak",
  "bisa",
  "cara",
  "apa",
  "kenapa",
  "bagaimana",
  "tolong",
  "mohon",
  "saya",
  "di",
  "ke",
  "ini",
  "itu",
  "the",
  "a",
  "of",
  "to",
  "how",
  "what",
]);

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    // Latin + angka (hindari \p{L} — butuh target ES2018+; VPS build ketat)
    .replace(/[^a-z0-9\s+-]+/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function excerptAround(content: string, tokens: string[], max = 160): string {
  const plain = content.replace(/^#+\s*/gm, "").replace(/\n+/g, " ").trim();
  if (!plain) return "";
  const lower = plain.toLowerCase();
  let idx = -1;
  for (const t of tokens) {
    idx = lower.indexOf(t);
    if (idx >= 0) break;
  }
  if (idx < 0) return plain.slice(0, max) + (plain.length > max ? "…" : "");
  const start = Math.max(0, idx - 40);
  const slice = plain.slice(start, start + max);
  return (start > 0 ? "…" : "") + slice + (start + max < plain.length ? "…" : "");
}

/** Mapping kata kunci umum → kategori KB */
export function inferCategory(query: string): string | null {
  const q = query.toLowerCase();
  if (/\b(edc|struk|thermal|tid|mid|ingenico|verifone|pax)\b/.test(q)) return "EDC";
  if (/\b(sdwan|tunnel|failover|fortigate|fortinet)\b/.test(q)) return "SDWAN";
  if (/\b(wifi|wlan|access\s*point|ssid)\b/.test(q)) return "WIFI";
  if (/\b(cctv|nvr|kamera)\b/.test(q)) return "CCTV";
  if (/\b(printer|spooler|kasir)\b/.test(q)) return "PRINTER";
  if (/\b(wan|isp|ont|pon|los|pppoe)\b/.test(q)) return "WAN";
  if (/\b(lan|utp|crimping|switch|dhcp|gateway)\b/.test(q)) return "LAN";
  if (/\b(safety|foto|before|after|escalate|handover)\b/.test(q)) return "GENERAL";
  return null;
}

export function searchKnowledgeBase(
  docs: KbSearchDoc[],
  query: string,
  opts?: { category?: string | null; limit?: number; hrefBase?: string }
): KbSearchHit[] {
  const tokens = tokenize(query);
  const limit = opts?.limit ?? 3;
  const hrefBase = opts?.hrefBase ?? "/engineer/kb";
  const preferred =
    opts?.category?.trim() || inferCategory(query) || null;

  if (tokens.length === 0 && !preferred) return [];

  const scored: KbSearchHit[] = [];

  for (const doc of docs) {
    const title = doc.title.toLowerCase();
    const cat = doc.category.toLowerCase();
    const body = doc.content.toLowerCase();
    let score = 0;

    if (preferred && doc.category.toUpperCase() === preferred.toUpperCase()) {
      score += 8;
    }

    for (const t of tokens) {
      if (title.includes(t)) score += 12;
      if (cat === t || cat.includes(t)) score += 6;
      if (body.includes(t)) score += 3;
      // frase di judul lebih berharga
      if (title.startsWith(t)) score += 2;
    }

    // Query substring di judul
    const qLower = query.toLowerCase().trim();
    if (qLower.length >= 4 && title.includes(qLower)) score += 15;

    if (score <= 0) continue;

    scored.push({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      score,
      excerpt: excerptAround(doc.content, tokens),
      href: `${hrefBase}/${doc.id}`,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildKbReply(hits: KbSearchHit[], query: string): {
  answer: string;
  lowConfidence: boolean;
} {
  if (hits.length === 0) {
    return {
      lowConfidence: true,
      answer:
        `Tidak ketemu SOP yang cocok untuk “${query.trim()}”. ` +
        `Coba kata kunci lain (mis. “tunnel down”, “line idle”, “failover”) ` +
        `atau buka daftar KB / escalate ke L1 bila di lapangan kritis.`,
    };
  }

  const top = hits[0];
  const lines = [
    `Berdasarkan SOP **${top.title}** (${top.category}):`,
    top.excerpt,
    "",
    "Sumber terkait:",
    ...hits.map((h, i) => `${i + 1}. [${h.category}] ${h.title}`),
    "",
    hits.length === 1 || top.score < 15
      ? "Kalau belum pas, refine pertanyaan atau escalate ke NOC/L1."
      : "Buka artikel di bawah untuk langkah lengkap.",
  ];

  return {
    answer: lines.join("\n"),
    lowConfidence: top.score < 12,
  };
}
