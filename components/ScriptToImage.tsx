
import React, { useState } from 'react';
import { ScriptToImageSettings, StoryboardScene, AspectRatio } from '../types';
import { analyzeScript, generateImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Clapperboard, Download, Share2, 
  Trash2, Plus, MessageSquare, Info, Film, PenTool
} from 'lucide-react';

interface ScriptToImageProps {
  onBack: () => void;
}

const STORY_STYLES = [
  'Cinematic', 'Hand-drawn Sketch', 'Noir Sketchbook', 
  'Animated / Pixar Style', 'Photorealistic', 'Digital Concept Art', 'Vintage Film'
];

export const ScriptToImage: React.FC<ScriptToImageProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<ScriptToImageSettings>({
    script: '',
    customInstructions: '',
    storyStyle: 'Cinematic',
    numScenes: 'Let AI decide',
    aspectRatio: '16:9'
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenes, setScenes] = useState<StoryboardScene[]>([]);
  const [creditsUsed, setCreditsUsed] = useState(0);

  const handleAnalyze = async () => {
    if (!settings.script.trim()) {
      alert("Please paste your script first.");
      return;
    }
    
    setIsAnalyzing(true);
    setScenes([]);
    try {
      const beats = await analyzeScript(settings);
      const newScenes: StoryboardScene[] = beats.map((b: any, i: number) => ({
        id: `scene-${Date.now()}-${i}`,
        description: b.description,
        isGenerating: false
      }));
      setScenes(newScenes);
      setCreditsUsed(prev => prev + 5);
    } catch (e: any) {
      console.error("Failed to analyze script:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to analyze script. Please try again.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSceneImage = async (id: string) => {
    const scene = scenes.find(s => s.id === id);
    if (!scene) return;

    setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: true } : s));
    
    try {
      const fullPrompt = `Storyboard scene: ${scene.description}. Style: ${settings.storyStyle}.`;
      const imageUrl = await generateImage(fullPrompt, 'gemini-2.5-flash-image', settings.aspectRatio);
      if (imageUrl) {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, imageUrl, isGenerating: false } : s));
        setCreditsUsed(prev => prev + 15);
      }
    } catch (e: any) {
      console.error("Failed to generate image:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate image for this scene.");
      }
      setScenes(prev => prev.map(s => s.id === id ? { ...s, isGenerating: false } : s));
    }
  };

  const generateAllScenes = async () => {
    for (const scene of scenes) {
      if (!scene.imageUrl) {
        await generateSceneImage(scene.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic uppercase">Script to Image</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Storyboard Visualizer</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-purple-600/10 rounded-full text-[10px] font-black text-purple-400 border border-purple-500/20">
            {creditsUsed} CREDITS USED
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !settings.script.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={16} /> : <Clapperboard size={16} />}
            <span>{scenes.length > 0 ? 'Re-Analyze' : 'Analyze Script'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Input Sidebar */}
        <aside className="lg:w-[450px] border-r border-slate-800 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Paste Your Script</h2>
                <span className="bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">Required</span>
              </div>
              <textarea 
                className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-sm font-medium focus:ring-4 focus:ring-purple-600/20 focus:border-purple-600 outline-none transition-all h-64 resize-none leading-relaxed placeholder:text-slate-700"
                placeholder="INT. COFFEE SHOP - DAY&#10;&#10;The steam from the espresso machine clouds the air. SARAH (25) stares blankly at her phone..."
                value={settings.script}
                onChange={(e) => setSettings({...settings, script: e.target.value})}
              />
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Creative Context</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Custom Instructions (Optional)</label>
                  <textarea 
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-purple-600/50 outline-none resize-none text-slate-300 italic"
                    placeholder="e.g. 'Focus on character expressions. Make the mood somber.'"
                    rows={3}
                    value={settings.customInstructions}
                    onChange={(e) => setSettings({...settings, customInstructions: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Story Style</label>
                    <select 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-600"
                      value={settings.storyStyle}
                      onChange={(e) => setSettings({...settings, storyStyle: e.target.value})}
                    >
                      {STORY_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Number of Scenes</label>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-600"
                      placeholder="Let AI decide"
                      value={settings.numScenes}
                      onChange={(e) => setSettings({...settings, numScenes: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Image Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['1:1', '9:16', '16:9'] as AspectRatio[]).map(ar => (
                      <button
                        key={ar}
                        onClick={() => setSettings({...settings, aspectRatio: ar})}
                        className={`py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                          settings.aspectRatio === ar ? 'border-purple-600 bg-purple-600/10 text-purple-500' : 'border-slate-800 text-slate-500 hover:border-slate-700'
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
              </div>
            </section>
            
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 flex items-start space-x-3">
              <Info size={16} className="text-purple-500 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                Analysis cost: 5 credits. Each generated scene costs 15 credits. Gemini handles composition and creative direction.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 bg-slate-900 flex flex-col p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black italic tracking-tighter uppercase">2. Generated Scenes</h2>
              {scenes.length > 0 && (
                <button 
                  onClick={generateAllScenes}
                  className="flex items-center space-x-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Sparkles size={14} className="text-purple-500" />
                  <span>Generate All Missing Scenes</span>
                </button>
              )}
            </div>

            {scenes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {scenes.map((scene, index) => (
                  <div 
                    key={scene.id} 
                    className="bg-slate-950/50 border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl transition-all hover:border-slate-700 group"
                  >
                    <div className={`relative bg-slate-900 flex items-center justify-center overflow-hidden ${
                      settings.aspectRatio === '16:9' ? 'aspect-video' : settings.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'
                    }`}>
                      {scene.imageUrl ? (
                        <img src={scene.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={`Scene ${index + 1}`} />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                           <div className={`p-4 rounded-3xl ${scene.isGenerating ? 'bg-purple-600/10' : 'bg-slate-800'}`}>
                             {scene.isGenerating ? <RefreshCw className="animate-spin text-purple-500" size={32} /> : <Film className="text-slate-600" size={32} />}
                           </div>
                           <button 
                             onClick={() => generateSceneImage(scene.id)}
                             disabled={scene.isGenerating}
                             className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                           >
                             {scene.isGenerating ? 'Rendering Scene...' : 'Generate Scene Visual'}
                           </button>
                        </div>
                      )}
                      <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/80 border border-white/10">
                        Scene {index + 1}
                      </div>
                    </div>
                    <div className="p-8 space-y-4">
                      <div className="flex items-start justify-between">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500">Action & Composition</h4>
                         <div className="flex space-x-2">
                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><Download size={14} /></button>
                            <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors"><Share2 size={14} /></button>
                         </div>
                      </div>
                      <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
                        {scene.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-h-[500px] flex flex-col items-center justify-center text-center space-y-6 bg-slate-950/20 border-2 border-dashed border-slate-800 rounded-[3rem] p-12">
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center shadow-2xl animate-pulse">
                  <PenTool size={48} className="text-slate-700" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase">Visual Sequence Empty</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-sm leading-relaxed">Paste your script and let Gemini analyze the visual beats to start building your storyboard.</p>
                </div>
                <button 
                  onClick={handleAnalyze} 
                  disabled={!settings.script.trim()}
                  className="px-10 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/40 disabled:opacity-50"
                >
                  Analyze & Start Sequence
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
