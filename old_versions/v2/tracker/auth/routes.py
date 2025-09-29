from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from tracker.models.user_models import User, UserProfile
from tracker.extensions import db

auth_bp = Blueprint('auth', __name__)
#wir füllen die "sammelmappe auth_bp mit routen und deren funktionalität"
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    
    if not email or not password:
        return jsonify({"msg": "Email und Passwort sind erforderlich"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email existiert bereits"}), 409
    
    hashed_password = generate_password_hash(password)
    new_user = User(email=email, password_hash=hashed_password, name=email.split('@')[0])
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"msg": "Benutzer erfolgreich registriert"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email, password = data.get('email'), data.get('password')
    user = User.query.filter_by(email=email).first()
    
    if user and check_password_hash(user.password_hash, password):
        access_token = create_access_token(identity=str(user.user_id))
        return jsonify(access_token=access_token)
        
    return jsonify({"msg": "Ungültige Anmeldeinformationen"}), 401

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    
    if not profile:
        return jsonify({})
        
    return jsonify({
        "gender": profile.gender,
        "age": profile.age,
        "height_cm": profile.height_cm,
        "weight_kg": profile.weight_kg,
        "tracking_start_date": profile.tracking_start_date
    })

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    profile = UserProfile.query.filter_by(user_id=user_id).first()
    data = request.get_json()

    if not profile:
        profile = UserProfile(user_id=user_id)
        db.session.add(profile)
    
    profile.gender = data.get('gender')
    profile.age = data.get('age')
    profile.height_cm = data.get('height_cm')
    profile.weight_kg = data.get('weight_kg')
    # Konvertierung des Datums, falls es als String kommt
    start_date = data.get('tracking_start_date')
    if start_date:
        profile.tracking_start_date = datetime.fromisoformat(start_date.split('T')[0])
    else:
        profile.tracking_start_date = None

    db.session.commit()
    return jsonify({"msg": "Profil aktualisiert"})