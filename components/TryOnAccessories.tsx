
import React, { useState, useRef } from 'react';
import { TryOnAccessoriesSettings, AccessoryType } from '../types';
import { tryOnAccessories } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  User, Watch, Info, CheckCircle, Wand2, ShieldCheck, Plus, Layers
} from 'lucide-react';

interface TryOnAccessoriesProps {
  onBack: () => void;
}

export const TryOnAccessories: React.FC<TryOnAccessoriesProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<TryOnAccessoriesSettings>({
    accessoryType: 'Eyewear',
    placementNote: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const personInputRef = useRef<HTMLInputElement>(null);
  const accessoryInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'personImage' | 'accessoryImage') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, [field]: reader.result as string }));
        setResultUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!settings.personImage || !settings.accessoryImage) {
      alert("Please upload both a person image and an accessory image.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await tryOnAccessories(settings);
      if (result) {
        setResultUrl(result);
        setCreditsUsed(prev => prev + 20);
      }
    } catch (e: any) {
      console.error("Failed to process accessory overlay:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to process accessory overlay.");
      }
    } finally {
      setIsGenerating(false);
    }
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
              ACCESSORIES TRY-ON <Watch size={16} className="ml-2 text-cyan-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Premium Adornment Suite</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-cyan-600/10 rounded-full text-[10px] font-black text-cyan-400 border border-cyan-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !settings.personImage || !settings.accessoryImage}
            className="flex items-center space-x-2 px-8 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>{resultUrl ? 'New Shoot' : 'Overlay AI'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="lg:w-[450px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            <section className="space-y-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Media Source</h2>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => personInputRef.current?.click()}
                  className={`aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    settings.personImage ? 'border-cyan-500/50 bg-slate-900' : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/50'
                  }`}
                >
                   {settings.personImage ? (
                     <img src={settings.personImage} className="w-full h-full object-cover rounded-3xl" />
                   ) : (
                     <>
                        <User size={24} className="text-slate-700 mb-2" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Person Photo</span>
                     </>
                   )}
                </div>
                <div 
                  onClick={() => accessoryInputRef.current?.click()}
                  className={`aspect-square border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                    settings.accessoryImage ? 'border-cyan-500/50 bg-slate-900' : 'border-slate-800 hover:border-cyan-500/50 bg-slate-900/50'
                  }`}
                >
                   {settings.accessoryImage ? (
                     <img src={settings.accessoryImage} className="w-full h-full object-contain p-6" />
                   ) : (
                     <>
                        <Plus size={24} className="text-slate-700 mb-2" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">Accessory</span>
                     </>
                   )}
                </div>
              </div>
              <input ref={personInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'personImage')} />
              <input ref={accessoryInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'accessoryImage')} />
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">2. Overlay Logic</h2>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Category</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-cyan-600"
                  value={settings.accessoryType}
                  onChange={(e) => setSettings({...settings, accessoryType: e.target.value as AccessoryType})}
                >
                  <option value="Eyewear">Eyewear / Glasses</option>
                  <option value="Headwear">Headwear / Hats</option>
                  <option value="Handbags">Handbags / Bags</option>
                  <option value="Jewelry">Jewelry / Watches</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Placement Notes</label>
                <input 
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-cyan-600 outline-none text-slate-300 uppercase tracking-tighter"
                  placeholder="e.g. 'Over the right shoulder' or 'Behind hair strands'"
                  value={settings.placementNote}
                  onChange={(e) => setSettings({...settings, placementNote: e.target.value})}
                />
              </div>
            </section>

            <div className="p-4 bg-cyan-950/20 rounded-2xl border border-cyan-900/30 flex items-start space-x-3">
              <Layers size={16} className="text-cyan-500 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                Layering Engine: AI handles occlusions (like hair covering glasses) and realistic perspective scaling.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:40px_40px]"></div>
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center">
            {resultUrl ? (
              <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className={`relative bg-slate-900 rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden group aspect-square max-w-[600px]`}>
                  <img src={resultUrl} className="w-full h-full object-contain bg-black" alt="Accessory Result" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-12">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultUrl;
                        link.download = `accessory-tryon-${Date.now()}.png`;
                        link.click();
                      }}
                      className="flex items-center space-x-3 px-10 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95"
                    >
                      <Download size={18} />
                      <span>Download Render</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl aspect-video bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 space-y-8">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl border border-white/5">
                    <Watch size={40} className="text-slate-800" />
                 </div>
                 <div className="space-y-3">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Adornment Visualization</h2>
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-md mx-auto leading-relaxed">Virtually layer bags, jewelry, or eyewear with complex occlusion support and perspective correction.</p>
                 </div>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                 <div className="relative">
                    <div className="w-24 h-24 border-4 border-cyan-500/10 rounded-full"></div>
                    <div className="absolute inset-0 w-24 h-24 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-cyan-500 animate-pulse" size={32} />
                 </div>
                 <p className="mt-8 text-xs font-black uppercase tracking-[0.5em] text-cyan-500 animate-pulse">Calculating Perspective...</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
