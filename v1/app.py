from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, time, date
from dateutil.relativedelta import relativedelta
from sqlalchemy import func
import os

# --- App-Konfiguration ---
app = Flask(__name__)

db_user = os.environ.get('DB_USER', 'postgres')
db_password = os.environ.get('DB_PASS', 'KaterMax007') 
db_host = os.environ.get('DB_HOST', 'localhost')
db_name = os.environ.get('DB_NAME', 'tracker_data')
app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{db_user}:{db_password}@{db_host}/{db_name}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = '1234'
jwt = JWTManager(app)
db = SQLAlchemy(app)

# --- Datenbankmodelle (ORM) ---
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    name = db.Column(db.Text)
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade="all, delete-orphan")

class UserProfile(db.Model):
    __tablename__ = 'userprofiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, unique=True)
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    height_cm = db.Column(db.Integer)
    weight_kg = db.Column(db.Float)
    tracking_start_date = db.Column(db.Date)

class Food(db.Model):
    __tablename__ = 'foods'
    food_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    name = db.Column(db.Text, nullable=False)
    calories_per_100g = db.Column(db.Integer, nullable=False)

class ExerciseType(db.Model):
    __tablename__ = 'exercisetypes'
    exercise_type_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    name = db.Column(db.Text, nullable=False)
    calories_per_hour = db.Column(db.Integer, nullable=False)

class ConsumptionLog(db.Model):
    __tablename__ = 'consumptionlogs'
    consumption_log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.food_id'), nullable=False)
    amount_g = db.Column(db.Integer, nullable=False)
    log_date = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    food = db.relationship('Food')

class ActivityLog(db.Model):
    __tablename__ = 'activitylogs'
    activity_log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    exercise_type_id = db.Column(db.Integer, db.ForeignKey('exercisetypes.exercise_type_id'), nullable=False)
    duration_min = db.Column(db.Integer, nullable=False)
    log_date = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    exercise_type = db.relationship('ExerciseType')

@app.route('/')
def index():
    return render_template('index.html')

# --- Authentifizierungs-API ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    #check of email und password gesendet wurden
    if not email or not password: return jsonify({"msg": "Email und Passwort sind erforderlich"}), 400
    #check of email schon genutzt
    if User.query.filter_by(email=email).first(): return jsonify({"msg": "Email existiert bereits"}), 409
    
    #wir hashen das password
    hashed_password = generate_password_hash(password)
    #erstellen neues user objekt welches wir dann in unsere datenbank einfügen
    new_user = User(email=email, password_hash=hashed_password, name=email.split('@')[0])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "Benutzer erfolgreich registriert"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    user = User.query.filter_by(email=email).first()
    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.user_id))
        return jsonify(access_token=access_token)
    return jsonify({"msg": "Ungültige Anmeldeinformationen"}), 401

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return jsonify({}) # Leeres Objekt zurückgeben, wenn kein Profil existiert
    return jsonify({
        "gender": profile.gender,
        "age": profile.age,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "tracking_start_date": profile.tracking_start_date
    })

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    data = request.get_json()

    if not profile:
        # Erstellen eines profil datensatzes für den user mit id=id, falls kein Profil existiert
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
    #einfügen der profil daten vom client
    profile.gender = data.get('gender')
    profile.age = data.get('age')
    profile.height_cm = data.get('height_cm')
    profile.weight_kg = data.get('weight_kg')
    profile.tracking_start_date = data.get('tracking_start_date')
    
    db.session.commit()
    return jsonify({"msg": "Profil aktualisiert"})

