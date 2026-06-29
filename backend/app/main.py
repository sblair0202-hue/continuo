from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

Base.metadata.create_all(bind=engine)


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


@app.get("/")
def root():
    return {"message": "Continuo MVP API is running"}
