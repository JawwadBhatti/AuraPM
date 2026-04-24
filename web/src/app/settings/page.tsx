"use client";

import { useEffect, useState } from "react";
import { User, Mail, Briefcase, Phone, BookOpen, Save, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "",
    department: "",
    designation: "",
    email: "",
    phone_number: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setProfile(data.user);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const token = localStorage.getItem("token");
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/update_profile`, {
        method: "POST",
        headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: "Profile updated successfully!", type: "success" });
      } else {
        setMessage({ text: data.detail || "Update failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] justify-center items-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile and personal preferences.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex justify-center items-center font-bold text-2xl uppercase">
             {profile.name ? profile.name[0] : "U"}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">{profile.name || "Your Name"}</h2>
            <p className="text-sm text-slate-500">{profile.designation || "Project Manager"}</p>
          </div>
        </div>
        
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {message && (
             <div className={`p-3 rounded-md text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
               {message.text}
             </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"><User className="inline w-3.5 h-3.5 mr-1"/> Full Name</label>
              <input type="text" name="name" value={profile.name} onChange={handleChange} className="w-full border border-slate-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"><Mail className="inline w-3.5 h-3.5 mr-1"/> Email Address</label>
              <input type="email" name="email" value={profile.email} onChange={handleChange} className="w-full border border-slate-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"><Briefcase className="inline w-3.5 h-3.5 mr-1"/> Department</label>
              <input type="text" name="department" value={profile.department} onChange={handleChange} className="w-full border border-slate-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"><BookOpen className="inline w-3.5 h-3.5 mr-1"/> Designation</label>
              <input type="text" name="designation" value={profile.designation} onChange={handleChange} className="w-full border border-slate-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2"><Phone className="inline w-3.5 h-3.5 mr-1"/> Phone Number</label>
              <input type="text" name="phone_number" value={profile.phone_number} onChange={handleChange} className="w-full border border-slate-300 rounded-md p-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md transition-colors flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