# --- Generische CRUD API Endpunkte ---
def create_crud_endpoints(entity_class, entity_name, required_attributes):
    @app.route(f'/api/{entity_name}', methods=['GET'], endpoint=f'get_{entity_name}')
    @jwt_required()
    def get_entities():
        user_id = get_jwt_identity()
        order_by_col = entity_class.log_date.desc() if hasattr(entity_class, 'log_date') else entity_class.name
        entities = entity_class.query.filter_by(user_id=user_id).order_by(order_by_col).all()
        return jsonify([entity_to_dict(entity) for entity in entities])

    @app.route(f'/api/{entity_name}', methods=['POST'], endpoint=f'add_{entity_name}')
    @jwt_required()
    def add_entity():
        user_id = get_jwt_identity()
        data = request.get_json()
        
        entity_data = {field: data.get(field) for field in required_attributes}
        entity_data['user_id'] = user_id

        if 'log_date' in entity_data and entity_data['log_date']:
            entity_data['log_date'] = datetime.fromisoformat(entity_data['log_date'])
        
        new_entity = entity_class(**entity_data)
        db.session.add(new_entity)
        db.session.commit()
        return jsonify(entity_to_dict(new_entity)), 201

    @app.route(f'/api/{entity_name}/<int:entity_id>', methods=['PUT'], endpoint=f'update_{entity_name}')
    @jwt_required()
    def update_entity(entity_id):
        user_id = get_jwt_identity()
        pk_name = entity_class.__table__.primary_key.columns.values()[0].name
        entity = entity_class.query.filter_by(**{pk_name: entity_id, 'user_id': user_id}).first_or_404()
        data = request.get_json()
        for attribute in required_attributes:
            if attribute in data:
                setattr(entity, attribute, data[attribute])
        db.session.commit()
        return jsonify({'msg': f'{entity_name[:-1].capitalize()} aktualisiert'})

    @app.route(f'/api/{entity_name}/<int:entity_id>', methods=['DELETE'], endpoint=f'delete_{entity_name}')
    @jwt_required()
    def delete_entity(entity_id):
        user_id = get_jwt_identity()
        pk_name = entity_class.__table__.primary_key.columns.values()[0].name
        entity = entity_class.query.filter_by(**{pk_name: entity_id, 'user_id': user_id}).first_or_404()
        db.session.delete(entity)
        db.session.commit()
        return jsonify({'msg': f'{entity_name[:-1].capitalize()} gelöscht'})

def entity_to_dict(entity):
    if isinstance(entity, Food):
        return {'id': entity.food_id, 'name': entity.name, 'calories_per_100g': entity.calories_per_100g}
    if isinstance(entity, ExerciseType):
        return {'id': entity.exercise_type_id, 'name': entity.name, 'calories_per_hour': entity.calories_per_hour}
    if isinstance(entity, ConsumptionLog):
        return {'id': entity.consumption_log_id, 'food_id': entity.food_id, 'food_name': entity.food.name, 'amount_g': entity.amount_g, 'log_date': entity.log_date.isoformat(), 'calories': round((entity.amount_g / 100) * entity.food.calories_per_100g)}
    if isinstance(entity, ActivityLog):
        return {'id': entity.activity_log_id, 'exercise_type_id': entity.exercise_type_id, 'exercise_name': entity.exercise_type.name, 'duration_min': entity.duration_min, 'log_date': entity.log_date.isoformat(), 'calories': round((entity.duration_min / 60) * entity.exercise_type.calories_per_hour)}
    return {}

create_crud_endpoints(Food, 'foods', ['name', 'calories_per_100g'])
create_crud_endpoints(ExerciseType, 'exercisetypes', ['name', 'calories_per_hour'])
create_crud_endpoints(ConsumptionLog, 'consumptionlogs', ['food_id', 'amount_g', 'log_date'])
create_crud_endpoints(ActivityLog, 'activitylogs', ['exercise_type_id', 'duration_min', 'log_date'])

