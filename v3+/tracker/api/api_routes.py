from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from tracker.models.tracking_models import Food, ExerciseType, ConsumptionLog, ActivityLog
from tracker.extensions import db
from tracker.schemas.tracking_schemas import (FoodSchema, ExerciseTypeSchema ,ActivityLogSchema, ConsumptionLogSchema
)
from tracker.services import dashboard_service

api_bp = Blueprint('api', __name__)

# Zuordnung von Entity-Namen zu Klassen und Schemas für generische Endpunkte
# die entity map ist das nachschlagewerk
ENTITY_MAP = {
    'foods': {'class': Food, 'schema': FoodSchema, 'pk': 'food_id'},
    'exercisetypes': {'class': ExerciseType, 'schema': ExerciseTypeSchema, 'pk': 'exercise_type_id'},
    'consumptionlogs': {'class': ConsumptionLog, 'schema': ConsumptionLogSchema, 'pk': 'consumption_log_id'},
    'activitylogs': {'class': ActivityLog, 'schema': ActivityLogSchema, 'pk': 'activity_log_id'}
}

# --- Dashboard Route ---
@api_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """
    holt die dashboard daten des nutzer für eine bestimmte periode sonst week aus der datenbank und schickt diese daten an das frontend
    """
    user_id = get_jwt_identity()
    period = request.args.get('period', 'week')
    
    try:
        data = dashboard_service.get_dashboard_data_for_period(user_id, period)
        return jsonify(data)
    except ValueError as e:
        return jsonify({"msg": str(e)}), 400
    except Exception as e:
        return jsonify({"msg": "Ein interner Serverfehler ist aufgetreten"}), 500

#Generische CRUD routen diese nehmen als URL (ressource) eine sting entgegen diese wird von flask geparst und in verschiedene schlüssel aufgespalten (paramater) wird welche dann
#von den jeweiligen endpoints genutzt werden, der unterscheidenen faktor ist nun die method, nicht der URL (der endpoint) die unterscheidung macht
#durch die URL daten (pramater) holt sich dann unsere funktion die benötigten daten aus dem ENTITY_MAP dicotnary

@api_bp.route('/<string:entity_name>', methods=['GET'])
@jwt_required()
def get_entities(entity_name):
    """Ruft eine Liste von Entitäten für den authentifizierten Benutzer ab.

        Diese generische View-Funktion dient als Endpunkt zum Lesen (Read) von
        Sammlungen verschiedener Entitätstypen (z.B. 'foods', 'exercisetypes').
        Sie verwendet den URL-Parameter `entity_name`, um dynamisch die korrekte
        SQLAlchemy-Modellklasse und das Marshmallow-Schema aus der ENTITY_MAP zu laden.

        Die abgerufenen Datenbankobjekte werden mithilfe des entsprechenden Schemas
        in eine JSON-Liste serialisiert und zurückgegeben.

        Args:
            entity_name (str): Der Name der Entität, die abgerufen werden soll.
                Muss ein gültiger Schlüssel in der ENTITY_MAP sein (z.B. 'foods').

        Returns:
            Response: Ein Flask-Response-Objekt.
                - Bei Erfolg: Ein JSON-Body mit einer Liste der serialisierten
                Entitätsobjekte und dem HTTP-Statuscode 200 OK.
                - Bei einem unbekannten `entity_name`: Ein JSON-Body mit einer
                Fehlermeldung und dem HTTP-Statuscode 404 Not Found.
        """
    user_id = get_jwt_identity()
    config = ENTITY_MAP.get(entity_name)
    if not config:
        return jsonify({'msg': 'Unbekannter Entitätstyp'}), 404

    EntityClass = config['class']
    SchemaClass = config['schema']
    
    # Instanziiere das Schema hier mit dem 'many=True' Kontext
    entities_schema = SchemaClass(many=True)

    #wir speichern wie wir ordnen, nach datum wenn vorhanden sonst name 
    order_by_col = EntityClass.log_date.desc() if hasattr(EntityClass, 'log_date') else EntityClass.name
    #query für alle datensätze der Entityclass
    entities = EntityClass.query.filter_by(user_id=user_id).order_by(order_by_col).all()
    return jsonify(entities_schema.dump(entities))

# wir adden ein entity
@api_bp.route('/<string:entity_name>', methods=['POST'])
@jwt_required()
def add_entity(entity_name):
    user_id = get_jwt_identity()
    config = ENTITY_MAP.get(entity_name)
    if not config:
        return jsonify({'msg': 'Unbekannter Entitätstyp'}), 404
    
    json_data = request.get_json()

    SchemaClass = config['schema']
    entity_schema = SchemaClass()
        
    new_entity = entity_schema.load(json_data, session=db.session, partial=True)
    #wir setzen die enitity user id auf die des nutzers
    new_entity.user_id = user_id
    
    db.session.add(new_entity)
    db.session.commit()
    return jsonify(entity_schema.dump(new_entity)), 201

@api_bp.route('/<string:entity_name>/<int:entity_id>', methods=['PUT'])
@jwt_required()
def update_entity(entity_name, entity_id):
    user_id = get_jwt_identity()
    config = ENTITY_MAP.get(entity_name)
    if not config:
        return jsonify({'msg': 'Unbekannter Entitätstyp'}), 404
        
    EntityClass = config['class']
    SchemaClass = config['schema']
    pk_name = config['pk']
    
    entity = EntityClass.query.filter_by(user_id=user_id, **{pk_name: entity_id}).first_or_404()
    json_data = request.get_json()
    
    # Instanziiere das Schema für ein einzelnes Objekt
    entity_schema = SchemaClass()
    updated_entity = entity_schema.load(json_data, instance=entity, session=db.session, partial=True)
    
    db.session.commit()
    return jsonify(entity_schema.dump(updated_entity))

@api_bp.route('/<string:entity_name>/<int:entity_id>', methods=['DELETE'])
@jwt_required()
def delete_entity(entity_name, entity_id):
    """
    Ein generischer Endpunkt zum Löschen einer Entität.
    Fängt Integritätsfehler ab und gibt eine benutzerfreundliche Fehlermeldung zurück.
    """
    user_id = get_jwt_identity()
    config = ENTITY_MAP.get(entity_name)
    if not config:
        return jsonify({'msg': 'Unbekannter Entitätstyp'}), 404

    EntityClass = config['class']
    pk_name = config['pk']
    entity = EntityClass.query.filter_by(user_id=user_id, **{pk_name: entity_id}).first_or_404()
    
    db.session.delete(entity)
    try:
        db.session.commit()
        return '', 204
    except IntegrityError:
        db.session.rollback()
        return jsonify({'msg': f'Kann nicht gelöscht werden, da noch Einträge darauf verweisen.'}), 409
    except Exception:
        db.session.rollback()
        return jsonify({'msg': 'Ein serverseitiger Fehler ist aufgetreten.'}), 500




