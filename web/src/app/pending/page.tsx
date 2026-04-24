"use client";

import { useEffect, useState } from "react";
import { UserX, Clock, ChevronRight, Fingerprint, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PendingActionsPage() {
  const [bottlenecks, setBottlenecks] = useState<Record<string, {total_delay: number, tasks: any[]}>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/analytics/pending`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBottlenecks(data.pending_actions);
        }
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-[80vh] justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  const sortedPersons = Object.keys(bottlenecks).sort((a, b) => bottlenecks[b].total_delay - bottlenecks[a].total_delay);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
             <Fingerprint className="text-indigo-600 w-5 h-5" />
             Stakeholder Accountability
          </h1>
          <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
            Live tracker of pending actions grouped by responsibility.
          </p>
        </div>
      </header>
      
      {sortedPersons.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-8 text-center shadow-sm">
           <UserX className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
           <h2 className="text-lg font-bold text-emerald-800">Clear Operations</h2>
           <p className="text-[11px] text-emerald-600 mt-1">There are currently no delayed tasks waiting on individual stakeholders.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPersons.map(person => (
             <div key={person} className="bg-white rounded-md shadow-sm border border-rose-200 overflow-hidden group hover:border-rose-300 transition-all flex flex-col">
                <div className="bg-gradient-to-r from-rose-50 to-white p-3 border-b border-rose-100 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm rounded-full">
                         {person[0]}
                      </div>
                      <div>
                         <h3 className="text-sm font-bold text-slate-800">{person}</h3>
                         <p className="text-[9px] font-semibold text-rose-600 uppercase tracking-widest">{bottlenecks[person].tasks.length} Pending Actions</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-black text-rose-500 leading-tight">{bottlenecks[person].total_delay}</p>
                      <p className="text-[8px] uppercase text-rose-400 font-bold tracking-wider">Days Stalled</p>
                   </div>
                </div>
                <div className="p-0 flex-1 overflow-y-auto max-h-48">
                  {bottlenecks[person].tasks.map((task, idx) => (
                    <div key={idx} className="p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors flex justify-between items-center">
                       <div className="truncate pr-2">
                         <p className="text-[11px] font-semibold text-slate-700 truncate">{task.task_name}</p>
                         <p className="text-[9px] text-slate-400 truncate">{task.project_name}</p>
                       </div>
                       <div className="flex items-center shrink-0">
                          <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] px-1.5 py-0.5 flex items-center gap-1 rounded font-medium">
                            <Clock className="w-3 h-3" /> {task.delay_days}d
                          </span>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
