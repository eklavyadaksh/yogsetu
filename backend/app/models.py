from sqlalchemy import Column, Float, ForeignKey, Integer, String, Text

from .db import Base


class User(Base):
    __tablename__ = "users"

    identifier = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    id_type = Column(String, nullable=False)  # 'email' | 'phone'


class Doctor(Base):
    __tablename__ = "doctors"

    identifier = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_identifier = Column(String, ForeignKey("users.identifier"), nullable=False, index=True)
    doctor_identifier = Column(String, ForeignKey("doctors.identifier"), nullable=False, index=True)
    plan_json = Column(Text, nullable=False)
    start_date = Column(String, nullable=False)  # ISO date string YYYY-MM-DD
    weeks = Column(Integer, nullable=False, default=2)
    status = Column(String, nullable=False, default="active")  # 'active' | 'ended'


class SessionRecord(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_identifier = Column(String, ForeignKey("users.identifier"), nullable=False, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True, index=True)
    date = Column(String, nullable=False, index=True)  # ISO date string YYYY-MM-DD
    pose_id = Column(String, nullable=False)
    status = Column(String, nullable=False)  # 'done' | 'skipped' | 'pain'
    best_angle = Column(Float, nullable=True)
    hold_seconds = Column(Integer, nullable=False, default=0)
    note = Column(String, nullable=True)
    source = Column(String, nullable=False, default="doctor", index=True)  # 'doctor' | 'self'
