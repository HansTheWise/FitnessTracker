from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Any

from .. import security
from ..services import dashboard_service
from ..crud import crud
from ..schemas import tracking_schemas
from ..database import get_db
from ..models import user_models, tracking_models

router = APIRouter()

# ==============================================================================
# Dashboard Route
# ==============================================================================

@router.get("/dashboard", response_model=tracking_schemas.DashboardData)
def get_dashboard(
    period: str = Query("week", enum=["day", "week", "month", "year"]),
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetches dashboard data for the authenticated user for a given period.
    """
    try:
        data = dashboard_service.get_dashboard_data_for_period(db, user_id=current_user.user_id, period=period)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log the error in a real application
        raise HTTPException(status_code=500, detail="An internal server error occurred")

# ==============================================================================
# Generic CRUD Routes for Tracking Entities
# ==============================================================================

# This map is the equivalent of your Flask ENTITY_MAP.
# It connects URL paths to models and schemas.
# FIX: Updated 'pk' values to 'id' to match the updated SQLAlchemy models.
ENTITY_MAP = {
    'foods': {
        'model': tracking_models.Food,
        'pk': 'id', # Formerly 'food_id'
        'schema': tracking_schemas.Food,
        'create_schema': tracking_schemas.FoodCreate,
        'update_schema': tracking_schemas.FoodUpdate,
    },
    'exercisetypes': {
        'model': tracking_models.ExerciseType,
        'pk': 'id', # Formerly 'exercise_type_id'
        'schema': tracking_schemas.ExerciseType,
        'create_schema': tracking_schemas.ExerciseTypeCreate,
        'update_schema': tracking_schemas.ExerciseTypeUpdate,
    },
    'consumptionlogs': {
        'model': tracking_models.ConsumptionLog,
        'pk': 'id', # Formerly 'consumption_log_id'
        'schema': tracking_schemas.ConsumptionLog,
        'create_schema': tracking_schemas.ConsumptionLogCreate,
        'update_schema': tracking_schemas.ConsumptionLogUpdate,
    },
    'activitylogs': {
        'model': tracking_models.ActivityLog,
        'pk': 'id', # Formerly 'activity_log_id'
        'schema': tracking_schemas.ActivityLog,
        'create_schema': tracking_schemas.ActivityLogCreate,
        'update_schema': tracking_schemas.ActivityLogUpdate,
    }
}

def get_entity_config(entity_name: str):
    """Helper to get config and raise 404 if not found."""
    config = ENTITY_MAP.get(entity_name)
    if not config:
        raise HTTPException(status_code=404, detail="Entity type not found")
    return config

@router.get("/{entity_name}", response_model=List[Any])
def get_entities(
    entity_name: str,
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Generic endpoint to list items for an entity type."""
    config = get_entity_config(entity_name)
    items = crud.get_items_by_user(db, user_id=current_user.user_id, model_class=config['model'])
    
    # We need to manually validate with the correct schema here
    # because FastAPI can't determine the response_model dynamically.
    Schema = config['schema']
    return [Schema.model_validate(item) for item in items]

@router.post("/{entity_name}", response_model=Any, status_code=status.HTTP_201_CREATED)
def create_entity(
    entity_name: str,
    # The actual schema will be determined and validated inside the function
    item_data: tracking_schemas.ItemCreate, 
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Generic endpoint to create an item for an entity type."""
    config = get_entity_config(entity_name)
    CreateSchema = config['create_schema']
    
    # Validate the raw dict with the correct schema
    try:
        validated_data = CreateSchema(**item_data.model_dump())
    except Exception:
         raise HTTPException(status_code=422, detail="Invalid data for this entity type")

    new_item = crud.create_item(db, user_id=current_user.user_id, item_data=validated_data, model_class=config['model'])
    Schema = config['schema']
    return Schema.model_validate(new_item)


@router.put("/{entity_name}/{item_id}", response_model=Any)
def update_entity(
    entity_name: str,
    item_id: int,
    item_data: tracking_schemas.ItemUpdate,
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Generic endpoint to update an item."""
    config = get_entity_config(entity_name)
    UpdateSchema = config['update_schema']
    
    db_item = crud.get_item_by_id(db, user_id=current_user.user_id, item_id=item_id, model_class=config['model'], pk_attr=config['pk'])
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        validated_data = UpdateSchema(**item_data.model_dump(exclude_unset=True))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid data for this entity type")

    updated_item = crud.update_item(db, db_item=db_item, item_data=validated_data)
    Schema = config['schema']
    return Schema.model_validate(updated_item)


@router.delete("/{entity_name}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entity(
    entity_name: str,
    item_id: int,
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """Generic endpoint to delete an item."""
    config = get_entity_config(entity_name)
    db_item = crud.get_item_by_id(db, user_id=current_user.user_id, item_id=item_id, model_class=config['model'], pk_attr=config['pk'])
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        crud.delete_item(db, db_item=db_item)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Cannot delete this as other entries depend on it.")
    
    return None






