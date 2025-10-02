from __future__ import annotations
from typing import Optional
from datetime import date
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .base_model import Base


class User(Base):
    __tablename__ = 'users'
    user_id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String)
    
    profile: Mapped["UserProfile"] = relationship(back_populates='user', uselist=False, cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = 'userprofiles'
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'), unique=True)
    gender: Mapped[Optional[str]] = mapped_column(String(10))
    age: Mapped[Optional[int]] = mapped_column()
    height_cm: Mapped[Optional[int]] = mapped_column()
    weight_kg: Mapped[Optional[float]] = mapped_column()
    tracking_start_date: Mapped[Optional[date]] = mapped_column()
    balance_goal_kcal: Mapped[Optional[int]] = mapped_column()
    user: Mapped["User"] = relationship(back_populates='profile')
