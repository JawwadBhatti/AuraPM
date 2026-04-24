"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RisksDashboard() {
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/analytics/risks`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRisks(data.risks);
        } else {
          setError(data.detail || "Failed to load risks.");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError("Network error.");
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="p-8 w-full h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const criticalRisks = risks.filter(r => r.delay_starts > 5);
  const attentionRisks = risks.filter(r => r.delay_starts > 0 && r.delay_starts <= 5);

  return (
    <div className="p-4 md:p-6 max-w-7xl w-full mx-auto">
      <header className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-md flex justify-center items-center">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Risks & Delays Hub</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Centralized crisis management across all your projects.</p>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border hover:border-red-300 border-red-200 rounded-md p-4 shadow-sm transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <AlertTriangle className="w-12 h-12 text-red-600" />
          </div>
          <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Critical Backlog (&gt; 5 Days)</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{criticalRisks.length} <span className="text-xs font-normal text-slate-500">Tasks</span></h3>
        </div>
        
        <div className="bg-white border hover:border-amber-300 border-amber-200 rounded-md p-4 shadow-sm transition-colors relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
             <AlertTriangle className="w-12 h-12 text-amber-600" />
          </div>
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Needs Attention (1 - 5 Days)</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{attentionRisks.length} <span className="text-xs font-normal text-slate-500">Tasks</span></h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800">Aggregated Delayed Tasks List</h2>
          <div className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold">Total: {risks.length}</div>
        </div>
        
        {risks.length === 0 ? (
          <div className="p-12 pl-12 flex flex-col items-center border border-dashed m-6 rounded border-slate-300 text-center">
             <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                 <AlertTriangle className="w-8 h-8 text-emerald-500" />
             </div>
             <h3 className="text-lg font-bold text-slate-800">All Tracked!</h3>
             <p className="text-slate-500 mt-2 max-w-sm">You currently have no delayed tasks across any of your projects. Excellent work!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-4 py-3">Task Information</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Department / WBS</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Delay Span</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {risks.map((risk, index) => {
                  const isCritical = risk.delay_starts > 5;
                  return (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-[11px] max-w-xs truncate" title={risk.task_name}>{risk.task_name}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-medium text-blue-600 truncate max-w-[150px]">
                         {risk.project_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[11px] text-slate-700">{risk.department}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[120px]" title={risk.wbs_structure}>{risk.wbs_structure}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                          {risk.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                         <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isCritical ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {risk.delay_starts} Days
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <Link href={`/projects/${risk.project_id}`} className="inline-flex items-center justify-center p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors">
                            <ArrowRight className="w-4 h-4" />
                         </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
