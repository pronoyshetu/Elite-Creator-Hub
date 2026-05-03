
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileText, Sparkles, Copy, Download, 
  RotateCcw, Check, Clock, Zap, Target,
  MessageSquare, User, Save, Trash2, Search, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from './FirebaseProvider';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, 
  doc, setDoc, deleteDoc, orderBy 
} from 'firebase/firestore';
import { formatScript, generateScript, generatePosePrompts, generateCloneScene, generateImage } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { ScriptData, ScriptTone, ScriptFormat, FormattedScript, CloneModel, PosePromptData } from '../types';
import { jsPDF } from 'jspdf';

interface ScriptStudioProps {
  onBack: () => void;
  initialRawScript?: string;
  linkedInfluencerId?: string;
}

export const ScriptStudio: React.FC<ScriptStudioProps> = ({ 
  onBack, 
  initialRawScript = '',
  linkedInfluencerId
}) => {
  const { user } = useFirebase();
  const [rawScript, setRawScript] = useState(initialRawScript);
  const [tone, setTone] = useState<ScriptTone>('Viral');
  const [format, setFormat] = useState<ScriptFormat>('Short-form');
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedScript, setFormattedScript] = useState<FormattedScript | null>(null);
  const [savedScripts, setSavedScripts] = useState<ScriptData[]>([]);
  const [savedPosePrompts, setSavedPosePrompts] = useState<PosePromptData[]>([]);
  const [models, setModels] = useState<CloneModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>(linkedInfluencerId || '');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'pose-generator'>('editor');
  const [editorMode, setEditorMode] = useState<'format' | 'generate'>('format');
  const [searchQuery, setSearchQuery] = useState('');

  // Pose Generator State
  const [poseModelId, setPoseModelId] = useState<string>('');
  const [poseMood, setPoseMood] = useState('');
  const [poseReferenceUrl, setPoseReferenceUrl] = useState('');
  const [posePrompts, setPosePrompts] = useState<string[]>([]);
  const [isGeneratingPoses, setIsGeneratingPoses] = useState(false);
  const [posePreviews, setPosePreviews] = useState<Record<number, string>>({});
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<Record<number, boolean>>({});

  // Script Preview State
  const [scriptPreviews, setScriptPreviews] = useState<{hook?: string, body?: string, cta?: string}>({});
  const [isGeneratingScriptPreview, setIsGeneratingScriptPreview] = useState<{hook?: boolean, body?: boolean, cta?: boolean}>({});

  useEffect(() => {
    if (!user) return;

    const scriptsQuery = query(
      collection(db, 'scripts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const posePromptsQuery = query(
      collection(db, 'pose_prompts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const modelsQuery = query(
      collection(db, 'models'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeScripts = onSnapshot(scriptsQuery, (snapshot) => {
      const scripts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScriptData));
      setSavedScripts(scripts);
    }, (error) => handleFirestoreError(error, 'list' as any, 'scripts'));

    const unsubscribePosePrompts = onSnapshot(posePromptsQuery, (snapshot) => {
      const poses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PosePromptData));
      setSavedPosePrompts(poses);
    }, (error) => handleFirestoreError(error, 'list' as any, 'pose_prompts'));

    const unsubscribeModels = onSnapshot(modelsQuery, (snapshot) => {
      const modelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CloneModel));
      setModels(modelsData);
    }, (error) => handleFirestoreError(error, 'list' as any, 'models'));

    return () => {
      unsubscribeScripts();
      unsubscribePosePrompts();
      unsubscribeModels();
    };
  }, [user]);

  const handleFormat = async () => {
    if (!rawScript.trim()) return;
    setIsFormatting(true);
    try {
      const result = editorMode === 'format' 
        ? await formatScript(rawScript, tone, format)
        : await generateScript(rawScript, tone, format);
      setFormattedScript(result);
    } catch (error: any) {
      console.error(`${editorMode === 'format' ? 'Formatting' : 'Generation'} failed:`, error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert(`Failed to ${editorMode === 'format' ? 'format' : 'generate'} script. Please try again.`);
      }
    } finally {
      setIsFormatting(false);
    }
  };

  const handleGeneratePoses = async () => {
    if (!poseModelId) return;
    
    const selectedModel = models.find(m => m.id === poseModelId);
    if (!selectedModel) return;

    setIsGeneratingPoses(true);
    setPosePreviews({});
    try {
      const prompts = await generatePosePrompts(selectedModel.name, poseMood, poseReferenceUrl);
      setPosePrompts(prompts);
    } catch (error: any) {
      console.error("Failed to generate poses:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate poses. Please try again.");
      }
    } finally {
      setIsGeneratingPoses(false);
    }
  };

  const handleGeneratePreview = async (index: number, prompt: string) => {
    if (!poseModelId) return;
    const selectedModel = models.find(m => m.id === poseModelId);
    if (!selectedModel) return;

    setIsGeneratingPreview(prev => ({ ...prev, [index]: true }));
    try {
      const imageUrl = await generateCloneScene(selectedModel, prompt, '1:1', Math.floor(Math.random() * 1000000));
      if (imageUrl) {
        setPosePreviews(prev => ({ ...prev, [index]: imageUrl }));
      }
    } catch (error: any) {
      console.error("Failed to generate preview:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate preview. Please try again.");
      }
    } finally {
      setIsGeneratingPreview(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleGenerateScriptPreview = async (part: 'hook' | 'body' | 'cta', text: string) => {
    setIsGeneratingScriptPreview(prev => ({ ...prev, [part]: true }));
    try {
      let imageUrl: string | null = null;
      if (selectedModelId) {
        const selectedModel = models.find(m => m.id === selectedModelId);
        if (selectedModel) {
          imageUrl = await generateCloneScene(selectedModel, `Visual scene matching this script: ${text}`, '1:1', Math.floor(Math.random() * 1000000));
        }
      }
      
      if (!imageUrl) {
        imageUrl = await generateImage(`Create a highly visual scene for this script beat: ${text}`, 'gemini-2.5-flash-image', '1:1');
      }
      
      if (imageUrl) {
        setScriptPreviews(prev => ({ ...prev, [part]: imageUrl }));
      }
    } catch (error: any) {
      console.error("Failed to generate script preview:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate visual. Please try again.");
      }
    } finally {
      setIsGeneratingScriptPreview(prev => ({ ...prev, [part]: false }));
    }
  };

  const handleSavePoses = async () => {
    if (!user || posePrompts.length === 0 || !poseModelId) return;

    const poseId = crypto.randomUUID();
    const newPoseData: PosePromptData = {
      id: poseId,
      uid: user.uid,
      modelId: poseModelId,
      mood: poseMood,
      referenceUrl: poseReferenceUrl,
      prompts: posePrompts,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'pose_prompts', poseId), newPoseData);
      setActiveTab('history');
    } catch (error) {
      handleFirestoreError(error, 'create' as any, 'pose_prompts');
    }
  };

  const handleSave = async () => {
    if (!user || !formattedScript) return;

    const scriptId = crypto.randomUUID();
    const newScript: ScriptData = {
      id: scriptId,
      uid: user.uid,
      influencer_id: selectedModelId || undefined,
      rawInput: rawScript,
      formattedOutput: formattedScript,
      tone,
      type: format,
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'scripts', scriptId), newScript);
      setActiveTab('history');
    } catch (error) {
      handleFirestoreError(error, 'create' as any, 'scripts');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scripts', id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, 'scripts');
    }
  };

  const handleCopy = () => {
    if (!formattedScript) return;
    const text = `
[${formattedScript.timestamps.hook}] HOOK:
${formattedScript.hook}

[${formattedScript.timestamps.body}] BODY:
${formattedScript.body}

[${formattedScript.timestamps.cta}] CTA:
${formattedScript.cta}
    `.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!formattedScript) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('AI Script Studio - Formatted Script', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Tone: ${tone} | Format: ${format}`, 20, 30);
    doc.text(`Created: ${new Date().toLocaleString()}`, 20, 35);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text(`[${formattedScript.timestamps.hook}] HOOK`, 20, 50);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const hookLines = doc.splitTextToSize(formattedScript.hook, 170);
    doc.text(hookLines, 20, 55);
    
    let y = 55 + (hookLines.length * 7);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text(`[${formattedScript.timestamps.body}] BODY`, 20, y + 10);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const bodyLines = doc.splitTextToSize(formattedScript.body, 170);
    doc.text(bodyLines, 20, y + 15);
    
    y = y + 15 + (bodyLines.length * 7);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 102, 204);
    doc.text(`[${formattedScript.timestamps.cta}] CTA`, 20, y + 10);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const ctaLines = doc.splitTextToSize(formattedScript.cta, 170);
    doc.text(ctaLines, 20, y + 15);
    
    doc.save(`script-${Date.now()}.pdf`);
  };

  const filteredScripts = savedScripts.filter(s => 
    s.rawInput.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.formattedOutput.hook.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosePrompts = savedPosePrompts.filter(p => 
    p.mood.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.prompts.some(prompt => prompt.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDeletePosePrompt = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pose_prompts', id));
    } catch (error) {
      handleFirestoreError(error, 'delete' as any, 'pose_prompts');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl transition-colors border border-white/5"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="text-blue-500" size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Production Module</span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter italic uppercase">Script Studio</h1>
            </div>
          </div>

          <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('pose-generator')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pose-generator' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              Pose Generator
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'}`}
            >
              History ({savedScripts.length})
            </button>
          </div>
        </div>

        {activeTab === 'pose-generator' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <h2 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                  <Sparkles className="text-purple-500" size={20} />
                  Pose Generator
                </h2>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Select Model</label>
                  <select 
                    value={poseModelId}
                    onChange={(e) => setPoseModelId(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Select a saved model...</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Scene or Mood (Optional)</label>
                  <input 
                    type="text"
                    value={poseMood}
                    onChange={(e) => setPoseMood(e.target.value)}
                    placeholder="e.g., Cyberpunk city at night, elegant gala..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Reference URL (Optional)</label>
                  <input 
                    type="text"
                    value={poseReferenceUrl}
                    onChange={(e) => setPoseReferenceUrl(e.target.value)}
                    placeholder="Paste an image URL for inspiration..."
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-4 text-sm text-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={handleGeneratePoses}
                  disabled={isGeneratingPoses || !poseModelId}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingPoses ? (
                    <><RotateCcw className="animate-spin" size={16} /> Generating...</>
                  ) : (
                    <><Sparkles size={16} /> Generate 10 Poses</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 h-full min-h-[600px] flex flex-col">
                <h2 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2 mb-6">
                  <Target className="text-purple-500" size={20} />
                  Generated Prompts
                </h2>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {posePrompts.length > 0 ? (
                    <>
                      {posePrompts.map((prompt, idx) => (
                        <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-white/5 relative group">
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(prompt);
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                              title="Copy Prompt"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                              <span className="text-purple-500 font-black text-sm mt-0.5">{idx + 1}.</span>
                              <p className="text-sm text-slate-300 leading-relaxed pr-16">{prompt}</p>
                            </div>
                            
                            {/* Preview Section */}
                            <div className="pl-6">
                              {posePreviews[idx] ? (
                                <div className="relative w-full max-w-[200px] aspect-square rounded-xl overflow-hidden border border-white/10">
                                  <img src={posePreviews[idx]} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleGeneratePreview(idx, prompt)}
                                  disabled={isGeneratingPreview[idx]}
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                                >
                                  {isGeneratingPreview[idx] ? (
                                    <><RotateCcw className="animate-spin" size={12} /> Generating Preview...</>
                                  ) : (
                                    <><ImageIcon size={12} /> Generate Preview</>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-4">
                        <button 
                          onClick={handleSavePoses}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={16} /> Save in History
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-slate-500">
                      <Sparkles size={32} className="opacity-50" />
                      <p className="text-xs font-black uppercase tracking-widest">No poses generated yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'editor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                    <Zap className="text-yellow-500" size={20} />
                    {editorMode === 'format' ? 'Input Script' : 'Generation Prompt'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/10">
                      <button 
                        onClick={() => setEditorMode('format')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editorMode === 'format' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                        Format
                      </button>
                      <button 
                        onClick={() => setEditorMode('generate')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editorMode === 'generate' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                      >
                        Generate
                      </button>
                    </div>
                    <button 
                      onClick={() => setRawScript('')}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                      title="Clear"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>

                <textarea 
                  value={rawScript}
                  onChange={(e) => setRawScript(e.target.value)}
                  placeholder={editorMode === 'format' ? "Paste your messy AI script here..." : "Describe the script you want to generate (e.g., 'A 30-second reel about AI fashion trends')..."}
                  className="w-full h-64 bg-slate-950/50 border border-white/10 rounded-2xl p-6 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none custom-scrollbar"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Tone</label>
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/10">
                      {(['Viral', 'Professional', 'Casual'] as ScriptTone[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTone(t)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tone === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Format</label>
                    <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/10">
                      {(['Short-form', 'Long-form'] as ScriptFormat[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setFormat(f)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${format === f ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Link to Influencer (Optional)</label>
                  <select 
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">No Link</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleFormat}
                  disabled={isFormatting || !rawScript.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black uppercase italic tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
                >
                  {isFormatting ? (
                    <RotateCcw className="animate-spin" size={20} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                  {isFormatting 
                    ? (editorMode === 'format' ? 'Formatting...' : 'Generating...') 
                    : (editorMode === 'format' ? 'Format Script' : 'Generate Script')}
                </button>
              </div>
            </div>

            {/* Output Panel */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {formattedScript ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-slate-900/50 border border-blue-500/30 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                    
                    <div className="flex items-center justify-between relative z-10">
                      <h2 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                        <Target className="text-blue-500" size={20} />
                        Viral Structure
                      </h2>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleCopy}
                          className="p-3 bg-slate-950 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                        >
                          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          onClick={handleDownloadPDF}
                          className="p-3 bg-slate-950 hover:bg-slate-800 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button 
                          onClick={handleSave}
                          className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all shadow-lg shadow-blue-600/20"
                          title="Save to History"
                        >
                          <Save size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded uppercase tracking-widest border border-blue-500/20">
                            {formattedScript.timestamps.hook}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Hook</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-white/5">
                            {formattedScript.hook}
                          </p>
                          <div className="flex justify-end">
                            {scriptPreviews.hook ? (
                              <div className="relative w-48 aspect-video rounded-xl overflow-hidden border border-white/10">
                                <img src={scriptPreviews.hook} className="w-full h-full object-cover" alt="Hook Visual Preview" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleGenerateScriptPreview('hook', formattedScript.hook)}
                                disabled={isGeneratingScriptPreview.hook}
                                className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                              >
                                {isGeneratingScriptPreview.hook ? <RotateCcw className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                                Generate Visual
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded uppercase tracking-widest border border-blue-500/20">
                            {formattedScript.timestamps.body}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Body</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-white/5">
                            {formattedScript.body}
                          </p>
                          <div className="flex justify-end">
                            {scriptPreviews.body ? (
                              <div className="relative w-48 aspect-video rounded-xl overflow-hidden border border-white/10">
                                <img src={scriptPreviews.body} className="w-full h-full object-cover" alt="Body Visual Preview" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleGenerateScriptPreview('body', formattedScript.body)}
                                disabled={isGeneratingScriptPreview.body}
                                className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                              >
                                {isGeneratingScriptPreview.body ? <RotateCcw className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                                Generate Visual
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded uppercase tracking-widest border border-blue-500/20">
                            {formattedScript.timestamps.cta}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">CTA</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/30 p-4 rounded-xl border border-white/5">
                            {formattedScript.cta}
                          </p>
                          <div className="flex justify-end">
                            {scriptPreviews.cta ? (
                              <div className="relative w-48 aspect-video rounded-xl overflow-hidden border border-white/10">
                                <img src={scriptPreviews.cta} className="w-full h-full object-cover" alt="CTA Visual Preview" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleGenerateScriptPreview('cta', formattedScript.cta)}
                                disabled={isGeneratingScriptPreview.cta}
                                className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-800 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                              >
                                {isGeneratingScriptPreview.cta ? <RotateCcw className="animate-spin" size={12} /> : <ImageIcon size={12} />}
                                Generate Visual
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 relative z-10">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Clock size={12} /> Est. {formattedScript.timestamps.cta}</span>
                        <span className="flex items-center gap-1"><Target size={12} /> {tone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap size={12} className="text-yellow-500" /> Viral Ready
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full min-h-[400px] bg-slate-900/30 border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-12 space-y-4">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 mb-4">
                      <Sparkles className="text-slate-700" size={32} />
                    </div>
                    <h3 className="text-xl font-black tracking-tighter uppercase italic text-slate-600">Ready for Formatting</h3>
                    <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                      Paste your messy script and select your options to generate a viral-ready structure.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
              <Search className="text-slate-500" size={20} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved scripts..."
                className="bg-transparent border-none outline-none text-sm w-full text-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScripts.map((script) => (
                <motion.div 
                  key={script.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-4 hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-[8px] font-black rounded uppercase tracking-widest">
                        {script.tone}
                      </span>
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[8px] font-black rounded uppercase tracking-widest">
                        {script.type}
                      </span>
                      {script.influencer_id && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-blue-400 text-[8px] font-black rounded uppercase tracking-widest border border-blue-500/20">
                          <User size={8} />
                          {models.find(m => m.id === script.influencer_id)?.name || 'Unknown'}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDelete(script.id)}
                      className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black tracking-tight uppercase italic line-clamp-1">
                      {script.formattedOutput.hook}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">
                      {script.formattedOutput.body}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                      <Clock size={10} /> {new Date(script.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => {
                        setFormattedScript(script.formattedOutput);
                        setRawScript(script.rawInput);
                        setTone(script.tone);
                        setFormat(script.type);
                        if (script.influencer_id) setSelectedModelId(script.influencer_id);
                        setActiveTab('editor');
                      }}
                      className="text-[8px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 flex items-center gap-1"
                    >
                      Load <ArrowLeft size={10} className="rotate-180" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {filteredPosePrompts.map((pose) => (
                <motion.div 
                  key={pose.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-4 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-purple-600/20 text-purple-400 text-[8px] font-black rounded uppercase tracking-widest">
                        Pose Prompts
                      </span>
                      <span className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-purple-400 text-[8px] font-black rounded uppercase tracking-widest border border-purple-500/20">
                        <User size={8} />
                        {models.find(m => m.id === pose.modelId)?.name || 'Unknown'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeletePosePrompt(pose.id)}
                      className="p-2 hover:bg-red-500/10 text-slate-600 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black tracking-tight uppercase italic line-clamp-1">
                      {pose.mood || 'No Mood Specified'}
                    </h4>
                    <p className="text-[10px] text-slate-500 line-clamp-3 leading-relaxed">
                      {pose.prompts.length} prompts generated
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-600">
                      <Clock size={10} /> {new Date(pose.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => {
                        setPoseModelId(pose.modelId);
                        setPoseMood(pose.mood);
                        setPoseReferenceUrl(pose.referenceUrl);
                        setPosePrompts(pose.prompts);
                        setPosePreviews({});
                        setActiveTab('pose-generator');
                      }}
                      className="text-[8px] font-black uppercase tracking-widest text-purple-500 hover:text-purple-400 flex items-center gap-1"
                    >
                      Load <ArrowLeft size={10} className="rotate-180" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {filteredScripts.length === 0 && filteredPosePrompts.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 mx-auto">
                    <FileText className="text-slate-700" size={24} />
                  </div>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No items found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
