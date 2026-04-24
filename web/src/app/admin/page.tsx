"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, TrendingUp, Users, AlertOctagon } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isAdmin = localStorage.getItem("is_admin");

    if (!token || isAdmin !== "1") {
      router.push("/");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/managers`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setManagers(data.managers);
        } else {
          setError(data.detail || "Failed to load managers.");
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

  // Calculate aggregates
  const totalManagers = managers.length;
  const totalProjects = managers.reduce((acc, m) => acc + m.total_projects, 0);
  const totalDelays = managers.reduce((acc, m) => acc + m.delayed_tasks, 0);

  return (
    <div className="p-8 max-w-7xl w-full mx-auto">
      <header className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12 bg-amber-100 rounded-lg flex justify-center items-center">
          <ShieldCheck className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Super Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Cross-tenant Project Manager Overview</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Managers</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalManagers}</h3>
          </div>
          <Users className="w-8 h-8 text-blue-500 opacity-80" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Globally Active Projects</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalProjects}</h3>
          </div>
          <TrendingUp className="w-8 h-8 text-emerald-500 opacity-80" />
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Global Delayed Tasks</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalDelays}</h3>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500 opacity-80" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-base font-bold text-slate-800">Manager Performance Leaderboard</h2>
        </div>
        
        {managers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No project managers registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Department / Desig.</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4 text-center">Active Projects</th>
                  <th className="px-6 py-4 text-center">Delayed Tasks</th>
                  <th className="px-6 py-4 text-right">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.map(mgr => {
                  const isCritical = mgr.delayed_tasks > 5;
                  return (
                    <tr key={mgr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800 text-sm">{mgr.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">@{mgr.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700">{mgr.department}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{mgr.designation}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-700">{mgr.email}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{mgr.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                          {mgr.total_projects}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${mgr.delayed_tasks > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                          {mgr.delayed_tasks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCritical ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-1 rounded">Critical</span>
                        ) : mgr.delayed_tasks > 0 ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-1 rounded">Attention</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Excellent</span>
                        )}
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
