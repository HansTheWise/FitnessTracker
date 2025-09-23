from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped, mapped_column
from ..database import Base

class Food(Base):
    __tablename__ = 'foods'
    food_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    name: Mapped[str] = mapped_column()
    calories_per_100g: Mapped[int] = mapped_column()

    consumptions: Mapped[List["ConsumptionLog"]] = relationship(back_populates='food', cascade="all, delete-orphan")

class ExerciseType(Base):
    __tablename__ = 'exercisetypes'
    exercise_type_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    name: Mapped[str] = mapped_column()
    calories_per_hour: Mapped[int] = mapped_column()

    activities: Mapped[List["ActivityLog"]] = relationship(back_populates='exercise_type', cascade="all, delete-orphan")

class ConsumptionLog(Base):
    __tablename__ = 'consumptionlogs'
    consumption_log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    food_id: Mapped[int] = mapped_column(ForeignKey('foods.food_id'))
    amount_g: Mapped[int] = mapped_column()
    log_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    
    food: Mapped["Food"] = relationship(back_populates='consumptions')

    @property
    def calories(self) -> float: # Added return type hint
        if self.food and self.amount_g:
            return round((self.amount_g / 100) * self.food.calories_per_100g)
        return 0.0

class ActivityLog(Base):
    __tablename__ = 'activitylogs'
    activity_log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'))
    exercise_type_id: Mapped[int] = mapped_column(ForeignKey('exercisetypes.exercise_type_id'))
    duration_min: Mapped[int] = mapped_column()
    log_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True))
    
    exercise_type: Mapped["ExerciseType"] = relationship(back_populates='activities')

    @property
    def calories(self) -> float: # Added return type hint
        if self.exercise_type and self.duration_min:
            return round((self.duration_min / 60) * self.exercise_type.calories_per_hour)
        return 0.0

