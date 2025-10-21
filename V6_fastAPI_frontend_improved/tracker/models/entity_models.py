from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from sqlalchemy import JSON, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
from tracker.models.base_model import Base

'''''
class FoodStat(Base):
    __tablename__ = 'food_stats'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    #food_id: Mapped[int] = mapped_column(ForeignKey('foods.food_id'), unique=True)
    food: Mapped["Food"] = relationship(back_populates='food_stats')
'''
    
    
class Food(Base):
    __tablename__ = 'foods'
    id: Mapped[int] = mapped_column('food_id', primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    #food_stat_id: Mapped[int] = mapped_column(ForeignKey('food_stats.id'))
    name: Mapped[str] = mapped_column()
    #calories_per_100g: Mapped[int] = mapped_column()
#------ Food Stats  -----------------------------------
# --- alles pro 100g !!!!!!!!---
    calories_kcal: Mapped[Optional[int]] = mapped_column()
    
    #calories_kJ: Mapped[Optional[int]] = mapped_column()
    @property
    def calories_kJ(self) -> float:
        # zugriff auf food_stats Objekt
        if self.calories_kcal:
            return round((self.calories_kcal * 4.184))
        return 0.0
    
    # --- Makronährstoffe Base---
    protein_g: Mapped[Optional[float]] = mapped_column()
    carbs_total_g: Mapped[Optional[float]] = mapped_column()
    carbs_sugar_g: Mapped[Optional[float]] = mapped_column()
    fat_total_g: Mapped[Optional[float]] = mapped_column()
    
    # --- Makronährstoffe Details ---
    # ballaststoffe
    carbs_fiber_g: Mapped[Optional[float]] = mapped_column()
    # fett details
    fat_saturated_g: Mapped[Optional[float]] = mapped_column()
    fat_monounsaturated_g: Mapped[Optional[float]] = mapped_column()
    fat_polyunsaturated_g: Mapped[Optional[float]] = mapped_column()
    fat_trans_g: Mapped[Optional[float]] = mapped_column()
    # cholesterin und salz
    artifical_sweeteners : Mapped[Optional[bool]] = mapped_column()
    cholesterol_mg: Mapped[Optional[float]] = mapped_column()
    sodium_mg: Mapped[Optional[float]] = mapped_column()
    
    
    # --- vitamine minerale und anderes zeug ---
    vitamins: Mapped[Optional[dict]] = mapped_column(JSON) # {"vitamin_C_mg" : 90, ...} zB
    minerals: Mapped[Optional[dict]] = mapped_column(JSON)
    # koffein und der ganze bullshit
    other_compounds: Mapped[Optional[dict]] = mapped_column(JSON)
    
    #food_stats: Mapped[List["FoodStat"]] = relationship(back_populates='food', cascade="all, delete-orphan", uselist=False)
    consumptions: Mapped[List["ConsumptionLog"]] = relationship(back_populates='food', cascade="all, delete-orphan")

class ExerciseType(Base):
    __tablename__ = 'exercisetypes'
    # MAP: Map the 'exercise_type_id' database column to the 'id' attribute.
    id: Mapped[int] = mapped_column('exercise_type_id', primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    name: Mapped[str] = mapped_column()
    calories_per_hour: Mapped[int] = mapped_column()

    activities: Mapped[List["ActivityLog"]] = relationship(back_populates='exercise_type', cascade="all, delete-orphan")

class ConsumptionLog(Base):
    __tablename__ = 'consumptionlogs'
    id: Mapped[int] = mapped_column('consumption_log_id', primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    food_id: Mapped[int] = mapped_column(ForeignKey('foods.food_id'))
    amount_g: Mapped[int] = mapped_column()
    log_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    
    food: Mapped["Food"] = relationship(back_populates='consumptions')

    @property
    def calories(self) -> float:
        # zugriff auf food_stats Objekt
        if self.food and self.amount_g and self.food.calories_kcal:
            return round((self.amount_g / 100.0) * self.food.calories_kcal)
        return 0.0
    
    @property
    def food_name(self) -> str:
        return self.food.name if self.food else ""

class ActivityLog(Base):
    __tablename__ = 'activitylogs'
    id: Mapped[int] = mapped_column('activity_log_id', primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    exercise_type_id: Mapped[int] = mapped_column(ForeignKey('exercisetypes.exercise_type_id'))
    duration_min: Mapped[int] = mapped_column()
    log_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    
    exercise_type: Mapped["ExerciseType"] = relationship(back_populates='activities')

    @property
    def calories(self) -> float:
        if self.exercise_type and self.duration_min:
            return round((self.duration_min / 60) * self.exercise_type.calories_per_hour)
        return 0.0

    @property
    def exercise_name(self) -> str:
        return self.exercise_type.name if self.exercise_type else ""

