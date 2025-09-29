from tracker.extensions import db

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
