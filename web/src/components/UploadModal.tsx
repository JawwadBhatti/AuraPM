import { useState, useRef } from 'react';
import { X, UploadCloud, Loader2, Link as LinkIcon } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (sheetUrl.trim() !== '') {
      formData.append('target_sheet_url', sheetUrl);
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/proposals/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      const result = await response.json();
      
      if (result.success) {
        onUploadSuccess(result.data);
        if (sheetUrl.trim() !== '') {
          alert("Sheet Sync Code said: " + result.syncStatus);
        }
      } else {
        alert("Upload failed: " + result.error);
      }
    } catch (err) {
      alert("Error connecting to backend server.");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative border border-slate-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-bold text-slate-800 mb-1">Upload Proposal</h2>
        <p className="text-xs text-slate-500 mb-5">AI will extract scope and deadlines automatically.</p>
        
        <div className="mb-5">
           <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">Sync to Google Sheet (Optional)</label>
           <div className="relative">
             <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
             <input 
                type="text" 
                placeholder="Paste Blank Google Sheet URL here..."
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
           <p className="text-[10px] text-slate-400 mt-1">If provided, AI will dump data to this link via Master Gateway.</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-100 bg-blue-50/50 rounded-lg">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm font-semibold text-blue-700">AI is Analyzing Proposal...</p>
            {sheetUrl && <p className="text-[10px] text-blue-500 mt-1 font-medium">Syncing with Google Sheets...</p>}
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors rounded-lg cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-8 h-8 text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700">Select PDF Proposal to process</p>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept=".pdf"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
