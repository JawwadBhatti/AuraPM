import { AlertCircle, Activity, CheckCircle2, TrendingUp } from "lucide-react";

export default function DashboardCards({ analytics }: { analytics: any }) {
  
  // Dynamic stats defaulting back to 0 if no analytics returned
  const delayed = analytics ? analytics.delayed_tasks : 0;
  const healthScore = analytics ? analytics.health_score : 100;
  const tasksCount = analytics ? analytics.total_tasks : 0;
  const activeProjs = analytics ? analytics.total_projects : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      
      {/* Red Alert Card */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm relative overflow-hidden group hover:border-red-200 transition-colors">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-500"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Delayed Tasks</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{delayed}</h3>
          </div>
          <AlertCircle className="w-4 h-4 text-red-500 opacity-80" />
        </div>
        <div className="mt-2.5 text-[9px] text-red-600 font-semibold bg-red-50 border border-red-100 inline-block px-1.5 py-0.5 rounded">
          {delayed > 0 ? "Requires urgent attention" : "All Projects on Track"}
        </div>
      </div>

      {/* Yellow/Health Alert Card */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-colors">
        <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Overall Health</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{healthScore}%</h3>
          </div>
          <Activity className={`w-4 h-4 ${healthScore >= 80 ? 'text-emerald-500' : healthScore >= 50 ? 'text-amber-500' : 'text-red-500'} opacity-80`} />
        </div>
        <div className={`mt-2.5 text-[9px] font-semibold inline-block px-1.5 py-0.5 rounded border ${healthScore >= 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : healthScore >= 50 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {healthScore >= 80 ? "Healthy Timeline" : healthScore >= 50 ? "At Risk" : "Critical Condition"}
        </div>
      </div>

      {/* Blue Alert Card */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-colors">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Active Projects</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{activeProjs}</h3>
          </div>
          <TrendingUp className="w-4 h-4 text-blue-500 opacity-80" />
        </div>
        <div className="mt-2.5 text-[9px] text-blue-600 font-semibold bg-blue-50 border border-blue-100 inline-block px-1.5 py-0.5 rounded">
          {activeProjs > 0 ? "Managing portfolio" : "No ongoing activity"}
        </div>
      </div>

      {/* Purple Focus Card */}
      <div className="bg-white border border-slate-200 rounded-md p-3 shadow-sm relative overflow-hidden group hover:border-fuchsia-200 transition-colors">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-fuchsia-500"></div>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Tasks</p>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{tasksCount}</h3>
          </div>
          <CheckCircle2 className="w-4 h-4 text-fuchsia-500 opacity-80" />
        </div>
        <div className="mt-2.5 text-[9px] text-fuchsia-600 font-semibold bg-fuchsia-50 border border-fuchsia-100 inline-block px-1.5 py-0.5 rounded">
          {tasksCount > 0 ? "Aggregated view" : "Upload to calculate"}
        </div>
      </div>

    </div>
  );
}
