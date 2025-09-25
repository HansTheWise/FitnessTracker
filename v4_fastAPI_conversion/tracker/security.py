import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from werkzeug.security import check_password_hash


from .config import settings
from .database import get_db
from .models import user_models

# --- Configuration ---
# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# OAuth2 scheme for token handling in Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- Password Utilities ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a hashed one."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a plain password."""
    return pwd_context.hash(password)

# --- JWT Utilities ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a new JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

# --- Dependency for getting the current user ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> user_models.User:
    """
    Dependency to get the current user from a JWT token.
    This will be used to protect endpoints.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(user_models.User).filter(user_models.User.user_id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user