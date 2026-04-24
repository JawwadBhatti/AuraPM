"use client";

import { useEffect, useState } from "react";
import { FolderGit2, Loader2, Calendar, FileSpreadsheet, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ProjectsList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        if (data.success) {
          setProjects(data.projects);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Project Directory</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">View database history and sync timelines.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-md p-8 text-center flex flex-col items-center">
          <FolderGit2 className="w-10 h-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-medium text-slate-700">No Projects Found</h3>
          <p className="text-[11px] text-slate-500 mt-1">Upload a new proposal on the Dashboard to populate the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.map((proj) => (
            <Link key={proj.id} href={`/projects/${proj.id}`}>
              <div className="border border-slate-200 bg-white rounded-md shadow-sm hover:shadow transition-all p-4 cursor-pointer flex flex-col h-full hover:border-blue-300 group">
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-blue-50 p-2 rounded-md text-blue-600">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                    PRJ-{proj.id}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-sm mb-1 truncate">{proj.name || "Untitled Proposal"}</h3>
                
                <div className="flex-grow space-y-2 mt-1">
                  <div className="flex items-center text-[10px] text-slate-500">
                    <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                    {new Date(proj.created_at).toLocaleDateString()}
                  </div>
                  {proj.target_sheet_url && (
                    <div className="flex items-center text-[10px] text-slate-500 truncate">
                      <FileSpreadsheet className="w-3 h-3 mr-1.5 text-green-500" />
                      <span className="truncate">Google Sheet Linked</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-blue-600 font-bold text-[11px]">
                  View Timeline
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
