CREATE TABLE translations (
  id TEXT PRIMARY KEY,
  source_text TEXT NOT NULL,
  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  translation_id TEXT NOT NULL REFERENCES translations(id),
  context TEXT NOT NULL,
  text TEXT NOT NULL,
  note TEXT NOT NULL,
  is_custom INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX results_translation ON results(translation_id);
