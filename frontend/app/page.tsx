"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, LogOut, Trash2 } from "lucide-react";
import { apiLogout, createNote, deleteNote, listNotes, updateNote, type Note } from "@/lib/api";

// The example screen: load on mount, mutate through lib/api.ts, reload the list after each change.
// Simple and always consistent with the server; reach for optimistic updates only where lag shows.
export default function HomePage() {
  const [showArchived, setShowArchived] = useState(false);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNotes((await listNotes(showArchived)).notes);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [showArchived]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    await run(() => createNote(body));
    setDraft("");
  }

  async function handleLogout() {
    await apiLogout();
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 pb-16 pt-6">
      <header className="flex h-10 items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Starter</h1>
        <button onClick={handleLogout} className="btn-secondary" aria-label="Sign out">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      {!showArchived && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input id="new-note" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a note" className="field" />
          <button type="submit" disabled={!draft.trim()} className="btn-primary">
            Add
          </button>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="label">{showArchived ? "Archived" : "Notes"}</span>
          <button onClick={() => setShowArchived((v) => !v)} className="text-sm font-medium text-accent hover:underline">
            {showArchived ? "Show notes" : "Show archived"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notes === null && !error && <p className="meta">Loading…</p>}
        {notes?.length === 0 && <p className="meta">{showArchived ? "Nothing archived." : "No notes yet. Add one above."}</p>}

        {notes?.map((note) => (
          <article key={note.id} className="card flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-words">{note.body}</p>
              <time className="meta num">{new Date(note.created_at).toLocaleString()}</time>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => run(() => updateNote(note.id, { archived: !note.archived }))}
                className="btn-secondary px-3"
                aria-label={note.archived ? "Unarchive" : "Archive"}
              >
                {note.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              </button>
              <button onClick={() => run(() => deleteNote(note.id))} className="btn-danger px-3" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
