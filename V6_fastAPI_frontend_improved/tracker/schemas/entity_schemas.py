from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List, Union

# ==============================================================================
# Base Schemas (Definieren die Kern-Attribute)
# ==============================================================================
class FoodBase(BaseModel):
    name: str
    calories_per_100g: int

class ExerciseTypeBase(BaseModel):
    name: str
    calories_per_hour: int
    
class ConsumptionLogBase(BaseModel):
    food_id: int
    amount_g: int
    log_date: Optional[datetime] = None

class ActivityLogBase(BaseModel):
    exercise_type_id: int
    duration_min: int
    log_date: Optional[datetime] = None

class UserProfileBase(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    tracking_start_date: Optional[date] = None
    balance_goal_kcal: Optional[int] = None

# ==============================================================================
# Schemas für Authentifizierung & Benutzer
# ==============================================================================
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# ==============================================================================
# Spezifische Create & Update Schemas
# ==============================================================================
class FoodCreate(FoodBase): pass
class ExerciseTypeCreate(ExerciseTypeBase): pass
class ConsumptionLogCreate(ConsumptionLogBase): pass
class ActivityLogCreate(ActivityLogBase): pass
class UserProfileUpdate(UserProfileBase): pass

class FoodUpdate(BaseModel):
    name: Optional[str] = None
    calories_per_100g: Optional[int] = None

class ExerciseTypeUpdate(BaseModel):
    name: Optional[str] = None
    calories_per_hour: Optional[int] = None

class ConsumptionLogUpdate(BaseModel):
    log_date: Optional[datetime] = None
    food_id: Optional[int] = None
    amount_g: Optional[int] = None

class ActivityLogUpdate(BaseModel):
    log_date: Optional[datetime] = None
    exercise_type_id: Optional[int] = None
    duration_min: Optional[int] = None

# "State of the Art": Union-Typen für die generischen Endpunkte.
ItemCreate = Union[FoodCreate, ExerciseTypeCreate, ConsumptionLogCreate, ActivityLogCreate]
ItemUpdate = Union[FoodUpdate, ExerciseTypeUpdate, ConsumptionLogUpdate, ActivityLogUpdate, UserProfileUpdate]

# ==============================================================================
# Read Schemas (für API-Antworten)
# ==============================================================================
class Food(FoodBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ExerciseType(ExerciseTypeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ConsumptionLog(BaseModel):
    id: int
    food_id: int
    amount_g: int
    log_date: datetime
    food_name: str
    calories: float
    model_config = ConfigDict(from_attributes=True)

class ActivityLog(BaseModel):
    id: int
    exercise_type_id: int
    duration_min: int
    log_date: datetime
    exercise_name: str
    calories: float
    model_config = ConfigDict(from_attributes=True)

class UserProfile(UserProfileBase):
    model_config = ConfigDict(from_attributes=True)

# Ein einziges, klares Read-Schema für den Benutzer
class User(BaseModel):
    user_id: int
    email: str
    name: Optional[str]
    profile: Optional[UserProfile] = None
    model_config = ConfigDict(from_attributes=True)

class AllTrackingData(BaseModel):
    foods: List[Food]
    exercise_types: List[ExerciseType]
    consumption_logs: List[ConsumptionLog]
    activity_logs: List[ActivityLog]
    user_profile: Optional[UserProfile] = None