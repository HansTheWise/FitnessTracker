from sqlalchemy.orm import Session
from ..schemas import entity_schemas
from ..models import user_models
from .. import security


def get_user_profile(db: Session, user_id: int):
    return db.query(user_models.UserProfile).filter(user_models.UserProfile.user_id == user_id).first()

def update_user_profile(db: Session, user_id: int, profile_data: entity_schemas.UserProfileUpdate):
    db_profile = get_user_profile(db, user_id=user_id)
    if not db_profile:
        db_profile = user_models.UserProfile(user_id=user_id)
        db.add(db_profile)

    update_data = profile_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_profile, key, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile