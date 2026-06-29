import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Railway (and some providers) still issue postgres:// URLs; SQLAlchemy needs postgresql://
_raw_url = os.getenv("DATABASE_URL")
if _raw_url:
    DATABASE_URL = _raw_url.replace("postgres://", "postgresql://", 1)
    _connect_args: dict = {}
else:
    _DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "continuo_dev.db")
    DATABASE_URL = f"sqlite:///{_DB_PATH}"
    _connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
