
import React, { useState, useRef, useEffect } from 'react';
import { ModelSwapSettings, PreservationFocus, CloneModel } from '../types';
import { swapModel } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  User, Shirt, ToggleLeft, ToggleRight, Info, CheckCircle,
  Eye, Wand2, ShieldCheck, ShoppingBag, Fingerprint, Plus
} from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

interface ModelSwapProps {
  onBack: () => void;
}

export const ModelSwap: React.FC<ModelSwapProps> = ({ onBack }) => {
  const { user } = useFirebase();
  const [models, setModels] = useState<CloneModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  const [settings, setSettings] = useState<ModelSwapSettings>({
    modelDescription: '',
    keepBackground: true,
    preservationFocus: 'Balanced'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualRefInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const modelsQuery = query(
      collection(db, 'models'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeModels = onSnapshot(modelsQuery, (snapshot) => {
      const modelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CloneModel));
      setModels(modelsData);
    }, (error) => handleFirestoreError(error, 'list' as any, 'models'));

    return () => unsubscribeModels();
  }, [user]);

  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (model) {
      const description = `Character Name: ${model.name}. Face Structure: ${model.dna.faceStructure}. Skin Tone: ${model.dna.skinTone}. Hair Signature: ${model.dna.hairSignature}. Body Proportions: ${model.dna.bodyProportions}.`;
      setSettings(prev => ({ 
        ...prev, 
        modelDescription: description,
        referenceImages: model.referenceImages
      }));
    } else {
      setSettings(prev => ({ ...prev, modelDescription: '', referenceImages: [] }));
    }
  };

  const compressBase64 = (base64Str: string, maxWidth = 512, maxHeight = 512, quality = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressBase64(reader.result as string, 1024, 1024, 0.7);
        setSettings(prev => ({ ...prev, originalImage: compressed }));
        setResultUrl(null); // Clear previous result if uploading a new original
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressBase64(reader.result as string, 512, 512, 0.5);
        setSettings(prev => ({ 
          ...prev, 
          referenceImages: [...(prev.referenceImages || []), compressed].slice(0, 10) // Limit to 10 to protect doc size
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const parseDNAFromDescription = (description: string) => {
    const dna = {
      faceStructure: 'Default balanced structure',
      skinTone: 'Natural',
      hairSignature: 'Standard',
      bodyProportions: 'Athletic',
      seed: Math.floor(Math.random() * 1000000)
    };

    const matches = {
      faceStructure: /Face Structure: (.*?)\./i,
      skinTone: /Skin Tone: (.*?)\./i,
      hairSignature: /Hair Signature: (.*?)\./i,
      bodyProportions: /Body Proportions: (.*?)\./i
    };

    Object.entries(matches).forEach(([key, regex]) => {
      const match = description.match(regex);
      if (match) {
        (dna as any)[key] = match[1].trim();
      }
    });

    return dna;
  };

  const handleSaveInfluencer = async () => {
    if (!user || (!settings.modelDescription && (!settings.referenceImages || settings.referenceImages.length === 0))) {
      alert("Please provide a description or reference images to save.");
      return;
    }

    const name = prompt("Enter a identity name for this profile:");
    if (!name) return;

    setIsSavingModel(true);
    try {
      const dna = parseDNAFromDescription(settings.modelDescription);
      const newModel = {
        uid: user.uid,
        name: name,
        description: settings.modelDescription,
        dna: dna,
        referenceImages: settings.referenceImages || [],
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'models'), newModel);
      setSelectedModelId(docRef.id);
      alert("Profile securely vaulted in Consistency Engine!");
    } catch (error: any) {
      console.error("Error saving model:", error);
      handleFirestoreError(error, 'create' as any, 'models');
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleSwap = async () => {
    if (!settings.originalImage || !settings.modelDescription.trim()) {
      alert("Please upload an original photo and describe the new model.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await swapModel(settings);
      if (result) {
        setResultUrl(result);
        setCreditsUsed(prev => prev + 25);
      }
    } catch (e: any) {
      console.error("Failed to swap model:", e);
      if (isRateLimitError(e)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to swap model. Ensure the image is high resolution and try again.");
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
              AI MODEL SWAP <Shirt size={16} className="ml-2 text-emerald-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Fashion E-Commerce Studio</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-4 py-1.5 bg-emerald-600/10 rounded-full text-[10px] font-black text-emerald-400 border border-emerald-500/20">
            {creditsUsed} CREDITS SPENT
          </div>
          <button 
            onClick={handleSwap}
            disabled={isGenerating || !settings.originalImage || !settings.modelDescription.trim()}
            className="flex items-center space-x-2 px-8 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />}
            <span>{resultUrl ? 'Try Different Model' : 'Swap Model'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Controls Sidebar */}
        <aside className="lg:w-[450px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            {/* Original Image */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">1. Original Photography</h2>
                <span className="bg-emerald-600/20 text-emerald-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">Required</span>
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-square border-2 border-dashed rounded-[2.5rem] transition-all cursor-pointer group flex flex-col items-center justify-center overflow-hidden ${
                  settings.originalImage ? 'border-emerald-500/50 bg-slate-900' : 'border-slate-800 hover:border-emerald-500/50 bg-slate-900/50'
                }`}
              >
                {settings.originalImage ? (
                  <>
                    <img src={settings.originalImage} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Original Model" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <RefreshCw size={24} />
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={32} className="text-slate-700 mb-4 group-hover:text-emerald-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Product Photo</p>
                    <p className="text-[8px] text-slate-600 mt-2 uppercase">Person wearing clothing</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            </section>

            {/* Target Model Description */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">2. New Model Profile</h2>
                <div className="flex items-center space-x-1 text-[8px] font-black text-slate-600 uppercase">
                  <Fingerprint size={10} />
                  <span>Biometric Selection</span>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Visual Influencer Selector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Saved Influencers</label>
                    {selectedModelId === '' && (settings.modelDescription || (settings.referenceImages && settings.referenceImages.length > 0)) && (
                      <button 
                        onClick={handleSaveInfluencer}
                        className="text-[8px] font-black text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded uppercase flex items-center space-x-1"
                      >
                        {isSavingModel ? <RefreshCw className="animate-spin" size={10} /> : <ShieldCheck size={10} />}
                        <span>Save to Consistency Engine</span>
                      </button>
                    )}
                  </div>
                  <div className="flex overflow-x-auto pb-4 gap-4 snap-x custom-scrollbar">
                    <button
                      onClick={() => handleModelSelect('')}
                      className={`flex-shrink-0 w-24 aspect-[3/4] rounded-2xl border-2 flex flex-col items-center justify-center space-y-2 transition-all snap-start ${
                        selectedModelId === '' 
                        ? 'border-emerald-500 bg-emerald-500/10' 
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                      }`}
                    >
                      <User size={24} className={selectedModelId === '' ? 'text-emerald-500' : 'text-slate-600'} />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-center px-2">Manual Description</span>
                    </button>

                    <button
                      onClick={() => {
                        handleModelSelect('');
                        manualRefInputRef.current?.click();
                      }}
                      className="flex-shrink-0 w-24 aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/30 hover:border-emerald-500 hover:bg-slate-900/50 flex flex-col items-center justify-center space-y-2 transition-all snap-start group"
                    >
                      <Upload size={20} className="text-slate-500 group-hover:text-emerald-500" />
                      <span className="text-[8px] font-black uppercase tracking-tighter text-center px-2 text-slate-400 group-hover:text-emerald-400">Upload Custom Model</span>
                    </button>

                    {models.map(m => (
                      <button
                        key={m.id}
                        onClick={() => handleModelSelect(m.id)}
                        className={`flex-shrink-0 w-24 aspect-[3/4] rounded-2xl border-2 overflow-hidden relative group transition-all snap-start ${
                          selectedModelId === m.id 
                          ? 'border-emerald-500 ring-4 ring-emerald-500/20' 
                          : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {m.referenceImages?.[0] ? (
                          <img src={m.referenceImages[0]} className="w-full h-full object-cover" alt={m.name} />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600 font-bold uppercase text-[10px]">
                            {m.name.slice(0, 2)}
                          </div>
                        )}
                        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-2 transition-opacity ${selectedModelId === m.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <span className="text-[8px] font-black uppercase tracking-tighter truncate text-white">{m.name}</span>
                        </div>
                        {selectedModelId === m.id && (
                          <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 shadow-lg">
                            <CheckCircle size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Model Reference Preview */}
                <AnimatePresence mode="wait">
                  {(selectedModelId || (selectedModelId === '' && settings.referenceImages && settings.referenceImages.length > 0)) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 bg-slate-900 border border-slate-800 rounded-3xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Eye size={12} className="text-emerald-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            {selectedModelId ? 'Biometric Verification' : 'Custom DNA References'}
                          </span>
                        </div>
                        {selectedModelId === '' && (
                          <button 
                            onClick={() => manualRefInputRef.current?.click()}
                            className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase flex items-center"
                          >
                            <Upload size={8} className="mr-1" /> Add Ref
                          </button>
                        )}
                        {selectedModelId && <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Reference Loaded</span>}
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {(selectedModelId ? models.find(m => m.id === selectedModelId)?.referenceImages : settings.referenceImages)?.slice(0, 10).map((img, i) => (
                          <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-800 relative group">
                            <img src={img} className="w-full h-full object-cover" alt="DNA Reference" />
                            {selectedModelId === '' && (
                              <button 
                                onClick={() => setSettings(prev => ({
                                  ...prev,
                                  referenceImages: prev.referenceImages?.filter((_, idx) => idx !== i)
                                }))}
                                className="absolute top-1 right-1 bg-black/60 opacity-0 group-hover:opacity-100 p-1 rounded-sm text-white transition-opacity"
                              >
                                <ChevronLeft size={8} className="rotate-45" />
                              </button>
                            )}
                          </div>
                        ))}
                        {selectedModelId === '' && (!settings.referenceImages || settings.referenceImages.length < 10) && (
                          <button 
                            onClick={() => manualRefInputRef.current?.click()}
                            className="aspect-square rounded-lg border border-dashed border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
                          >
                            <Plus size={16} className="text-slate-600" />
                          </button>
                        )}
                      </div>
                      <input ref={manualRefInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleManualRefUpload} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <div className="absolute -top-2 left-4 bg-slate-950 px-2 text-[8px] font-black uppercase tracking-widest text-slate-500 z-10">
                    Character Prompt Reference
                  </div>
                  <textarea 
                    className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 pt-8 text-sm font-bold focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-600 outline-none transition-all h-32 resize-none leading-relaxed placeholder:text-slate-700 uppercase tracking-tighter italic"
                    placeholder="A professional Brazilian male model in his late 20s with short hair and a confident pose..."
                    value={settings.modelDescription}
                    onChange={(e) => {
                      const isSwitchingFromSaved = selectedModelId !== '';
                      setSelectedModelId('');
                      setSettings({
                        ...settings, 
                        modelDescription: e.target.value, 
                        referenceImages: isSwitchingFromSaved ? [] : settings.referenceImages
                      });
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Config Options */}
            <section className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-200">Keep Original Background</h3>
                   <p className="text-[8px] text-slate-500 uppercase font-black">Preserve existing set/location</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, keepBackground: !settings.keepBackground})}
                  className="text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  {settings.keepBackground ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-700" />}
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Preservation Focus</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['Clothing & Texture', 'Pose & Silhouette', 'Balanced'] as PreservationFocus[]).map(focus => (
                    <button
                      key={focus}
                      onClick={() => setSettings({...settings, preservationFocus: focus})}
                      className={`px-6 py-4 rounded-2xl border flex items-center justify-between transition-all ${
                        settings.preservationFocus === focus 
                        ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' 
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{focus}</span>
                      {settings.preservationFocus === focus && <CheckCircle size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="p-4 bg-emerald-950/20 rounded-2xl border border-emerald-900/30 flex items-start space-x-3">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                Garment Integrity Lock: Clothing colors, fabrics, and fit are protected by Gemini 2.5 Flash Image.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Display Area */}
        <main className="flex-1 bg-slate-950 flex flex-col p-8 overflow-y-auto custom-scrollbar relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col items-center justify-center space-y-8">
            {resultUrl ? (
              <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-700">
                {/* Original for comparison */}
                <div className="flex flex-col items-center space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-900 px-3 py-1 rounded-full">ORIGINAL</span>
                  <div className="w-64 aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border border-white/5 opacity-50 grayscale sm:w-80">
                    <img src={settings.originalImage} className="w-full h-full object-cover" alt="Original Reference" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center space-y-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 flex items-center">
                    <Sparkles size={12} className="mr-2" /> AI MODEL SWAP COMPLETE
                  </span>
                  <div className="relative w-full max-w-lg aspect-[3/4] bg-slate-900 rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] group">
                    <img src={resultUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.03]" alt="Result" />
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = resultUrl;
                          link.download = `model-swap-${Date.now()}.png`;
                          link.click();
                        }}
                        className="flex items-center space-x-2 px-8 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
                      >
                        <Download size={16} />
                        <span>Download Edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-3xl aspect-[16/9] bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 flex items-center justify-center shadow-2xl animate-pulse">
                      <ShoppingBag size={48} className="text-slate-800" />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-emerald-500 p-2 rounded-full text-white shadow-xl">
                      <User size={16} />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase">Virtual Model Room</h2>
                    <p className="text-xs text-slate-500 uppercase font-black tracking-widest max-w-md mx-auto leading-relaxed">Swap the person in any fashion photo with a custom AI character while locking the original product details in place.</p>
                 </div>
                 {!settings.originalImage && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40"
                    >
                      Start Production
                    </button>
                 )}
              </div>
            )}
            {isGenerating && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60] animate-in fade-in duration-300">
                 <div className="relative">
                    <div className="w-24 h-24 border-4 border-emerald-500/10 rounded-full"></div>
                    <div className="absolute inset-0 w-24 h-24 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                    <Shirt className="absolute inset-0 m-auto text-emerald-500 animate-pulse" size={32} />
                 </div>
                 <p className="mt-8 text-xs font-black uppercase tracking-[0.5em] text-emerald-500 animate-pulse">Recasting Identity...</p>
                 <div className="mt-4 flex items-center space-x-2">
                    <span className="text-[10px] font-black text-slate-600 uppercase">Locking Garment Geometries</span>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
