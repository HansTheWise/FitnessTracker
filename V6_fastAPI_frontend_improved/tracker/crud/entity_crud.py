from sqlalchemy.orm import Session
from ..schemas import entity_schemas
from ..models import user_models
from .. import security


def get_items_by_user(db: Session, user_id: int, model_class):
    order_by_col = model_class.log_date.desc() if hasattr(model_class, 'log_date') else model_class.name
    return db.query(model_class).filter(model_class.user_id == user_id).order_by(order_by_col).all()

def get_item_by_id(db: Session, user_id: int, item_id: int, model_class, pk_attr: str):
    return db.query(model_class).filter(
        model_class.user_id == user_id, 
        getattr(model_class, pk_attr) == item_id
    ).first()

def create_item(db: Session, user_id: int, item_data, model_class):
    db_item = model_class(**item_data.model_dump(), user_id=user_id)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_item(db: Session, db_item, item_data):
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_item(db: Session, db_item):
    db.delete(db_item)
    db.commit()