from tracker.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    name = db.Column(db.Text)
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade="all, delete-orphan")
        
    def __init__(self, email, password_hash, name):
        self.email = email
        self.password_hash = password_hash
        self.name = name

class UserProfile(db.Model):
    __tablename__ = 'userprofiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False, unique=True)
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    height_cm = db.Column(db.Integer)
    weight_kg = db.Column(db.Float)
    tracking_start_date = db.Column(db.Date)