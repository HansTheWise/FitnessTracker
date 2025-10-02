from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from .. import security
from ..schemas import entity_schemas
from ..crud import user_crud, profile_crud
from ..database import get_db
from ..models import user_models

# --- ASYNC DB CHANGES ---


# Gruppiere Routen mit einem Prefix und Tags
router = APIRouter(
    prefix="/api",
    tags=["Authentication & Profile"]
)

@router.post("/register", response_model=entity_schemas.User, status_code=status.HTTP_201_CREATED)
async def register_user(user: entity_schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Handles new user registration.
    """
    db_user = await user_crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    return await user_crud.create_user(db=db, user=user)

@router.post("/login", response_model=entity_schemas.Token)
# Wir erwarten jetzt ein UserLogin-Schema (JSON) anstelle von Formulardaten
# macht diesen Endpunkt konsistent mit dem Rest der API
async def login(user_data: entity_schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    # zugriff auf user_data.email statt auf form_data.username
    user = await user_crud.authenticate_user(
        db, email=user_data.email, password=user_data.password
    )
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
async def read_user_profile(
    current_user: user_models.User = Depends(security.get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches the profile for the currently authenticated user.
    Returns an empty object if no profile exists, as the frontend expects.
    """
    profile = await profile_crud.get_user_profile(db, user_id=current_user.user_id)
    if not profile:
        return entity_schemas.UserProfile() # leeres Profil zurückzugeben
    return profile

@router.put("/profile", response_model=entity_schemas.UserProfile)
async def update_user_profile(
    profile_data: entity_schemas.UserProfileUpdate,
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the profile for the currently authenticated user.
    """
    return await profile_crud.update_user_profile(db, user_id=current_user.user_id, profile_data=profile_data)
