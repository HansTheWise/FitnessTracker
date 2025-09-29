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
#! wir ins frond end ausgelagert
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

#Entity map um dynamisch die crud funktionen mit den richtigen parametern zu füttern
ENTITY_MAP = {
    'foods': {
        'model': tracking_models.Food,
        'pk': 'id',
        'schema': tracking_schemas.Food,
        'create_schema': tracking_schemas.FoodCreate,
        'update_schema': tracking_schemas.FoodUpdate,
    },
    'exercisetypes': {
        'model': tracking_models.ExerciseType,
        'pk': 'id', 
        'schema': tracking_schemas.ExerciseType,
        'create_schema': tracking_schemas.ExerciseTypeCreate,
        'update_schema': tracking_schemas.ExerciseTypeUpdate,
    },
    'consumptionlogs': {
        'model': tracking_models.ConsumptionLog,
        'pk': 'id', 
        'schema': tracking_schemas.ConsumptionLog,
        'create_schema': tracking_schemas.ConsumptionLogCreate,
        'update_schema': tracking_schemas.ConsumptionLogUpdate,
    },
    'activitylogs': {
        'model': tracking_models.ActivityLog,
        'pk': 'id',
        'schema': tracking_schemas.ActivityLog,
        'create_schema': tracking_schemas.ActivityLogCreate,
        'update_schema': tracking_schemas.ActivityLogUpdate,
    }
}

def get_entity_config(entity_name: str):
    """Hilfsfunktion welche auf die ENTITY_MAP zugreift um die passenden parameter für einen entity type zu finden """
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
    """
    holt sich die config und sucht dann mit der get_items_by_user() crud funktion nach dem passenden entitys
    nimmt die entity items list und validiert diese und passt sie an unser schema für das entity an 
    und gibt das eine liste von validierten entity schemas zurück
    """
    config = get_entity_config(entity_name)
    items = crud.get_items_by_user(db, user_id=current_user.user_id, model_class=config['model'])
    
    Schema = config['schema']
    return [Schema.model_validate(item) for item in items]

@router.post("/{entity_name}", response_model=Any, status_code=status.HTTP_201_CREATED)
def create_entity(
    entity_name: str,
    item_data: tracking_schemas.ItemCreate, 
    current_user: user_models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """endpoint to create an item for an entity type."""
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
    """endpoint to update an item."""
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
    """endpoint to delete an item."""
    config = get_entity_config(entity_name)
    db_item = crud.get_item_by_id(db, user_id=current_user.user_id, item_id=item_id, model_class=config['model'], pk_attr=config['pk'])
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        crud.delete_item(db, db_item=db_item)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Cannot delete this as other entries depend on it.")
    
    return None






