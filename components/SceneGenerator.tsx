import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Sparkles, Copy, Check, Download, Layers,
  Camera, Settings2, Sliders, Dna, FileText, Shuffle,
  User, ChevronDown, Wand2, Bookmark, BookmarkCheck,
  LayoutGrid, History, Trash2, ExternalLink, Film,
  Image as ImageIcon, Loader2, Eye
} from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { CloneModel } from '../types';
import { generateImage } from '../services/geminiService';

interface SceneGeneratorProps {
  onBack: () => void;
}

interface SavedScene {
  id: string;
  uid: string;
  context: string;
  camera: string;
  fullPrompt: string;
  dnaProfile?: string;
  styleIdentity?: string;
  createdAt: number;
}

const STYLE_PRESETS = [
  { id: 'daily', label: 'Daily Activity', value: 'natural daily lifestyle, candid moments, casual urban vibe, relaxed energy' },
  { id: 'morning', label: 'Morning Routine', value: 'morning soft light, cozy atmosphere, waking up, fresh start energy' },
  { id: 'outdoor', label: 'Outdoor Roaming', value: 'outdoor adventure, city exploration, street style photography, high energy' },
  { id: 'luxury', label: 'High-End Luxury', value: 'premium luxury aesthetic, elegant poise, high fashion influence, sophisticated' },
  { id: 'tech', label: 'Tech & Gadgetry', value: 'cyberpunk tech vibe, glowing screens, digital nomad lifestyle, futuristic' },
  { id: 'traditional', label: 'Traditional Heritage', value: 'traditional cultural heritage, respectful but modern, ancestral roots' },
  { id: 'gym', label: 'Athletic/Workout', value: 'high intensity athletic, sweat glistening, determination, sportswear focus' },
  { id: 'office', label: 'Professional Office', value: 'boss energy, workspace focus, intellectual vibe, business casual' },
  { id: 'street', label: 'Streetwear Edgy', value: 'bold streetwear, graffiti backgrounds, rebellious spirit, high contrast' },
  { id: 'night', label: 'Night Owl', value: 'noir night lighting, neon reflections, mysterious energy, cinematic dusk' },
  { id: 'travel', label: 'Global Traveler', value: 'earthy travel tones, nomadic spirit, airport or hotel lobby vibes, curious' },
  { id: 'artistic', label: 'Artistic Creator', value: 'painterly light, messy creative studio, contemplative, artistic focus' },
  { id: 'cozy', label: 'Cozy Homebody', value: 'warm knit textures, soft home interior, peaceful domesticity, low contrast' },
  { id: 'editorial', label: 'Editorial Vogue', value: 'harsh studio lighting, striking poses, high fashion editorial, magazine style' },
  { id: 'influencer', label: 'Social Media Pro', value: 'highly staged vlog style, ring light reflections, speaking to camera, vibrant' },
];

const SCENE_PRESETS = [
  { id: 'golden-hour', label: 'Golden Hour Street Style', value: 'walking along a vibrant city avenue during golden hour, long shadows, warm atmospheric light' },
  { id: 'rooftop-sunset', label: 'Rooftop Sunset Vlog', value: 'standing on a modern glass-walled rooftop at sunset, city skyline illuminated in the background' },
  { id: 'cafe-minimalist', label: 'Minimalist Café Work', value: 'sitting in a bright minimalist Scandi-style café, natural window light, holding a premium ceramic cup' },
  { id: 'neon-night', label: 'Neon Cyberpunk Walk', value: 'walking through a rain-slicked city alley at night, glowing neon signs reflecting on puddles' },
  { id: 'luxury-lobby', label: 'Luxury Hotel Lobby', value: 'descending a grand marble staircase in a five-star hotel lobby, soft ambient chandelier lighting' },
  { id: 'nature-retreat', label: 'Nature Retreat Morning', value: 'standing on a wooden deck surrounded by tropical greenery in early morning mist' },
  { id: 'studio-portrait', label: 'High Fashion Studio', value: 'posing in a professional photo studio, stark white background, high-contrast editorial lighting' },
  { id: 'urban-rickshaw', label: 'Dhaka Rickshaw Ride', value: 'riding a vibrantly decorated rickshaw through a bustling old town street, motion blur movement' },
  { id: 'library-study', label: 'Moody Library Study', value: 'browsing through towering dark wood bookshelves in a prestigious old library, dusty light shafts' },
  { id: 'balcony-skincare', label: 'Morning Skincare Routine', value: 'applying serum in front of a modern bathroom mirror, soft morning light filtered through plants' }
];

