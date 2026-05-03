
import React, { useState, useRef } from 'react';
import { CloneSettings, AspectRatio, ReferenceMode } from '../types';
import { cloneStyleOrCharacter } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, Edit3, 
  UserCircle, Palette, Zap, Layers, Image as ImageIcon,
  CheckCircle, ArrowRight, Sliders
} from 'lucide-react';

interface StyleCharacterCloneProps {
  onBack: () => void;
}

export const StyleCharacterClone: React.FC<StyleCharacterCloneProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<CloneSettings>({
    prompt: '',
    mode: 'Full Clone',
    strength: 80,
    aspectRatio: '1:1'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!settings.referenceImage || !settings.prompt.trim()) {
      alert("Please upload a reference image and provide a prompt.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await cloneStyleOrCharacter(settings);
      if (result) {
        setPreviewUrl(result);
        setCreditsUsed(prev => prev + 25);
      }
    } catch (e: any) {
      console.error("Failed to generate clone:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate clone. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      {/* Header */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic uppercase flex items-center">
              STYLE & CHARACTER CLONE <Zap size={16} className="ml-2 text-yellow-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Visual Anchor Technology</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-yellow-600/10 rounded-full text-[10px] font-black text-yellow-400 border border-yellow-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !settings.referenceImage || !settings.prompt.trim()}
            className="flex items-center space-x-2 px-8 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            <span>{previewUrl ? 'Regenerate' : 'Start Cloning'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Controls */}
        <aside className="lg:w-[450px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            {/* Reference Image */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Source Reference</h2>
                <span className="bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">Anchor Required</span>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-[16/10] border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden ${
                  settings.referenceImage ? 'border-yellow-500/50 bg-slate-900' : 'border-slate-800 hover:border-yellow-500/50 bg-slate-900/50'
                }`}
              >
                {settings.referenceImage ? (
                  <>
                    <img src={settings.referenceImage} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Reference" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <RefreshCw size={24} />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-slate-700 mb-4 group-hover:text-yellow-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Target Image</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            </section>

            {/* Prompt */}
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">2. Define New Scene</h2>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-yellow-600/10 focus:border-yellow-600 outline-none transition-all h-32 resize-none leading-relaxed placeholder:text-slate-700 uppercase tracking-tighter italic"
                placeholder="The character from the reference image exploring a futuristic jungle..."
                value={settings.prompt}
                onChange={(e) => setSettings({...settings, prompt: e.target.value})}
              />
            </section>

            {/* Mode & Strength */}
            <section className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">3. Cloning Parameters</h2>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Reference Priority</label>
                  <select 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-yellow-600"
                    value={settings.mode}
                    onChange={(e) => setSettings({...settings, mode: e.target.value as ReferenceMode})}
                  >
                    <option value="Character Likeness">Character Likeness (Face/Person)</option>
                    <option value="Artistic Style">Artistic Style (Lighting/Art)</option>
                    <option value="Full Clone">Full Clone (Both)</option>
                  </select>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Clone Strength</label>
                    <span className="text-xs font-black text-yellow-500">{settings.strength}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" max="100" 
                    className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-yellow-600"
                    value={settings.strength}
                    onChange={(e) => setSettings({...settings, strength: parseInt(e.target.value)})}
                  />
                  <div className="flex justify-between text-[8px] font-black text-slate-700 uppercase tracking-widest px-1">
                    <span>Flexible</span>
                    <span>Literal</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">4. Output Format</h2>
                <div className="grid grid-cols-3 gap-2">
                  {(['1:1', '9:16', '16:9'] as AspectRatio[]).map(ar => (
                    <button
                      key={ar}
                      onClick={() => setSettings({...settings, aspectRatio: ar})}
                      className={`py-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                        settings.aspectRatio === ar ? 'border-yellow-600 bg-yellow-600/10 text-yellow-500' : 'border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                       <div className={`mb-1.5 border-2 border-current rounded-sm ${
                          ar === '1:1' ? 'w-5 h-5' : ar === '9:16' ? 'w-3 h-6' : 'w-7 h-4'
                        }`} />
                       <span className="text-[10px] font-black">{ar}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </aside>

        {/* Main Preview Area */}
        <main className="flex-1 bg-slate-950 flex flex-col p-12 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#eab308_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col items-center justify-center space-y-8">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-4 self-start">Generated Result</h2>
            
            <div className={`relative bg-slate-900 rounded-[3rem] border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-700 ${
              settings.aspectRatio === '1:1' ? 'aspect-square max-w-[500px]' : 
              settings.aspectRatio === '9:16' ? 'aspect-[9/16] h-[70vh]' : 
              'aspect-video w-full'
            }`}>
              {previewUrl ? (
                <div className="w-full h-full group">
                  <img src={previewUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.03]" alt="Clone Output" />
                  <div className="absolute top-8 right-8 flex items-center space-x-3">
                     <div className="bg-yellow-600 text-white p-2 rounded-full shadow-2xl animate-bounce"><CheckCircle size={20} /></div>
                     <span className="bg-black/80 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white border border-white/10">CLONE SYNCED</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                   <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl animate-pulse">
                      <Zap size={48} className="text-slate-800" />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-xl font-black italic tracking-tighter uppercase">Clone Engine Idle</h3>
                      <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-xs leading-relaxed">Configure your visual anchor and scenario to initiate high-fidelity cloning.</p>
                   </div>
                   {!settings.referenceImage && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-2 px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                         <Upload size={14} className="text-yellow-500" />
                         <span>Upload Reference First</span>
                      </button>
                   )}
                </div>
              )}
              {isGenerating && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
                   <div className="relative">
                      <div className="w-20 h-20 border-4 border-yellow-500/20 rounded-full"></div>
                      <div className="absolute inset-0 w-20 h-20 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
                      <Zap className="absolute inset-0 m-auto text-yellow-500 animate-pulse" size={32} />
                   </div>
                   <p className="mt-8 text-xs font-black uppercase tracking-[0.5em] text-yellow-500 animate-pulse">Transferring Likeness...</p>
                </div>
              )}
            </div>

            {previewUrl && (
              <div className="flex items-center space-x-4 animate-in slide-in-from-bottom-8 duration-500">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewUrl;
                    link.download = `clone-${Date.now()}.png`;
                    link.click();
                  }}
                  className="flex items-center space-x-3 px-12 py-5 bg-white text-slate-900 hover:bg-slate-100 rounded-3xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
                >
                  <Download size={20} />
                  <span>Download Output</span>
                </button>
                <button className="flex items-center space-x-3 px-12 py-5 bg-slate-800 hover:bg-slate-700 rounded-3xl text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 border border-white/5">
                  <Edit3 size={20} className="text-yellow-500" />
                  <span>Send to Editor</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
