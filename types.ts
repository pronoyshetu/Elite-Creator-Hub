
export type AspectRatio = '9:16' | '1:1' | '16:9' | '3:4' | '4:3' | 'Auto';

export enum LayerType {
  TEXT = 'TEXT',
  GRAPHIC = 'GRAPHIC',
  SHAPE = 'SHAPE',
  MEDIA = 'MEDIA'
}

export interface LayerProperties {
  text?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  width?: number;
  height?: number;
  mediaUrl?: string;
  iconName?: string;
  shapeType?: 'rectangle' | 'circle' | 'triangle';
}

export interface Layer {
  id: string;
  type: LayerType;
  properties: LayerProperties;
  zIndex: number;
  groupId?: string;
}

export interface CarouselPage {
  id: string;
  title: string;
  layers: Layer[];
  backgroundImage?: string;
}

export interface Carousel {
  id: string;
  topic: string;
  aspectRatio: AspectRatio;
  style: string;
  pages: CarouselPage[];
  creditsUsed: number;
}

export interface GenerationSettings {
  topic: string;
  pagesCount: number;
  language: string;
  tone: string;
  purpose: string;
  audience: string;
  aspectRatio: AspectRatio;
  mediaSource: 'Stock' | 'AI' | 'ProAI';
  style: string;
  imageSize?: '1K' | '2K' | '4K';
}

export interface PhotocardSettings {
  aspectRatio: AspectRatio;
  backgroundImage?: string;
  logoImage?: string;
  brandName?: string;
  brandUrl?: string;
  brandPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  brandSize: number;
  brandTextColor: string;
  headline: string;
  headlineColor: string;
  headlineSize: number;
  highlightColor: string;
  description: string;
  descriptionColor: string;
  descriptionSize: number;
  category: string;
  categoryTextColor: string;
  categoryBoxColor: string;
  categorySize: number;
  source: string;
  sourceColor: string;
  sourceSize: number;
  filters: {
    brightness: number;
    contrast: number;
    blur: number;
    grayscale: boolean;
  };
}

export interface ThumbnailSettings {
  personImage?: string;
  additionalImages: string[];
  thumbnailText?: string;
  videoTopic?: string;
  customPrompt?: string;
  watermarkType: 'None' | 'Text' | 'Logo';
  watermarkText?: string;
  watermarkLogo?: string;
  outputFormat: 'PNG' | 'JPG';
}

export interface ScriptToImageSettings {
  script: string;
  customInstructions?: string;
  storyStyle?: string;
  numScenes?: string;
  aspectRatio: AspectRatio;
}

