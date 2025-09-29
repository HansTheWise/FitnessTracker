from sqlalchemy.orm import Session
from ..schemas import entity_schemas
from ..models import user_models
from .. import security

def get_user_by_email(db: Session, email: str):
    return db.query(user_models.User).filter(user_models.User.email == email).first()

def create_user(db: Session, user: entity_schemas.UserCreate):
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



