from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from .. import auth

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginIn, response: Response):
    if not auth.check_credentials(body.username, body.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    auth.set_session_cookie(response)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    auth.clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
def me(_: None = Depends(auth.require_auth)):
    return {"ok": True}
