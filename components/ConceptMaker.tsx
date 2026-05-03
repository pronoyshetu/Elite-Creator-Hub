
import React, { useState } from 'react';
import { ConceptMakerSettings, ConceptData } from '../types';
import { generateConcept } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, Link as LinkIcon, Globe, 
  Layers, Target, Hash, Play, Clock, Volume2, 
  Download, Copy, Check, AlertCircle
} from 'lucide-react';

interface ConceptMakerProps {
  onBack: () => void;
  onSendToStoryboard?: (script: string) => void;
}

export const ConceptMaker: React.FC<ConceptMakerProps> = ({ onBack, onSendToStoryboard }) => {
  const [settings, setSettings] = useState<ConceptMakerSettings>({
    url: '',
    category: 'Entertainment',
    language: 'English'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConceptData | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = [
    'Entertainment', 'Educational', 'Promotional', 
    'Personal Branding', 'Storytelling', 'Comedy', 
    'Tutorial/How-to', 'Review/Unboxing'
  ];

  const handleGenerate = async () => {
    if (!settings.url.trim()) return;
    setLoading(true);
    try {
      const data = await generateConcept(settings);
      setResult(data);
    } catch (error: any) {
      console.error("Failed to generate concept:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to analyze the URL. Please make sure it's a valid public link.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getOutputText = () => {
    if (!result) return '';
    return `
Title: ${result.title}
Hook: ${result.hook}
Target Audience: ${result.targetAudience}
Hashtags: ${result.hashtags.join(' ')}

Scenes:
${result.scenes.map((s, i) => `Scene ${i+1} (${s.duration}):
Visual: ${s.visual}
Audio: ${s.audio}`).join('\n\n')}
    `.trim();
  };

  const handleCopy = () => {
    const text = getOutputText();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToStoryboard = () => {
    const text = getOutputText();
    if (text && onSendToStoryboard) {
      onSendToStoryboard(text);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft size={20} />
            <span className="font-bold uppercase tracking-widest text-xs">Back to Hub</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Sparkles size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Concept Maker</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Settings Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <LinkIcon size={12} />
                  Source URL
                </label>
                <input 
                  type="text"
                  placeholder="Paste Instagram, TikTok, YouTube link..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={settings.url}
                  onChange={(e) => setSettings({ ...settings, url: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Layers size={12} />
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSettings({ ...settings, category: cat })}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${
                        settings.category === cat 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20' 
                          : 'bg-slate-950 border-white/5 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Globe size={12} />
                  Language
                </label>
                <select 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                >
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                  <option>Hindi</option>
                  <option>Bangla</option>
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading || !settings.url.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Concept
                  </>
                )}
              </button>
            </div>

            <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-4 flex gap-3">
              <AlertCircle className="text-blue-500 shrink-0" size={18} />
              <p className="text-[10px] text-blue-200/60 leading-relaxed">
                Our AI analyzes the URL's content, metadata, and visual style to craft a unique story concept tailored to your chosen category.
              </p>
            </div>
          </div>

          {/* Result Panel */}
          <div className="lg:col-span-8">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black tracking-tighter uppercase italic text-blue-500">{result.title}</h2>
                      <p className="text-slate-400 text-xs font-medium flex items-center gap-2">
                        <Target size={14} className="text-blue-500" />
                        Target: {result.targetAudience}
                      </p>
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="p-3 bg-slate-950 border border-white/10 rounded-xl hover:bg-slate-800 transition-all text-slate-400 hover:text-white flex items-center gap-2"
                    >
                      {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>

                  <div className="p-8 space-y-8">
                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Play size={80} />
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">The Hook (0-3s)</h4>
                      <p className="text-xl font-bold leading-relaxed italic">"{result.hook}"</p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2">Scene Breakdown</h4>
                      <div className="space-y-3">
                        {result.scenes.map((scene, idx) => (
                          <div key={idx} className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 hover:border-blue-500/30 transition-all group">
                            <div className="md:col-span-1 flex flex-col items-center justify-center border-r border-white/5 pr-4">
                              <span className="text-2xl font-black italic text-slate-700 group-hover:text-blue-500 transition-colors">{idx + 1}</span>
                              <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 uppercase mt-1">
                                <Clock size={8} />
                                {scene.duration}
                              </div>
                            </div>
                            <div className="md:col-span-6 space-y-2">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-400">
                                <Play size={10} />
                                Visual
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed">{scene.visual}</p>
                            </div>
                            <div className="md:col-span-5 space-y-2">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400">
                                <Volume2 size={10} />
                                Audio
                              </div>
                              <p className="text-sm text-slate-400 leading-relaxed italic">{scene.audio}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mr-2">
                        <Hash size={12} />
                        Hashtags:
                      </div>
                      {result.hashtags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-slate-950 border border-white/5 rounded-full text-[10px] font-bold text-blue-400 hover:border-blue-500/30 cursor-default transition-all">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
                      <button 
                        onClick={handleSendToStoryboard}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                      >
                        <Sparkles size={16} />
                        Send to Storyboard AI
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] bg-slate-900/30 border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center border border-white/5 text-slate-700">
                  <Sparkles size={40} />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Ready for Production</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Enter a URL and select a category to generate your next viral story concept.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
