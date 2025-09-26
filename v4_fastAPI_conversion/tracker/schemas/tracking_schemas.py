from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import Optional, List, Any, Dict

# ==============================================================================
# Base Schemas
# ==============================================================================

class FoodBase(BaseModel):
    name: str
    calories_per_100g: int

class ExerciseTypeBase(BaseModel):
    name: str
    calories_per_hour: int

class ConsumptionLogBase(BaseModel):
    log_date: datetime
    food_id: int
    amount_g: int

class ActivityLogBase(BaseModel):
    log_date: datetime
    exercise_type_id: int
    duration_min: int

class UserProfileBase(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[float] = None
    tracking_start_date: Optional[date] = None


# ==============================================================================
# Create & Update Schemas
# ==============================================================================

class FoodCreate(FoodBase):
    pass

class ExerciseTypeCreate(ExerciseTypeBase):
    pass

class ConsumptionLogCreate(ConsumptionLogBase):
    pass

class ActivityLogCreate(ActivityLogBase):
    pass

class UserProfileUpdate(UserProfileBase):
    pass

# --- Generic Schemas for API routes ---
# These act as flexible containers for incoming data in the generic endpoints.
# The specific validation happens inside the route logic.
class ItemCreate(BaseModel):
    model_config = ConfigDict(extra='allow')

class ItemUpdate(BaseModel):
    model_config = ConfigDict(extra='allow')

# --- Schemas with optional fields for PUT requests ---
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


# ==============================================================================
# Read Schemas (Response Models)
# ==============================================================================

class Food(FoodBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

class ExerciseType(ExerciseTypeBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)

class ConsumptionLog(ConsumptionLogBase):
    id: int
    user_id: int
    food_name: str
    calories: float
    model_config = ConfigDict(from_attributes=True)

class ActivityLog(ActivityLogBase):
    id: int
    user_id: int
    exercise_name: str
    calories: float
    model_config = ConfigDict(from_attributes=True)

class UserProfile(UserProfileBase):
    # This allows returning an empty object if profile doesn't exist
    model_config = ConfigDict(from_attributes=True)

class User(BaseModel):
    user_id: int
    email: str
    name: Optional[str]
    model_config = ConfigDict(from_attributes=True)



class DashboardData(BaseModel):
    labels: List[str]
    calories_in: List[float]
    calories_out_active: List[float]  
    calories_out_bmr: List[float]     
    details_in: List[List[str]]
    details_out: List[List[str]]
    total_in: float
    total_out: float
    balance: float
# ==============================================================================
# Authentication Schemas
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