
import React, { useState } from 'react';
import { StoryboardSettings, StoryboardSceneData, StoryboardStyle } from '../types';
import { generateStoryboardBeats, generateImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Clapperboard, Download, 
  Camera, Mic, Film, Wand2, ArrowRight, CheckCircle, List,
  Play, Type, Globe, ShieldCheck, Image as ImageIcon
} from 'lucide-react';

interface CinematicStoryboardProps {
  onBack: () => void;
  initialScript?: string;
}

const STYLES: StoryboardStyle[] = ['Cinematic', 'Noir', 'Cyberpunk', 'Minimalist', 'Anime'];
const LANGUAGES = ['English', 'Spanish', 'Bengali', 'French', 'German', 'Japanese'];

export const CinematicStoryboard: React.FC<CinematicStoryboardProps> = ({ onBack, initialScript }) => {
  const [settings, setSettings] = useState<StoryboardSettings>({
    script: initialScript || '',
    style: 'Cinematic',
    sceneCount: 5,
    language: 'English'
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenes, setScenes] = useState<StoryboardSceneData[]>([]);
  const [creditsUsed, setCreditsUsed] = useState(0);

  const handleAnalyze = async () => {
    if (!settings.script.trim()) return alert("Please paste your script or narrative first.");
    
    setIsAnalyzing(true);
    try {
      const result = await generateStoryboardBeats(settings);
      setScenes(result);
      setCreditsUsed(prev => prev + 5);
    } catch (e: any) {
      console.error("Script analysis failed:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Script analysis failed. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRenderFrame = async (idx: number) => {
    const scene = scenes[idx];
    if (!scene || scene.isRendering) return;

    const updatedScenes = [...scenes];
    updatedScenes[idx].isRendering = true;
    setScenes(updatedScenes);

    try {
      const result = await generateImage(scene.visualPrompt, 'gemini-2.5-flash-image', '16:9');
      if (result) {
        const finalScenes = [...scenes];
        finalScenes[idx].renderedImageUrl = result;
        finalScenes[idx].isRendering = false;
        setScenes(finalScenes);
        setCreditsUsed(prev => prev + 10);
      }
    } catch (e: any) {
      console.error("Frame rendering failed:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Frame rendering failed.");
      }
      const finalScenes = [...scenes];
      finalScenes[idx].isRendering = false;
      setScenes(finalScenes);
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
              CINEMATIC STORYBOARD AI <Clapperboard size={16} className="ml-2 text-purple-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Creative Direction Lab</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-purple-600/10 rounded-full text-[10px] font-black text-purple-400 border border-purple-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !settings.script.trim()}
            className="flex items-center space-x-2 px-8 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            <span>{scenes.length > 0 ? 'Analyze New Script' : 'Generate Storyboard'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="lg:w-[450px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
          <section className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Narrative Input</h2>
            <textarea 
              className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm font-bold focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 outline-none transition-all h-64 resize-none leading-relaxed placeholder:text-slate-800 uppercase tracking-tighter italic"
              placeholder="Paste your script or scene description here. E.G. 'A neon-drenched city street in 2077. A detective walks slowly into a rainy alleyway...'"
              value={settings.script}
              onChange={(e) => setSettings({...settings, script: e.target.value})}
            />
          </section>

          <section className="space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">2. Directives</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Visual Style</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-600"
                  value={settings.style}
                  onChange={(e) => setSettings({...settings, style: e.target.value as StoryboardStyle})}
                >
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Scene Count</label>
                    <input 
                      type="number" min="1" max="15"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-purple-600"
                      value={settings.sceneCount}
                      onChange={(e) => setSettings({...settings, sceneCount: parseInt(e.target.value)})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">V.O. Language</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-600"
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                    >
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                 </div>
              </div>
            </div>
          </section>

          <div className="p-4 bg-purple-950/20 rounded-2xl border border-purple-900/30 flex items-start space-x-3">
            <ShieldCheck size={16} className="text-purple-500 shrink-0 mt-0.5" />
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
              Storyboard Analysis: Gemini translates narrative beats into cinematic framing, lighting, and motion directives.
            </p>
          </div>
        </aside>

        <main className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col space-y-12">
            {scenes.length > 0 ? (
              <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {scenes.map((scene, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col xl:flex-row shadow-2xl group transition-all hover:border-purple-500/30">
                    <div className="w-full xl:w-[450px] aspect-video xl:aspect-auto bg-slate-950 relative overflow-hidden flex items-center justify-center border-b xl:border-b-0 xl:border-r border-white/5 shrink-0">
                      {scene.renderedImageUrl ? (
                        <img src={scene.renderedImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={`Scene ${idx+1}`} />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
                           <div className="w-20 h-20 rounded-[2rem] bg-slate-900 flex items-center justify-center shadow-inner">
                              {/* Added missing ImageIcon to lucide-react imports above */}
                              {scene.isRendering ? <RefreshCw className="animate-spin text-purple-500" size={32} /> : <ImageIcon className="text-slate-800" size={32} />}
                           </div>
                           <button 
                             onClick={() => handleRenderFrame(idx)}
                             disabled={scene.isRendering}
                             className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                           >
                             {scene.isRendering ? 'Rendering Frame...' : 'Render Image Frame'}
                           </button>
                        </div>
                      )}
                      <div className="absolute top-6 left-6 bg-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-black shadow-2xl">
                         SCENE {scene.sceneNumber}
                      </div>
                      {scene.renderedImageUrl && (
                        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                             onClick={() => {
                               const link = document.createElement('a');
                               link.href = scene.renderedImageUrl!;
                               link.download = `storyboard-scene-${idx+1}.png`;
                               link.click();
                             }}
                             className="p-3 bg-white text-slate-900 rounded-xl shadow-2xl active:scale-95"
                           >
                             <Download size={18} />
                           </button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-10 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <div className="flex items-center space-x-2 text-purple-500">
                                <Camera size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Cinematography</span>
                             </div>
                             <p className="text-xs font-bold text-slate-300 leading-relaxed uppercase tracking-tighter italic">
                               {scene.visualPrompt}
                             </p>
                          </div>
                          <div className="space-y-3">
                             <div className="flex items-center space-x-2 text-red-500">
                                <Play size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Motion / Video</span>
                             </div>
                             <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter italic">
                               {scene.videoPrompt}
                             </p>
                          </div>
                       </div>

                       <div className="h-px bg-white/5" />

                       <div className="space-y-4">
                          <div className="flex items-center space-x-2 text-blue-500">
                             <Mic size={14} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Voiceover & Narrative</span>
                          </div>
                          <div className="bg-slate-950/80 rounded-2xl p-6 border border-white/5 relative">
                             <p className="text-sm font-medium text-slate-200 leading-relaxed">
                               {scene.voiceover}
                             </p>
                             <div className="mt-4 pt-4 border-t border-white/5">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Summary: {scene.description}</p>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full max-w-lg aspect-square bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 space-y-8 self-center mt-20">
                 <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl border border-white/5">
                    <Film size={40} className="text-slate-800" />
                 </div>
                 <div className="space-y-3">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Sequential Visualizer</h2>
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest leading-relaxed">Paste your script and define your style. Gemini will break your story into a structured sequence of cinematic frames.</p>
                 </div>
                 {!settings.script && (
                    <div className="flex items-center space-x-2 px-6 py-2 bg-slate-800 rounded-full border border-white/5 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                       Waiting for script input
                    </div>
                 )}
              </div>
            )}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60] animate-in fade-in duration-300">
                 <div className="relative mb-8">
                    <div className="w-28 h-28 border-4 border-purple-500/10 rounded-[2.5rem]"></div>
                    <div className="absolute inset-0 w-28 h-28 border-4 border-purple-500 rounded-[2.5rem] border-t-transparent animate-spin"></div>
                    <Wand2 className="absolute inset-0 m-auto text-purple-500 animate-pulse" size={32} />
                 </div>
                 <h3 className="text-xl font-black italic tracking-tighter uppercase text-white">Analyzing Narrative beats...</h3>
                 <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 animate-pulse">Mapping Cinematic Archetypes</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