export interface StoryboardScene {
  id: string;
  description: string;
  imageUrl?: string;
  isGenerating: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export type ReferenceMode = 'Character Likeness' | 'Artistic Style' | 'Full Clone';

export interface CloneSettings {
  referenceImage?: string;
  prompt: string;
  mode: ReferenceMode;
  strength: number;
  aspectRatio: AspectRatio;
}

export type PreservationFocus = 'Clothing & Texture' | 'Pose & Silhouette' | 'Balanced';

export interface ModelSwapSettings {
  originalImage?: string;
  modelDescription: string;
  keepBackground: boolean;
  preservationFocus: PreservationFocus;
  referenceImages?: string[];
}

export type UGCStylePreset = 'Minimalist Studio' | 'Nature & Organic' | 'Luxury/Premium' | 'Urban/Street';

export interface UGCProductSettings {
  productImage?: string;
  sceneDescription: string;
  stylePreset: UGCStylePreset;
  aspectRatio: AspectRatio;
  outputFormat: 'PNG' | 'JPG' | 'WEBP';
}

export type ClothingCategory = 'Tops' | 'Bottoms' | 'One-pieces';

export interface TryOnModel {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface TryOnFashionSettings {
  modelSource: 'Library' | 'Upload';
  modelImage?: string;
  selectedModelId?: string;
  garmentImage?: string;
  category: ClothingCategory;
  sceneDescription?: string;
}

export interface VirtualTryOnSettings {
  garmentImage?: string;
  clothingType: 'Tops' | 'Bottoms' | 'One-pieces';
  modelSource: 'Library' | 'Upload';
  selectedModelId?: string;
  customModelImage?: string;
  sceneDescription?: string;
}

export type AccessoryType = 'Eyewear' | 'Headwear' | 'Handbags' | 'Jewelry';
export interface TryOnAccessoriesSettings {
  personImage?: string;
  accessoryImage?: string;
  accessoryType: AccessoryType;
  placementNote?: string;
}

export interface TryOnShoesSettings {
  legsImage?: string;
  shoeImage?: string;
  floorType?: string;
}

export type TemplateCategory = 'Social Media Post' | 'Sale Banner' | 'New Arrival' | 'Holiday Special';
export interface EcomTemplateSettings {
  productImage?: string;
  category: TemplateCategory;
  primaryText: string;
  brandColor: string;
}

export type PDPTheme = 'Technical/Blueprints' | 'Lifestyle/Clean' | 'Bold/Infographic';
export interface PDPDesignerSettings {
  productImages: string[];
  productUrl?: string;
  logoImage?: string;
  inspirationImage?: string;
  inspirationUrl?: string;
  features: string[];
  theme: PDPTheme;
}

export type BackgroundStyle = 'Studio' | 'Nature' | 'Interior' | 'Street';
export interface AIBackgroundSettings {
  productImage?: string;
  prompt: string;
  style: BackgroundStyle;
  includeReflections: boolean;
}

export interface ImageEnhancerSettings {
  strength: number;
  faceRestoration: boolean;
  denoise: boolean;
  colorCorrection: boolean;
}

export interface ImageUpscalerSettings {
  factor: '2x' | '4x' | '8x';
  outputFormat: 'PNG' | 'JPG';
  resemblance: number;
}

export type BgRemoverOutputType = 'Transparent (PNG)' | 'Solid White' | 'Custom Color';
export interface BgRemoverSettings {
  outputType: BgRemoverOutputType;
  customColor: string;
  refineEdges: boolean;
}

export interface BulkItem {
  id: string;
  originalUrl: string;
  resultUrl?: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  fileName: string;
}

export type AvatarStyle = 'Realistic Photo' | '3D Render (Pixar style)' | 'Stylized Illustration' | 'Anime';
export type AvatarBackground = 'Transparent' | 'Solid Color' | 'Office Environment';

export interface AvatarModel {
  id: string;
  name: string;
  imageUrl: string;
}

export interface ProductAvatarSettings {
  sourceType: 'upload' | 'saved' | 'url';
  sourceImage?: string;
  selectedModelId?: string;
  sourceUrl?: string;
  style: AvatarStyle;
  appearancePrompt: string;
  background: AvatarBackground;
}

export type VideoVibe = 'Fast Paced Stomp' | 'Elegant Slow Zoom' | 'Product Unboxing' | 'Dynamic Showcase';
export type VideoDuration = '5s' | '10s' | '15s';
export type MusicStyle = 'Upbeat Lo-Fi' | 'Corporate Energetic' | 'No Music';

export interface ViralVideoSettings {
  sourceType: 'upload' | 'url';
  sourceFile?: string; // Base64 or Blob URL
  sourceUrl?: string;
  vibe: VideoVibe;
  duration: VideoDuration;
  textOverlay?: string;
  musicStyle: MusicStyle;
}

export type StoryboardStyle = 'Cinematic' | 'Noir' | 'Cyberpunk' | 'Minimalist' | 'Anime';

export interface StoryboardSettings {
  script: string;
  style: StoryboardStyle;
  sceneCount: number;
  language: string;
}

export interface StoryboardSceneData {
  sceneNumber: number;
  description: string;
  visualPrompt: string;
  videoPrompt: string;
  voiceover: string;
  renderedImageUrl?: string;
  isRendering?: boolean;
}

export interface NanoBananaSettings {
  prompt: string;
  dnaProfile?: string;
  referenceImages: string[];
  outputFormat: 'PNG';
  aspectRatio: AspectRatio;
  lighting: string;
  angle: string;
  style: string;
  quality: 'Standard' | 'HD' | '4K';
}

export type SkinRefinerMode = 'Fix Skin' | 'Unpolish' | 'Fix Shine' | 'Retouch';
export type EnhancementType = 'Subtle' | 'Realistic' | 'Pimple' | 'Freckle';
export type OutputQualityLevel = '8K ULTRA' | '4K FAST';

export interface SkinRefinerSettings {
  sourceImage?: string;
  mode: SkinRefinerMode;
  enhancementType: EnhancementType;
  outputQuality: OutputQualityLevel;
  fixLighting: boolean;
  lightPreset?: string;
}

export type ProductionModel = 'Nano Banana Pro' | 'Kora Pro Cinema';
export type ProductionResolution = '2K' | '4K' | '8K Production';
export type SkinIntensity = 'Light' | 'Medium' | 'Heavy';
export type ProductionPreset = 'None' | 'iPhone Selfie' | 'Mirror Selfie' | 'Top Down View' | 'Full Body View';

export interface ProductionEditorSettings {
  model: ProductionModel;
  resolution: ProductionResolution;
  aspectRatio: AspectRatio;
  prompt: string;
  referenceImage?: string;
  subjectImages: string[];
  objectImages: string[];
  maskImage?: string;
  crispUpscale: boolean;
  skinTextureIntensity: SkinIntensity;
  addFreckles: boolean;
  addImperfections: boolean;
  removeShine: boolean;
  preset: ProductionPreset;
  remixPrompt: string;
}

export interface ConceptMakerSettings {
  url: string;
  category: string;
  language: string;
}

export interface ConceptData {
  title: string;
  hook: string;
  scenes: {
    visual: string;
    audio: string;
    duration: string;
  }[];
  targetAudience: string;
  hashtags: string[];
}

export interface CharacterDNA {
  faceStructure: string;
  skinTone: string;
  hairSignature: string;
  bodyProportions: string;
  seed: number;
}

export interface CloneModel {
  id: string;
  uid: string;
  name: string;
  description: string;
  dna: CharacterDNA;
  referenceImages: string[];
  createdAt: number;
}

export interface CloneGeneration {
  id: string;
  uid: string;
  modelId: string;
  prompt: string;
  resultUrl: string;
  aspectRatio: AspectRatio;
  quality: 'Standard' | 'HD' | '4K';
  batchSize: number;
  seed: number;
  createdAt: number;
}

export type ScriptTone = 'Viral' | 'Professional' | 'Casual';
export type ScriptFormat = 'Short-form' | 'Long-form';

export interface FormattedScript {
  hook: string;
  body: string;
  cta: string;
  timestamps: {
    hook: string;
    body: string;
    cta: string;
  };
}

export interface ScriptData {
  id: string;
  uid: string;
  influencer_id?: string;
  rawInput: string;
  formattedOutput: FormattedScript;
  tone: ScriptTone;
  type: ScriptFormat;
  createdAt: number;
}

export interface PosePromptData {
  id: string;
  uid: string;
  modelId: string;
  mood: string;
  referenceUrl: string;
  prompts: string[];
  createdAt: number;
}

export interface CSVMetaAsset {
  filename: string;
  title: string;
  description: string;
  keywords: string;
  ai_generation_prompt: string;
  variations: string[];
}

export interface CSVMetaResult {
  assets: CSVMetaAsset[];
}
