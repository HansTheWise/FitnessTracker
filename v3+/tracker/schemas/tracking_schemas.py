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
    
    id = ma.auto_field('food_id') # PK in 'id' umbenennen und für das Frontend freigeben #genormt!

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
    calories = ma.Float(dump_only=True)


class ActivityLogSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = ActivityLog
        load_instance = True
        include_fk = True
        exclude = ("activity_log_id",)
    
    id = ma.auto_field('activity_log_id')
    exercise_name = ma.String(attribute="exercise_type.name", dump_only=True)
    calories = ma.Float(dump_only=True)