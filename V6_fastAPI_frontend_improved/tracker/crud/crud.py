from sqlalchemy.orm import Session
from ..schemas import tracking_schemas
from ..models import user_models
from .. import security
# ==============================================================================
# User and Profile CRUD
# ==============================================================================

def get_user_by_email(db: Session, email: str):
    return db.query(user_models.User).filter(user_models.User.email == email).first()

def create_user(db: Session, user: tracking_schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = user_models.User(
        email=user.email, 
        password_hash=hashed_password,
        name=user.email.split('@')[0]
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> user_models.User | None:
    user = get_user_by_email(db, email=email)
    if not user or not security.verify_password(password, user.password_hash):
        return None
    return user

def get_user_profile(db: Session, user_id: int):
    return db.query(user_models.UserProfile).filter(user_models.UserProfile.user_id == user_id).first()

def update_user_profile(db: Session, user_id: int, profile_data: tracking_schemas.UserProfileUpdate):
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

# ==============================================================================
# Generic Item CRUD
# Your ENTITY_MAP logic was great, so we'll build on a similar generic idea.
# ==============================================================================

def get_items_by_user(db: Session, user_id: int, model_class):
    order_by_col = model_class.log_date.desc() if hasattr(model_class, 'log_date') else model_class.name
    return db.query(model_class).filter(model_class.user_id == user_id).order_by(order_by_col).all()

def get_item_by_id(db: Session, user_id: int, item_id: int, model_class, pk_attr: str):
    return db.query(model_class).filter(
        model_class.user_id == user_id, 
        getattr(model_class, pk_attr) == item_id
    ).first()

def create_item(db: Session, user_id: int, item_data, model_class):
    db_item = model_class(**item_data.model_dump(), user_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_item(db: Session, db_item, item_data):
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_item(db: Session, db_item):
    db.delete(db_item)
    db.commit()