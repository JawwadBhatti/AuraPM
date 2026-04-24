from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Integer, default=0)
    
    # Optional Profile Fields
    name = Column(String, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="owner", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    target_sheet_url = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("ActivityLog", back_populates="project", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    task_id_string = Column(String)  # This matches the "1", "2" id returned from frontend Gantt
    task_name = Column(String)
    start_date = Column(String)
    end_date = Column(String, nullable=True)
    duration = Column(Integer)
    parent_id = Column(String, nullable=True)
    progress = Column(Float, default=0.0)
    task_type = Column(String)
    department = Column(String, nullable=True)
    wbs_structure = Column(String, nullable=True)
    scope = Column(String, nullable=True)
    status = Column(String, default="Pending")
    delay_starts = Column(Integer, default=0)
    delay_reason = Column(String, nullable=True)
    bottleneck_person = Column(String, nullable=True)
    pre_requisites = Column(String, nullable=True)

    project = relationship("Project", back_populates="tasks")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    is_read = Column(Integer, default=0)
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())

    owner = relationship("User", back_populates="notifications")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    action_desc = Column(String)
    created_at = Column(String, default=lambda: datetime.datetime.now().isoformat())

    project = relationship("Project", back_populates="logs")
