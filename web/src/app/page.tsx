"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardCards from "@/components/DashboardCards";
import UploadModal from "@/components/UploadModal";
import GanttChart from "@/components/GanttChart";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          throw new Error("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && data.projects.length > 0) {
          const latest = data.projects[0];
          fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${latest.id}/tasks`, {
            headers: { "Authorization": `Bearer ${token}` }
          })
            .then((res) => res.json())
            .then((taskData) => {
              if (taskData.success) {
                setProjectData({
                  project_name: latest.name,
                  tasks: taskData.tasks,
                });
              }
            })
            .catch(console.error);
        }
      })
      .catch(console.error);

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/analytics/dashboard`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if(data.success) setAnalytics(data.metrics);
      })
      .catch(console.error);
  }, []);

  return (
    <>
      <UploadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onUploadSuccess={(data: any) => {
          setProjectData(data);
        }}
      />
      <div className="p-4 md:p-6 max-w-7xl w-full mx-auto">
        <header className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">Dashboard Overview</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">AI-assisted project health and delay analysis.</p>
          </div>
          <div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-md text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              <span className="text-base leading-none mb-[2px]">+</span> New Proposal
            </button>
          </div>
        </header>

        <DashboardCards analytics={analytics} />

        {/* Dynamic Custom Gantt Chart */}
        <section className="bg-white border border-slate-200 shadow-sm rounded-md p-4 min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {projectData ? projectData.project_name : "Dynamic Gantt Chart"}
            </h2>
            <div className="text-[10px] px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 block"></span>
              Live Sync Active
            </div>
          </div>
          
          <GanttChart 
            data={projectData} 
            onTaskUpdate={(updatedTask: any) => {
              if (projectData && projectData.tasks) {
                setProjectData({
                  ...projectData,
                  tasks: projectData.tasks.map((t: any) => t.id === updatedTask.id ? updatedTask : t)
                });
              }
            }}
          />
          
        </section>
      </div>
    </>
  );
}
