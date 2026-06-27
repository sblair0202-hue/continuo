from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI

from app.api.routes import router
from app.api.calendar_routes import router as calendar_router
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Continuo MVP API",
    description="Voice-first Field Intelligence Platform MVP backend.",
    version="0.1.0",
)

app.include_router(router)
app.include_router(calendar_router)


@app.get("/")
def root():
    return {"message": "Continuo MVP API is running"}
