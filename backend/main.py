from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import os, json, csv, io, shutil, urllib.request, re

from database import get_db, engine
import models
import auth
from ai_engine import parse_pdf_to_gantt
from typing import Optional

# Ensure tables exist (will not overwrite existing data)
models.Base.metadata.create_all(bind=engine)

import sqlite3
try:
    conn = sqlite3.connect("./pm_suite.db")
    try:
        conn.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;")
    except:
        pass
    try:
        conn.execute("ALTER TABLE tasks ADD COLUMN bottleneck_person TEXT;")
    except:
        pass
    try:
        conn.execute("ALTER TABLE tasks ADD COLUMN pre_requisites TEXT;")
    except:
        pass
    try:
        conn.execute("ALTER TABLE tasks ADD COLUMN delay_reason TEXT;")
    except:
        pass
    conn.commit()
    conn.close()
except:
    pass

app = FastAPI(
    title="AI PM Governance API",
    description="Backend API for the AI-Driven Project Governance Suite",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def create_super_admin():
    import database
    db = next(database.get_db())
    admin_user = db.query(models.User).filter(models.User.username == "superman").first()
    if not admin_user:
        hashed_password = auth.get_password_hash("admin123")
        new_admin = models.User(
            username="superman",
            hashed_password=hashed_password,
            name="Super Admin",
            department="Management",
            designation="Owner",
            email="admin@company.com",
            phone_number="000-0000",
            is_admin=1
        )
        db.add(new_admin)
        db.commit()

MASTER_WEBHOOK_URL = os.getenv("MASTER_WEBHOOK_URL", "https://script.google.com/macros/s/AKfycbyprYMtXl9zIthoAk4zU-AlnAThtp4crrMUvgyRR7cMaj8otuTyGDPkZxUU3tZ5n03Z/exec")

def extract_sheet_id(url: str):
    matches = re.search(r"/d/([a-zA-Z0-9-_]+)", url)
    if matches:
        return matches.group(1)
    return None

def sync_to_google_sheet(sheet_id: str, tasks: list):
    try:
        import requests
        data = {"sheetId": sheet_id, "tasks": tasks}
        response = requests.post(MASTER_WEBHOOK_URL, json=data, allow_redirects=True, timeout=15)
        return True
    except Exception as e:
        return False

# --- AUTHENTICATION ROUTES ---

from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    department: str
    designation: str
    email: str
    phone_number: str

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        hashed_password=hashed_password,
        name=user.name,
        department=user.department,
        designation=user.designation,
        email=user.email,
        phone_number=user.phone_number
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@app.post("/api/auth/token")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_admin": user.is_admin
    }

@app.get("/api/auth/me")
def get_current_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return {
        "success": True,
        "user": {
            "name": current_user.name,
            "department": current_user.department,
            "designation": current_user.designation,
            "email": current_user.email,
            "phone_number": current_user.phone_number
        }
    }

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None

@app.post("/api/auth/update_profile")
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if payload.name: current_user.name = payload.name
    if payload.department: current_user.department = payload.department
    if payload.designation: current_user.designation = payload.designation
    if payload.email: current_user.email = payload.email
    if payload.phone_number: current_user.phone_number = payload.phone_number
    db.commit()
    return {"success": True, "message": "Profile updated successfully"}

# --- PROTECTED APP ROUTES ---

