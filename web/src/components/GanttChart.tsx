"use client";
import React, { useState } from 'react';
import EditTaskModal from './EditTaskModal';
import { AlertCircle, Edit2 } from 'lucide-react';

interface GanttChartProps {
  data: any;
  onTaskUpdate?: (task: any) => void;
}

const computeCriticalPath = (tasks: any[]) => {
  if (!tasks || tasks.length === 0) return new Set<string>();
  
  const nameToId: Record<string, string> = {};
  const tasksMap: Record<string, any> = {};
  
  tasks.forEach(t => {
    if (t.type !== 'project') {
      nameToId[t.text.trim().toLowerCase()] = t.id;
      tasksMap[t.id] = t;
    }
  });

  const graph: Record<string, string[]> = {};
  const predecessors: Record<string, string[]> = {};
  
  Object.keys(tasksMap).forEach(id => {
    graph[id] = [];
    predecessors[id] = [];
  });

  tasks.forEach(t => {
    if (t.type === 'project') return;
    if (t.pre_requisites) {
      const reqNames = t.pre_requisites.split(',').map((s: string) => s.trim().toLowerCase());
      reqNames.forEach((reqName: string) => {
        const predId = nameToId[reqName];
        if (predId && predId !== t.id) {
          graph[predId].push(t.id);
          predecessors[t.id].push(predId);
        }
      });
    }
  });

  const es: Record<string, number> = {};
  const ef: Record<string, number> = {};
  const inDegree: Record<string, number> = {};
  
  Object.keys(tasksMap).forEach(id => {
    inDegree[id] = predecessors[id].length;
  });
  
  const queue: string[] = [];
  Object.keys(tasksMap).forEach(id => {
    if (inDegree[id] === 0) {
      queue.push(id);
      es[id] = 0;
      ef[id] = Number(tasksMap[id].duration) || 0;
    }
  });

  const topoOrder: string[] = [];
  
  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);
    
    graph[u].forEach(v => {
      inDegree[v]--;
      const predEf = ef[u];
      if (es[v] === undefined || predEf > es[v]) {
        es[v] = predEf;
        ef[v] = es[v] + (Number(tasksMap[v].duration) || 0);
      }
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    });
  }

  const ls: Record<string, number> = {};
  const lf: Record<string, number> = {};
  
  let maxEf = 0;
  Object.values(ef).forEach(val => {
    if (val > maxEf) maxEf = val;
  });

  Object.keys(tasksMap).forEach(id => {
    if (graph[id].length === 0) {
      lf[id] = maxEf;
      ls[id] = lf[id] - (Number(tasksMap[id].duration) || 0);
    }
  });

  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const u = topoOrder[i];
    if (graph[u].length > 0) {
      let minSuccLs = Infinity;
      graph[u].forEach(v => {
        if (ls[v] < minSuccLs) {
          minSuccLs = ls[v];
        }
      });
      lf[u] = minSuccLs;
      ls[u] = lf[u] - (Number(tasksMap[u].duration) || 0);
    }
  }

  const criticalPath = new Set<string>();
  Object.keys(tasksMap).forEach(id => {
    if (es[id] === ls[id]) {
      criticalPath.add(id);
    }
  });

  return criticalPath;
};

