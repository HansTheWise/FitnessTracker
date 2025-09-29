from ..models import entity_models
from ..schemas import entity_schemas
from fastapi import HTTPException

ENTITY_MAP = {
    'foods': {
        'model': entity_models.Food,
        'pk': 'id',
        'schema': entity_schemas.Food,
        'create_schema': entity_schemas.FoodCreate,
        'update_schema': entity_schemas.FoodUpdate,
    },
    'exercisetypes': {
        'model': entity_models.ExerciseType,
        'pk': 'id', 
        'schema': entity_schemas.ExerciseType,
        'create_schema': entity_schemas.ExerciseTypeCreate,
        'update_schema': entity_schemas.ExerciseTypeUpdate,
    },
    'consumptionlogs': {
        'model': entity_models.ConsumptionLog,
        'pk': 'id', 
        'schema': entity_schemas.ConsumptionLog,
        'create_schema': entity_schemas.ConsumptionLogCreate,
        'update_schema': entity_schemas.ConsumptionLogUpdate,
    },
    'activitylogs': {
        'model': entity_models.ActivityLog,
        'pk': 'id',
        'schema': entity_schemas.ActivityLog,
        'create_schema': entity_schemas.ActivityLogCreate,
        'update_schema': entity_schemas.ActivityLogUpdate,
    }
}

def get_entity_config(entity_name: str):
    """Hilfsfunktion welche auf die ENTITY_MAP zugreift um die passenden parameter für einen entity type zu finden """
    config = ENTITY_MAP.get(entity_name)
    if not config:
        raise HTTPException(status_code=404, detail="Entity type not found")
    return config