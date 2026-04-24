import os
import json
import pdfplumber
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

class GanttTask(BaseModel):
    id: str
    text: str
    start_date: str
    duration: int
    parent: Optional[str] = None
    progress: float = 0.0
    open: bool = True
    type: str = "task" # "project" or "task"
    pre_requisites: Optional[str] = None

class Dependency(BaseModel):
    id: int
    source: str
    target: str
    type: str = "0" # 0: Finish to Start

class ParsedProposal(BaseModel):
    project_name: str
    tasks: List[GanttTask]
    links: List[Dependency]
    critical_delays: int = 0
    buffer_erosion: int = 0

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        # Paginating efficiently to avoid overwhelming the token window
        for page in pdf.pages[:10]:
            content = page.extract_text()
            if content:
                text += content + "\n"
    return text

def parse_pdf_to_gantt(file_path: str, history_context: str = "") -> ParsedProposal:
    text = extract_text_from_pdf(file_path)
    if not text.strip():
        raise Exception("Failed to read any text from the uploaded PDF. It might be an image-only scan.")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "YOUR_OPENAI_API_KEY_HERE":
        raise Exception("OpenAI API Key is missing or invalid. Please check the backend/.env file.")
        
    client = OpenAI(api_key=api_key)
    
    system_prompt = """
    You are an expert Project Manager AI. 
    You will read a raw project proposal (RFPs, contracts, timelines) and logically break it down into a highly structured Work Breakdown Structure (WBS).
    Follow these exact formatting rules to return a valid JSON object matching our schemas:
    
    - Output must be purely JSON without any markdown code blocks.
    - `project_name`: String summarizing the core project intent.
    - `tasks`: A list of GanttTask objects.
        - `id`: Unique string ID (e.g. "1", "2"). Must increment.
        - `text`: Concise name of the task. Keep it short.
        - `start_date`: Estimate a start date in YYYY-MM-DD format (assume '2026-05-01' is Day 1 if none stated in text). 
        - `duration`: Integer representing days roughly.
        - `type`: Must be strictly either "project" (a summary parent phase) or "task" (a child leaf).
        - `parent`: The string ID of its parent phase. For root "project" types, this should be null or missing.
        - `progress`: Number between 0.0 to 1.0. Set to 0.0.
        - `open`: Boolean, set to true.
    - `links`: Array of dependencies (source -> target). Make logical Finish-to-Start dependencies!
    - `critical_delays`: Integer (0-10) evaluating potential blockers described in text.
    - `buffer_erosion`: Integer (0-5) indicating strictness of timeline risk.
    
    Think systematically. Create phases ("project") and place actual tasks ("task") inside those phases using the `parent` attribute.

    IMPORTANT: You may be provided with 'Historical Context' detailing tasks that have been delayed in the past. 
    If you are generating a task that is functionally similar to a historically delayed task, proactively INCREASE its `duration` by adding a reasonable buffer (e.g., adding the average historical delay). 
    If you add a buffer, append a suffix to the task `text` like "(Includes +Xd historical buffer)".

    Historical Context:
    {history_context}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Parse this proposal:\n\n{text[:12000]}"}
            ],
            response_format={ "type": "json_object" }
        )
        
        content = response.choices[0].message.content
        data = json.loads(content)
        
        tasks = []
        for t in data.get("tasks", []):
            tasks.append(
                GanttTask(
                    id=str(t.get("id")),
                    text=str(t.get("text", "Task")),
                    start_date=str(t.get("start_date")),
                    duration=int(t.get("duration", 5)),
                    parent=str(t.get("parent")) if t.get("parent") else None,
                    type=str(t.get("type", "task"))
                )
            )
        
        links = []
        for index, l in enumerate(data.get("links", [])):
            links.append(
                Dependency(
                    id=index + 1,
                    source=str(l.get("source")),
                    target=str(l.get("target"))
                )
            )
            
        return ParsedProposal(
            project_name=data.get("project_name", "AI Processed Proposal"),
            tasks=tasks,
            links=links,
            critical_delays=int(data.get("critical_delays", 0)),
            buffer_erosion=int(data.get("buffer_erosion", 0))
        )
    except Exception as e:
        print("API PARSING ERROR:", e)
        raise Exception(f"AI Processing failed: {str(e)}")
