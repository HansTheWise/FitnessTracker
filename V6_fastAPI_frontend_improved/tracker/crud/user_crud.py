import asyncio
from sqlalchemy import select
from ..schemas import entity_schemas
from ..models import user_models
from .. import security
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession


# --- ASYNC DB CHANGES ---

# 
# Funktion um einen Benutzer anhand seiner ID zu finden
async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[user_models.User]:
    """Sucht einen Benutzer anhand seines Primärschlüssels """
    
    return await db.get(user_models.User, user_id)

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[user_models.User]:
    """Sucht einen Benutzer anhand seiner E-Mail-Adresse """
    
    query = select(user_models.User).where(user_models.User.email == email)
    result = await db.execute(query)
    
    return result.scalar_one_or_none()

# --- 2. create_user (umgeschrieben) ---
async def create_user(db: AsyncSession, user: entity_schemas.UserCreate) -> user_models.User:
    """Erstellt einen neuen Benutzer in der Datenbank """
    
    # Führe die CPU-intensive Hashing-Operation in separaten Thread aus
    # um den Server nicht zu blockieren
    hashed_password = await asyncio.to_thread(security.get_password_hash, user.password)
    
    db_user = user_models.User(
        email=user.email, 
        password_hash=hashed_password,
        name=user.email.split('@')[0]
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    return db_user

async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[user_models.User]:
    """Authentifiziert einen Benutzer (asynchron)."""
    
    user = await get_user_by_email(db, email=email)
    
    if not user:
        return None
        
    # Die Passwort-Verifizierung ist ebenfalls CPU-intensiv und wird ausgelagert
    is_password_correct = await asyncio.to_thread(
        security.verify_password, password, user.password_hash
    )
    
    if not is_password_correct:
        return None
        
    return user



