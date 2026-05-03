
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { editImageWithPrompt } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Send, Image as ImageIcon, Download, Sparkles, 
  RefreshCw, Trash2, Package, Wand2, Palette, Box, Type,
  Share2, Camera, Upload, AlertCircle
} from 'lucide-react';

interface ChatPhotoEditorProps {
  onBack: () => void;
}

export const ChatPhotoEditor: React.FC<ChatPhotoEditorProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'PNG' | 'JPG' | 'WEBP'>('PNG');
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInitialUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCurrentImage(base64);
        setMessages([{
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: 'Product image uploaded successfully! How would you like me to edit it? You can ask to change backgrounds, swap colors, or add/remove objects.',
          imageUrl: base64,
          timestamp: Date.now()
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !currentImage || isGenerating) return;

    const userPrompt = inputText;
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsGenerating(true);

    try {
      // System instruction embedded in the edit prompt for e-commerce precision
      const systemInstruction = `
        E-commerce Product Editing Mode:
        - Task: ${userPrompt}
        - CRITICAL: Maintain the main product's integrity (shape, labels, core details) 100% intact.
        - Handle object manipulation, background environment changes, or color/texture swaps as requested.
        - Ensure lighting is professional and consistent.
      `;

      const resultImage = await editImageWithPrompt(currentImage, systemInstruction);
      
      if (resultImage) {
        setCurrentImage(resultImage);
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: 'I have applied the edits according to your instructions. Is there anything else you would like to refine?',
          imageUrl: resultImage,
          timestamp: Date.now()
        }]);
        setCreditsUsed(prev => prev + 20);
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      console.error("Failed to edit image:", error);
      if (isRateLimitError(error)) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: RATE_LIMIT_MESSAGE,
          timestamp: Date.now()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an error while trying to process that edit. Please try a different instruction or re-upload the image.',
          timestamp: Date.now()
        }]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `edited-product-${Date.now()}.${outputFormat.toLowerCase()}`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-white">
      {/* Header */}
      <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tighter italic uppercase flex items-center">
              AI CHAT EDITOR <Wand2 size={16} className="ml-2 text-blue-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Precision E-Commerce Suite</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-blue-600/10 rounded-full text-[10px] font-black text-blue-400 border border-blue-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1 border border-white/5">
            {(['PNG', 'JPG', 'WEBP'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all ${
                  outputFormat === fmt ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          {currentImage && (
            <button 
              onClick={downloadImage}
              className="flex items-center space-x-2 px-6 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <aside className="w-full lg:w-[450px] border-r border-white/5 bg-slate-900/30 flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {!currentImage && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center animate-pulse">
                  <Package size={32} className="text-blue-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black italic tracking-tighter uppercase">No Product Loaded</h3>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest leading-relaxed">Upload a product photo to begin conversational editing.</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40"
                >
                  Upload Product Image
                </button>
                <div className="pt-8 grid grid-cols-2 gap-3 w-full">
                  {[
                    { icon: Box, label: 'Remove Object' },
                    { icon: Palette, label: 'Change Color' },
                    { icon: ImageIcon, label: 'New Scene' },
                    { icon: Type, label: 'Edit Text' }
                  ].map((feat, i) => (
                    <div key={i} className="p-3 bg-slate-900/50 border border-white/5 rounded-xl flex items-center space-x-3 opacity-40">
                      <feat.icon size={14} className="text-blue-500" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{feat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 text-xs font-bold leading-relaxed shadow-lg ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 border border-white/5 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                {msg.imageUrl && (
                  <div className="mt-2 w-48 aspect-square rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={msg.imageUrl} className="w-full h-full object-cover" alt="Editor output" />
                  </div>
                )}
                <span className="text-[8px] font-black text-slate-600 uppercase mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex flex-col items-start animate-pulse">
                <div className="bg-slate-800 border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center space-x-3">
                  <RefreshCw size={14} className="animate-spin text-blue-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">AI is repainting...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-white/5 bg-slate-900/50">
            <div className="relative group">
              <input 
                type="text" 
                placeholder={currentImage ? "e.g. 'Change background to mountain peak'..." : "Upload image first..."}
                disabled={!currentImage || isGenerating}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 pr-14 text-sm font-bold focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all disabled:opacity-50 placeholder:text-slate-700"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isGenerating || !currentImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all disabled:opacity-20 disabled:bg-slate-800"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between px-2">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">20 credits per prompt</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[8px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center"
              >
                <Upload size={10} className="mr-1" /> Re-upload
              </button>
            </div>
          </div>
        </aside>

        {/* Preview Section */}
        <main className="flex-1 bg-slate-950 flex items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="relative w-full h-full flex items-center justify-center">
            {currentImage ? (
              <div className="relative max-w-full max-h-full group">
                <div className="absolute inset-0 bg-blue-600/20 blur-[100px] opacity-20 pointer-events-none"></div>
                <img 
                  src={currentImage} 
                  className="max-w-full max-h-[80vh] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5 object-contain transition-transform duration-700 hover:scale-[1.02]" 
                  alt="Current Edit" 
                />
                
                {/* Floating Tools */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 p-2 bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                  <button onClick={downloadImage} className="p-3 hover:bg-blue-600 rounded-xl transition-all text-white" title="Download"><Download size={20} /></button>
                  <button className="p-3 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white" title="Share"><Share2 size={20} /></button>
                  <div className="w-px h-8 bg-white/10 mx-2"></div>
                  <button 
                    onClick={() => {
                      setMessages([]);
                      setCurrentImage(null);
                      setCreditsUsed(0);
                    }} 
                    className="p-3 hover:bg-red-600/20 rounded-xl transition-all text-red-500" 
                    title="Reset Session"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-[500px] aspect-square bg-slate-900/30 border-2 border-dashed border-white/10 rounded-[4rem] flex flex-col items-center justify-center text-center p-12 cursor-pointer hover:border-blue-500/50 transition-all group"
              >
                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 flex items-center justify-center shadow-2xl mb-8 group-hover:scale-110 transition-transform">
                  <Camera size={48} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase">Studio Ready</h2>
                  <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-xs mx-auto leading-relaxed">Drag and drop or click to upload your high-resolution product photography.</p>
                </div>
              </div>
            )}
          </div>

          {/* Guidelines info */}
          <div className="absolute top-12 left-12 max-w-[200px] hidden xl:block">
            <div className="space-y-4">
              <div className="flex items-start space-x-3 opacity-40">
                <AlertCircle size={14} className="text-blue-500 mt-1 shrink-0" />
                <p className="text-[8px] font-black uppercase tracking-widest leading-relaxed">Pro Tip: Describe environment details like "Soft rim lighting" or "Reflection on floor".</p>
              </div>
              <div className="flex items-start space-x-3 opacity-40">
                <AlertCircle size={14} className="text-blue-500 mt-1 shrink-0" />
                <p className="text-[8px] font-black uppercase tracking-widest leading-relaxed">Iterative: You can say "Now make it dusk" to refine previous results.</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <input 
        ref={fileInputRef} 
        type="file" 
        className="hidden" 
        accept="image/*" 
        onChange={handleInitialUpload} 
      />
    </div>
  );
};
