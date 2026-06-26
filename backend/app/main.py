from fastapi import FastAPI

from app.api.routes import router
from app.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Continuo MVP API",
    description="Voice-first Field Intelligence Platform MVP backend.",
    version="0.1.0",
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Continuo MVP API is running"}
