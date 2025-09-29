from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from .. import security
from ..schemas import entity_schemas
from ..crud import user_crud, profile_crud
from ..database import get_db
from ..models import user_models

router = APIRouter()

@router.post("/register", response_model=entity_schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(user: entity_schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Handles new user registration.
    """
    db_user = user_crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=409, detail="Email already registered")
    return user_crud.create_user(db=db, user=user)

@router.post("/login", response_model=entity_schemas.Token)
def login(user_data: entity_schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Logs in a user and returns an access token.
    This endpoint now expects a JSON body with 'email' and 'password'.
    """
    user = user_crud.authenticate_user(db, email=user_data.email, password=user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = security.create_access_token(
        data={"sub": str(user.user_id)}
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/profile", response_model=entity_schemas.UserProfile)
def read_user_profile(
    current_user: user_models.User = Depends(security.get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Fetches the profile for the currently authenticated user.
    Returns an empty object if no profile exists, as the frontend expects.
    """
    profile = profile_crud.get_user_profile(db, user_id=current_user.user_id)
    if not profile:
        return entity_schemas.UserProfile() # Return a default, empty profile
    return profile

@router.put("/profile", response_model=entity_schemas.UserProfile)
def update_user_profile(
    profile_data: entity_schemas.UserProfileUpdate,
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the profile for the currently authenticated user.
    """
    return profile_crud.update_user_profile(db, user_id=current_user.user_id, profile_data=profile_data)

