
import React, { useState } from 'react';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import { auth, googleProvider, signInWithPopup } from './lib/firebase';
import { ConceptMaker } from './components/ConceptMaker';
import { ScriptToImage } from './components/ScriptToImage';
import { ChatPhotoEditor } from './components/ChatPhotoEditor';
import { ConsistencyEngine } from './components/ConsistencyEngine';
import { ScriptStudio } from './components/ScriptStudio';
import { ModelSwap } from './components/ModelSwap';
import { TryOnAccessories } from './components/TryOnAccessories';
import { ImageEnhancer } from './components/ImageEnhancer';
import { CinematicStoryboard } from './components/CinematicStoryboard';
import { NanoBananaGenerator } from './components/NanoBananaGenerator';
import { SceneGenerator } from './components/SceneGenerator';
import { VirtualTryOn } from './components/VirtualTryOn';
import { SkinRefiner } from './components/SkinRefiner';
import { CSVMeta } from './components/CSVMeta';
import { PromptGenerator } from './components/PromptGenerator';
import { 
  Sparkles, Link as LinkIcon, Zap, 
  ArrowRight, Clapperboard, MessageSquare, 
  Copy, Watch, Sparkle, Film, Eye,
  Fingerprint, Palette, AlertCircle, Loader2,
  FileText, Dna, FileSearch, Camera
} from 'lucide-react';

type ToolType = 'none' | 'concept-maker' | 'script-to-image' | 'chat-editor' | 'consistency-engine' | 'model-swap' | 'try-on-accessories' | 'enhancer' | 'storyboard' | 'nano-banana' | 'virtual-try-on' | 'skin-refiner' | 'script-studio' | 'csv-meta' | 'scene-generator' | 'prompt-generator';

const App: React.FC = () => {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
};