@app.post("/api/proposals/upload")
async def upload_proposal(
    file: UploadFile = File(...), 
    target_sheet_url: Optional[str] = Form(None), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    temp_path = f"/tmp/temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        historical_delays = db.query(models.Task).filter(models.Task.delay_starts > 0).all()
        history_context = ""
        if historical_delays:
            history_summary = []
            for t in historical_delays[:50]:
                history_summary.append(f"Task '{t.task_name}' was historically delayed by {t.delay_starts} days. Reason: {t.delay_reason or 'Unknown'}")
            history_context = "\n".join(history_summary)

        result = parse_pdf_to_gantt(temp_path, history_context)
        os.remove(temp_path)
        
        db_project = models.Project(
            name=file.filename.replace(".pdf", ""),
            target_sheet_url=target_sheet_url,
            user_id=current_user.id
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)

        task_names = {t.id: t.text for t in result.tasks}
        dependency_map = {}
        for link in result.links:
            target = str(link.target)
            source = str(link.source)
            if target not in dependency_map:
                dependency_map[target] = []
            if source in task_names:
                dependency_map[target].append(task_names[source])

        for t in result.tasks:
            pre_reqs = ", ".join(dependency_map.get(str(t.id), []))
            
            # Inject into task object so sync_to_google_sheet pushes it too
            setattr(t, "pre_requisites", pre_reqs)
            
            db_task = models.Task(
                project_id=db_project.id,
                task_id_string=t.id,
                task_name=t.text,
                start_date=t.start_date,
                duration=t.duration,
                parent_id=t.parent,
                progress=t.progress,
                task_type=t.type,
                pre_requisites=pre_reqs
            )
            db.add(db_task)
        db.commit()
        
        sync_status = "Skipped"
        if target_sheet_url:
            sheet_id = extract_sheet_id(target_sheet_url)
            if sheet_id:
                task_dicts = jsonable_encoder(result.tasks)
                success = sync_to_google_sheet(sheet_id, task_dicts)
                sync_status = "Successful" if success else "Failed Master Connection"

        return {
            "success": True, 
            "message": "Proposal successfully parsed into Tasks.",
            "syncStatus": sync_status,
            "project_id": db_project.id,
            "data": jsonable_encoder(result)
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return {"success": False, "error": str(e)}

@app.get("/api/projects")
async def get_projects(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    projects = db.query(models.Project).filter(models.Project.user_id == current_user.id).order_by(models.Project.id.desc()).all()
    return {"success": True, "projects": projects}

@app.get("/api/projects/{project_id}/tasks")
async def get_project_tasks(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or accessible")

    tasks = db.query(models.Task).filter(models.Task.project_id == project_id).all()
    formatted_tasks = []
    for t in tasks:
        formatted_tasks.append({
            "id": t.task_id_string,
            "text": t.task_name,
            "start_date": t.start_date,
            "end_date": t.end_date,
            "duration": t.duration,
            "parent": t.parent_id,
            "progress": t.progress,
            "type": t.task_type,
            "department": t.department,
            "wbs_structure": t.wbs_structure,
            "scope": t.scope,
            "status": t.status,
            "delay_starts": t.delay_starts,
            "delay_reason": t.delay_reason,
            "bottleneck_person": t.bottleneck_person,
            "pre_requisites": t.pre_requisites
        })
    return {"success": True, "tasks": formatted_tasks}

from fastapi import Body, BackgroundTasks

def trigger_webhook(data: dict):
    import requests
    try:
        requests.post(MASTER_WEBHOOK_URL, json=data, timeout=5)
    except:
        pass

@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, background_tasks: BackgroundTasks, payload: dict = Body(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_task = db.query(models.Task).join(models.Project).filter(
        models.Task.task_id_string == task_id,
        models.Project.user_id == current_user.id
    ).first()
    
    if not db_task:
        return {"success": False, "error": "Task not found"}
        
    changes = []
    for field in ["department", "wbs_structure", "scope", "status", "end_date", "delay_starts", "delay_reason"]:
        if field in payload:
            old_val = getattr(db_task, field)
            new_val = payload[field]
            if field == "delay_starts":
                new_val = int(new_val)
                db_task.delay_starts = new_val
            else:
                setattr(db_task, field, new_val)
            
            if str(old_val) != str(new_val):
                changes.append(f"{field.replace('_', ' ').title()} changed to '{new_val}'")
                
    if changes:
        action_msg = f"Task '{db_task.task_name}': " + ", ".join(changes)
        db_log = models.ActivityLog(project_id=db_task.project_id, action_desc=action_msg)
        db.add(db_log)
        
        # Proactive Notification for critical delays
        if "delay_starts" in payload and int(payload["delay_starts"]) > 5:
            db_notif = models.Notification(
                user_id=current_user.id,
                message=f"🚨 CRITICAL: Task '{db_task.task_name}' is delayed by {payload['delay_starts']} days!"
            )
            db.add(db_notif)

    db.commit()
    
    db_project = db.query(models.Project).filter(models.Project.id == db_task.project_id).first()
    if db_project and db_project.target_sheet_url:
        import requests
        sheet_id = extract_sheet_id(db_project.target_sheet_url)
        if sheet_id:
            try:
                data = {
                    "action": "updateRow",
                    "sheetId": sheet_id,
                    "taskId": db_task.task_id_string,
                    "taskName": db_task.task_name,
                    "updates": payload
                }
                background_tasks.add_task(trigger_webhook, data)
            except:
                pass

    return {"success": True, "message": "Task updated"}

@app.get("/api/sync/pull")
async def pull_from_sheet(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    import requests
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not project or not project.target_sheet_url:
        return {"success": False, "error": "Project or target sheet not found"}
        
    sheet_id = extract_sheet_id(project.target_sheet_url)
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
    
    try:
        response = requests.get(csv_url, timeout=10)
        if response.status_code != 200:
            return {"success": False, "error": f"Failed to read CSV from Google: {response.status_code}"}
            
        csv_data = response.text
        reader = csv.DictReader(io.StringIO(csv_data))
        
        import uuid
        for row in reader:
            t_id = row.get("Task ID")
            t_name = row.get("Task Name")
            if not t_name:
                continue
                
            db_task = None
            if t_id:
                db_task = db.query(models.Task).filter(
                    models.Task.project_id == project_id, 
                    models.Task.task_id_string == str(t_id).strip()
                ).first()
                
            if not db_task:
                db_task = db.query(models.Task).filter(
                    models.Task.project_id == project_id, 
                    models.Task.task_name == str(t_name).strip()
                ).first()
                
            bottleneck = None
            remarks_text = row.get("Remarks") or ""
            if remarks_text:
                import re
                match = re.search(r'(?i)(?:waiting for|pending with|delayed by|by|@)\s*([a-zA-Z\-\s]+)', remarks_text)
                if match:
                    bottleneck = match.group(1).strip().title()
            
            if db_task:
                changes = []
                if row.get("Status") and str(db_task.status) != str(row.get("Status")):
                    changes.append(f"Status changed to '{row.get('Status')}'")
                    db_task.status = row.get("Status")
                     
                if row.get("Delay Starts (Days)"):
                    try:
                        val = int(float(row.get("Delay Starts (Days)")))
                        if db_task.delay_starts != val:
                            changes.append(f"Delay changed to '{val}'")
                            db_task.delay_starts = val
                    except: pass
                     
                if bottleneck and str(db_task.bottleneck_person) != str(bottleneck):
                    changes.append(f"Bottleneck assigned to '{bottleneck}'")
                    db_task.bottleneck_person = bottleneck
                     
                if changes:
                    action_msg = f"Task '{str(t_name).strip()}' (via Sync): " + ", ".join(changes)
                    db.add(models.ActivityLog(project_id=project_id, action_desc=action_msg))

                db_task.task_name = str(t_name).strip()
                if not bottleneck and not db_task.bottleneck_person:
                    db_task.bottleneck_person = bottleneck
                
                if row.get("Duration"): db_task.duration = int(float(row.get("Duration")))
                if row.get("Start Date"): db_task.start_date = row.get("Start Date")
                if row.get("End Date"): db_task.end_date = row.get("End Date")
                if row.get("Department"): db_task.department = row.get("Department")
                if row.get("WBS Structure"): db_task.wbs_structure = row.get("WBS Structure")
                if row.get("Scope"): db_task.scope = row.get("Scope")
            else:
                progress_val = 0.0
                t_id_use = str(t_id).strip() if t_id else f"G-{uuid.uuid4().hex[:5]}"
                dur_val = 1
                if row.get("Duration"):
                    try: dur_val = int(float(row.get("Duration")))
                    except: pass
                
                delay_val = 0
                if row.get("Delay Starts (Days)"):
                    try: delay_val = int(float(row.get("Delay Starts (Days)")))
                    except: pass
                
                new_task = models.Task(
                    project_id=project_id,
                    task_id_string=t_id_use,
                    task_name=str(t_name).strip(),
                    start_date=row.get("Start Date") or "2026-01-01",
                    end_date=row.get("End Date") or "2026-01-01",
                    duration=dur_val,
                    progress=progress_val,
                    task_type="task",
                    department=row.get("Department", ""),
                    wbs_structure=row.get("WBS Structure", ""),
                    scope=row.get("Scope", ""),
                    status=row.get("Status", "Pending"),
                    delay_starts=delay_val,
                    bottleneck_person=bottleneck
                )
                db.add(new_task)
                 
        db.commit()
        return await get_project_tasks(project_id, db, current_user)
    except Exception as e:
         return {"success": False, "error": str(e)}

@app.get("/api/analytics/dashboard")
async def get_dashboard_analytics(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    total_projects = db.query(models.Project).filter(models.Project.user_id == current_user.id).count()
    
    total_tasks = db.query(models.Task).join(models.Project).filter(models.Project.user_id == current_user.id).count()
    
    delayed_tasks = db.query(models.Task).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Task.delay_starts > 0
    ).count()

    completed_tasks = db.query(models.Task).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Task.status.in_(["Completed", "Done"])
    ).count()

    health_score = 100
    if total_tasks > 0:
        penalty = (delayed_tasks / total_tasks) * 100
        health_score = max(0, 100 - penalty)
        
    return {
        "success": True,
        "metrics": {
            "total_projects": total_projects,
            "total_tasks": total_tasks,
            "delayed_tasks": delayed_tasks,
            "completed_tasks": completed_tasks,
            "health_score": round(health_score, 1)
        }
    }

@app.get("/api/analytics/pending")
async def get_pending_actions(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    delayed_tasks = db.query(models.Task).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Task.delay_starts > 0,
        models.Task.bottleneck_person.isnot(None),
        models.Task.bottleneck_person != ""
    ).all()
    
    bottlenecks = {}
    for task in delayed_tasks:
        person = task.bottleneck_person
        if person not in bottlenecks:
            bottlenecks[person] = {"total_delay": 0, "tasks": []}
        
        bottlenecks[person]["tasks"].append({
            "task_name": task.task_name,
            "project_name": task.project.name,
            "delay_days": task.delay_starts
        })
        bottlenecks[person]["total_delay"] += task.delay_starts
        
        # Nudge Logic: Issue notification warning if person has high delay
        if task.delay_starts >= 1:
            alert_msg = f"Nudge Alert: {person} is holding up '{task.task_name}' for {task.delay_starts} days!"
            existing = db.query(models.Notification).filter(
               models.Notification.user_id == current_user.id,
               models.Notification.message == alert_msg
            ).first()
            if not existing:
               notif = models.Notification(user_id=current_user.id, message=alert_msg)
               db.add(notif)
    
    db.commit()      
    return {"success": True, "pending_actions": bottlenecks}

@app.get("/api/projects/{project_id}/logs")
async def get_project_logs(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id, models.Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Not found")
    logs = db.query(models.ActivityLog).filter(models.ActivityLog.project_id == project_id).order_by(models.ActivityLog.id.desc()).all()
    return {"success": True, "logs": logs}

@app.get("/api/notifications")
async def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notifs = db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.id.desc()).limit(10).all()
    return {"success": True, "notifications": notifs}

@app.post("/api/notifications/read")
async def mark_notifications_read(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db.query(models.Notification).filter(models.Notification.user_id == current_user.id, models.Notification.is_read == 0).update({"is_read": 1})
    db.commit()
    return {"success": True}

@app.get("/api/admin/managers")
async def get_all_managers_overview(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if current_user.is_admin != 1:
        raise HTTPException(status_code=403, detail="Unauthorized. Super Admin access required.")
        
    managers = db.query(models.User).filter(models.User.is_admin != 1).all()
    overview = []
    
    for mgr in managers:
        proj_count = db.query(models.Project).filter(models.Project.user_id == mgr.id).count()
        delayed_tasks = db.query(models.Task).join(models.Project).filter(
            models.Project.user_id == mgr.id,
            models.Task.delay_starts > 0
        ).count()
        
        overview.append({
            "id": mgr.id,
            "username": mgr.username,
            "name": mgr.name or "N/A",
            "department": mgr.department or "N/A",
            "designation": mgr.designation or "N/A",
            "email": mgr.email or "N/A",
            "phone": mgr.phone_number or "N/A",
            "total_projects": proj_count,
            "delayed_tasks": delayed_tasks
        })
        
    return {"success": True, "managers": overview}

@app.get("/api/analytics/risks")
async def get_risk_dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    delayed_tasks = db.query(
        models.Task.task_name,
        models.Task.delay_starts,
        models.Task.department,
        models.Task.wbs_structure,
        models.Task.status,
        models.Project.name.label("project_name"),
        models.Project.id.label("project_id")
    ).join(models.Project).filter(
        models.Project.user_id == current_user.id,
        models.Task.delay_starts > 0
    ).order_by(models.Task.delay_starts.desc()).all()
    
    formatted_risks = []
    for dt in delayed_tasks:
        formatted_risks.append({
            "task_name": dt.task_name,
            "delay_starts": dt.delay_starts,
            "department": dt.department or "Unassigned",
            "wbs_structure": dt.wbs_structure or "N/A",
            "status": dt.status,
            "project_name": dt.project_name,
            "project_id": dt.project_id
        })
        
    return {"success": True, "risks": formatted_risks}


# --- AI CHAT ASSISTANT ---

class ChatMessage(BaseModel):
    message: str
    history: Optional[list] = []

@app.post("/api/chat")
async def ai_chat(payload: ChatMessage, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE":
        raise HTTPException(status_code=500, detail="OpenAI API Key is not configured.")

    # Build project context for AI
    projects = db.query(models.Project).filter(models.Project.user_id == current_user.id).all()
    context_lines = [f"The user is '{current_user.name or current_user.username}' ({current_user.designation or 'Project Manager'})."]
    context_lines.append(f"They manage {len(projects)} project(s).")

    for proj in projects[:5]:  # limit to 5 projects to avoid token overflow
        tasks = db.query(models.Task).filter(models.Task.project_id == proj.id).all()
        delayed = [t for t in tasks if t.delay_starts and t.delay_starts > 0]
        bottlenecked = [t for t in tasks if t.bottleneck_person]

        context_lines.append(f"\n### Project: {proj.name}")
        context_lines.append(f"  Total tasks: {len(tasks)}, Delayed tasks: {len(delayed)}")

        if delayed:
            delay_summary = ", ".join([f"'{t.task_name}' ({t.delay_starts}d delay)" for t in delayed[:5]])
            context_lines.append(f"  Delayed tasks: {delay_summary}")

        if bottlenecked:
            bn_summary = ", ".join([f"'{t.task_name}' -> {t.bottleneck_person}" for t in bottlenecked[:5]])
            context_lines.append(f"  Bottleneck assignees: {bn_summary}")

    project_context = "\n".join(context_lines)

    system_prompt = f"""You are an intelligent AI Project Management Assistant embedded in the AI PM Governance Suite.
You help project managers analyze their project data, identify risks, resolve bottlenecks, and make smart decisions.
Be concise, direct, and professional. Use bullet points for lists. Keep responses under 300 words unless asked to elaborate.
Use emojis sparingly but effectively to improve readability.

Here is the live project data for context:
{project_context}

If the user asks something outside project management, gently redirect them to PM topics."""

    from openai import OpenAI
    client = OpenAI(api_key=api_key)

    messages = [{"role": "system", "content": system_prompt}]

    # Inject conversation history (last 6 turns)
    for turn in (payload.history or [])[-6:]:
        if turn.get("role") in ("user", "assistant"):
            messages.append({"role": turn["role"], "content": turn["content"]})

    messages.append({"role": "user", "content": payload.message})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=600,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        return {"success": True, "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
