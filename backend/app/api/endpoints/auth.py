from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import TokenResponse, User, UserCreate, UserLogin, UserRead

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, session: SessionDep) -> TokenResponse:
    """Register a new user."""
    # Check if email already exists
    existing_email = session.exec(
        select(User).where(User.email == user_data.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    existing_username = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Create token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
        }
    )

    return TokenResponse(
        access_token=access_token,
        user=UserRead(
            id=user.id,
            email=user.email,
            username=user.username,
            name=user.name,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, session: SessionDep) -> TokenResponse:
    """Login with username and password."""
    # Find user by username
    user = session.exec(
        select(User).where(User.username == credentials.username)
    ).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is disabled",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    session.add(user)
    session.commit()

    # Create token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "username": user.username,
        }
    )

    return TokenResponse(
        access_token=access_token,
        user=UserRead(
            id=user.id,
            email=user.email,
            username=user.username,
            name=user.name,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserRead)
async def get_current_user_info(session: SessionDep, current_user_id: str) -> UserRead:
    """Get current user info. Note: This requires auth header handled by middleware."""
    # This endpoint would typically use the CurrentUserDep, but for simplicity
    # we're making it available without auth for testing
    pass