const AppContent: React.FC = () => {
  const [tool, setTool] = useState<ToolType>('none');
  const { user, loading, credits } = useFirebase();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | undefined>();
  const [storyboardInitialScript, setStoryboardInitialScript] = useState<string>('');
  const [nanoBananaInitialPrompt, setNanoBananaInitialPrompt] = useState<string>('');

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Popup blocked by browser. Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setLoginError("Login request was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setLoginError("Login window was closed before completion.");
      } else {
        setLoginError("An unexpected error occurred during login. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/20 blur-[150px] rounded-full"></div>
        
        <div className="max-w-md w-full z-10 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600/10 rounded-full border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
            <Zap size={14} />
            <span>Secure Production Access</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter italic uppercase leading-tight">
            ELITE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">CREATIVE HUB</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Login with your Google account to access character cloning, storyboard AI, and professional editing tools.
          </p>
          
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0" />
              <p>{loginError}</p>
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Sparkles size={20} />
            )}
            {isLoggingIn ? 'Connecting...' : 'Login with Google'}
          </button>
        </div>
      </div>
    );
  }

  if (tool === 'concept-maker') return <ConceptMaker onBack={() => setTool('none')} onSendToStoryboard={(script) => { setStoryboardInitialScript(script); setTool('storyboard'); }} />;
  if (tool === 'script-to-image') return <ScriptToImage onBack={() => setTool('none')} />;
  if (tool === 'csv-meta') return <CSVMeta onBack={() => setTool('none')} />;
  if (tool === 'chat-editor') return <ChatPhotoEditor onBack={() => setTool('none')} />;
  if (tool === 'consistency-engine') return <ConsistencyEngine onBack={() => setTool('none')} onGenerateScript={(id) => { setSelectedInfluencerId(id); setTool('script-studio'); }} />;
  if (tool === 'script-studio') return <ScriptStudio onBack={() => { setTool('none'); setSelectedInfluencerId(undefined); }} linkedInfluencerId={selectedInfluencerId} />;
  if (tool === 'model-swap') return <ModelSwap onBack={() => setTool('none')} />;
  if (tool === 'virtual-try-on') return <VirtualTryOn onBack={() => setTool('none')} />;
  if (tool === 'skin-refiner') return <SkinRefiner onBack={() => setTool('none')} onSendToPro={() => {}} />;
  if (tool === 'try-on-accessories') return <TryOnAccessories onBack={() => setTool('none')} />;
  if (tool === 'enhancer') return <ImageEnhancer onBack={() => setTool('none')} />;
  if (tool === 'storyboard') return <CinematicStoryboard onBack={() => { setTool('none'); setStoryboardInitialScript(''); }} initialScript={storyboardInitialScript} />;
  if (tool === 'nano-banana') return <NanoBananaGenerator onBack={() => { setTool('none'); setNanoBananaInitialPrompt(''); }} initialPrompt={nanoBananaInitialPrompt} />;
  if (tool === 'scene-generator') return <SceneGenerator onBack={() => setTool('none')} />;
  if (tool === 'prompt-generator') return <PromptGenerator onBack={() => setTool('none')} onSendToNanoGen={(prompt) => { setNanoBananaInitialPrompt(prompt); setTool('nano-banana'); }} />;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white overflow-hidden relative">
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/20 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/20 blur-[150px] rounded-full"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 bg-purple-600/10 blur-[200px] rounded-full"></div>
      
      <div className="max-w-[1400px] w-full z-10 space-y-12 py-12 overflow-y-auto max-h-screen custom-scrollbar">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600/10 rounded-full border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest animate-bounce">
            <Zap size={14} />
            <span>Elite AI Creative Suite</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-tight">
            PRODUCTION <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500">DASHBOARD</span>
          </h1>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 px-4">Core Production</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button onClick={() => setTool('concept-maker')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-blue-500 transition-all duration-500 ring-2 ring-blue-500/30 bg-blue-500/5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><LinkIcon size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Concept Maker</h3>
                <p className="text-slate-400 text-xs leading-relaxed">URL to viral story concept.</p>
                <div className="flex items-center text-blue-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('nano-banana')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-yellow-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Zap size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Nano Gen</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Text-to-image art generation.</p>
                <div className="flex items-center text-yellow-400 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('storyboard')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-purple-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Film size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Storyboard AI</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Cinematic scene breakdown.</p>
                <div className="flex items-center text-purple-400 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('enhancer')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-blue-400/50 transition-all duration-500">
                <div className="w-14 h-14 bg-blue-500/80 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Sparkles size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Enhancer</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Fix lighting and sharpness.</p>
                <div className="flex items-center text-blue-400 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 px-4">Fashion & Editing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button onClick={() => setTool('skin-refiner')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-teal-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Fingerprint size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Skin Refiner</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Hyper-realistic skin textures.</p>
                <div className="flex items-center text-teal-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('virtual-try-on')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-pink-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Eye size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Virtual Try-On</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Realistic fabric draping.</p>
                <div className="flex items-center text-pink-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('try-on-accessories')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-cyan-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-cyan-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Watch size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Accessories</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Jewelry and eyewear try-on.</p>
                <div className="flex items-center text-cyan-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('model-swap')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-emerald-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Palette size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Model Swap</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Replace models in photos.</p>
                <div className="flex items-center text-emerald-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 mb-6 px-4">Advanced Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <button onClick={() => setTool('scene-generator')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-emerald-500 transition-all duration-500 ring-2 ring-emerald-500/30 bg-emerald-500/5">
                <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Camera size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Scene Generator</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Character DNA anchoring prompts.</p>
                <div className="flex items-center text-emerald-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('consistency-engine')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-blue-500 transition-all duration-500 ring-2 ring-blue-500/30 bg-blue-500/5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Dna size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Consistency Engine</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Character DNA & identity locking.</p>
                <div className="flex items-center text-blue-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('script-studio')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-blue-500 transition-all duration-500 ring-2 ring-blue-500/30 bg-blue-500/5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><FileText size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Script Studio</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Viral script formatter.</p>
                <div className="flex items-center text-blue-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>
              
              <button onClick={() => setTool('chat-editor')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-cyan-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><MessageSquare size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Chat Edit</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Conversational editing.</p>
                <div className="flex items-center text-blue-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('script-to-image')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-purple-500/50 transition-all duration-500">
                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><Clapperboard size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Script Viz</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Visualize scripts into beats.</p>
                <div className="flex items-center text-purple-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('csv-meta')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-blue-500 transition-all duration-500 ring-2 ring-blue-500/30 bg-blue-500/5">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><FileSearch size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">CSV Meta</h3>
                <p className="text-slate-400 text-xs leading-relaxed">AI Metadata Architect.</p>
                <div className="flex items-center text-blue-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>

              <button onClick={() => setTool('prompt-generator')} className="group relative p-8 bg-slate-900/50 border border-white/5 rounded-[2rem] text-left hover:border-indigo-500 transition-all duration-500 ring-2 ring-indigo-500/30 bg-indigo-500/5">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6"><FileSearch size={28} /></div>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">Prompt Architect</h3>
                <p className="text-slate-400 text-xs leading-relaxed">Reverse engineer visual prompts.</p>
                <div className="flex items-center text-indigo-500 font-black text-xs uppercase tracking-[0.2em] pt-4 group-hover:translate-x-2 transition-transform">Enter <ArrowRight size={14} className="ml-2" /></div>
              </button>
            </div>
          </section>
        </div>

        <div className="text-center pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
            GEMINI API INTEGRATED • 2025 ELITE EDITION • SECURE PRODUCTION • NANOBANANA POWERED
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
