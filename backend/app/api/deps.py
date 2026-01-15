from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from app.core.security import CurrentUser, get_current_user_obj
from app.db.session import get_session

# Database session dependency
SessionDep = Annotated[Session, Depends(get_session)]

# Current user dependency
CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user_obj)]
