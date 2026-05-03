
import React, { useState, useRef } from 'react';
import { ImageEnhancerSettings, BulkItem } from '../types';
import { enhanceImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  Layers, Sliders, CheckCircle, Wand2, ShieldCheck, 
  Trash2, FileImage, Zap
} from 'lucide-react';
import JSZip from 'jszip';

interface ImageEnhancerProps {
  onBack: () => void;
}

export const ImageEnhancer: React.FC<ImageEnhancerProps> = ({ onBack }) => {
  const [isBulk, setIsBulk] = useState(false);
  const [settings, setSettings] = useState<ImageEnhancerSettings>({
    strength: 75,
    faceRestoration: true,
    denoise: true,
    colorCorrection: true
  });
  
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const limit = isBulk ? 20 : 1;
    const newFiles = Array.from(files).slice(0, limit);
    
    // Fix: Explicitly type 'file' as 'File' to ensure it's recognized as a Blob for readAsDataURL and has property 'name'
    newFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: BulkItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          originalUrl: reader.result as string,
          fileName: file.name,
          status: 'idle'
        };
        setBulkItems(prev => isBulk ? [...prev, newItem] : [newItem]);
      };
      reader.readAsDataURL(file);
    });
  };

  const processQueue = async () => {
    if (bulkItems.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    let totalCost = 0;

    for (const item of bulkItems) {
      if (item.status === 'done') continue;
      
      setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
      
      try {
        const result = await enhanceImage(item.originalUrl, settings);
        if (result) {
          setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, resultUrl: result, status: 'done' } : i));
          totalCost += 5;
        } else {
          throw new Error();
        }
      } catch (e: any) {
        console.error("Failed to enhance image:", e);
        if (isRateLimitError(e)) {
          alert(RATE_LIMIT_MESSAGE);
          setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
          break; // Stop processing if rate limited
        } else {
          setBulkItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
        }
      }
    }
    
    setCreditsUsed(prev => prev + totalCost);
    setIsProcessing(false);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    bulkItems.filter(i => i.resultUrl).forEach(item => {
      const base64Data = item.resultUrl!.split(',')[1];
      zip.file(`enhanced-${item.fileName}`, base64Data, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `enhanced-images-${Date.now()}.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic uppercase flex items-center">
              AI IMAGE ENHANCER <Sparkles size={16} className="ml-2 text-blue-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Restorative Processing</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-blue-600/10 rounded-full text-[10px] font-black text-blue-400 border border-blue-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={processQueue}
            disabled={isProcessing || bulkItems.length === 0}
            className="flex items-center space-x-2 px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>{bulkItems.some(i => i.status === 'done') ? 'Reprocess All' : 'Start Enhancement'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="lg:w-[400px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Upload Mode</h2>
              <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5">
                <button 
                  onClick={() => { setIsBulk(false); setBulkItems([]); }}
                  className={`px-3 py-1.5 rounded text-[10px] font-black transition-all ${!isBulk ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >SINGLE</button>
                <button 
                  onClick={() => { setIsBulk(true); setBulkItems([]); }}
                  className={`px-3 py-1.5 rounded text-[10px] font-black transition-all ${isBulk ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >BULK (20)</button>
              </div>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[16/10] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-slate-900/50 transition-all group"
            >
              <Upload size={32} className="text-slate-700 group-hover:text-blue-500 mb-2" />
              <p className="text-[10px] font-black uppercase text-slate-500">Drag & Drop Photos</p>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple={isBulk} onChange={handleFileUpload} />
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">2. Parameters</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enhancement Strength</label>
                  <span className="text-xs font-black text-blue-500">{settings.strength}%</span>
                </div>
                <input 
                  type="range" min="1" max="100" 
                  className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-600"
                  value={settings.strength}
                  onChange={(e) => setSettings({...settings, strength: parseInt(e.target.value)})}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: 'faceRestoration' as const, label: 'Face Restoration', icon: ShieldCheck },
                  { key: 'denoise' as const, label: 'Deep Denoising', icon: Zap },
                  { key: 'colorCorrection' as const, label: 'Vibrant Color', icon: Sliders },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800 cursor-pointer group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center space-x-3">
                      <item.icon size={16} className="text-blue-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{item.label}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0"
                      checked={settings[item.key]}
                      onChange={(e) => setSettings({...settings, [item.key]: e.target.checked})}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>

          <div className="p-4 bg-blue-950/20 rounded-2xl border border-blue-900/30 flex items-start space-x-3">
            <FileImage size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
              Gemini Restorative Pass: AI analyzes visual noise, poor exposure, and lens blur to rebuild pixel clarity.
            </p>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-6xl mx-auto w-full space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">Processing Queue ({bulkItems.length})</h2>
              {bulkItems.some(i => i.status === 'done') && (
                <button 
                  onClick={handleDownloadAll}
                  className="flex items-center space-x-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Download size={14} />
                  <span>Download All (ZIP)</span>
                </button>
              )}
            </div>

            {bulkItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bulkItems.map((item) => (
                  <div key={item.id} className="bg-slate-900/50 rounded-[2rem] border border-white/5 overflow-hidden flex flex-col group relative">
                    <div className="aspect-[4/3] bg-slate-950 relative">
                      <img src={item.resultUrl || item.originalUrl} className={`w-full h-full object-cover ${item.status === 'processing' ? 'opacity-30 blur-sm' : ''}`} alt="Preview" />
                      
                      {item.status === 'processing' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <RefreshCw className="animate-spin text-blue-500" size={32} />
                        </div>
                      )}
                      
                      {item.status === 'done' && (
                        <div className="absolute top-4 right-4 bg-green-500 p-1.5 rounded-full shadow-lg">
                          <CheckCircle size={14} className="text-white" />
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                         <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black uppercase text-white/80 border border-white/10 truncate max-w-[150px]">
                           {item.fileName}
                         </span>
                         {item.status === 'done' && (
                           <button 
                             onClick={() => {
                               const link = document.createElement('a');
                               link.href = item.resultUrl!;
                               link.download = `enhanced-${item.fileName}`;
                               link.click();
                             }}
                             className="p-2 bg-white text-slate-900 rounded-lg hover:scale-110 transition-transform shadow-xl"
                           >
                             <Download size={14} />
                           </button>
                         )}
                      </div>
                    </div>
                    {item.status === 'idle' && (
                       <div className="p-4 flex justify-between items-center bg-slate-950/50">
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Awaiting Process</span>
                          <button onClick={() => setBulkItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500/50 hover:text-red-500">
                             <Trash2 size={14} />
                          </button>
                       </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center text-center space-y-6 bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-[3rem] p-12">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center shadow-2xl">
                  <FileImage size={40} className="text-slate-800" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic uppercase">No Photos Queued</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-sm leading-relaxed">Upload up to 20 images for rapid bulk enhancement. Each photo will be analyzed for visual artifacts.</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
