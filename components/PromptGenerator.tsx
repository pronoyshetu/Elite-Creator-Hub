
import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, Sparkles, Upload, Copy, Check, Trash2, 
  RefreshCw, FileSearch, Camera, Wand2, Info, Image as ImageIcon,
  Loader2, Scan, Zap
} from 'lucide-react';
import { reverseEngineerPrompt } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface PromptGeneratorProps {
  onBack: () => void;
  onSendToNanoGen?: (prompt: string) => void;
}

export const PromptGenerator: React.FC<PromptGeneratorProps> = ({ onBack, onSendToNanoGen }) => {
  const [images, setImages] = useState<string[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const remainingSlots = 10 - images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);
      
      filesToProcess.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string].slice(0, 10));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length === 1) {
      setGeneratedPrompt('');
    }
  };

  const handleGenerate = async () => {
    if (images.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      const prompt = await reverseEngineerPrompt(images);
      setGeneratedPrompt(prompt);
    } catch (err) {
      setError("Analysis failed. Please ensure images are valid and try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-900 rounded-xl transition-colors flex items-center gap-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft size={20} />
            <span className="font-black uppercase tracking-widest text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Scan size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white/90">Prompt Architect</h1>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500/60">Reverse Engineering Engine</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl backdrop-blur-sm">
              <div className="space-y-2">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-indigo-400">
                  <Upload size={16} /> Asset Injection
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Upload 1-10 reference images to extract their visual DNA.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-[2rem] p-12 transition-all cursor-pointer bg-slate-950/50 overflow-hidden"
              >
                <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="text-slate-600 group-hover:text-indigo-400 transition-colors" size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Drop references here</p>
                    <p className="text-[9px] font-bold text-slate-600 uppercase">PNG, JPG up to 10MB</p>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden" 
                  multiple 
                  accept="image/*"
                />
              </div>

              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence>
                  {images.map((img, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative aspect-square rounded-xl border border-white/5 overflow-hidden group shadow-lg"
                    >
                      <img src={img} alt="ref" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                  {Array.from({ length: 10 - images.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-xl bg-slate-950/50 border border-slate-900 flex items-center justify-center">
                       <div className="w-1 h-1 bg-slate-800 rounded-full" />
                    </div>
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={handleGenerate}
                disabled={images.length === 0 || isGenerating}
                className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] italic text-xs transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${
                  images.length === 0 || isGenerating 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deconstructing Visuals...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Extract Prompt DNA
                  </>
                )}
              </button>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-[2rem] p-6 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                <Info size={14} /> System Logic
              </h3>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-wider">
                Our vision engine performs cross-batch analysis of the provided assets to isolate recurring aesthetic patterns, lighting signatures, and camera parameters.
              </p>
            </div>
          </div>

          {/* Prompt Output */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] min-h-[500px] flex flex-col shadow-2xl p-8 space-y-8 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400">Extracted Sequence</h3>
                  <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">Master Prompt Metadata</p>
                </div>
                {generatedPrompt && (
                  <button 
                    onClick={copyToClipboard}
                    className={`p-3 rounded-xl transition-all border ${
                      copied 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                        : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white hover:border-indigo-500/50'
                    }`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold uppercase text-center animate-in fade-in slide-in-from-top-4">
                  {error}
                </div>
              )}

              <div className="flex-1 flex flex-col justify-center">
                {isGenerating ? (
                  <div className="space-y-8 animate-pulse">
                    <div className="h-4 bg-slate-800/50 rounded-full w-full" />
                    <div className="h-4 bg-slate-800/50 rounded-full w-5/6" />
                    <div className="h-4 bg-slate-800/50 rounded-full w-4/6" />
                    <div className="h-4 bg-slate-800/50 rounded-full w-full" />
                    <div className="h-4 bg-slate-800/50 rounded-full w-3/6" />
                  </div>
                ) : generatedPrompt ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative group h-full flex flex-col"
                  >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-indigo-500/20 rounded-full" />
                    <div className="bg-slate-950/50 p-8 rounded-[2rem] border border-white/5 text-sm md:text-base text-slate-300 leading-relaxed font-mono whitespace-pre-wrap italic shadow-inner custom-scrollbar overflow-y-auto max-h-[600px]">
                      {generatedPrompt}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-6 py-20 opacity-20">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-slate-800">
                      <Wand2 size={40} className="text-slate-700" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-lg font-black italic uppercase tracking-tight">Vortex Idle</h3>
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Inject assets to begin architectural extraction.</p>
                    </div>
                  </div>
                )}
              </div>

              {generatedPrompt && (
                <div className="pt-6 border-t border-white/5 flex flex-wrap gap-3">
                   <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-xl border border-white/5">
                      <Camera size={12} className="text-slate-600" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Auto-Detected Lens</span>
                   </div>
                   <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 rounded-xl border border-white/5">
                      <RefreshCw size={12} className="text-slate-600" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Aesthetic Seed Extracted</span>
                   </div>
                   {onSendToNanoGen && (
                     <button 
                       onClick={() => onSendToNanoGen(generatedPrompt)}
                       className="flex items-center gap-2 px-4 py-2 bg-yellow-600/10 hover:bg-yellow-600 text-yellow-500 hover:text-white rounded-xl border border-yellow-500/20 transition-all font-black uppercase tracking-widest text-[8px]"
                     >
                       <Zap size={12} />
                       Send to Nano Gen
                     </button>
                   )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
};
