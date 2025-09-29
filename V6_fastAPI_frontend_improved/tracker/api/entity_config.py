from ..models import user_models, tracking_models
from ..schemas import tracking_schemas
from fastapi import HTTPException

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