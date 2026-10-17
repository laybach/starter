"""The example resource: list, create, update, delete. SQL is written by hand with psycopg
parameters (%s), rows come back as dicts (db.py sets dict_row), and FastAPI serializes them."""
from fastapi import APIRouter, HTTPException

from .. import db
from ..schemas import NoteCreate, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])

COLUMNS = "id, body, archived, created_at"


@router.get("")
async def list_notes(archived: bool = False):
    async with db.get_pool().connection() as conn:
        cur = await conn.execute(
            f"SELECT {COLUMNS} FROM notes WHERE archived = %s ORDER BY created_at DESC", (archived,)
        )
        return {"notes": await cur.fetchall()}


@router.post("", status_code=201)
async def create_note(body: NoteCreate):
    async with db.get_pool().connection() as conn:
        cur = await conn.execute(f"INSERT INTO notes (body) VALUES (%s) RETURNING {COLUMNS}", (body.body,))
        return {"note": await cur.fetchone()}


@router.patch("/{note_id}")
async def update_note(note_id: int, body: NoteUpdate):
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "Nothing to update")
    # Column names come from the schema's fields, never from the request, so this is safe to format.
    assignments = ", ".join(f"{column} = %s" for column in changes)
    async with db.get_pool().connection() as conn:
        cur = await conn.execute(
            f"UPDATE notes SET {assignments} WHERE id = %s RETURNING {COLUMNS}", (*changes.values(), note_id)
        )
        note = await cur.fetchone()
    if note is None:
        raise HTTPException(404, "Note not found")
    return {"note": note}


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: int):
    async with db.get_pool().connection() as conn:
        cur = await conn.execute("DELETE FROM notes WHERE id = %s", (note_id,))
    if cur.rowcount == 0:
        raise HTTPException(404, "Note not found")
