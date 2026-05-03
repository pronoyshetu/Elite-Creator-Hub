
import React, { useState, useRef } from 'react';
import { VirtualTryOnSettings, TryOnModel } from '../types';
import { runVirtualTryOn, enhanceImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  User, Shirt, Info, CheckCircle, Wand2, Plus, Users, 
  Maximize2, Layout, Camera, Palette
} from 'lucide-react';

interface VirtualTryOnProps {
  onBack: () => void;
}

const AI_FASHION_MODELS: TryOnModel[] = [
  { id: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600', name: 'Elena', description: 'European, Elegant', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400' },
  { id: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600', name: 'Jordan', description: 'Mixed, Athletic', imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400' },
  { id: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600', name: 'Amira', description: 'Middle Eastern, Stylish', imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400' },
  { id: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600', name: 'Yuki', description: 'East Asian, Minimalist', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400' },
  { id: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600', name: 'Mateo', description: 'Hispanic, Casual', imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400' },
  { id: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600', name: 'Zoe', description: 'African, Bold', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400' }
];

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<VirtualTryOnSettings>({
    clothingType: 'Tops',
    modelSource: 'Library',
    selectedModelId: AI_FASHION_MODELS[0].id
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const garmentInputRef = useRef<HTMLInputElement>(null);
  const customModelInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'garmentImage' | 'customModelImage') => {
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
    if (!settings.garmentImage) return alert("Please upload a garment image.");
    if (settings.modelSource === 'Upload' && !settings.customModelImage) return alert("Please upload a custom model image.");

    setIsGenerating(true);
    try {
      const result = await runVirtualTryOn(settings);
      if (result) {
        setResultUrl(result);
        setCreditsUsed(prev => prev + 25);
      }
    } catch (e: any) {
      console.error("Try-on failed:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Try-on failed. Please try again with clearer images.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUHD = async () => {
    if (!resultUrl) return;
    setIsEnhancing(true);
    try {
      const enhanced = await enhanceImage(resultUrl, {
        strength: 95,
        faceRestoration: true,
        denoise: true,
        colorCorrection: true
      });
      if (enhanced) {
        setResultUrl(enhanced);
        setCreditsUsed(prev => prev + 10);
      }
    } catch (e: any) {
      console.error("Enhancement failed:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Enhancement failed.");
      }
    } finally {
      setIsEnhancing(false);
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
              AI VIRTUAL TRY-ON <Shirt size={16} className="ml-2 text-pink-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fashion Simulation Suite</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-pink-600/10 rounded-full text-[10px] font-black text-pink-400 border border-pink-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-8 py-2 bg-pink-600 hover:bg-pink-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>{resultUrl ? 'New Generation' : 'Start Try-On'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="lg:w-[480px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
          
          <section className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
               <Upload size={14} className="mr-2" /> 1. Garment Source
            </h2>
            <div 
              onClick={() => garmentInputRef.current?.click()}
              className={`aspect-[3/4] border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all ${
                settings.garmentImage ? 'border-pink-500 bg-slate-900 shadow-xl shadow-pink-900/10' : 'border-slate-800 hover:border-pink-500/50 bg-slate-900/50'
              }`}
            >
              {settings.garmentImage ? (
                <img src={settings.garmentImage} className="w-full h-full object-contain p-8" alt="Garment" />
              ) : (
                <>
                  <Shirt size={32} className="text-slate-700 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Flat-lay or Mannequin Photo</p>
                </>
              )}
              <input ref={garmentInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'garmentImage')} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Clothing Type</label>
              <select 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-pink-600"
                value={settings.clothingType}
                onChange={(e) => setSettings({...settings, clothingType: e.target.value as any})}
              >
                <option value="Tops">Tops</option>
                <option value="Bottoms">Bottoms</option>
                <option value="One-pieces">One-pieces / Dresses</option>
              </select>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
                 <Users size={14} className="mr-2" /> 2. Model Selection
              </h2>
              <div className="flex bg-slate-800 rounded-xl p-1 border border-white/5">
                <button onClick={() => setSettings({...settings, modelSource: 'Library'})} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.modelSource === 'Library' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500'}`}>Library</button>
                <button onClick={() => setSettings({...settings, modelSource: 'Upload'})} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.modelSource === 'Upload' ? 'bg-pink-600 text-white shadow-lg' : 'text-slate-500'}`}>Upload</button>
              </div>
            </div>

            {settings.modelSource === 'Library' ? (
              <div className="grid grid-cols-3 gap-3">
                {AI_FASHION_MODELS.map(model => (
                  <div 
                    key={model.id}
                    onClick={() => setSettings({...settings, selectedModelId: model.id})}
                    className={`relative aspect-[3/4] rounded-2xl border-2 cursor-pointer overflow-hidden transition-all ${settings.selectedModelId === model.id ? 'border-pink-500 scale-105 shadow-xl shadow-pink-900/20' : 'border-slate-800 opacity-60 hover:opacity-100'}`}
                  >
                    <img src={model.imageUrl} className="w-full h-full object-cover" alt={model.name} />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-black/60 backdrop-blur-md">
                       <p className="text-[8px] font-black uppercase text-white truncate">{model.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div 
                onClick={() => customModelInputRef.current?.click()}
                className={`aspect-[3/4] border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all ${
                  settings.customModelImage ? 'border-pink-500 bg-slate-900 shadow-xl shadow-pink-900/10' : 'border-slate-800 hover:border-pink-500/50 bg-slate-900/50'
                }`}
              >
                {settings.customModelImage ? (
                  <img src={settings.customModelImage} className="w-full h-full object-cover rounded-[1.8rem]" alt="Custom Model" />
                ) : (
                  <>
                    <Camera size={32} className="text-slate-700 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Portrait Photo</span>
                  </>
                )}
                <input ref={customModelInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'customModelImage')} />
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">3. Scene Context (Optional)</h2>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-pink-600/10 focus:border-pink-600 outline-none transition-all h-32 resize-none leading-relaxed placeholder:text-slate-800 uppercase tracking-tighter italic"
              placeholder="Parisian street, modern luxury studio, beach sunset..."
              value={settings.sceneDescription}
              onChange={(e) => setSettings({...settings, sceneDescription: e.target.value})}
            />
          </section>

          <div className="p-4 bg-pink-950/20 rounded-2xl border border-pink-900/30 flex items-start space-x-3">
            <Info size={16} className="text-pink-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
              Powered by Gemini 2.5 Flash Image. Automated pose detection and 3D fabric draping ensure ultra-realistic results.
            </p>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ec4899_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-center space-y-8">
            {resultUrl ? (
              <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                <div className="bg-pink-500/10 px-6 py-2 rounded-full border border-pink-500/20 flex items-center shadow-2xl">
                  <Sparkles size={14} className="mr-2 text-pink-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">VIRTUAL TRY-ON COMPLETE</span>
                </div>
                
                <div className={`relative bg-slate-900 rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700 group aspect-[3/4] h-[75vh]`}>
                  <img src={resultUrl} className={`w-full h-full object-cover transition-all duration-1000 ${isEnhancing ? 'blur-sm grayscale' : 'group-hover:scale-[1.02]'}`} alt="Result" />
                  
                  {isEnhancing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                       <RefreshCw className="animate-spin text-white mb-4" size={32} />
                       <span className="text-xs font-black uppercase tracking-widest text-white">Refining Fabric Details...</span>
                    </div>
                  )}

                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-500">
                    <button 
                      onClick={handleUHD}
                      disabled={isEnhancing}
                      className="flex items-center space-x-2 px-8 py-4 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      <Maximize2 size={18} />
                      <span>UHD Enhance</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultUrl;
                        link.download = `tryon-fashion-${Date.now()}.png`;
                        link.click();
                      }}
                      className="flex items-center space-x-2 px-8 py-4 bg-white text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95"
                    >
                      <Download size={18} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg aspect-square bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 space-y-8 self-center mt-20">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl border border-white/5">
                    <Layout size={40} className="text-slate-800" />
                 </div>
                 <div className="space-y-3">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Virtual Fitting Room</h2>
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest leading-relaxed">Upload a garment and choose a model to see a realistic simulation. Gemini handles the fabric physics and lighting integration.</p>
                 </div>
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-[60] animate-in fade-in duration-300">
                 <div className="relative mb-8">
                    <div className="w-28 h-28 border-4 border-pink-500/10 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-28 h-28 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
                    <RefreshCw className="absolute inset-0 m-auto text-pink-500 animate-spin" size={32} />
                 </div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Calculating Draping...</h3>
                 <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 animate-pulse">Running Inpainting Diffusion Chains</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
