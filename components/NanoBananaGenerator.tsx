
import React, { useState, useRef, useEffect } from 'react';
import { NanoBananaSettings, AspectRatio, CloneModel } from '../types';
import { generateNanoBananaImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { useFirebase } from './FirebaseProvider';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  Image as ImageIcon, Plus, Trash2, Zap, Wand2, Info, CheckCircle,
  Camera, Sun, Palette, Maximize2, ShieldCheck, Dna, User, ChevronDown
} from 'lucide-react';

interface NanoBananaGeneratorProps {
  onBack: () => void;
  initialPrompt?: string;
}

const LIGHTING_OPTIONS = ['Default', 'Cinematic', 'Soft Glow', 'Neon', 'Golden Hour', 'Studio Light', 'Dramatic Shadow'];
const ANGLE_OPTIONS = ['Default', 'Eye Level', 'Low Angle', 'High Angle', 'Wide Shot', 'Macro', 'Birds Eye'];
const STYLE_OPTIONS = ['Photorealistic', 'Digital Art', 'Cyberpunk', 'Anime', 'Oil Painting', '3D Render', 'Sketch', 'Minimalist'];
const QUALITY_OPTIONS = ['Standard', 'HD', '4K'];
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '9:16', '16:9', '4:3', '3:4'];

