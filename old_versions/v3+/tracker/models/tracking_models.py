from tracker.extensions import db

class Food(db.Model):
    __tablename__ = 'foods'
    food_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    name = db.Column(db.Text, nullable=False)
    calories_per_100g = db.Column(db.Integer, nullable=False)
    consumptions = db.relationship('ConsumptionLog', back_populates='food', cascade="all, delete-orphan")


class ExerciseType(db.Model):
    __tablename__ = 'exercisetypes'
    exercise_type_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    name = db.Column(db.Text, nullable=False)
    calories_per_hour = db.Column(db.Integer, nullable=False)
    activities = db.relationship('ActivityLog', back_populates='exercise_type', cascade="all, delete-orphan")


class ConsumptionLog(db.Model):
    __tablename__ = 'consumptionlogs'
    consumption_log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey('foods.food_id'), nullable=False)
    amount_g = db.Column(db.Integer, nullable=False)
    log_date = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    
    food = db.relationship('Food', back_populates='consumptions')

    @property
    def calories(self):
        """
        Calculates the total calories for this consumption log entry.
        """
        if self.food and self.amount_g:
            return round((self.amount_g / 100) * self.food.calories_per_100g)
        return 0


class ActivityLog(db.Model):
    __tablename__ = 'activitylogs'
    activity_log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    exercise_type_id = db.Column(db.Integer, db.ForeignKey('exercisetypes.exercise_type_id'), nullable=False)
    duration_min = db.Column(db.Integer, nullable=False)
    log_date = db.Column(db.TIMESTAMP(timezone=True), nullable=False)
    
    exercise_type = db.relationship('ExerciseType', back_populates='activities')

    @property
    def calories(self):
        """
        Calculates the calories burned for this activity log entry.
        """
        if self.exercise_type and self.duration_min:
            return round((self.duration_min / 60) * self.exercise_type.calories_per_hour)
        return 0
