"""A simple username/password gate for this whole app. Not built for a
multi-user product — one shared username/password pair, configured via env
vars, guarding a signed session cookie. That's the right amount of auth for
a private instance whose content shouldn't be open to anyone who finds the
URL.
"""
import hashlib
import hmac
import os
import time

from fastapi import Cookie, HTTPException, Response

AUTH_USERNAME = os.environ.get("AUTH_USERNAME", "admin")
AUTH_PASSWORD = os.environ.get("AUTH_PASSWORD", "starter")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "starter-dev-secret-change-me")

COOKIE_NAME = "starter_session"
SESSION_TTL_SECONDS = 30 * 24 * 60 * 60  # 30 days

# The web frontend reaches this API same-origin in production (Caddy proxies
# it under the same domain, see docker-compose.yml) and over plain http on a
# LAN/Tailscale address in dev — SameSite=Lax covers both. A plain http
# origin can never set a Secure cookie, so that flag is opt-in and the real
# (HTTPS) deployment turns it on.
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


def _sign(payload: str) -> str:
    return hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()


def create_session_token() -> str:
    expires_at = int(time.time()) + SESSION_TTL_SECONDS
    payload = f"{AUTH_USERNAME}:{expires_at}"
    signature = _sign(payload)
    return f"{payload}:{signature}"


def verify_session_token(token: str | None) -> bool:
    if not token:
        return False
    parts = token.split(":")
    if len(parts) != 3:
        return False
    username, expires_at, signature = parts
    payload = f"{username}:{expires_at}"
    if not hmac.compare_digest(signature, _sign(payload)):
        return False
    if int(expires_at) < time.time():
        return False
    return True


def check_credentials(username: str, password: str) -> bool:
    return hmac.compare_digest(username, AUTH_USERNAME) and hmac.compare_digest(password, AUTH_PASSWORD)


def set_session_cookie(response: Response) -> None:
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def require_auth(session_token: str | None = Cookie(default=None, alias=COOKIE_NAME)) -> None:
    if not verify_session_token(session_token):
        raise HTTPException(status_code=401, detail="Not authenticated")