export const NanoBananaGenerator: React.FC<NanoBananaGeneratorProps> = ({ onBack, initialPrompt }) => {
  const { user } = useFirebase();
  const [models, setModels] = useState<CloneModel[]>([]);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);

  const [settings, setSettings] = useState<NanoBananaSettings>({
    prompt: initialPrompt || '',
    dnaProfile: '',
    referenceImages: [],
    outputFormat: 'PNG',
    aspectRatio: '1:1',
    lighting: 'Cinematic',
    angle: 'Eye Level',
    style: 'Photorealistic',
    quality: 'HD'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const modelsQuery = query(collection(db, 'models'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(modelsQuery, (snapshot) => {
      setModels(snapshot.docs.map(doc => doc.data() as CloneModel));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'models');
    });
    return () => unsubscribe();
  }, [user]);

  const selectModelDNA = (model: CloneModel) => {
    const dnaString = [
      model.dna.faceStructure,
      model.dna.skinTone,
      model.dna.hairSignature,
      model.dna.bodyProportions
    ].filter(Boolean).join(", ");
    setSettings(prev => ({ ...prev, dnaProfile: dnaString }));
    setShowModelsDropdown(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingCount = 3 - settings.referenceImages.length;
      const filesToAdd = Array.from(files).slice(0, remainingCount);
      
      filesToAdd.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSettings(prev => ({
            ...prev,
            referenceImages: [...prev.referenceImages, reader.result as string].slice(0, 3)
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeReference = (idx: number) => {
    setSettings(prev => ({
      ...prev,
      referenceImages: prev.referenceImages.filter((_, i) => i !== idx)
    }));
  };

  const handleGenerate = async () => {
    if (!settings.prompt.trim()) return alert("Please write a prompt first.");

    setIsGenerating(true);
    try {
      const result = await generateNanoBananaImage(settings);
      if (result) {
        setResultUrl(result);
        const cost = settings.quality === '4K' ? 30 : settings.quality === 'HD' ? 20 : 10;
        setCreditsUsed(prev => prev + cost);
      }
    } catch (e: any) {
      console.error("Failed to generate image:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate image. Please try again.");
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
              NANOBANANA IMAGE GEN <Zap size={16} className="ml-2 text-yellow-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Generative Art Studio</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-yellow-600/10 rounded-full text-[10px] font-black text-yellow-400 border border-yellow-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !settings.prompt.trim()}
            className="flex items-center space-x-2 px-8 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>{resultUrl ? 'Regenerate' : 'Generate Image'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="lg:w-[450px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">1. Create Your Scene</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Write a prompt and optionally provide up to 3 reference images.</p>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Reference Images (Optional)</label>
                 
                 {models.length > 0 && (
                    <div className="relative">
                      <button 
                        onClick={() => setShowModelsDropdown(!showModelsDropdown)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-yellow-600/10 hover:bg-yellow-600/20 text-yellow-500 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border border-yellow-500/20"
                      >
                        <User size={10} />
                        Clone Model
                        <ChevronDown size={10} className={`transition-transform duration-300 ${showModelsDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showModelsDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                          {models.map(m => (
                            <button 
                              key={m.id}
                              onClick={() => selectModelDNA(m)}
                              className="w-full text-left px-4 py-3 hover:bg-yellow-600/10 text-[10px] font-bold uppercase transition-colors border-b border-white/5 last:border-0 flex items-center gap-2"
                            >
                              <img src={m.referenceImages[0]} className="w-6 h-6 rounded-md object-cover" alt="" referrerPolicy="no-referrer" />
                              <span className="flex-1 truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                  {settings.referenceImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl border border-slate-800 overflow-hidden group">
                      <img src={img} className="w-full h-full object-cover" alt="ref" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => removeReference(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {settings.referenceImages.length < 3 && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-yellow-500/50 hover:bg-slate-900 transition-all text-slate-600 hover:text-yellow-500"
                    >
                      <Plus size={20} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Add Image</span>
                    </button>
                  )}
               </div>
               <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 ml-1">
                <Dna size={12} className="text-yellow-500" />
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Character DNA Profile</label>
              </div>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-[11px] font-bold focus:ring-4 focus:ring-yellow-600/10 focus:border-yellow-600 outline-none transition-all h-20 resize-none leading-relaxed placeholder:text-slate-800 text-slate-300"
                placeholder="Biological traits, facial architecture, skin texture..."
                value={settings.dnaProfile}
                onChange={(e) => setSettings({...settings, dnaProfile: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Prompt</label>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-yellow-600/10 focus:border-yellow-600 outline-none transition-all h-32 resize-none leading-relaxed placeholder:text-slate-800 uppercase tracking-tighter italic"
                placeholder="A cinematic shot of a cat wearing sunglasses, photorealistic..."
                value={settings.prompt}
                onChange={(e) => setSettings({...settings, prompt: e.target.value})}
              />
            </div>

            {/* Directives Section */}
            <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Directives</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                    <Sun size={10} className="mr-1.5" /> Lighting
                  </label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                    value={settings.lighting}
                    onChange={(e) => setSettings({...settings, lighting: e.target.value})}
                  >
                    {LIGHTING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                    <Camera size={10} className="mr-1.5" /> Angle
                  </label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                    value={settings.angle}
                    onChange={(e) => setSettings({...settings, angle: e.target.value})}
                  >
                    {ANGLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                    <Palette size={10} className="mr-1.5" /> Art Style
                  </label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                    value={settings.style}
                    onChange={(e) => setSettings({...settings, style: e.target.value})}
                  >
                    {STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                    <Maximize2 size={10} className="mr-1.5" /> Aspect Ratio
                  </label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as AspectRatio})}
                  >
                    {ASPECT_RATIOS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center">
                  <ShieldCheck size={10} className="mr-1.5" /> Quality Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                   {QUALITY_OPTIONS.map(q => (
                     <button
                       key={q}
                       onClick={() => setSettings({...settings, quality: q as any})}
                       className={`py-2 rounded-xl border text-[9px] font-black uppercase transition-all ${
                         settings.quality === q ? 'bg-yellow-600 border-yellow-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500'
                       }`}
                     >
                       {q}
                     </button>
                   ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Est. Cost:</span>
              <span className="text-sm font-black text-yellow-500 uppercase tracking-tighter italic">
                {settings.quality === '4K' ? '30' : settings.quality === 'HD' ? '20' : '10'} credits
              </span>
            </div>
          </section>

          <div className="p-4 bg-yellow-950/20 rounded-2xl border border-yellow-900/30 flex items-start space-x-3">
            <Info size={16} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
              {settings.quality === '4K' ? 'Ultra HD mode triggers the Pro engine for superior detail and resolution.' : 'Nano Banana optimized for rapid creative iteration.'}
            </p>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-12">
            <div className="space-y-2">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">2. Generated Image</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Your image will appear here. You can download it in your preferred format.</p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
               {resultUrl ? (
                 <div className="w-full flex flex-col items-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className={`relative w-full max-w-[600px] bg-slate-900 rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,1)] border border-white/5 group transition-all duration-500 ${
                       settings.aspectRatio === '1:1' ? 'aspect-square' : 
                       settings.aspectRatio === '9:16' ? 'aspect-[9/16]' : 
                       settings.aspectRatio === '16:9' ? 'aspect-[16/9]' : 
                       settings.aspectRatio === '3:4' ? 'aspect-[3/4]' : 'aspect-[4/3]'
                    }`}>
                      <img src={resultUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]" alt="Generated result" />
                      <div className="absolute top-8 right-8 flex space-x-2">
                         <div className="bg-yellow-600 text-white p-2 rounded-full shadow-lg"><CheckCircle size={14} /></div>
                         <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded text-[8px] font-black uppercase text-white border border-white/10">Engine Complete</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1.5 ml-1">Output Format</label>
                        <select 
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                          value={settings.outputFormat}
                          onChange={(e) => setSettings({...settings, outputFormat: e.target.value as any})}
                        >
                          <option value="PNG">PNG</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultUrl;
                          link.download = `nano-gen-${Date.now()}.png`;
                          link.click();
                        }}
                        className="flex items-center space-x-3 px-12 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
                      >
                        <Download size={20} />
                        <span>Download Image</span>
                      </button>
                    </div>
                 </div>
               ) : (
                 <div className="w-full max-w-lg aspect-square bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 space-y-8 self-center">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl border border-white/5">
                       <ImageIcon size={40} className="text-slate-800" />
                    </div>
                    <div className="space-y-3">
                       <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-700">Canvas Awaiting</h2>
                       <p className="text-xs text-slate-500 uppercase font-black tracking-widest leading-relaxed">Compose your vision in the prompt and hit generate to manifest it here.</p>
                    </div>
                 </div>
               )}
            </div>

            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60] animate-in fade-in duration-300">
                 <div className="relative mb-8">
                    <div className="w-28 h-28 border-4 border-yellow-500/10 rounded-[2.5rem]"></div>
                    <div className="absolute inset-0 w-28 h-28 border-4 border-yellow-500 rounded-[2.5rem] border-t-transparent animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-yellow-500 animate-pulse" size={32} />
                 </div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">
                   {settings.quality === '4K' ? 'Rendering Ultra HD Assets...' : 'Synthesizing Pixels...'}
                 </h3>
                 <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 animate-pulse">Running Diffusion Chains</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
