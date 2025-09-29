from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from tracker.models.user_models import UserProfile
from tracker.models.tracking_models import Food, ExerciseType, ConsumptionLog, ActivityLog
from tracker.extensions import db
from tracker.services import dashboard_service
# Importiere die neuen Schemas aus der schemas-Datei
from tracker.schemas.tracking_schemas import (
    foods_schema, food_schema,
    exercise_types_schema, exercise_type_schema,
    consumption_logs_schema, consumption_log_schema,
    activity_logs_schema, activity_log_schema
)

api_bp = Blueprint('api', __name__)

# --- Dashboard API Route ---
# Diese Route bleibt unverändert, da ihre Logik im Service-Layer liegt.
@api_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    user_id = get_jwt_identity()
    period = request.args.get('period', 'week')
    today = datetime.now().date()
    
    start_date, end_date, labels = dashboard_service.get_time_period(period, today)
    if not start_date:
        return jsonify({"msg": "Ungültiger Zeitraum"}), 400

    profile = UserProfile.query.filter_by(user_id=user_id).first()
    daily_bmr, tracking_start = dashboard_service.calculate_bmr(profile)

    consumptions = ConsumptionLog.query.filter(ConsumptionLog.user_id == user_id, ConsumptionLog.log_date.between(start_date, end_date)).all()
    activities = ActivityLog.query.filter(ActivityLog.user_id == user_id, ActivityLog.log_date.between(start_date, end_date)).all()

    calories_in, details_in = dashboard_service.process_logs(consumptions, period, len(labels), ConsumptionLog)
    calories_out_active, details_out = dashboard_service.process_logs(activities, period, len(labels), ActivityLog)
    
    calories_out_total = dashboard_service.add_bmr_to_calories_out(calories_out_active, daily_bmr, period, start_date, today, tracking_start)

    return jsonify({
        'labels': labels,
        'calories_in': calories_in,
        'calories_out': calories_out_total,
        'details_in': details_in,
        'details_out': details_out,
        'total_in': sum(calories_in),
        'total_out': sum(calories_out_total),
        'balance': sum(calories_in) - sum(calories_out_total)
    })


# --- CRUD Endpunkte mit Marshmallow ---
# Diese Funktion erstellt alle (Create, Read, Update, Delete) Routen für ein Modell.
def create_crud_endpoints(model_class, single_schema, many_schema, entity_name):
    
    @api_bp.route(f'/{entity_name}', methods=['GET'], endpoint=f'get_{entity_name}')
    @jwt_required()
    def get_entities():
        user_id = get_jwt_identity()
        order_by_col = model_class.log_date.desc() if hasattr(model_class, 'log_date') else model_class.name
        entities = model_class.query.filter_by(user_id=user_id).order_by(order_by_col).all()
        # Serialisierung: Wandle DB-Objekte mit dem Schema in JSON um
        return jsonify(many_schema.dump(entities))

    @api_bp.route(f'/{entity_name}', methods=['POST'], endpoint=f'add_{entity_name}')
    @jwt_required()
    def add_entity():
        user_id = get_jwt_identity()
        json_data = request.get_json()
        json_data['user_id'] = user_id

        try:
            # Deserialisierung: Lade JSON in ein DB-Objekt und validiere es automatisch
            new_entity = single_schema.load(json_data, session=db.session)
            db.session.add(new_entity)
            db.session.commit()
            # Serialisiere das neue Objekt für die Antwort zurück
            return jsonify(single_schema.dump(new_entity)), 201
        except Exception as e: # Fängt Validierungsfehler von Marshmallow ab
            return jsonify({"msg": "Fehlerhafte Daten", "errors": str(e)}), 400

    @api_bp.route(f'/{entity_name}/<int:entity_id>', methods=['PUT'], endpoint=f'update_{entity_name}')
    @jwt_required()
    def update_entity(entity_id):
        user_id = get_jwt_identity()
        pk_name = model_class.__table__.primary_key.columns.values()[0].name
        entity = model_class.query.filter_by(**{pk_name: entity_id, 'user_id': user_id}).first_or_404()
        
        json_data = request.get_json()
        try:
            # Lade die neuen Daten in das bestehende Objekt
            updated_entity = single_schema.load(json_data, instance=entity, session=db.session, partial=True)
            db.session.commit()
            return jsonify(single_schema.dump(updated_entity))
        except Exception as e:
            return jsonify({"msg": "Fehlerhafte Daten", "errors": str(e)}), 400

    @api_bp.route(f'/{entity_name}/<int:entity_id>', methods=['DELETE'], endpoint=f'delete_{entity_name}')
    @jwt_required()
    def delete_entity(entity_id):
        user_id = get_jwt_identity()
        pk_name = model_class.__table__.primary_key.columns.values()[0].name
        entity = model_class.query.filter_by(**{pk_name: entity_id, 'user_id': user_id}).first_or_404()
        
        db.session.delete(entity)
        db.session.commit()
        return jsonify({'msg': f'{entity_name[:-1].capitalize()} gelöscht'}), 200

# Registriere die CRUD-Endpunkte für jedes Modell mit den entsprechenden Schemas
create_crud_endpoints(Food, food_schema, foods_schema, 'foods')
create_crud_endpoints(ExerciseType, exercise_type_schema, exercise_types_schema, 'exercisetypes')
create_crud_endpoints(ConsumptionLog, consumption_log_schema, consumption_logs_schema, 'consumptionlogs')
create_crud_endpoints(ActivityLog, activity_log_schema, activity_logs_schema, 'activitylogs')


