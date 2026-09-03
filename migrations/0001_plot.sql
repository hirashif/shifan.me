CREATE TABLE IF NOT EXISTS plot (
  cell       INTEGER PRIMARY KEY CHECK (cell BETWEEN 0 AND 399),
  user_id    TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  msg        TEXT    NOT NULL CHECK (length(msg)  BETWEEN 1 AND 120),
  color      TEXT    NOT NULL CHECK (color IN
               ('#e8b04b','#53d08a','#7dd3fc','#f472b6','#a78bfa','#fb923c')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS plot_created_at ON plot (created_at DESC);
