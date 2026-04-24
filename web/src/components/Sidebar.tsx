"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Copyleft, LayoutDashboard, FolderKanban, AlertTriangle, Settings, Bell, LogOut, User, ShieldAlert, Fingerprint, MessageSquare, Activity } from "lucide-react";

export default function Sidebar() {
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifs = () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/notifications`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if(data.success) {
           setNotifications(data.notifications);
        }
      });
  };

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
    setIsAdmin(localStorage.getItem("is_admin") === "1");
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  const markRead = () => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/notifications/read`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    }).then(() => {
      setNotifications(notifications.map(n => ({...n, is_read: 1})));
    });
  };

  const toggleNotifs = () => {
     setShowNotifs(!showNotifs);
     if(!showNotifs && unreadCount > 0) {
        markRead();
     }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };
  return (
    <aside className="w-48 border-r border-slate-200 bg-white h-screen flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-transparent flex justify-center items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-800">
            Aura<span className="text-blue-600">PM</span>
          </span>
        </div>
      </div>
      <div className="flex-1 py-2 px-2.5">
        <div className="space-y-0.5">
          <Link href="/" className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-blue-50/70 text-blue-700 text-[11px] font-semibold transition-colors">
            <LayoutDashboard className="w-3 h-3" />
            Dashboard
          </Link>
          <Link href="/projects" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <FolderKanban className="w-3 h-3" />
            Projects
          </Link>
          <Link href="/risks" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <AlertTriangle className="w-3 h-3" />
            Risks & Delays
          </Link>
          <Link href="/pending" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <Fingerprint className="w-3 h-3" />
            Pending Actions
          </Link>
          <Link href="/chat" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-600 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <MessageSquare className="w-3 h-3" />
            AI Chat
          </Link>
        </div>
      </div>
      <div className="p-2.5 border-t border-transparent">
        <div className="space-y-0.5">
          {isAdmin && (
            <Link href="/admin" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-amber-600 bg-amber-50 hover:bg-amber-100 text-[11px] font-bold transition-colors shadow-sm mb-2">
              <ShieldAlert className="w-3 h-3" />
              Super Admin Area
            </Link>
          )}

          <button onClick={toggleNotifs} className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="w-3 h-3" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
              </div>
              Notifications
            </div>
            {unreadCount > 0 && <span className="bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold text-[9px]">{unreadCount}</span>}
          </button>
          
          {showNotifs && (
            <div className="mx-2 mt-1 bg-slate-50 border border-slate-200 rounded-md overflow-y-auto max-h-48 shadow-inner">
               {notifications.length === 0 ? (
                 <p className="text-[10px] text-slate-400 text-center py-4">You're all caught up!</p>
               ) : (
                 notifications.map(n => (
                   <div key={n.id} className={`text-[10px] p-2.5 border-b border-slate-200 last:border-0 ${n.is_read === 0 ? 'bg-white font-bold text-slate-800' : 'text-slate-500'}`}>
                     {n.message}
                     <div className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest">{new Date(n.created_at).toLocaleTimeString()}</div>
                   </div>
                 ))
               )}
            </div>
          )}
          <Link href="/settings" className="flex items-center gap-2 px-2.5 py-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-[11px] font-medium transition-colors">
            <Settings className="w-3 h-3" />
            Settings
          </Link>
          <div className="pt-2 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-600 font-semibold text-[11px] truncate">
              <User className="w-3 h-3 text-blue-500" />
              {username || "Guest"}
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 text-[11px] font-medium transition-colors mt-1">
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
