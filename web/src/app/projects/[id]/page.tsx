"use client";

import { useEffect, useState } from "react";
import GanttChart from "@/components/GanttChart";
import { ArrowLeft, Loader2, RefreshCw, Download } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProjectDetail() {
  const params = useParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sync/pull?project_id=${params.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        alert("Live data synced from Google Sheets!");
      } else {
        alert("Sync failed: " + data.error);
      }
    } catch (e) {
      alert("Network error: " + e);
    }
    setSyncing(false);
  };

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Task ID", "Task Name", "Start Date", "End Date", "Duration", 
      "Progress (%)", "Task Type", "Department", "WBS Structure", "Scope", "Status", "Delay Starts (Days)"
    ];
    
    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const t of tasks) {
      const values = [
        t.id || "",
        `"${(t.text || "").replace(/"/g, '""')}"`,
        t.start_date || "",
        t.end_date || "",
        t.duration || 0,
        (t.progress * 100 || 0).toFixed(0),
        t.type || "",
        `"${(t.department || "").replace(/"/g, '""')}"`,
        `"${(t.wbs_structure || "").replace(/"/g, '""')}"`,
        `"${(t.scope || "").replace(/"/g, '""')}"`,
        t.status || "",
        t.delay_starts || 0
      ];
      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Project_${params.id}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${params.id}/tasks`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTasks(data.tasks);
        }
        setLoading(false);
      });

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${params.id}/logs`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLogs(data.logs);
        }
      });
  }, [params.id]);

  return (
    <div className="p-8 w-full max-w-7xl mx-auto h-[100vh] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Project Workspace</h1>
            <p className="text-sm text-slate-500 mt-1">ID: PRJ-{params.id}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Cloud'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
         <div className="p-8 text-center border border-dashed border-slate-300 rounded-lg">
           <p className="text-slate-500">No tasks found for this project.</p>
         </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6">
          {/* Gantt Chart Panel */}
          <div className="flex-[3] bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-hidden flex flex-col relative h-[65vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Historical Timeline</h2>
              <div className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded">Saved in Database</div>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-slate-100 relative">
              <GanttChart 
                data={{ tasks: tasks }} 
                onTaskUpdate={(updatedTask: any) => {
                  setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
                }}
              />
            </div>
          </div>

          {/* Activity Logs Panel */}
          <div className="flex-[1] bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col h-[65vh]">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Activity Log</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No activity yet. Changes to tasks will appear here.</p>
              ) : null}
              
              {logs.map(log => (
                <div key={log.id} className="text-sm border-l-2 border-blue-500 pl-3 py-1">
                  <p className="text-slate-800">{log.action_desc}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
