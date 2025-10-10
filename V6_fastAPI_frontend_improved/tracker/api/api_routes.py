import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.exc import IntegrityError
from typing import List, Any

from ..models import entity_models

from .. import security
from ..crud import entity_crud
from ..database import get_db

from ..models import user_models
from ..schemas import entity_schemas
from .api_entity_config import get_entity_config

from ..crud import profile_crud

# --- ASYNC DB CHANGES ---

# Gruppieren der Routen mit Prefix und Tags
router = APIRouter(
    prefix="/api",
    tags=["Generic Entities"]
)

@router.get("/tracking-data", response_model=entity_schemas.AllTrackingData)
async def get_all_tracking_data(
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Holt alle relevanten Tracking-Daten für den aktuellen Benutzer in einer einzigen Anfrage.
    Dieser Endpunkt wird zur initialen Hydrierung des Frontend-Anwendungszustands verwendet.
    """
    user_id = current_user.user_id
    
    # Parallele Ausführung aller Datenbankabfragen = performanter als sequentielle
    tasks = [
        entity_crud.get_items_by_user(db, user_id=user_id, model_class=entity_models.Food),
        entity_crud.get_items_by_user(db, user_id=user_id, model_class=entity_models.ExerciseType),
        entity_crud.get_items_by_user(db, user_id=user_id, model_class=entity_models.ConsumptionLog),
        entity_crud.get_items_by_user(db, user_id=user_id, model_class=entity_models.ActivityLog),
        profile_crud.get_user_profile(db, user_id=user_id)
    ]
    
    foods, exercise_types, consumption_logs, activity_logs, profile = await asyncio.gather(*tasks)

    return {
        "foods": foods,
        "exercise_types": exercise_types,
        "consumption_logs": consumption_logs,
        "activity_logs": activity_logs,
        "user_profile": profile if profile else None
    }

@router.get("/{entity_name}", response_model=List[Any])
async def get_entities(
    entity_name: str,
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Holt sich die config und sucht dann mit der get_items_by_user() crud funktion nach dem passenden entitys.
    """
    config = get_entity_config(entity_name)
    
    items = await entity_crud.get_items_by_user(db, user_id=current_user.user_id, model_class=config['model'])
    
    Schema = config['schema']
    # 'model_validate' ist wie 'from_orm' für neue pydantic version UwU
    return [Schema.model_validate(item, from_attributes=True) for item in items]

@router.post("/{entity_name}", response_model=Any, status_code=status.HTTP_201_CREATED)
async def create_entity(
    entity_name: str,
    # Union-Typ: FastAPI überprüft/validiert automatisch Schemas
    #item_data: entity_schemas.ItemCreate, 
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint zum Erstellen eines Items für einen Entitätstyp."""
    config = get_entity_config(entity_name) 
    
    item_data = config['create_schema']   
        
    new_item = await entity_crud.create_item(db, user_id=current_user.user_id, item_data=item_data, model_class=config['model'])
    # Laden der für Serialisierung benötigten Beziehungen vor schließen der Session
    if entity_name == 'consumption_logs':
        # Für Konsum-Log, lade das zugehörige 'food'-Objekt
        await db.refresh(new_item, attribute_names=['food'])
    elif entity_name == 'activity_logs':
        # Für Aktivitäts-Log, lade das zugehörige 'exercise_type'-Objekt
        await db.refresh(new_item, attribute_names=['exercise_type'])
    Schema = config['schema']
    return Schema.model_validate(new_item, from_attributes=True)


@router.put("/{entity_name}/{item_id}", response_model=Any)
async def update_entity(
    entity_name: str,
    item_id: int,
    #item_data: entity_schemas.ItemUpdate, # Nutze Union für automatische Validierung
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint zum Aktualisieren eines Items."""
    config = get_entity_config(entity_name)
    item_data = config['update_schema']
    
    db_item = await entity_crud.get_item_by_id(db, user_id=current_user.user_id, item_id=item_id, model_class=config['model'], pk_attr=config['pk'])
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    updated_item = await entity_crud.update_item(db, db_item=db_item, item_data=item_data)
    
    # wie beim Erstellen
    if entity_name == 'consumption_logs':
        await db.refresh(updated_item, attribute_names=['food'])
    elif entity_name == 'activity_logs':
        await db.refresh(updated_item, attribute_names=['exercise_type'])
    
    Schema = config['schema']
    return Schema.model_validate(updated_item, from_attributes=True)


@router.delete("/{entity_name}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entity(
    entity_name: str,
    item_id: int,
    current_user: user_models.User = Depends(security.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Endpoint zum Löschen eines Items."""
    config = get_entity_config(entity_name)
    
    db_item = await entity_crud.get_item_by_id(db, user_id=current_user.user_id, item_id=item_id, model_class=config['model'], pk_attr=config['pk'])
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    try:
        await entity_crud.delete_item(db, db_item=db_item)
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Cannot delete this as other entries depend on it.")
    
    return None