const CAMERA_PRESETS = [
  { id: 'tracking', label: 'Cinematic Tracking', value: 'cinematic tracking shot following the subject' },
  { id: 'push-in', label: 'Slow Push-in', value: 'slow cinematic push-in toward the subject' },
  { id: 'handheld', label: 'Handheld Documentary', value: 'handheld documentary camera movement' },
  { id: 'wide', label: 'Wide Establishing', value: 'wide cinematic establishing shot' },
  { id: 'orbit', label: 'Slow Orbit', value: 'slow cinematic orbit camera movement around subject' },
  { id: 'over-shoulder', label: 'Over-the-shoulder', value: 'over-the-shoulder perspective framing' },
  { id: 'low-angle', label: 'Powerful Low Angle', value: 'low angle heroic upward perspective' },
  { id: 'close-up', label: 'Intimate Close-up', value: 'extreme close-up focused on eyes and facial expression' }
];

export const SceneGenerator: React.FC<SceneGeneratorProps> = ({ onBack }) => {
  const { user } = useFirebase();
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [models, setModels] = useState<CloneModel[]>([]);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  
  const [dnaProfile, setDnaProfile] = useState("24 year old Bangladeshi female, warm brown skin tone, oval face structure, defined cheekbones, dark brown almond shaped eyes, natural eyebrows, wavy shoulder length black hair with middle part, slim build, 5'5 height");
  const [styleIdentity, setStyleIdentity] = useState("trendy modern lifestyle influencer aesthetic, urban Bangladeshi fashion style, confident personality, natural expressions");
  
  const [selectedScene, setSelectedScene] = useState(SCENE_PRESETS[0].value);
  const [selectedCamera, setSelectedCamera] = useState(CAMERA_PRESETS[0].value);

  const [generatedPrompts, setGeneratedPrompts] = useState<{ id: string, context: string, camera: string, fullPrompt: string, isSaved?: boolean }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModelsDropdown, setShowModelsDropdown] = useState(false);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Fetch Models
    const modelsQuery = query(collection(db, 'models'), where('uid', '==', user.uid));
    const unsubscribeModels = onSnapshot(modelsQuery, (snapshot) => {
      setModels(snapshot.docs.map(doc => doc.data() as CloneModel));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'models'));

    // Fetch Saved Scenes
    const scenesQuery = query(collection(db, 'saved_scenes'), where('uid', '==', user.uid));
    const unsubscribeScenes = onSnapshot(scenesQuery, (snapshot) => {
      setSavedScenes(snapshot.docs.map(doc => doc.data() as SavedScene).sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'saved_scenes'));

    return () => {
      unsubscribeModels();
      unsubscribeScenes();
    };
  }, [user]);

  const characterIdentityLock = "same recurring character, consistent facial identity, cinematic character continuity, recurring protagonist appearing across scenes";
  const faceStabilityStack = "ultra realistic skin texture, natural pores, high facial fidelity, detailed facial features, photorealistic portrait quality";
  const cinematicRealismStack = "cinematic film still, production still photography, stills archive reference, natural lighting realism, subtle film grain, HDR photography, professional color grading";
  const lensStabilityStack = "shot on professional cinema camera, 50mm lens or 85mm portrait lens, shallow depth of field, realistic perspective";

  const constructPrompt = (scene: string, camera: string) => {
    return [
      characterIdentityLock,
      dnaProfile,
      styleIdentity,
      faceStabilityStack,
      scene,
      camera,
      cinematicRealismStack,
      lensStabilityStack
    ].filter(Boolean).join(",\n\n");
  };

  const handleGenerate = () => {
    const fullPrompt = constructPrompt(selectedScene, selectedCamera);
    const newPrompt = {
      id: Math.random().toString(36).substr(2, 9),
      context: selectedScene,
      camera: selectedCamera,
      fullPrompt,
      isSaved: false
    };
    setGeneratedPrompts([newPrompt, ...generatedPrompts]);
  };

  const handleShuffleGenerate = () => {
    const randomScene = SCENE_PRESETS[Math.floor(Math.random() * SCENE_PRESETS.length)].value;
    const randomCamera = CAMERA_PRESETS[Math.floor(Math.random() * CAMERA_PRESETS.length)].value;
    const fullPrompt = constructPrompt(randomScene, randomCamera);
    const newPrompt = {
      id: Math.random().toString(36).substr(2, 9),
      context: randomScene,
      camera: randomCamera,
      fullPrompt,
      isSaved: false
    };
    setGeneratedPrompts([newPrompt, ...generatedPrompts]);
  };

  const handleSaveScene = async (promptData: { context: string, camera: string, fullPrompt: string, id: string }) => {
    if (!user) return;
    setSaveLoading(promptData.id);
    try {
      const sceneId = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const savedScene: SavedScene = {
        id: sceneId,
        uid: user.uid,
        context: promptData.context,
        camera: promptData.camera,
        fullPrompt: promptData.fullPrompt,
        dnaProfile,
        styleIdentity,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'saved_scenes', sceneId), savedScene);
      
      setGeneratedPrompts(prev => prev.map(p => p.id === promptData.id ? { ...p, isSaved: true } : p));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'saved_scenes');
    } finally {
      setSaveLoading(null);
    }
  };

  const handleDeleteSaved = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'saved_scenes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'saved_scenes');
    }
  };

  const selectModelDNA = (model: CloneModel) => {
    const dnaString = [
      model.dna.faceStructure,
      model.dna.skinTone,
      model.dna.hairSignature,
      model.dna.bodyProportions
    ].filter(Boolean).join(", ");
    setDnaProfile(dnaString);
    setShowModelsDropdown(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePreview = async (id: string, prompt: string) => {
    setPreviewLoading(id);
    try {
      const imageUrl = await generateImage(prompt, 'gemini-2.5-flash-image', '9:16');
      if (imageUrl) {
        setPreviewImages(prev => ({ ...prev, [id]: imageUrl }));
      }
    } catch (error) {
      console.error("Preview generation failed:", error);
    } finally {
      setPreviewLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-2 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={20} />
              <span className="font-bold uppercase tracking-widest text-xs">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase italic text-white/90">Scene Generator</h1>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Cinematic Identity Anchoring</p>
              </div>
            </div>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-sm self-start">
            <button 
              onClick={() => setActiveTab('generate')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'generate' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid size={14} /> Generate
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'saved' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History size={14} /> Library ({savedScenes.length})
            </button>
          </div>
        </div>

        {activeTab === 'generate' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Control Panel */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl backdrop-blur-sm">
                
                {/* Character Anchor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Dna className="text-emerald-500" size={16} />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity Anchor</h2>
                    </div>
                    {models.length > 0 && (
                      <div className="relative">
                        <button onClick={() => setShowModelsDropdown(!showModelsDropdown)} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-full transition-all border border-emerald-500/20">
                          <User size={10} /> Saved Model <ChevronDown size={10} />
                        </button>
                        {showModelsDropdown && (
                          <div className="absolute top-full right-0 mt-2 w-56 bg-slate-900 border border-white/5 rounded-2xl shadow-2xl z-50 overflow-hidden py-1">
                            {models.map(m => (
                              <button key={m.id} onClick={() => selectModelDNA(m)} className="w-full text-left px-4 py-3 hover:bg-emerald-600/10 text-[10px] font-bold uppercase transition-colors border-b border-white/5 last:border-0 flex items-center gap-2">
                                <img src={m.referenceImages[0]} className="w-6 h-6 rounded-md object-cover" alt="" referrerPolicy="no-referrer" />
                                <span className="flex-1 truncate">{m.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <textarea 
                    className="w-full h-24 bg-slate-950 border border-white/5 rounded-2xl p-5 text-xs focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all resize-none text-slate-300 custom-scrollbar"
                    value={dnaProfile}
                    onChange={(e) => setDnaProfile(e.target.value)}
                    placeholder="DNA Profile..."
                  />
                </div>

                {/* Atmosphere */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="text-emerald-500" size={16} />
                      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Atmosphere</h2>
                    </div>
                    <select 
                      onChange={(e) => setStyleIdentity(e.target.value)}
                      className="bg-slate-950 border border-white/10 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 outline-none"
                    >
                      <option value="">Preset Tone</option>
                      {STYLE_PRESETS.map(p => <option key={p.id} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <textarea 
                    className="w-full h-20 bg-slate-950 border border-white/5 rounded-2xl p-5 text-xs focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all resize-none text-slate-300 custom-scrollbar"
                    value={styleIdentity}
                    onChange={(e) => setStyleIdentity(e.target.value)}
                    placeholder="Style Identity..."
                  />
                </div>

                {/* Module Selectors */}
                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scene Module</label>
                    <select 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500/50"
                      value={selectedScene}
                      onChange={(e) => setSelectedScene(e.target.value)}
                    >
                      {SCENE_PRESETS.map(p => <option key={p.id} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Camera Module</label>
                    <select 
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500/50"
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                    >
                      {CAMERA_PRESETS.map(p => <option key={p.id} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={handleGenerate} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase tracking-widest italic text-xs transition-all shadow-xl shadow-emerald-600/20 active:scale-95">
                    Generate
                  </button>
                  <button onClick={handleShuffleGenerate} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95" title="Random Shuffle">
                    <Shuffle size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Output Stream */}
            <div className="lg:col-span-8 flex flex-col">
              <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] flex flex-col h-[850px] shadow-2xl relative overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/60 rounded-t-[3rem] z-10">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-600/10 rounded-xl"><FileText className="text-emerald-500" size={20} /></div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Prompt Stream</h3>
                  </div>
                  {generatedPrompts.length > 0 && (
                    <button onClick={() => setGeneratedPrompts([])} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 border border-white/5">Clear</button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {generatedPrompts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                      <Camera size={64} className="text-slate-700" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Awaiting Cinematic Configuration...</p>
                    </div>
                  ) : (
                    generatedPrompts.map((p) => (
                      <div key={p.id} className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:border-emerald-500/30 transition-all group relative animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
                        <div className="flex justify-between items-start">
                          <div className="space-y-3">
                            <h4 className="text-lg font-black uppercase tracking-tighter italic">{SCENE_PRESETS.find(s => s.value === p.context)?.label || 'Custom Scene'}</h4>
                            <div className="flex flex-wrap gap-2">
                               <span className="px-3 py-1 bg-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-500/60 border border-emerald-500/10">{CAMERA_PRESETS.find(c => c.value === p.camera)?.label || 'Custom Lens'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handlePreview(p.id, p.fullPrompt)}
                              disabled={previewLoading === p.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                previewImages[p.id] 
                                  ? 'bg-blue-600/10 border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white' 
                                  : 'bg-slate-900 border-white/5 text-slate-400 hover:text-blue-500 hover:border-blue-500/50 active:scale-95'
                              }`}
                              title="Generate Preview"
                            >
                              {previewLoading === p.id ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                            </button>
                            <button 
                              onClick={() => handleSaveScene(p)}
                              disabled={p.isSaved || saveLoading === p.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                p.isSaved 
                                  ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 cursor-default' 
                                  : 'bg-slate-900 border-white/5 text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 active:scale-95'
                              }`}
                            >
                              {saveLoading === p.id ? <Shuffle size={20} className="animate-spin" /> : p.isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                            </button>
                            <button onClick={() => handleCopy(p.id, p.fullPrompt)} className={`p-4 rounded-2xl border transition-all ${copiedId === p.id ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:border-white/20 active:scale-95'}`}>
                              {copiedId === p.id ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                          </div>
                        </div>

                        {previewImages[p.id] && (
                          <div className="relative group/img overflow-hidden rounded-3xl aspect-[9/16] bg-slate-900 border border-white/5">
                            <img 
                              src={previewImages[p.id]} 
                              alt="Scene Preview" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-end">
                               <button 
                                 onClick={() => window.open(previewImages[p.id], '_blank')}
                                 className="p-3 bg-white/10 hover:bg-white text-white hover:text-black rounded-xl backdrop-blur-md transition-all"
                               >
                                 <ExternalLink size={18} />
                               </button>
                            </div>
                          </div>
                        )}

                        <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 text-[11px] text-slate-400 leading-relaxed font-mono whitespace-pre-wrap italic shadow-inner">
                          {p.fullPrompt}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Library View */
          <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] min-h-[700px] p-10 shadow-2xl">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Your Production Archive</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/60 mt-1">Consistency Locked Master Prompts</p>
              </div>
              <LayoutGrid size={32} className="text-slate-800" />
            </div>

            {savedScenes.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center space-y-6 opacity-30 text-center">
                <History size={64} className="text-slate-700" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No projects archived yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {savedScenes.map(s => (
                  <div key={s.id} className="bg-slate-950 border border-white/5 rounded-[2.5rem] p-8 space-y-6 hover:border-emerald-500/50 transition-all group relative shadow-xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDeleteSaved(s.id)} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20" title="Delete Saved Scene">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500"><Film size={24} /></div>
                        <div>
                          <h4 className="text-xl font-black italic uppercase tracking-tighter truncate max-w-[200px] text-white/90">{SCENE_PRESETS.find(p => p.value === s.context)?.label || 'Direct Export'}</h4>
                          <p className="text-[9px] font-black text-slate-500 flex items-center gap-1 uppercase tracking-widest">
                            <Settings2 size={10} /> {new Date(s.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-400 border border-white/5">{s.camera.split(' ').slice(0, 3).join(' ')}</span>
                      </div>

                      <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 text-[10px] text-slate-500 leading-relaxed font-mono max-h-32 overflow-y-auto italic custom-scrollbar">
                        {s.fullPrompt}
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          onClick={() => handlePreview(s.id, s.fullPrompt)}
                          disabled={previewLoading === s.id}
                          className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border ${
                            previewImages[s.id]
                              ? 'bg-blue-600/10 border-blue-500 text-blue-500 hover:bg-blue-600 hover:text-white'
                              : 'bg-slate-900 border-white/5 text-slate-400 hover:text-blue-500 hover:border-blue-500/50'
                          }`}
                        >
                          {previewLoading === s.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                          Preview Visual
                        </button>
                        <button onClick={() => handleCopy(s.id, s.fullPrompt)} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 text-white">
                          {copiedId === s.id ? <Check size={14} /> : <Copy size={14} />}
                          {copiedId === s.id ? 'Copied' : 'Copy Meta Prompt'}
                        </button>
                      </div>

                      {previewImages[s.id] && (
                        <div className="mt-4 rounded-2xl overflow-hidden border border-white/5 animate-in fade-in zoom-in-95 duration-500">
                          <img 
                            src={previewImages[s.id]} 
                            alt="Scene Preview" 
                            className="w-full h-auto object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
