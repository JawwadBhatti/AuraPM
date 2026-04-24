"use client";
import React, { useState } from 'react';
import { X, Save, Clock, Loader2 } from 'lucide-react';

interface EditTaskModalProps {
  task: any;
  onClose: () => void;
  onSave: (updatedTask: any) => void;
}

export default function EditTaskModal({ task, onClose, onSave }: EditTaskModalProps) {
  const [department, setDepartment] = useState(task.department || '');
  const [wbsStructure, setWbsStructure] = useState(task.wbs_structure || '');
  const [scope, setScope] = useState(task.scope || '');
  const [status, setStatus] = useState(task.status || 'Pending');
  const [delayStarts, setDelayStarts] = useState(task.delay_starts?.toString() || '0');
  const [delayReason, setDelayReason] = useState(task.delay_reason || 'Client Delay');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      department,
      wbs_structure: wbsStructure,
      scope,
      status,
      delay_starts: parseInt(delayStarts) || 0,
      delay_reason: (parseInt(delayStarts) || 0) > 0 ? delayReason : null
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        onSave({ ...task, ...payload });
      } else {
        alert("Failed to update task");
      }
    } catch (err) {
      alert("Error updating task: " + err);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Edit Task Form</h2>
              <p className="text-xs text-slate-500">{task.text}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Department</label>
              <input 
                type="text" 
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. IT, Operations"
                className="px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">WBS Structure</label>
              <input 
                type="text" 
                value={wbsStructure}
                onChange={(e) => setWbsStructure(e.target.value)}
                placeholder="e.g. 1.1.2"
                className="px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Scope</label>
            <textarea 
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Brief description of the scope"
              rows={2}
              className="px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all cursor-pointer"
              >
                <option value="Pending">Pending</option>
                <option value="Running">Running</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex gap-2 items-center text-sm font-semibold text-orange-600">
                Delay Starts (Days)
              </label>
              <input 
                type="number" 
                value={delayStarts}
                onChange={(e) => setDelayStarts(e.target.value)}
                min="0"
                className="px-3 py-2 border border-orange-200 rounded-md text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-orange-50/30 focus:bg-white transition-all"
              />
            </div>
            {(parseInt(delayStarts) || 0) > 0 && (
              <div className="flex flex-col gap-1.5 col-span-2 mt-2">
                <label className="text-sm font-semibold text-orange-700">Delay Reason</label>
                <select 
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="px-3 py-2 border border-orange-200 rounded-md text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-orange-50/30 focus:bg-white transition-all cursor-pointer text-orange-800"
                >
                  <option value="Client Delay">Client Delay</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Resource Shortage">Resource Shortage</option>
                  <option value="Third-Party Blocked">Third-Party Blocked</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3 mt-4 border-t border-slate-100 pt-5">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
