import asyncio
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from tracker.crud import user_crud


from tracker.config import settings
from tracker.database import get_db
from tracker.models import user_models

# --- Configuration ---
# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# das ist der kleine arbeiter welcher wenn er benötig wird die request bekommt diese nach dem token durchsucht und gibt eine string alles nach "Bearer " zurück
# wenn er keinen findet dann HTTPException mit 401 Unauthorized
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
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> user_models.User:
    """
    Abhängigkeit, um den aktuellen Benutzer aus einem JWT-Token zu holen.
    Diese wird verwendet, um Endpunkte zu schützen.
    """
    # das wird losgesendet wenn ou
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # "State of the Art": Führe die CPU-intensive Dekodierung in einem Thread aus.
        payload = await asyncio.to_thread(
            jwt.decode, token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError: # Fängt alle JWT-bezogenen Fehler ab
        raise credentials_exception
    
    # Delegiert Datenbankabfrage an asynchrone CRUD-Schicht
    user = await user_crud.get_user_by_id(db, user_id=int(user_id))
    
    if user is None:
        raise credentials_exception
    return user