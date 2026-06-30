from dotenv import load_dotenv
load_dotenv(override=False)  # Railway env vars always win; .env only fills gaps

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth_routes import router as auth_router
from app.api.routes import router
from app.api.calendar_routes import router as calendar_router
from app.api.daily_brief_routes import router as daily_brief_router
from app.api.email_routes import router as email_router
from app.api.notion_routes import router as notion_router
from app.api.opportunity_routes import router as opportunity_router
from app.api.milestone_routes import router as milestone_router
from app.api.activity_history_routes import router as activity_history_router
from app.api.intelligence_routes import router as intelligence_router
from app.database import Base, SessionLocal, engine
from app.services.auth_service import seed_admin

try:
    Base.metadata.create_all(bind=engine)
except Exception as _e:
    import sys
    print(f"[startup] DB create_all failed: {_e}", file=sys.stderr)

# Inline migration: add OAuth columns if missing (handles existing Railway DB)
try:
    from sqlalchemy import inspect, text as _text
    _insp = inspect(engine)
    _user_cols = [c["name"] for c in _insp.get_columns("users")]
    with engine.connect() as _conn:
        if "oauth_provider" not in _user_cols:
            _conn.execute(_text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR"))
        if "oauth_id" not in _user_cols:
            _conn.execute(_text("ALTER TABLE users ADD COLUMN oauth_id VARCHAR"))
        _conn.commit()
except Exception:
    pass

try:
    from sqlalchemy import inspect as _insp2, text as _text2
    _vj_cols = [c["name"] for c in _insp2(engine).get_columns("voice_journal_entries")]
    with engine.connect() as _conn2:
        if "source" not in _vj_cols:
            _conn2.execute(_text2("ALTER TABLE voice_journal_entries ADD COLUMN source VARCHAR DEFAULT 'typed'"))
        if "status" not in _vj_cols:
            _conn2.execute(_text2("ALTER TABLE voice_journal_entries ADD COLUMN status VARCHAR DEFAULT 'pending_review'"))
        if "ai_extraction_json" not in _vj_cols:
            _conn2.execute(_text2("ALTER TABLE voice_journal_entries ADD COLUMN ai_extraction_json TEXT"))
        _conn2.commit()
except Exception:
    pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Continuo MVP API",
    description="Voice-first Field Intelligence Platform MVP backend.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(router)
app.include_router(calendar_router)
app.include_router(daily_brief_router)
app.include_router(email_router)
app.include_router(notion_router)
app.include_router(opportunity_router)
app.include_router(milestone_router)
app.include_router(activity_history_router)
app.include_router(intelligence_router)


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/")
def root():
    return {"message": "Continuo MVP API is running"}
