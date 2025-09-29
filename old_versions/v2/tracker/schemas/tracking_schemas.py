from tracker.extensions import ma
from tracker.models.tracking_models import Food, ExerciseType, ConsumptionLog, ActivityLog

#ma ist die instanz der Marshmellow class welche wir benötigen um die umwandlungen durchzuführen
# SQLAlchemyAutoSchema ist die klasse welche marshmellow erlaubt 
class FoodSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Food
        load_instance = True
        include_fk = True
        exclude = ("food_id",) # Original-PK ausschließen, um Konflikt zu vermeiden
    
    id = ma.auto_field('food_id') # PK als 'id' für das Frontend freigeben

class ExerciseTypeSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ExerciseType
        load_instance = True
        include_fk = True
        exclude = ("exercise_type_id",)

    id = ma.auto_field('exercise_type_id')

class ConsumptionLogSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ConsumptionLog
        load_instance = True
        include_fk = True
        exclude = ("consumption_log_id",)
    
    id = ma.auto_field('consumption_log_id')
    # Felder, die nur beim Senden (dump) erstellt werden sollen
    food_name = ma.String(attribute="food.name", dump_only=True)
    calories = ma.Method("get_calories", dump_only=True)

    def get_calories(self, obj):
        if obj.food and obj.amount_g:
            return round((obj.amount_g / 100) * obj.food.calories_per_100g)
        return 0

class ActivityLogSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ActivityLog
        load_instance = True
        include_fk = True
        exclude = ("activity_log_id",)
    
    id = ma.auto_field('activity_log_id')
    exercise_name = ma.String(attribute="exercise_type.name", dump_only=True)
    calories = ma.Method("get_calories", dump_only=True)

    def get_calories(self, obj):
        if obj.exercise_type and obj.duration_min:
            return round((obj.duration_min / 60) * obj.exercise_type.calories_per_hour)
        return 0

# Instanziiere die Schemas für die Verwendung in den Routen
# Ein Schema für ein einzelnes Objekt, eines für eine Liste von Objekten
food_schema = FoodSchema()
foods_schema = FoodSchema(many=True)

exercise_type_schema = ExerciseTypeSchema()
exercise_types_schema = ExerciseTypeSchema(many=True)

consumption_log_schema = ConsumptionLogSchema()
consumption_logs_schema = ConsumptionLogSchema(many=True)

activity_log_schema = ActivityLogSchema()
activity_logs_schema = ActivityLogSchema(many=True)
