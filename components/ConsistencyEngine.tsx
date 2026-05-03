
import React, { useState, useEffect, useRef } from 'react';
import { CloneModel, CloneGeneration, AspectRatio, CharacterDNA } from '../types';
import { generateCloneScene, craftPrompt } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { useFirebase } from './FirebaseProvider';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { 
  ChevronLeft, Plus, Trash2, Sparkles, 
  Image as ImageIcon, User, Info, CreditCard,
  Play, Download, History, X, Upload, 
  CheckCircle2, AlertCircle, Loader2, FileText,
  Dna, Zap, Layers, Settings2, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConsistencyEngineProps {
  onBack: () => void;
  onGenerateScript?: (modelId: string) => void;
}

export const ConsistencyEngine: React.FC<ConsistencyEngineProps> = ({ onBack, onGenerateScript }) => {
  const { user, credits } = useFirebase();
  const [models, setModels] = useState<CloneModel[]>([]);
  const [generations, setGenerations] = useState<CloneGeneration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingModelId, setViewingModelId] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  
  // New/Edit Model Form State
  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    dna: {
      faceStructure: '',
      skinTone: '',
      hairSignature: '',
      bodyProportions: '',
      seed: Math.floor(Math.random() * 1000000)
    } as CharacterDNA,
    referenceImages: [] as string[]
  });
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Scene Creation State
  const [sceneDescription, setSceneDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [quality, setQuality] = useState<'Standard' | 'HD' | '4K'>('HD');
  const [batchSize, setBatchSize] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCrafting, setIsCrafting] = useState(false);
  const [resultImages, setResultImages] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const modelsQuery = query(collection(db, 'models'), where('uid', '==', user.uid));
    const unsubscribeModels = onSnapshot(modelsQuery, (snapshot) => {
      const modelsData = snapshot.docs.map(doc => doc.data() as CloneModel);
      setModels(modelsData.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'models');
    });

    const gensQuery = query(collection(db, 'generations'), where('uid', '==', user.uid));
    const unsubscribeGens = onSnapshot(gensQuery, (snapshot) => {
      const gensData = snapshot.docs.map(doc => doc.data() as CloneGeneration);
      setGenerations(gensData.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'generations');
    });

    return () => {
      unsubscribeModels();
      unsubscribeGens();
    };
  }, [user]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = (e.target.files ? Array.from(e.target.files) : []) as File[];
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressBase64(reader.result as string, 512, 512, 0.5);
        setNewModel(prev => ({
          ...prev,
          referenceImages: [...prev.referenceImages, compressed].slice(0, 10)
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSaveModel = async () => {
    if (!user) return;
    
    const { name, dna, referenceImages } = newModel;
    if (!name || !dna.faceStructure || !dna.skinTone || !dna.hairSignature || !dna.bodyProportions || referenceImages.length < 5) {
      setSaveError(`Please complete all fields and upload at least 5 reference images (Current: ${referenceImages.length}/5)`);
      return;
    }

    setSaveError(null);
    setIsSavingModel(true);
    
    try {
      const modelId = editingModelId || `model-${Date.now()}`;
      const model: CloneModel = {
        id: modelId,
        uid: user.uid,
        name: newModel.name,
        description: newModel.description,
        dna: newModel.dna,
        referenceImages: newModel.referenceImages,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'models', modelId), model);
      
      setIsModalOpen(false);
      setEditingModelId(null);
      setNewModel({ 
        name: '', 
        description: '', 
        dna: { faceStructure: '', skinTone: '', hairSignature: '', bodyProportions: '', seed: Math.floor(Math.random() * 1000000) },
        referenceImages: [] 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'models');
    } finally {
      setIsSavingModel(false);
    }
  };

  const handleCraft = async () => {
    const model = models.find(m => m.id === selectedModelId);
    if (!model || !sceneDescription) return;

    setIsCrafting(true);
    try {
      const crafted = await craftPrompt(model.dna, sceneDescription);
      setPrompt(crafted);
    } catch (error: any) {
      console.error("Crafting failed:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to craft prompt. Please try again.");
      }
    } finally {
      setIsCrafting(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    const model = models.find(m => m.id === selectedModelId);
    if (!model || !prompt) return;

    setIsGenerating(true);
    setResultImages([]);
    const newResults: string[] = [];
    
    try {
      for (let i = 0; i < batchSize; i++) {
        const currentSeed = model.dna.seed + i;
        const result = await generateCloneScene(model, prompt, aspectRatio, currentSeed);
        if (result) {
          const compressedResult = await compressBase64(result, 1024, 1024, 0.7);
          newResults.push(compressedResult);
          const genId = `gen-${Date.now()}-${i}`;
          const generation: CloneGeneration = {
            id: genId,
            uid: user.uid,
            modelId: model.id,
            prompt,
            resultUrl: compressedResult,
            aspectRatio,
            quality,
            batchSize,
            seed: currentSeed,
            createdAt: Date.now()
          };
          await setDoc(doc(db, 'generations', genId), generation);
        }
      }
      setResultImages(newResults);
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate images. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);
  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.dna.faceStructure.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl transition-colors border border-white/5"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Dna className="text-blue-500" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Consistency Engine v2.0</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase">AI Influencer DNA</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setEditingModelId(null);
                setNewModel({ 
                  name: '', 
                  description: '', 
                  dna: { faceStructure: '', skinTone: '', hairSignature: '', bodyProportions: '', seed: Math.floor(Math.random() * 1000000) },
                  referenceImages: [] 
                });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-blue-600/20"
            >
              <Plus size={20} />
              Define New DNA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: DNA Library */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                  <Layers size={14} />
                  DNA Library
                </h2>
                <span className="text-[10px] font-black bg-slate-950 px-2 py-1 rounded-md text-slate-400">{models.length}</span>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                <input 
                  type="text"
                  placeholder="Search DNA..."
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-12 pr-4 py-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredModels.map(model => (
                  <div 
                    key={model.id}
                    onClick={() => setSelectedModelId(model.id)}
                    className={`group relative bg-slate-950 border rounded-3xl p-4 cursor-pointer transition-all ${
                      selectedModelId === model.id ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        <img src={model.referenceImages[0]} alt={model.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black uppercase italic text-sm truncate">{model.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-900 text-slate-500 rounded border border-white/5">{model.dna.faceStructure}</span>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-slate-900 text-slate-500 rounded border border-white/5">{model.dna.hairSignature}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onGenerateScript?.(model.id); }}
                        className="p-2 text-slate-600 hover:text-blue-500 transition-all"
                        title="Generate Script"
                      >
                        <FileText size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingModelId(model.id); setNewModel({ ...model }); setIsModalOpen(true); }}
                        className="p-2 text-slate-600 hover:text-yellow-500 transition-all"
                        title="Edit DNA"
                      >
                        <Settings2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Delete DNA?')) deleteDoc(doc(db, 'models', model.id)); }}
                        className="p-2 text-slate-600 hover:text-red-500 transition-all"
                        title="Delete DNA"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content: Generation Engine */}
          <div className="lg:col-span-8 space-y-8">
            {selectedModel ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Prompt Crafter */}
                <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Prompt Crafter</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Linked to: {selectedModel.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-2">
                        <ImageIcon size={12} className="text-blue-500" />
                        Scene Selection
                      </label>
                      <div className="relative">
                        <textarea 
                          placeholder="Describe the scene (e.g., 'At a high-end café in Paris, sunset lighting')..."
                          className="w-full bg-slate-950 border border-white/10 rounded-3xl px-6 py-5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px] resize-none pr-32"
                          value={sceneDescription}
                          onChange={(e) => setSceneDescription(e.target.value)}
                        />
                        <button 
                          onClick={handleCraft}
                          disabled={isCrafting || !sceneDescription}
                          className="absolute right-4 bottom-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl font-black uppercase italic text-[10px] tracking-widest transition-all flex items-center gap-2"
                        >
                          {isCrafting ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          Craft
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 px-2">
                        <Settings2 size={12} className="text-blue-500" />
                        Final Generation Prompt
                      </label>
                      <textarea 
                        placeholder="The crafted prompt will appear here..."
                        className="w-full bg-slate-950 border border-white/10 rounded-3xl px-6 py-5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[120px] resize-none text-slate-400 italic"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Aspect Ratio</label>
                        <select 
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:border-blue-500 outline-none transition-all appearance-none"
                        >
                          <option value="9:16">9:16 (Reel)</option>
                          <option value="1:1">1:1 (Post)</option>
                          <option value="16:9">16:9 (Video)</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Quality</label>
                        <select 
                          value={quality}
                          onChange={(e) => setQuality(e.target.value as any)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:border-blue-500 outline-none transition-all appearance-none"
                        >
                          <option value="Standard">Standard</option>
                          <option value="HD">HD Production</option>
                          <option value="4K">4K Cinematic</option>
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Batch Size</label>
                        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                          {[1, 2, 4].map(size => (
                            <button
                              key={size}
                              onClick={() => setBatchSize(size)}
                              className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${batchSize === size ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                              x{size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt}
                      className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-[1.5rem] font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                    >
                      {isGenerating ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        <>
                          <Play size={20} />
                          Generate Batch
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Result Gallery */}
                {resultImages.length > 0 && (
                  <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Batch Output</h3>
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Seed: {selectedModel.dna.seed}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {resultImages.map((img, idx) => (
                        <div key={idx} className={`relative rounded-3xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl group ${
                          aspectRatio === '1:1' ? 'aspect-square' : 
                          aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'
                        }`}>
                          <img src={img} alt="Generated" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button 
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = img;
                                link.download = `dna-${selectedModel.name}-${idx}.png`;
                                link.click();
                              }}
                              className="p-4 bg-blue-600 rounded-2xl text-white hover:scale-110 transition-transform"
                            >
                              <Download size={24} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History Gallery */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2 px-2">
                    <History size={14} />
                    Asset History
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {generations.filter(g => g.modelId === selectedModelId).map(gen => (
                      <div key={gen.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/5">
                        <img src={gen.resultUrl} alt={gen.prompt} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                          <p className="text-[8px] text-white line-clamp-2 leading-tight mb-2">{gen.prompt}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[6px] text-slate-400 uppercase font-black">Seed: {gen.seed}</span>
                            <button onClick={() => {
                              const link = document.createElement('a');
                              link.href = gen.resultUrl;
                              link.download = `history-${gen.id}.png`;
                              link.click();
                            }} className="text-blue-400 hover:text-white"><Download size={10} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[600px] bg-slate-900/20 border border-dashed border-white/10 rounded-[3rem] flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 text-slate-700">
                  <Dna size={40} />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl font-black uppercase italic tracking-tighter">Select a DNA Profile</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Choose an influencer identity from the library to start generating consistent content.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DNA Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Dna size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic">
                      {editingModelId ? 'Edit DNA Profile' : 'Define Character DNA'}
                    </h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      Persistent Identity Configuration
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 hover:bg-white/20 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Influencer Name</label>
                    <input 
                      type="text"
                      placeholder="e.g., Luna Digital"
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      value={newModel.name}
                      onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Face Structure</label>
                      <input 
                        type="text"
                        placeholder="e.g., Heart-shaped"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newModel.dna.faceStructure}
                        onChange={(e) => setNewModel({ ...newModel, dna: { ...newModel.dna, faceStructure: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Skin Tone</label>
                      <input 
                        type="text"
                        placeholder="e.g., Olive/Sun-kissed"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newModel.dna.skinTone}
                        onChange={(e) => setNewModel({ ...newModel, dna: { ...newModel.dna, skinTone: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Hair Signature</label>
                      <input 
                        type="text"
                        placeholder="e.g., Platinum Bob"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newModel.dna.hairSignature}
                        onChange={(e) => setNewModel({ ...newModel, dna: { ...newModel.dna, hairSignature: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Body Proportions</label>
                      <input 
                        type="text"
                        placeholder="e.g., Athletic/Petite"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newModel.dna.bodyProportions}
                        onChange={(e) => setNewModel({ ...newModel, dna: { ...newModel.dna, bodyProportions: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Identity Seed (Fixed)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={newModel.dna.seed}
                        onChange={(e) => setNewModel({ ...newModel, dna: { ...newModel.dna, seed: parseInt(e.target.value) } })}
                      />
                      <button 
                        onClick={() => setNewModel({ ...newModel, dna: { ...newModel.dna, seed: Math.floor(Math.random() * 1000000) } })}
                        className="p-4 bg-slate-950 border border-white/10 rounded-2xl hover:bg-slate-800 transition-all text-slate-500"
                      >
                        <Zap size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2 flex items-center justify-between">
                      Reference Images (5+ required)
                      <span className={`text-[10px] ${newModel.referenceImages.length >= 5 ? 'text-green-500' : 'text-blue-500'}`}>
                        {newModel.referenceImages.length} uploaded
                      </span>
                    </label>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-[2rem] p-8 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group bg-slate-950/30"
                    >
                      <input 
                        type="file"
                        ref={fileInputRef}
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                      <Upload className="mx-auto text-slate-700 group-hover:text-blue-500 transition-colors mb-4" size={40} />
                      <p className="text-sm font-bold text-slate-400">Upload Reference Set</p>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {newModel.referenceImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                          <img src={img} alt="Ref" className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewModel(prev => ({
                                ...prev,
                                referenceImages: prev.referenceImages.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-950/50 border-t border-white/5 flex flex-col md:flex-row gap-4">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-2xl font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <div className="flex-[2] flex flex-col gap-2">
                  <button 
                    onClick={handleSaveModel}
                    disabled={isSavingModel}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase italic tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                  >
                    {isSavingModel ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Lock Identity DNA
                      </>
                    )}
                  </button>
                  {saveError && (
                    <p className="text-[10px] text-red-400 font-black uppercase tracking-widest text-center animate-pulse">
                      {saveError}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