# --- Dashboard API ---
@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    
    def get_time_period(period_str, today_date):
        match period_str:
            case 'day':
                start = datetime.combine(today_date, time.min)
                end = datetime.combine(today_date, time.max)
                chart_labels = [f"{h:02d}:00" for h in range(24)]
            case 'week':
                start_of_week = today_date - timedelta(days=today_date.weekday())
                end_of_week = start_of_week + timedelta(days=6)
                start = datetime.combine(start_of_week, time.min)
                end = datetime.combine(end_of_week, time.max)
                chart_labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
            case 'month':
                start_of_month = today_date.replace(day=1)
                end_of_month = (start_of_month + relativedelta(months=1)) - timedelta(days=1)
                start = datetime.combine(start_of_month, time.min)
                end = datetime.combine(end_of_month, time.max)
                chart_labels = [str(d) for d in range(1, end_of_month.day + 1)]
            case 'year':
                start_of_year = today_date.replace(month=1, day=1)
                end_of_year = today_date.replace(month=12, day=31)
                start = datetime.combine(start_of_year, time.min)
                end = datetime.combine(end_of_year, time.max)
                chart_labels = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
            case _:
                return None, None, None
        return start, end, chart_labels

    def calculate_bmr(profile):
        if not (profile and profile.gender and profile.age and profile.height_cm and profile.weight_kg):
            return 0, None
        
        bmr_val = 0
        if profile.gender.lower() == 'female':
            bmr_val = 655.1 + (9.6 * profile.weight_kg) + (1.8 * profile.height_cm) - (4.7 * profile.age)
        elif profile.gender.lower() == 'male':
            bmr_val = 66.47 + (13.7 * profile.weight_kg) + (5 * profile.height_cm) - (6.8 * profile.age)
        
        return round(bmr_val), profile.tracking_start_date

    def process_logs(logs, period, num_labels):
        calories_list = [0] * num_labels
        details_list = [[] for _ in range(num_labels)]
        
        def get_interval_index(log_date_local, period_str):
            if period_str == 'day': return log_date_local.hour
            if period_str == 'week': return log_date_local.weekday()
            if period_str == 'month': return log_date_local.day - 1
            if period_str == 'year': return log_date_local.month - 1
            return -1

        for log in logs:
            is_consumption = isinstance(log, ConsumptionLog)
            calories = (log.amount_g / 100 * log.food.calories_per_100g) if is_consumption else (log.duration_min / 60 * log.exercise_type.calories_per_hour)
            name = log.food.name if is_consumption else log.exercise_type.name
            
            idx = get_interval_index(log.log_date.astimezone(), period)
            if 0 <= idx < num_labels:
                calories_list[idx] += calories
                details_list[idx].append(f"{name}: {round(calories)} kcal")
        
        return [round(c) for c in calories_list], details_list

    def add_bmr_to_calories_out(calories_out_list, daily_bmr, period_str, start_date_dt, today_date, tracking_start):
        if not (daily_bmr > 0 and tracking_start):
            return calories_out_list

        match period_str:
            case 'day':
                limit_index = datetime.now().hour
                bmr_per_interval = daily_bmr / 24
                day_date = start_date_dt.date()
                if day_date >= tracking_start:
                    for i in range(len(calories_out_list)):
                        if i <= limit_index:
                            calories_out_list[i] += bmr_per_interval
            case 'week' | 'month':
                limit_index = today_date.weekday() if period_str == 'week' else today_date.day - 1
                for i in range(len(calories_out_list)):
                    day_date = start_date_dt.date() + timedelta(days=i)
                    if i <= limit_index and day_date >= tracking_start:
                        calories_out_list[i] += daily_bmr
            case 'year':
                limit_month_index = today_date.month - 1
                for i in range(len(calories_out_list)):
                    month_start = date(today_date.year, i + 1, 1)
                    if month_start < tracking_start.replace(day=1):
                        continue
                    
                    if i < limit_month_index:
                        days_in_month = (month_start + relativedelta(months=1) - timedelta(days=1)).day
                        calories_out_list[i] += daily_bmr * days_in_month
                    elif i == limit_month_index:
                        start_day = max(1, tracking_start.day if tracking_start.month == i + 1 else 1)
                        days_to_add = today_date.day - start_day + 1
                        if days_to_add > 0:
                            calories_out_list[i] += daily_bmr * days_to_add
        
        return [round(c) for c in calories_out_list]

    #ihr fängt der spaß an
    #wir überprüfen ob session gültig ist
    user_id = get_jwt_identity()
    #wir holen uns von der anfrage für welche periode wir die dashboard daten filtern und aufbereiten möchten
    period = request.args.get('period', 'week')
    #speichern des heutigen datums
    today = datetime.now().date()
    
    #gibt das start datum und end datum unseres graphen zurück sowie die passenden lables
    start_date, end_date, labels = get_time_period(period, today)
    if not start_date:
        return jsonify({"msg": "Ungültiger Zeitraum"}), 400

    #speichern der profildaten des nutzers
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    #berechnen des bmr aufgrunde der nutzerdaten
    daily_bmr, tracking_start = calculate_bmr(profile)

    #speichern der consuptions und aktivitäten für unseren start und end zeitraum
    consumptions = ConsumptionLog.query.filter(ConsumptionLog.user_id == user_id, ConsumptionLog.log_date.between(start_date, end_date)).all()
    activities = ActivityLog.query.filter(ActivityLog.user_id == user_id, ActivityLog.log_date.between(start_date, end_date)).all()

    #berechnen des kalorineinnahme anhand der consumption
    calories_in, details_in = process_logs(consumptions, period, len(labels))
    #kalorinverbrauch der aktive begangen wurde :P
    calories_out_active, details_out = process_logs(activities, period, len(labels))
    
    #kalorinverbrauch welcher passiv begangen wurde :/
    calories_out_total = add_bmr_to_calories_out(calories_out_active, daily_bmr, period, start_date, today, tracking_start)

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)
