from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..schemas import entity_schemas
from ..models import user_models


# --- ASYNC DB CHANGES ---


async def get_user_profile(db: AsyncSession, user_id: int) -> Optional[user_models.UserProfile]:
    """Sucht ein Benutzerprofil anhand der User-ID (asynchron)."""
    
    query = select(user_models.UserProfile).where(user_models.UserProfile.user_id == user_id)
    result = await db.execute(query)
    
    return result.scalar_one_or_none()

async def update_user_profile(db: AsyncSession, user_id: int, profile_data: entity_schemas.UserProfileUpdate) -> user_models.UserProfile:
    """Aktualisiert ein Benutzerprofil oder erstellt es, falls es nicht existiert (asynchron)."""
    
    db_profile = await get_user_profile(db, user_id=user_id)
    
    if not db_profile:
        db_profile = user_models.UserProfile(user_id=user_id)
        db.add(db_profile)

    # Hole die Update-Daten als Dictionary. exclude_unset=True,
    # damit nur die Felder aktualisiert werden, die der Benutzer auch gesendet hat
    update_data = profile_data.model_dump(exclude_unset=True)
    
    # Aktualisiert die Felder des Datenbank-Objekts dynamisch
    for key, value in update_data.items():
        setattr(db_profile, key, value)
        
    await db.commit()
    await db.refresh(db_profile)
    
    return db_profile

