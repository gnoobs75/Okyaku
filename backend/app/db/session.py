from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)


def get_session() -> Generator[Session, None, None]:
    """Dependency that provides a database session."""
    with Session(engine) as session:
        yield session
