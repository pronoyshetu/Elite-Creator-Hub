
import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, Sparkles, RefreshCw, Upload, Download, 
  FileSearch, Table as TableIcon, Copy, FileText, Check,
  Image as LucideImage, AlertCircle, Trash2, Database,
  Plus, Info, CheckCircle, Zap
} from 'lucide-react';
import { generateCSVMeta, generatePromptVariations } from '../services/geminiService';
import { isRateLimitError, RATE_LIMIT_MESSAGE } from '../lib/error-utils';
import { CSVMetaAsset, CSVMetaResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface CSVMetaProps {
  onBack: () => void;
}

export const CSVMeta: React.FC<CSVMetaProps> = ({ onBack }) => {
  const [images, setImages] = useState<{ filename: string; data: string }[]>([]);
  const [results, setResults] = useState<CSVMetaAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [promptVariations, setPromptVariations] = useState<Record<string, string[]>>({});
  const [isGeneratingVariations, setIsGeneratingVariations] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: { filename: string; data: string }[] = [];
    let processedCount = 0;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push({
          filename: file.name,
          data: reader.result as string
        });
        processedCount++;
        if (processedCount === files.length) {
          setImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    setImages([]);
    setResults([]);
  };

  const processImages = async () => {
    if (images.length === 0) return;
    
    setIsProcessing(true);
    try {
      const result = await generateCSVMeta(images);
      setResults(result.assets);
    } catch (error: any) {
      console.error("CSV Meta analysis failed:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to analyze images. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVariations = async (asset: CSVMetaAsset) => {
    setIsGeneratingVariations(prev => ({ ...prev, [asset.filename]: true }));
    try {
      const imgData = images.find(img => img.filename === asset.filename)?.data || '';
      const variations = await generatePromptVariations(imgData, asset.title, asset.description, asset.keywords);
      setPromptVariations(prev => ({ ...prev, [asset.filename]: variations }));
    } catch (error: any) {
      console.error("Variation generation failed:", error);
      if (isRateLimitError(error)) {
        alert(RATE_LIMIT_MESSAGE);
      } else {
        alert("Failed to generate variations.");
      }
    } finally {
      setIsGeneratingVariations(prev => ({ ...prev, [asset.filename]: false }));
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(id);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const exportAsJSON = (singleAsset?: CSVMetaAsset) => {
    const data = singleAsset ? { assets: [singleAsset] } : { assets: results };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute("href", url);
    link.setAttribute("download", singleAsset ? `${singleAsset.filename}_meta.json` : `metadata_export_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 3000);
  };

  const exportAsCSV = (singleAsset?: CSVMetaAsset) => {
    const dataToExport = singleAsset ? [singleAsset] : results;
    if (dataToExport.length === 0) return;
    
    const headers = ["filename", "title", "description", "keywords", "ai_generation_prompt", "variation_1", "variation_2", "variation_3", "variation_4"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(asset => {
        const rowData = [
          asset.filename,
          asset.title,
          asset.description,
          asset.keywords,
          asset.ai_generation_prompt,
          ...(asset.variations || promptVariations[asset.filename] || ["", "", "", ""])
        ];
        return rowData.map(val => `"${val.replace(/"/g, '""')}"`).join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute("href", url);
    link.setAttribute("download", singleAsset ? `${singleAsset.filename}_meta.csv` : `metadata_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 3000);
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
              CSV META <FileSearch size={16} className="ml-2 text-blue-500" />
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-wrap">Stock Metadata & Prompt Architect</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {results.length > 0 && (
            <div className="flex items-center space-x-2">
              <AnimatePresence>
                {isDownloaded && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest mr-2"
                  >
                    <CheckCircle size={10} />
                    <span>Assets Exported</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <button 
                onClick={() => exportAsJSON()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center border border-white/5"
              >
                <Download size={14} className="mr-2" /> JSON
              </button>
              <button 
                onClick={() => exportAsCSV()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center shadow-lg shadow-blue-900/40"
              >
                <TableIcon size={14} className="mr-2" /> CSV Export
              </button>
            </div>
          )}
          <button 
            onClick={processImages}
            disabled={isProcessing || images.length === 0}
            className="flex items-center space-x-2 px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
            <span>{isProcessing ? 'Analyzing...' : 'Generate Metadata'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Assets Sidebar */}
        <aside className="lg:w-[400px] border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center">
              <LucideImage size={14} className="mr-2" /> Batch Gallery ({images.length})
            </h2>
            <div className="flex items-center gap-2">
              {images.length > 0 && (
                <button
                  onClick={clearAllImages}
                  className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                  title="Clear All Images"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-white/5 rounded-lg text-blue-400 transition-colors"
                title="Add Images"
              >
                <Plus size={20} />
              </button>
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleFileUpload} 
            />
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {images.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <Upload size={48} className="text-slate-700" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest">No Assets Loaded</p>
                  <p className="text-[8px] uppercase">Upload images to start analysis</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 border border-dashed border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-500/50 hover:text-blue-400 transition-all"
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-20">
                <AnimatePresence>
                  {images.map((img, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-white/5"
                    >
                      <img src={img.data} className="w-full h-full object-cover" alt={img.filename} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <p className="text-[8px] font-bold text-center break-all line-clamp-2 mb-2">{img.filename}</p>
                        <button 
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </aside>

        {/* Results Main Area */}
        <main className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:40px_40px]"></div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {results.length > 0 ? (
              <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
                {results.map((asset, index) => (
                  <div key={index} className="bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-xl">
                    <div className="flex flex-col lg:flex-row">
                      {/* Image Preview */}
                      <div className="lg:w-72 shrink-0 border-r border-white/5 bg-slate-900 p-6 flex flex-col space-y-4">
                        <div className="aspect-square rounded-2xl overflow-hidden border border-white/10">
                          <img 
                            src={images.find(img => img.filename === asset.filename)?.data || ''} 
                            className="w-full h-full object-cover" 
                            alt={asset.filename} 
                          />
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Asset Reference</p>
                            <p className="text-[10px] font-bold truncate text-slate-300">{asset.filename}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button 
                              onClick={() => exportAsCSV(asset)}
                              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center border border-white/5"
                            >
                              <TableIcon size={10} className="mr-2" /> Download CSV
                            </button>
                            <button 
                              onClick={() => exportAsJSON(asset)}
                              className="w-full py-2 bg-slate-950/50 hover:bg-slate-900 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center border border-white/5"
                            >
                              <Download size={10} className="mr-2" /> Download JSON
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Metadata Content */}
                      <div className="flex-1 p-8 space-y-8">
                        {/* Title & Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center">
                              <FileText size={12} className="mr-2" /> Commercial Title
                            </label>
                            <div className="relative group">
                              <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-sm font-bold text-slate-100 leading-relaxed min-h-[60px]">
                                {asset.title}
                              </div>
                              <button 
                                onClick={() => copyToClipboard(asset.title, `title-${index}`)}
                                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copyStatus === `title-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center">
                              <Info size={12} className="mr-2" /> Stock Description
                            </label>
                            <div className="relative group">
                              <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-sm font-bold text-slate-100 leading-relaxed min-h-[60px]">
                                {asset.description}
                              </div>
                              <button 
                                onClick={() => copyToClipboard(asset.description, `desc-${index}`)}
                                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {copyStatus === `desc-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Keywords */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center">
                            <Database size={12} className="mr-2" /> SEO Keywords ({asset.keywords.split(',').length})
                          </label>
                          <div className="relative group">
                            <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5 text-[11px] font-medium text-slate-400 flex flex-wrap gap-2 leading-relaxed">
                              {asset.keywords.split(',').map((kw, kIndex) => (
                                <span key={kIndex} className="px-2 py-0.5 bg-white/5 rounded-md hover:bg-white/10 cursor-default">
                                  {kw.trim()}
                                </span>
                              ))}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(asset.keywords, `kw-${index}`)}
                              className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copyStatus === `kw-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>

                        {/* AI Prompt */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center">
                              <Sparkles size={12} className="mr-2" /> Master Generative Prompt
                            </label>
                            {(!asset.variations || asset.variations.length === 0) && !promptVariations[asset.filename] && (
                              <button 
                                onClick={() => handleGenerateVariations(asset)}
                                disabled={isGeneratingVariations[asset.filename]}
                                className="text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 flex items-center bg-emerald-500/10 px-3 py-1 rounded-full transition-all disabled:opacity-50"
                              >
                                {isGeneratingVariations[asset.filename] ? <RefreshCw className="animate-spin mr-2" size={10} /> : <Zap size={10} className="mr-2" />}
                                Generate 4 Styled Variations
                              </button>
                            )}
                          </div>
                          <div className="relative group">
                            <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-[11px] font-mono text-emerald-300 italic leading-loose">
                              {asset.ai_generation_prompt}
                            </div>
                            <button 
                              onClick={() => copyToClipboard(asset.ai_generation_prompt, `prompt-${index}`)}
                              className="absolute top-3 right-3 p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copyStatus === `prompt-${index}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-emerald-500" />}
                            </button>
                          </div>

                          {/* Variations Display */}
                          <AnimatePresence>
                            {(asset.variations || promptVariations[asset.filename]) && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4 pt-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <div className="h-px flex-1 bg-emerald-500/20"></div>
                                  <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest pr-2">Creative Variations</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(asset.variations || promptVariations[asset.filename]).map((variation, vIdx) => (
                                    <div key={vIdx} className="relative group/var">
                                      <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 text-[10px] font-mono text-slate-300 leading-relaxed min-h-[140px] flex flex-col justify-center">
                                        <div className="mb-2 text-[8px] font-black uppercase text-emerald-500/50">Style Option {vIdx + 1}</div>
                                        {variation}
                                      </div>
                                      <button 
                                        onClick={() => copyToClipboard(variation, `var-${index}-${vIdx}`)}
                                        className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg opacity-0 group-hover/var:opacity-100 transition-opacity"
                                      >
                                        {copyStatus === `var-${index}-${vIdx}` ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-10">
                <div className="relative">
                  <div className="w-32 h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center shadow-2xl shadow-blue-900/20 border border-white/5">
                    <FileSearch size={64} className="text-blue-500/50" />
                  </div>
                  <div className="absolute -top-3 -right-3 w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl animate-bounce">
                    <TableIcon size={24} className="text-white" />
                  </div>
                </div>
                
                <div className="space-y-4 max-w-xl">
                  <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">CSV META ARCHITECT</h2>
                  <p className="text-sm text-slate-500 uppercase font-black tracking-widest leading-relaxed">
                    Transform your commercial photography into high-converting metadata and precise AI prompts. Built for stock contributors and prompt engineers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                  {[
                    { icon: LucideImage, title: "Batch Analysis", desc: "Process entire collections with consistent styling logic." },
                    { icon: Database, title: "SEO Keywords", desc: "40-50 high-traffic commercial tags per asset." },
                    { icon: RefreshCw, title: "Reverse-Engineered", desc: "Technical prompts including lens specs and lighting." }
                  ].map((feature, i) => (
                    <div key={i} className="p-6 bg-slate-900/50 border border-white/5 rounded-3xl space-y-3 text-left">
                      <feature.icon size={20} className="text-blue-400" />
                      <p className="text-xs font-black uppercase tracking-widest">{feature.title}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                {images.length > 0 && !isProcessing && (
                  <button 
                    onClick={processImages}
                    className="px-12 py-5 bg-blue-600 hover:bg-blue-500 rounded-3xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/40 animate-pulse active:scale-95"
                  >
                    Start Metadata Extraction
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Processing Overlay */}
          {isProcessing && (
             <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-[60] animate-in fade-in duration-300">
                <div className="relative">
                   <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full"></div>
                   <div className="absolute inset-0 w-24 h-24 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                   <FileSearch className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse">Deconstructing Visuals...</p>
                <div className="mt-4 flex items-center space-x-2">
                   <span className="text-[10px] font-black text-slate-600 uppercase">Indexing Commercial Signals</span>
                   <div className="flex space-x-1 text-blue-500">
                     <span className="animate-bounce" style={{ animationDelay: '0s' }}>.</span>
                     <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                     <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                   </div>
                </div>
             </div>
          )}
        </main>
      </div>
    </div>
  );
};