export default function GanttChart({ data, onTaskUpdate }: GanttChartProps) {
  const [editingTask, setEditingTask] = useState<any>(null);

  const criticalTaskIds = React.useMemo(() => {
    return computeCriticalPath(data?.tasks || []);
  }, [data?.tasks]);

  if (!data || !data.tasks || data.tasks.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-md h-[220px] flex gap-1.5 items-center justify-center bg-slate-50 text-slate-400 text-xs flex-col">
        <span className="font-medium">[ Data Empty: Proposal Required ]</span>
        <span className="text-[10px] text-slate-400">Click '+ New Proposal' to generate the Timeline map</span>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white w-full relative">
      <div className="overflow-x-auto w-full">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[280px_100px_100px_1fr] text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
            <div className="p-2.5 border-r border-slate-200">Task Name & Details</div>
            <div className="p-2.5 border-r border-slate-200 text-center">Status</div>
            <div className="p-2.5 border-r border-slate-200 text-center">Department</div>
            <div className="p-2.5 flex items-center justify-between px-4">
              <span>Start Point</span>
              <span>Timeline Flow</span>
              <span>Completion</span>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pb-4">
            {data.tasks.map((task: any, index: number) => {
              const isParent = task.type === "project";
              const isCritical = criticalTaskIds.has(task.id);
              
              let dayOffset = index * 25;
              if (dayOffset > 400) dayOffset = 400;
              
              const delay = task.delay_starts > 0 ? parseInt(task.delay_starts) : 0;
              
              const statusColors: Record<string, string> = {
                "Pending": "bg-slate-100 text-slate-600",
                "Running": "bg-blue-100 text-blue-700",
                "Completed": "bg-green-100 text-green-700"
              };
              
              const sColor = statusColors[task.status] || statusColors["Pending"];

              return (
                <div key={task.id} className={`grid grid-cols-[280px_100px_100px_1fr] text-xs items-center hover:bg-slate-50 group transition-colors ${isCritical && !isParent ? 'bg-red-50/20' : ''}`}>
                  <div className={`p-2 border-r border-slate-200 ${isParent ? 'font-bold text-slate-800 bg-slate-50/50' : 'text-slate-600 pl-4'} flex flex-col justify-center relative overflow-hidden`}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 min-w-0 pr-2 flex items-center gap-2">
                         <span className="truncate">{task.text}</span>
                         {delay > 0 && (
                            <div 
                              title={`Delay: ${delay} days${task.delay_reason ? ` (${task.delay_reason})` : ''}`}
                              className="flex items-center justify-center shrink-0 w-4 h-4 rounded-full bg-orange-100 text-orange-600 border border-orange-200 cursor-help"
                            >
                               <AlertCircle className="w-3 h-3" />
                            </div>
                         )}
                         {isCritical && !isParent && (
                            <span 
                              title="Critical Path: Delaying this task will delay the entire project" 
                              className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider shadow-sm flex items-center shrink-0"
                            >
                              ⚡ Critical
                            </span>
                         )}
                      </div>
                      {/* Hover Edit Action */}
                      <button 
                        onClick={() => setEditingTask(task)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-all shrink-0 bg-white shadow-sm border border-slate-200"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                    {task.pre_requisites && !isParent && (
                      <div className="mt-1 flex">
                         <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-medium bg-rose-50 text-rose-600 border border-rose-100 truncate max-w-full">
                           Requires: {task.pre_requisites}
                         </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div className="p-2 border-r border-slate-200 flex justify-center items-center">
                    {!isParent && <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${sColor}`}>
                      {task.status || "Pending"}
                    </span>}
                  </div>
                  
                  {/* Department */}
                  <div className="p-2 border-r border-slate-200 text-center text-slate-500 font-medium truncate px-2">
                     {!isParent && (task.department || '-')}
                  </div>

                  {/* Timeline */}
                  <div className="p-2.5 relative flex items-center h-full w-full border-l border-slate-100/50">
                    <div 
                      className={`h-3 rounded-full ${isParent ? 'bg-indigo-600' : isCritical ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-blue-400/80'} shadow-sm transition-all relative group/bar`}
                      style={{ 
                        width: `${Math.max(task.duration * 15, 30)}px`,
                        marginLeft: `${dayOffset}px` 
                      }}
                    >
                      {/* Tooltip for duration */}
                      <div className="absolute opacity-0 group-hover/bar:opacity-100 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded whitespace-nowrap pointer-events-none transition-opacity z-10 hidden group-hover/bar:block z-50">
                        {task.duration} Days
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {editingTask && (
        <EditTaskModal 
          task={editingTask} 
          onClose={() => setEditingTask(null)}
          onSave={(updatedTask) => {
            if(onTaskUpdate) onTaskUpdate(updatedTask);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

