import type { Lang } from "./validate";

export type Result = { context: string; text: string; note: string; custom: boolean };
export type TranslateResponse = { id: string; sourceLang: string; results: Result[] };

export async function translationId(model: string, text: string, target: Lang): Promise<string> {
  const data = new TextEncoder().encode(`${model}\n${target}\n${text.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getTranslation(db: D1Database, id: string): Promise<TranslateResponse | null> {
  const head = await db.prepare("SELECT source_lang FROM translations WHERE id = ?").bind(id).first<{ source_lang: string }>();
  if (!head) return null;
  const { results } = await db
    .prepare("SELECT context, text, note, is_custom FROM results WHERE translation_id = ? ORDER BY id")
    .bind(id)
    .all<{ context: string; text: string; note: string; is_custom: number }>();
  return {
    id,
    sourceLang: head.source_lang,
    results: results.map((r) => ({ context: r.context, text: r.text, note: r.note, custom: r.is_custom === 1 })),
  };
}

// Idempotent: two requests for the same new text may both miss the cache and both save.
export async function saveTranslation(
  db: D1Database, id: string, text: string, sourceLang: string, target: Lang, results: Result[],
): Promise<void> {
  const now = Date.now();
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO translations (id, source_text, source_lang, target_lang, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, text, sourceLang, target, now),
    ...results.map((r) =>
      db
        .prepare(
          `INSERT INTO results (translation_id, context, text, note, is_custom, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE NOT EXISTS (SELECT 1 FROM results WHERE translation_id = ?1 AND context = ?2)`,
        )
        .bind(id, r.context, r.text, r.note, r.custom ? 1 : 0, now),
    ),
  ]);
}

export async function getSource(db: D1Database, id: string): Promise<{ text: string; target: Lang } | null> {
  const row = await db
    .prepare("SELECT source_text, target_lang FROM translations WHERE id = ?")
    .bind(id)
    .first<{ source_text: string; target_lang: Lang }>();
  return row && { text: row.source_text, target: row.target_lang };
}

export async function addResult(db: D1Database, translationId: string, r: Result): Promise<void> {
  await db
    .prepare("INSERT INTO results (translation_id, context, text, note, is_custom, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(translationId, r.context, r.text, r.note, r.custom ? 1 : 0, Date.now())
    .run();
}
