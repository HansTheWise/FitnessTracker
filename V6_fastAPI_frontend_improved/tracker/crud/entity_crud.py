from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


# --- ASYNC DB CHANGES ---


async def get_items_by_user(db: AsyncSession, user_id: int, model_class):
    """Holt alle Items eines bestimmten Typs für einen Benutzer """
    # Sortierspalte dynamisch bestummen
    order_by_col = model_class.log_date.desc() if hasattr(model_class, 'log_date') else model_class.name
    
    # moderne, asynchrone `select`-Syntax
    query = select(model_class).where(model_class.user_id == user_id).order_by(order_by_col)
    result = await db.execute(query)
    
    return result.scalars().all()

async def get_item_by_id(db: AsyncSession, user_id: int, item_id: int, model_class, pk_attr: str):
    """Holt ein spezifisches Item anhand seiner ID für einen Benutzer """
    query = select(model_class).where(
        model_class.user_id == user_id, 
        getattr(model_class, pk_attr) == item_id
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()

async def create_item(db: AsyncSession, user_id: int, item_data, model_class):
    """Erstellt ein neues Item in der Datenbank """
    
    # Anstatt model_dump() zu verwenden, das Datentypen in Strings umwandelt,
    # erstellen wir ein Dictionary, indem wir direkt auf die Attribute des Pydantic-Objekts zugreifen.
    # Dies bewahrt die korrekten Python-Typen (wie 'datetime').
    create_data = {}
    for field in item_data.model_fields:
        # Wir stellen sicher, dass wir keine 'None'-Werte für Felder übergeben,
        # die nicht explizit gesetzt wurden (wie das optionale log_date).
        value = getattr(item_data, field)
        if value is not None:
            create_data[field] = value
            
    db_item = model_class(**create_data, user_id=user_id)
    
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

async def update_item(db: AsyncSession, db_item, item_data):
    """Aktualisiert ein bestehendes Item """
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
    await db.commit()
    await db.refresh(db_item)
    return db_item

async def delete_item(db: AsyncSession, db_item):
    """Löscht ein Item aus der Datenbank """
    await db.delete(db_item)
    await db.commit()