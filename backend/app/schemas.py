from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


# Every field optional: PATCH changes only what's sent.
class NoteUpdate(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=2000)
    archived: bool | None = None
