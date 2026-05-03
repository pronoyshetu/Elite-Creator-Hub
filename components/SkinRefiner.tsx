
import React, { useState, useRef } from 'react';
import { SkinRefinerSettings, SkinRefinerMode, EnhancementType, OutputQualityLevel } from '../types';
import { refineSkinTexture } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
// Added List to the lucide-react imports below to fix the error on line 347
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  User, ShieldCheck, Wand2, Box, Info, CheckCircle,
  Eye, Zap, Camera, Sliders, Contrast, Maximize2, HelpCircle,
  Sun, Moon, Grid, LayoutGrid, ArrowUpRight, List,
  Send
} from 'lucide-react';

interface SkinRefinerProps {
  onBack: () => void;
  onSendToPro: (asset: string) => void;
}

const MODES: { id: SkinRefinerMode; label: string; icon: React.ReactNode }[] = [
  { id: 'Fix Skin', label: 'Fix Skin', icon: <Zap size={14} /> },
  { id: 'Unpolish', label: 'Unpolish', icon: <Maximize2 size={14} /> },
  { id: 'Fix Shine', label: 'Fix Shine', icon: <Sun size={14} /> },
  { id: 'Retouch', label: 'Retouch', icon: <Wand2 size={14} /> }
];

const ENHANCEMENT_TYPES: EnhancementType[] = ['Subtle', 'Realistic', 'Pimple', 'Freckle'];

