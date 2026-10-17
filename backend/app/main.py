import logging
import os
from contextlib import asynccontextmanager
from urllib.parse import urlsplit

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import auth, db
from .routers import auth as auth_router
from .routers import notes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Blocks until Postgres answers and migrations are applied. Background loops (schedulers,
    # mailers) start here too, as asyncio tasks cancelled after the yield.
    await db.connect()
    yield
    await db.close()


app = FastAPI(title="starter", lifespan=lifespan)

# allow_credentials needs explicit origins. The regex covers the app's port (9000) on localhost,
# LAN and Tailscale addresses, so it opens from a phone on the tailnet with no config; PUBLIC_URL
# adds the deployed origin when the app sits behind a reverse proxy.
public = urlsplit(os.environ.get("PUBLIC_URL", "http://localhost:9000"))
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"{public.scheme}://{public.netloc}"],
    allow_origin_regex=(
        r"^http://(localhost|127\.0\.0\.1|192\.168(\.\d{1,3}){2}|10(\.\d{1,3}){3}"
        r"|100(\.\d{1,3}){3}|[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.ts\.net):9000$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
# Every data router is gated here, not inside the router, so a new one can't forget it.
app.include_router(notes.router, dependencies=[Depends(auth.require_auth)])


@app.get("/health")
def health():
    return {"status": "ok"}
