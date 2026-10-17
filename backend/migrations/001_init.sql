-- The example resource, there to show the full path: migration -> router -> api.ts -> page.
-- A new project replaces it with its own tables. Never edit an applied migration; add 002_*.sql.
CREATE TABLE notes (
    id         SERIAL PRIMARY KEY,
    body       TEXT NOT NULL CHECK (length(body) > 0),
    archived   BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