const LIGHT_PRESETS = [
  { id: 'ethereal', label: 'Ethereal Light', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: 'dramatic', label: 'Dramatic Window Projection', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200' },
  { id: 'blinds', label: 'Blinds Noir Stripes', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200' },
  { id: 'studio', label: 'Cinematic Studio Tri Light', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200' },
  { id: 'gobo', label: 'Gobo Spotlight Drift', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200' },
  { id: 'candle', label: 'Candlelit Chiaroscuro', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200' }
];

export const SkinRefiner: React.FC<SkinRefinerProps> = ({ onBack, onSendToPro }) => {
  const [settings, setSettings] = useState<SkinRefinerSettings>({
    mode: 'Fix Skin',
    enhancementType: 'Realistic',
    outputQuality: '8K ULTRA',
    fixLighting: false,
    lightPreset: 'ethereal'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, sourceImage: reader.result as string }));
        setResultUrl(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!settings.sourceImage) return alert("Please upload a portrait first.");
    setIsGenerating(true);
    try {
      const result = await refineSkinTexture(settings);
      if (result) {
        setResultUrl(result);
      }
    } catch (e: any) {
      console.error("Refining failed:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Refining failed. Ensure the image is a clear portrait.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].pageX : e.pageX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, position)));
  };

  return (
    <div className="h-screen bg-black flex text-white overflow-hidden font-sans">
      {/* Sidebar Controls */}
      <aside className="w-[340px] flex flex-col border-r border-white/5 bg-[#0a0a0a] overflow-y-auto custom-scrollbar shrink-0">
        <header className="p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0a0a0a] z-10">
          <div className="flex items-center space-x-2">
            <button onClick={onBack} className="p-1 hover:bg-white/5 rounded text-gray-400">
              <ChevronLeft size={18} />
            </button>
            <h1 className="text-sm font-bold tracking-tight">Input Image</h1>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-medium">
             <button className="flex items-center hover:text-white"><HelpCircle size={10} className="mr-1"/> Help</button>
             <button className="flex items-center hover:text-white" onClick={() => {setSettings({...settings, sourceImage: undefined}); setResultUrl(null);}}><RefreshCw size={10} className="mr-1"/> Reset</button>
          </div>
        </header>

        <div className="p-4 space-y-6">
          {/* Source Image Slot */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-[4/5] bg-[#141414] rounded-xl overflow-hidden border border-white/5 cursor-pointer group transition-all ${!settings.sourceImage ? 'border-dashed border-gray-700' : ''}`}
          >
            {settings.sourceImage ? (
              <img src={settings.sourceImage} className="w-full h-full object-cover" alt="Input" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Upload size={32} className="mb-2" />
                <span className="text-[10px] font-black uppercase">Upload Photo</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>

          {/* Processing Mode */}
          <div className="space-y-3">
            <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Processing Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map(m => (
                <button 
                  key={m.id}
                  onClick={() => setSettings({...settings, mode: m.id})}
                  className={`flex items-center justify-center space-x-2 h-11 rounded-lg border text-[11px] font-bold transition-all ${settings.mode === m.id ? 'bg-blue-700 border-blue-600 text-white' : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:border-gray-700'}`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Model Version Card */}
          <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                   <div className="p-1.5 bg-gray-800 rounded-lg text-white"><Zap size={14} /></div>
                   <span className="text-xs font-bold">Enhancor V4</span>
                </div>
                <div className="flex space-x-1">
                   <span className="bg-purple-700 text-[8px] font-black px-1.5 py-0.5 rounded leading-none flex items-center">ULTRA</span>
                   <span className="bg-gray-700 text-[8px] font-black px-1.5 py-0.5 rounded leading-none flex items-center">8K</span>
                </div>
             </div>
             <p className="text-[10px] text-gray-500 leading-relaxed">True 8K generation delivering exceptional sharpness and ultra realistic skin texture. Enhances natural detail for the highest visual fidelity.</p>
          </div>

          {/* Output Quality */}
          <div className="space-y-3">
             <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Output Quality</h2>
             <div className="grid grid-cols-2 gap-2 p-1 bg-[#141414] rounded-xl border border-white/5">
                {(['8K ULTRA', '4K FAST'] as OutputQualityLevel[]).map(q => (
                   <button 
                     key={q}
                     onClick={() => setSettings({...settings, outputQuality: q})}
                     className={`py-2 rounded-lg text-[10px] font-black transition-all ${settings.outputQuality === q ? 'bg-blue-700 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                   >
                     {q}
                   </button>
                ))}
             </div>
          </div>

          {/* Enhancement Type */}
          <div className="space-y-3">
             <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Enhancement Type</h2>
             <div className="grid grid-cols-4 gap-1">
                {ENHANCEMENT_TYPES.map(t => (
                   <button 
                     key={t}
                     onClick={() => setSettings({...settings, enhancementType: t})}
                     className={`py-2.5 rounded-lg text-[10px] font-black transition-all border ${settings.enhancementType === t ? 'bg-blue-700 border-blue-600 text-white' : 'bg-[#1a1a1a] border-white/5 text-gray-400 hover:border-gray-700'}`}
                   >
                     {t}
                   </button>
                ))}
             </div>
          </div>

          {/* Fix Lighting Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-white/5">
             <div className="flex items-center space-x-2 text-gray-400">
                <Sun size={12} />
                <span className="text-[11px] font-bold">Fix Lighting</span>
                <HelpCircle size={10} className="text-gray-600" />
             </div>
             <button 
               onClick={() => setSettings({...settings, fixLighting: !settings.fixLighting})}
               className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.fixLighting ? 'bg-blue-600' : 'bg-gray-800'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.fixLighting ? 'translate-x-5' : ''}`} />
             </button>
          </div>

          {/* Light Presets Preview */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Light Presets</h2>
             </div>
             <div className="flex space-x-2 pb-2">
                {LIGHT_PRESETS.slice(0, 3).map(p => (
                  <div key={p.id} className="space-y-1 shrink-0 w-20 cursor-pointer" onClick={() => setSettings({...settings, lightPreset: p.id})}>
                     <div className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${settings.lightPreset === p.id ? 'border-blue-600 scale-95' : 'border-white/5'}`}>
                        <img src={p.url} className="w-full h-full object-cover" />
                     </div>
                     <p className="text-[8px] font-medium text-gray-500 truncate">{p.label}</p>
                  </div>
                ))}
                <button 
                  onClick={() => setShowAllPresets(true)}
                  className="w-20 aspect-square rounded-lg border border-white/5 bg-[#141414] flex flex-col items-center justify-center space-y-1 hover:border-gray-600 transition-all text-gray-500"
                >
                   <LayoutGrid size={16} />
                   <span className="text-[8px] font-black uppercase">See All</span>
                </button>
             </div>
          </div>
        </div>

        {/* Footer Sidebar info & Button */}
        <div className="mt-auto p-4 border-t border-white/5 bg-[#0a0a0a]">
           <div className="flex justify-between items-center mb-4">
              <div className="space-y-0.5">
                 <p className="text-[9px] text-gray-600 font-bold uppercase">Cost</p>
                 <p className="text-xs font-black">599.00 <span className="text-[10px] text-gray-500">CR</span></p>
              </div>
              <div className="text-right space-y-0.5">
                 <p className="text-[9px] text-gray-600 font-bold uppercase text-right">Resolution</p>
                 <p className="text-[11px] font-bold text-gray-400">928 x 1232</p>
              </div>
           </div>
           <button 
             onClick={handleGenerate}
             disabled={isGenerating || !settings.sourceImage}
             className="w-full h-12 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
           >
             {isGenerating ? <RefreshCw className="animate-spin inline mr-2" size={14} /> : 'Generate'}
           </button>
        </div>
      </aside>

      {/* Main Preview Workspace */}
      <main className="flex-1 bg-[#050505] flex flex-col relative overflow-hidden">
        {/* All Presets Grid Modal/Overlay */}
        {showAllPresets && (
          <div className="absolute inset-0 bg-[#050505] z-40 p-8 flex flex-col border-r border-white/5 animate-in slide-in-from-left duration-300">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-widest">All Presets</h3>
                <button onClick={() => setShowAllPresets(false)} className="text-[10px] font-bold text-gray-500 hover:text-white uppercase">Close</button>
             </div>
             <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pr-4 pb-20">
                {LIGHT_PRESETS.map(p => (
                   <div key={p.id} className="space-y-3 cursor-pointer group" onClick={() => { setSettings({...settings, lightPreset: p.id}); setShowAllPresets(false); }}>
                      <div className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${settings.lightPreset === p.id ? 'border-blue-600 ring-4 ring-blue-600/10' : 'border-white/5 group-hover:border-gray-600'}`}>
                         <img src={p.url} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors">{p.label}</p>
                   </div>
                ))}
             </div>
          </div>
        )}

        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md">
           <div className="flex items-center space-x-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-gray-200 italic">Result</h2>
              <span className="bg-white/5 text-[8px] font-black px-2 py-0.5 rounded text-gray-500 uppercase">HD Preview</span>
           </div>
           <div className="flex items-center space-x-3">
             {resultUrl && (
               <button 
                 onClick={() => onSendToPro(resultUrl)}
                 className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20 shadow-lg"
               >
                 <Send size={12} />
                 <span>Send to Pro Editor</span>
               </button>
             )}
             <button className="p-2 text-gray-600 hover:text-white transition-colors"><Maximize2 size={16} /></button>
           </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-12 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>
          
          {resultUrl && settings.sourceImage ? (
             <div 
               ref={containerRef}
               onMouseMove={handleMouseMove}
               onTouchMove={handleMouseMove}
               onMouseDown={() => setIsResizing(true)}
               onMouseUp={() => setIsResizing(false)}
               className="relative h-full max-h-[80vh] aspect-[3/4] rounded-3xl overflow-hidden shadow-[0_60px_100px_rgba(0,0,0,1)] border border-white/5 cursor-col-resize group bg-black"
             >
                <img src={resultUrl} className="absolute inset-0 w-full h-full object-cover" alt="After" />
                <div 
                  className="absolute inset-0 border-r border-white/20 z-10" 
                  style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                >
                  <img src={settings.sourceImage} className="absolute inset-0 w-full h-full object-cover" alt="Before" />
                </div>
                
                <div 
                  className="absolute inset-y-0 z-20 w-px bg-white/50 shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#050505] text-black">
                     <div className="flex space-x-1">
                        <ChevronLeft size={10} />
                        <ChevronLeft size={10} className="rotate-180" />
                     </div>
                  </div>
                </div>

                <div className="absolute top-8 left-8 z-30 bg-black/60 px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest text-white/70">Before</div>
                <div className="absolute top-8 right-8 z-30 bg-black/60 px-3 py-1 rounded text-[8px] font-black uppercase tracking-widest text-white/70">After</div>
                
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-black/80 px-6 py-2 rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Click and drag to compare</span>
                </div>
             </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
               <div className="w-[500px] aspect-[4/5] rounded-[3rem] bg-[#111] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12 space-y-8">
                  <div className="w-24 h-24 rounded-[2rem] bg-black shadow-2xl flex items-center justify-center">
                     <Camera size={40} className="text-gray-800" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black italic uppercase tracking-tight">Texture Workspace</h3>
                     <p className="text-xs text-gray-500 uppercase font-black leading-relaxed max-w-sm tracking-widest">Select a high-resolution portrait to initialize the cellular refinement process.</p>
                  </div>
               </div>
            </div>
          )}

          {isGenerating && (
             <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="relative mb-12">
                   <div className="w-32 h-32 border-4 border-blue-500/10 rounded-full animate-pulse"></div>
                   <div className="absolute inset-0 w-32 h-32 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                   <Wand2 className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={40} />
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2">Refining Biometrics...</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse">Eliminating Synthetic Smoothing</p>
             </div>
          )}
        </div>

        {/* Action Footer */}
        <footer className="h-20 border-t border-white/5 px-8 flex items-center justify-between bg-black/40">
           <div className="flex items-center space-x-6">
              <button className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors text-[11px] font-bold uppercase">
                 <List size={16} /> <span>More Actions</span> <ChevronLeft size={12} className="-rotate-90" />
              </button>
           </div>
           
           <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 h-11 px-6 bg-[#1a1a1a] hover:bg-[#222] border border-white/5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all">
                 <ArrowUpRight size={14} className="text-gray-500" />
                 <span>Upscale</span>
              </button>
              <button 
                onClick={() => {
                   if (!resultUrl) return;
                   const link = document.createElement('a');
                   link.href = resultUrl;
                   link.download = `refined-skin-${Date.now()}.png`;
                   link.click();
                }}
                className="flex items-center space-x-2 h-11 px-8 bg-blue-700 hover:bg-blue-600 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                 <Download size={14} />
                 <span>Download</span>
              </button>
           </div>
        </footer>
        
        {/* Right floating info */}
        <div className="absolute top-1/2 right-4 -translate-y-1/2 hidden xl:flex flex-col space-y-1">
           <div className="bg-[#111]/80 backdrop-blur-md border border-white/5 px-4 py-2 rounded-lg flex flex-col items-center">
              <p className="text-[8px] font-black text-gray-600 uppercase">Last Generations</p>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1 mb-2 animate-pulse"></div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">All</span>
           </div>
        </div>
      </main>
    </div>
  );
};
