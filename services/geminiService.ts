
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { isRateLimitError } from '../lib/error-utils';
import { 
  GenerationSettings, CarouselPage, LayerType, PhotocardSettings, 
  ThumbnailSettings, ScriptToImageSettings, CloneSettings, 
  ModelSwapSettings, UGCProductSettings,
  TryOnFashionSettings, TryOnAccessoriesSettings, TryOnShoesSettings,
  EcomTemplateSettings, PDPDesignerSettings, AIBackgroundSettings,
  ImageEnhancerSettings, ImageUpscalerSettings, BgRemoverSettings,
  ProductAvatarSettings, ViralVideoSettings, StoryboardSettings, StoryboardSceneData,
  NanoBananaSettings, VirtualTryOnSettings, SkinRefinerSettings,
  ProductionEditorSettings, ConceptMakerSettings, ConceptData,
  CloneModel, CloneGeneration, AspectRatio, CharacterDNA,
  ScriptTone, ScriptFormat, FormattedScript, CSVMetaResult
} from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

/**
 * Executes a function with exponential backoff retry for rate limit errors.
 */
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 2, baseDelay = 2000): Promise<T> => {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (isRateLimitError(error)) {
        if (i < maxRetries) {
          const delay = baseDelay * Math.pow(2, i);
          console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error("You exceeded your current Gemini API quota. Please check your plan and billing details, or wait for the quota to reset tomorrow.");
        }
      }
      throw error;
    }
  }
  throw lastError;
};

const extractImageFromResponse = (response: any) => {
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0 || !candidates[0].content || !candidates[0].content.parts) {
    return null;
  }
  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const generateNanoBananaImage = async (settings: NanoBananaSettings) => {
  const ai = getAI();
  
  // Construct a more descriptive prompt using the new parameters
  const enhancedPrompt = `
    Character Identity/DNA: ${settings.dnaProfile || 'None'}.
    Style: ${settings.style}.
    Lighting: ${settings.lighting}.
    Camera Angle: ${settings.angle}.
    Quality Target: ${settings.quality}.
    Subject/Scene: ${settings.prompt}
  `.trim();

  const parts: any[] = [{ text: enhancedPrompt }];
  
  settings.referenceImages.forEach(img => {
    parts.push({
      inlineData: {
        data: img.split(',')[1],
        mimeType: 'image/png'
      }
    });
  });

  // Decide on the model based on requested quality
  // Gemini 3 Pro supports higher resolutions/quality
  const modelName = settings.quality === '4K' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  try {
    const config: any = {
      imageConfig: { 
        aspectRatio: settings.aspectRatio === 'Auto' ? '1:1' : settings.aspectRatio as any,
      }
    };

    // Only 3-pro supports imageSize parameter
    if (modelName === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = "1K"; // Start with 1K for better stability, prompt for more if needed
      if (settings.quality === '4K') config.imageConfig.imageSize = "4K";
      if (settings.quality === 'HD') config.imageConfig.imageSize = "2K";
    }

    const response = await withRetry(() => ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config
    }));

    return extractImageFromResponse(response);
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found.")) {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    throw error;
  }
  
  return null;
};

export const reverseEngineerPrompt = async (images: string[]): Promise<string> => {
  const ai = getAI();
  const prompt = `Analyze these ${images.length} images and reverse engineer a highly detailed, cinematic stable diffusion / Midjourney style prompt that would generate images with this exact aesthetic, subject, lighting, and composition. 
  
  Include:
  1. Core Subject description
  2. Lighting and Atmosphere (e.g., golden hour, cinematic teal/orange)
  3. Camera and Lens specs (e.g., 85mm f/1.8, low angle)
  4. Textures and Details (e.g., skin pores, fabric weave)
  5. Styling and Vibe
  
  Format the output as a single, comma-separated paragraph optimized for AI image generators. DO NOT include any introductory text, only the prompt.`;

  const parts: any[] = images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: "image/png"
    }
  }));
  parts.push({ text: prompt });

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts }
    }));
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Reverse engineering failed:", error);
    throw error;
  }
};

export const generateStoryboardBeats = async (settings: StoryboardSettings): Promise<StoryboardSceneData[]> => {
  const ai = getAI();
  const prompt = `
    Analyze the following script/narrative and break it down into a sequence of ${settings.sceneCount} key visual scenes.
    
    Script: ${settings.script}
    Style: ${settings.style}
    Output Language: ${settings.language}

    For each scene, provide:
    - sceneNumber: The sequence index.
    - description: A short narrative summary of the action.
    - visualPrompt: A detailed prompt for image generation. Include style "${settings.style}", lighting, camera angle, and mood.
    - videoPrompt: A camera movement and action description for video generation.
    - voiceover: Narration or dialogue text in ${settings.language}.
    
    Return as a JSON array of objects.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.INTEGER },
            description: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            videoPrompt: { type: Type.STRING },
            voiceover: { type: Type.STRING }
          },
          required: ['sceneNumber', 'description', 'visualPrompt', 'videoPrompt', 'voiceover']
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generateCarouselText = async (settings: GenerationSettings) => {
  const ai = getAI();
  const prompt = `
    Generate a social media carousel with ${settings.pagesCount} pages.
    Topic: ${settings.topic}
    Language: ${settings.language}
    Tone: ${settings.tone}
    Purpose: ${settings.purpose}
    Audience: ${settings.audience}
    Style: ${settings.style}

    For each page, provide:
    1. A page title (short).
    2. Main headline text.
    3. Body text/content.
    4. A visual description for the background image.
    5. A short call to action for the last page.

    Return the result as a JSON array of objects, one per page.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            headline: { type: Type.STRING },
            body: { type: Type.STRING },
            visualDescription: { type: Type.STRING },
            cta: { type: Type.STRING }
          },
          required: ['title', 'headline', 'body', 'visualDescription']
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const generateImage = async (prompt: string, model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' = 'gemini-2.5-flash-image', aspectRatio: string = "1:1", size?: '1K' | '2K' | '4K') => {
  const ai = getAI();
  
  try {
    if (model === 'gemini-3-pro-image-preview') {
      const response = await withRetry(() => ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio === 'Auto' ? '1:1' : aspectRatio as any,
            imageSize: size as any
          }
        }
      }));

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    } else {
      const response = await withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: { aspectRatio: aspectRatio === 'Auto' ? '1:1' : aspectRatio as any }
        }
      }));

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found.")) {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    throw error;
  }
  
  return null;
};

export const editImageWithPrompt = async (originalImageBase64: string, editPrompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: originalImageBase64.split(',')[1], mimeType: 'image/png' } },
        { text: editPrompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const enhanceImage = async (imageBase64: string, settings: ImageEnhancerSettings) => {
  const ai = getAI();
  const prompt = `
    Image Enhancement Task:
    1. Goal: Restore and enhance the provided photo.
    2. Strength: ${settings.strength}/100.
    3. Active Features: ${[
      settings.faceRestoration ? 'Face Restoration' : '',
      settings.denoise ? 'Denoise' : '',
      settings.colorCorrection ? 'Color Correction' : ''
    ].filter(Boolean).join(', ') || 'General Restoration'}.
    
    Technical requirements:
    - Analyze visual flaws like blur, grain, and noise.
    - Apply a restorative pass that increases clarity while maintaining natural textures.
    - Adjust lighting and color balance for a professional look.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  }));

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const upscaleImage = async (imageBase64: string, settings: ImageUpscalerSettings) => {
  const ai = getAI();
  const prompt = `
    Super-Resolution Upscaling Task:
    1. Target Factor: ${settings.factor}.
    2. Resemblance Mode: ${settings.resemblance}/100 (High = stick to pixels, Low = AI detail invention).
    
    Technical requirements:
    - Increase image resolution significantly without pixelation.
    - Infer high-frequency details to fill in missing pixels.
    - Output should be crisp and high-definition.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const removeBackground = async (imageBase64: string, settings: BgRemoverSettings) => {
  const ai = getAI();
  const prompt = `
    Background Removal Task:
    1. Subject isolation: Detect the main subject (person or product).
    2. Output Type: ${settings.outputType}.
    3. Refine Edges: ${settings.refineEdges ? 'ON (Apply complex masking for hair/fur)' : 'OFF'}.
    
    Technical requirements:
    - Generate a clean alpha mask.
    - ${settings.outputType === 'Transparent (PNG)' ? 'Remove all background pixels for transparency.' : `Replace background with ${settings.outputType === 'Solid White' ? 'pure white' : settings.customColor}.`}
    - Ensure zero halos or compositing artifacts.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const composePhotocard = async (settings: PhotocardSettings) => {
  const ai = getAI();
  
  const compositionPrompt = `
    Compose a professional social media graphic with the following specifications:
    Aspect Ratio: ${settings.aspectRatio}
    
    Layout Instructions:
    - Create a clean, magazine-style professional layout.
    - If a background image is provided, use it as the base. Apply these filters: grayscale=${settings.filters.grayscale}, blur=${settings.filters.blur}px, brightness=${settings.filters.brightness}%, contrast=${settings.filters.contrast}%.
    - Brand Identity: Include brand logo/name "${settings.brandName}" at ${settings.brandPosition}. URL: ${settings.brandUrl}. Text color: ${settings.brandTextColor}.
    - Headline: "${settings.headline}" in ${settings.headlineColor} color. Use highlight color ${settings.highlightColor} for emphasized parts. Font size factor: ${settings.headlineSize}.
    - Description/Quote: "${settings.description}" in ${settings.descriptionColor} color. Font size factor: ${settings.descriptionSize}.
    - Category Tag: "${settings.category}" inside a box with background color ${settings.categoryBoxColor} and text color ${settings.categoryTextColor}.
    - Source: "${settings.source}" in ${settings.sourceColor} color.
    
    Please render the final high-quality graphic following these professional design principles.
  `;

  const parts: any[] = [{ text: compositionPrompt }];
  
  if (settings.backgroundImage) {
    parts.push({
      inlineData: {
        data: settings.backgroundImage.split(',')[1],
        mimeType: 'image/png'
      }
    });
  }
  
  if (settings.logoImage) {
    parts.push({
      inlineData: {
        data: settings.logoImage.split(',')[1],
        mimeType: 'image/png'
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: { aspectRatio: settings.aspectRatio === 'Auto' ? '1:1' : settings.aspectRatio as any }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateYouTubeThumbnail = async (settings: ThumbnailSettings) => {
  const ai = getAI();
  
  const prompt = `
    Generate a high-impact, viral YouTube thumbnail (16:9 aspect ratio).
    Video Topic/Title: ${settings.videoTopic || 'Unspecified'}
    Text on Thumbnail: ${settings.thumbnailText || 'None'}
    Creative Instructions: ${settings.customPrompt || 'Professional, vibrant, high-contrast viral style.'}
    
    Instructions:
    - Intelligently combine all provided images.
    - If a person is provided, prioritize their expression and make them the focal point.
    - Use expressive lighting, high contrast, and vibrant colors typical of successful YouTube thumbnails.
    - Place the text "${settings.thumbnailText || ''}" prominently with an impactful, readable font style and outlines if necessary.
    - Ensure a 16:9 cinematic composition.
  `;

  const parts: any[] = [{ text: prompt }];
  
  if (settings.personImage) {
    parts.push({
      inlineData: {
        data: settings.personImage.split(',')[1],
        mimeType: 'image/png'
      }
    });
  }
  
  for (const img of settings.additionalImages) {
    parts.push({
      inlineData: {
        data: img.split(',')[1],
        mimeType: 'image/png'
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: { aspectRatio: '16:9' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const analyzeScript = async (settings: ScriptToImageSettings) => {
  const ai = getAI();
  const prompt = `
    Analyze the following script and break it down into key visual storyboard beats.
    Script: ${settings.script}
    Custom Instructions: ${settings.customInstructions || 'None'}
    Target Style: ${settings.storyStyle || 'Cinematic'}
    Desired Number of Scenes: ${settings.numScenes || 'As many as necessary'}

    For each visual beat, provide a detailed image description that captures the composition, characters, action, and mood.
    The descriptions should be optimized for an image generation AI.
    
    Return the result as a JSON array of objects with a "description" field.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING }
          },
          required: ['description']
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const cloneStyleOrCharacter = async (settings: CloneSettings) => {
  const ai = getAI();
  if (!settings.referenceImage) throw new Error("Reference image is required.");

  const prompt = `
    Reference Mode: ${settings.mode}
    Target Scene/Action: ${settings.prompt}
    Fidelity Strength: ${settings.strength}/100
    
    System Instructions:
    You are an elite creative AI artist. Use the provided image as a strict visual anchor.
    - If Mode is 'Character Likeness', replicate the person's exact facial features, hair, and character traits in the new scene.
    - If Mode is 'Artistic Style', replicate the lighting, color palette, medium (e.g., oil painting, digital art, film noir), and textures.
    - If Mode is 'Full Clone', replicate both.
    
    Strictly follow the prompt '${settings.prompt}' while ensuring the character/style traits are 100% consistent with the reference image.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.referenceImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: { aspectRatio: settings.aspectRatio === 'Auto' ? '1:1' : settings.aspectRatio as any }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const swapModel = async (settings: ModelSwapSettings) => {
  const ai = getAI();
  if (!settings.originalImage) throw new Error("Original image is required.");

  const prompt = `
    Fashion E-commerce Model Swap Task:
    1. Identity Replacement: Replace the human model in the photo with the character described: ${settings.modelDescription}.
    ${settings.referenceImages && settings.referenceImages.length > 0 ? 'Use the provided reference images to ensure 100% facial and physical consistency of the new character.' : ''}
    2. Garment Integrity: Keep the clothing, accessories, and product details 100% perfectly intact. DO NOT change the color, texture, shape, or fit of the garments.
    3. Background Preservation: ${settings.keepBackground ? 'Keep the original background exactly as it is.' : 'Generate a new, professional studio or complementary outdoor background for the product.'}
    4. Focus Priority: ${settings.preservationFocus}.
    
    Technical Requirements:
    - Mask the skin and features of the original person accurately.
    - Ensure natural transitions at clothing edges, necklines, and sleeves.
    - Maintain realistic shadows, fabric folds, and lighting consistency.
    - The final result must look like a professional fashion editorial photo.
  `;

  const parts: any[] = [
    { inlineData: { data: settings.originalImage.split(',')[1], mimeType: 'image/png' } },
    { text: prompt }
  ];

  if (settings.referenceImages && settings.referenceImages.length > 0) {
    settings.referenceImages.forEach(img => {
      if (img.startsWith('data:')) {
        parts.push({
          inlineData: {
            data: img.split(',')[1],
            mimeType: 'image/png'
          }
        });
      }
    });
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  }));

  return extractImageFromResponse(response);
};

export const generateUGCProduct = async (settings: UGCProductSettings) => {
  const ai = getAI();
  if (!settings.productImage) throw new Error("Product image is required.");

  const prompt = `
    AI UGC Product - Professional Commercial Lifestyle Task:
    1. Scene Composition: ${settings.sceneDescription}
    2. Style Influence: ${settings.stylePreset}
    
    Strict Technical Requirements:
    - CONTEXTUAL PRODUCT PLACEMENT: Detect the main product in the provided image.
    - PRODUCT INTEGRITY: Keep the product 100% physically accurate. DO NOT alter labels, branding, shape, or textures of the product itself.
    - PHYSICS-BASED RENDERING: Generate highly realistic shadows and reflections on the new environment surfaces that perfectly match the light source described.
    - SEAMLESS BLENDING: The product must appear integrated into the scene as a single high-resolution photograph. No compositing artifacts.
    
    The output should be a professional e-commerce lifestyle image suitable for Shopify, Amazon, or high-end web banners.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.productImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: { aspectRatio: settings.aspectRatio === 'Auto' ? '1:1' : settings.aspectRatio as any }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};

export const generateEcomTemplate = async (settings: EcomTemplateSettings) => {
  const ai = getAI();
  if (!settings.productImage) throw new Error("Product image is required.");

  const prompt = `
    AI E-commerce Template Design Task:
    1. Context: Compose a professional marketing graphic.
    2. Product: The provided product image.
    3. Category: ${settings.category}.
    4. Text Content: "${settings.primaryText}".
    5. Brand Color: ${settings.brandColor}.
    
    Strict Technical Requirements:
    - BACKGROUND REMOVAL: Automatically and cleanly remove the original background from the product.
    - GRAPHIC COMPOSITION: Place the product aesthetically within a high-end design layout corresponding to the "${settings.category}" style.
    - TYPOGRAPHY: Render the text "${settings.primaryText}" using professional, high-impact typography that complements the brand color ${settings.brandColor}.
    - OVERALL LOOK: The final result must look like a professional graphic design for an elite e-commerce brand.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.productImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: { aspectRatio: '1:1' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const generatePDPDesign = async (settings: PDPDesignerSettings) => {
  const ai = getAI();
  
  const prompt = `
    AI Product Detail Page (PDP) Infographic Task:
    1. Objective: Generate a high-converting infographics page for an Amazon/Shopify listing.
    2. Theme: ${settings.theme}.
    3. Features to Highlight: ${settings.features.filter(f => f.trim()).join(', ')}.
    ${settings.inspirationUrl || settings.inspirationImage ? '4. Inspiration: Use the provided inspiration image/URL to guide the layout and aesthetic style.' : ''}
    ${settings.productUrl ? `5. Product Context: Use the following URL for additional product context: ${settings.productUrl}` : ''}
    
    Strict Technical Requirements:
    - SOPHISTICATED LAYOUT: Create a balanced design that features the primary products prominently.
    - VISUAL CALLOUTS: Use sleek icons, pointers (lines/arrows), and text boxes to explain each provided feature.
    - THEMATIC STYLING: Apply the "${settings.theme}" visual style.
    - PRODUCT CONTEXT: Use the provided product images to represent the item.
    - OUTPUT: A single, long-form professional listing image.
  `;

  const parts: any[] = [];
  
  // Add product images (limit to 10)
  settings.productImages.slice(0, 10).forEach(img => {
    parts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
  });

  if (settings.logoImage) {
    parts.push({ inlineData: { data: settings.logoImage.split(',')[1], mimeType: 'image/png' } });
  }

  if (settings.inspirationImage) {
    parts.push({ inlineData: { data: settings.inspirationImage.split(',')[1], mimeType: 'image/png' } });
  }

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: { aspectRatio: '3:4' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const runVirtualTryOn = async (settings: VirtualTryOnSettings) => {
  const ai = getAI();
  const modelImg = settings.modelSource === 'Library' ? settings.selectedModelId : settings.customModelImage;
  
  if (!settings.garmentImage || !modelImg) {
    throw new Error("Missing garment or model image.");
  }

  const prompt = `
    AI Fashion Virtual Try-On Task:
    Realistically overlay the provided clothing item onto the human model.
    Clothing Category: ${settings.clothingType}
    Scene/Background: ${settings.sceneDescription || 'Maintain existing setting'}
    
    Strict Execution Requirements:
    - PRECISE DRAPING: Detect the pose of the model and realistically "drape" the uploaded clothing over the body.
    - FABRIC INTEGRITY: Preserve all garment details, including original texture, color, folds, patterns, and logos.
    - LIGHTING SYNC: Automatically adjust lighting and shadows on the clothing to match the model and background.
    - SEAMLESS BLENDING: Ensure a professional, seamless blend around the neck, arms, and waistline.
    - 3D REALISM: The result must look like a real photograph of the model wearing the item.
  `;

  const parts: any[] = [
    { text: prompt },
    { inlineData: { data: settings.garmentImage.split(',')[1], mimeType: 'image/png' } }
  ];

  if (settings.modelSource === 'Library' && settings.selectedModelId) {
     // Fetch library model
     const modelData = await fetchImageAsBase64(settings.selectedModelId);
     parts.push({ inlineData: { data: modelData, mimeType: 'image/png' } });
  } else if (settings.customModelImage) {
     parts.push({ inlineData: { data: settings.customModelImage.split(',')[1], mimeType: 'image/png' } });
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts }
  }));

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const refineSkinTexture = async (settings: SkinRefinerSettings) => {
  const ai = getAI();
  if (!settings.sourceImage) throw new Error("Source image is required.");

  const prompt = `
    Fidelity Skin Refiner Task (Model: Enhancor V4):
    Eliminate the 'plastic' or 'synthetic' look by reconstructing realistic skin textures, pores, and micro-details.
    
    Processing Mode: ${settings.mode}
    Enhancement Type: ${settings.enhancementType}
    Output Quality: ${settings.outputQuality}
    Fix Lighting Enabled: ${settings.fixLighting}
    ${settings.lightPreset ? `Selected Light Preset: ${settings.lightPreset}` : ''}
    
    Strict Execution Requirements:
    - CELLULAR RECONSTRUCTION: Replace smoothed AI pixels with organic pore structures, fine lines, and cellular detail.
    - ANATOMY LOCK: Zero creative change to facial structure or identity. Maintain bone structure 100%.
    - ATMOSPHERE: Reconstruct lighting to look like professional studio photography.
    - ${settings.mode === 'Fix Skin' ? 'Focus on adding pores and skin micro-textures.' : ''}
    - ${settings.mode === 'Unpolish' ? 'Remove the flat, glossy AI-typical look.' : ''}
    - ${settings.mode === 'Fix Shine' ? 'Eliminate unwanted oily highlights and oily reflections.' : ''}
    - ${settings.mode === 'Retouch' ? 'Perform high-end editorial skin smoothing while keeping 100% of pore structures intact.' : ''}
    
    Target Fidelity: Professional 8K-level sharpness and biological realism.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.sourceImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: '1:1', // Assuming 1:1 for this portrait tool as per UI
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const runProductionGradeProcess = async (settings: ProductionEditorSettings) => {
  const ai = getAI();
  const modelName = 'gemini-3-pro-image-preview';

  const refinementInstructions = `
    High-Fidelity Skin Fix Pass:
    - Target Intensity: ${settings.skinTextureIntensity}
    - Biological Details: ${[
      settings.addFreckles ? "Add subtle freckles" : "",
      settings.addImperfections ? "Add natural micro-imperfections" : "",
      settings.removeShine ? "Eliminate excessive oily highlights" : ""
    ].filter(Boolean).join(", ")}
    - Goal: Erase any "AI look" and smooth plastic surfaces. Inject organic skin grain, visible pores, and cellular-level realism.
    - Resolution target: ${settings.resolution}
    ${settings.crispUpscale ? "- Perform a high-frequency sharpening pass for clinical clarity." : ""}
    ${settings.preset !== 'None' ? `- Shot Orientation / Composition: ${settings.preset}` : ''}
  `;

  const generationMode = settings.model === 'Kora Pro Cinema' ? 'Cinematic Photorealistic Style' : 'High-Fidelity Commercial Style';

  const finalPrompt = `
    PRODUCTION GRADE IMAGE GENERATION & EDITING
    Model Mode: ${generationMode}
    Prompt: ${settings.prompt}
    ${settings.remixPrompt ? `REMIX DIRECTIVE: ${settings.remixPrompt}` : ''}
    
    CRITICAL TECHNICAL REQ:
    - Detect skin regions and reconstruct them using the "Skin Fix" logic.
    - Ensure identity preservation if reference images are used.
    - Interpret micro-detail instructions in the prompt (e.g. sweat, fabric weave).
    - If multi-image subject/object provided, synthesize them into a cohesive masterpiece.
    
    ${refinementInstructions}
  `;

  const parts: any[] = [{ text: finalPrompt }];
  
  // Combine all images into a single payload for the vision model
  if (settings.referenceImage) {
    parts.push({ inlineData: { data: settings.referenceImage.split(',')[1], mimeType: 'image/png' } });
  }
  settings.subjectImages.forEach(img => {
    parts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: "Reference Subject Detail" });
  });
  settings.objectImages.forEach(img => {
    parts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: "Reference Object Detail" });
  });

  if (settings.maskImage) {
    parts.push({ inlineData: { data: settings.maskImage.split(',')[1], mimeType: 'image/png' } });
    parts.push({ text: "Use the provided mask image to restrict edits only to the marked regions (inpainting mode)." });
  }

  try {
    const config: any = {
      imageConfig: {
        aspectRatio: settings.aspectRatio === 'Auto' ? '1:1' : settings.aspectRatio as any,
      }
    };

    if (settings.resolution === '4K' || settings.resolution === '8K Production') config.imageConfig.imageSize = '4K';
    else if (settings.resolution === '2K') config.imageConfig.imageSize = '2K';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found.")) {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        await (window as any).aistudio.openSelectKey();
      }
    }
    throw error;
  }
  
  return null;
};

export const generateAIBackground = async (settings: AIBackgroundSettings) => {
  const ai = getAI();
  if (!settings.productImage) throw new Error("Product image is required.");

  const prompt = `
    AI Background Generation Task:
    1. Scene Prompt: ${settings.prompt}
    2. Visual Style: ${settings.style} preset.
    3. Technical: ${settings.includeReflections ? 'Include highly realistic floor reflections and contact shadows.' : 'Include realistic contact shadows.'}
    
    Strict Technical Requirements:
    - PRODUCT ISOLATION: Cleanly remove the original background from the product.
    - ENVIRONMENT SYNTHESIS: Generate a new high-quality environment based on: "${settings.prompt}".
    - LIGHTING INTEGRATION: The lighting on the product MUST be adjusted to perfectly match the new background's light source and temperature.
    - SEAMLESS BLENDING: Ensure the product looks naturally placed, not "copy-pasted". 
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.productImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: { aspectRatio: '1:1' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const tryOnFashion = async (settings: TryOnFashionSettings) => {
  const ai = getAI();
  if (!settings.modelImage || !settings.garmentImage) throw new Error("Model and garment images are required.");

  const prompt = `
    AI Fashion Virtual Try-On Task:
    Realistically overlay the provided clothing item onto the human model.
    Clothing Category: ${settings.category}
    Desired Background/Scene: ${settings.sceneDescription || 'Default professional studio'}
    
    Strict Execution Requirements:
    - PRECISE DRAPING: Analyze the model's pose and realistically "drape" the garment over the body. Do not simply paste it.
    - FABRIC INTEGRITY: Maintain 100% original texture, color, and design details (patterns, logos, stitching).
    - ANATOMY AWARENESS: Handle natural folds, shadows, and occlusions where body parts (arms, neck) interact with the fabric.
    - LIGHTING SYNC: Automatically adjust lighting and shadows on the garment to match the model's environmental context.
    - BLENDING: Ensure a seamless, professional blend at the neckline, cuffs, and waist.
    
    Final result must look like a real, high-quality fashion photograph.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.modelImage.startsWith('http') ? await fetchImageAsBase64(settings.modelImage) : settings.modelImage.split(',')[1], mimeType: 'image/png' } },
        { inlineData: { data: settings.garmentImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

// Helper for library images (since models are URLs)
async function fetchImageAsBase64(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(blob);
  });
}

export const tryOnAccessories = async (settings: TryOnAccessoriesSettings) => {
  const ai = getAI();
  if (!settings.personImage || !settings.accessoryImage) throw new Error("Person and accessory images are required.");

  const prompt = `
    AI Accessories Try-On Task:
    Virtually place the provided accessory onto the person.
    Accessory Type: ${settings.accessoryType}
    Placement Logic: ${settings.placementNote || 'Intelligent natural placement'}
    
    Strict Requirements:
    - Handle complex layering (e.g., glasses behind hair, bag strap over jacket).
    - Maintain correct perspective and scale of the accessory relative to the person.
    - Ensure lighting and shadows on the accessory match the environment of the original person image.
    - Product integrity: Accessory design must be perfectly preserved.
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.personImage.split(',')[1], mimeType: 'image/png' } },
        { inlineData: { data: settings.accessoryImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  }));

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const tryOnShoes = async (settings: TryOnShoesSettings) => {
  const ai = getAI();
  if (!settings.legsImage || !settings.shoeImage) throw new Error("Legs and shoe images are required.");

  const prompt = `
    AI Shoes Try-On Task:
    Visualize the provided shoes on the person's feet.
    Floor/Surface context: ${settings.floorType || 'Studio floor'}
    
    Strict Requirements:
    - Accurately detect the orientation of the person's feet.
    - Remove any existing footwear in the original photo.
    - "Fit" the new shoes onto the feet with realistic perspective.
    - CRITICAL: Generate realistic contact shadows and reflections on the floor/surface.
    - Maintain high product fidelity of the shoe.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: settings.legsImage.split(',')[1], mimeType: 'image/png' } },
        { inlineData: { data: settings.shoeImage.split(',')[1], mimeType: 'image/png' } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const generateProductAvatar = async (settings: ProductAvatarSettings) => {
  const ai = getAI();
  const sourceImage = settings.sourceType === 'upload' ? settings.sourceImage : 
                    settings.sourceType === 'url' ? settings.sourceUrl : settings.sourceImage;

  if (!sourceImage) throw new Error("Source image is required.");

  const prompt = `
    AI Product Avatar - Brand Ambassador Generation Task:
    1. Base Character: Maintain strict visual consistency with the person in the provided reference image.
    2. Style Transformation: Re-render the person in the style of "${settings.style}".
    3. Custom Appearance: ${settings.appearancePrompt}
    4. Background Setting: ${settings.background}.
    
    Requirements:
    - Preserve the facial structure and core identity of the person.
    - Ensure a high-quality, professional finish suitable for marketing.
    - If background is 'Transparent', provide a clean mask.
  `;

  const contents: any = {
    parts: [
      { text: prompt }
    ]
  };

  contents.parts.push({ inlineData: { data: sourceImage.split(',')[1], mimeType: 'image/png' } });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents,
    config: {
      imageConfig: { aspectRatio: '1:1' }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return null;
};

export const generateViralVideo = async (settings: ViralVideoSettings) => {
  const ai = getAI();
  const sourceFile = settings.sourceType === 'upload' ? settings.sourceFile : settings.sourceUrl;
  if (!sourceFile) throw new Error("Source file is required.");

  const prompt = `
    Generate a short, viral e-commerce video.
    Vibe/Template: ${settings.vibe}
    Duration: ${settings.duration}
    Text Overlay: ${settings.textOverlay || 'None'}
    Music Vibe: ${settings.musicStyle}
    
    Technical:
    - Use dynamic camera movements (pans, zoom-ins, orbit) based on the '${settings.vibe}' template.
    - Animate the static product image if provided.
    - If text overlay is provided, render it with high-impact kinetic typography.
    - Aspect Ratio: 9:16 (Vertical).
  `;

  const isVideoSource = sourceFile.startsWith('data:video') || sourceFile.toLowerCase().endsWith('.mp4');

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: !isVideoSource ? {
      imageBytes: sourceFile.split(',')[1],
      mimeType: 'image/png'
    } : undefined,
    video: isVideoSource ? {
      uri: sourceFile
    } : undefined,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '9:16'
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed.");
  
  const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const generateConcept = async (settings: ConceptMakerSettings): Promise<ConceptData> => {
  const ai = getAI();
  const prompt = `
    Analyze the content and theme of the following URL: ${settings.url}
    
    Based on this content, create a high-impact story concept for a social media video (like a Reel, TikTok, or Short).
    
    Category: ${settings.category}
    Language: ${settings.language}
    
    The concept should include:
    1. A catchy title.
    2. A strong "hook" for the first 3 seconds.
    3. A breakdown of 3-5 scenes with visual and audio descriptions.
    4. Target audience identification.
    5. Relevant hashtags.
    
    Return the result as a JSON object.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          hook: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                visual: { type: Type.STRING },
                audio: { type: Type.STRING },
                duration: { type: Type.STRING }
              },
              required: ['visual', 'audio', 'duration']
            }
          },
          targetAudience: { type: Type.STRING },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ['title', 'hook', 'scenes', 'targetAudience', 'hashtags']
      },
      tools: [{ googleSearch: {} }]
    }
  });

  return JSON.parse(response.text || "{}");
};

// Helper for dynamic timestamp calculation
const calculateDynamicDuration = (text: string) => {
  if (!text) return 0;
  
  // Base duration from word count (140 WPM = ~2.33 words per second)
  const words = text.split(/\s+/);
  const baseSeconds = words.length / (140 / 60);
  
  // Add pauses for punctuation
  const commas = (text.match(/,/g) || []).length;
  const periods = (text.match(/[\.\!\?]/g) || []).length;
  const longPauses = (text.match(/\.\.\.|—|-/g) || []).length;
  
  // Add emphasis for ALL CAPS words (longer than 1 char)
  const emphasisWords = words.filter(w => w.length > 1 && w === w.toUpperCase()).length;
  
  // Calculate total pause time
  const pauseSeconds = (commas * 0.4) + (periods * 0.8) + (longPauses * 1.2) + (emphasisWords * 0.2);
  
  return Math.max(1, Math.ceil(baseSeconds + pauseSeconds));
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatScript = async (rawScript: string, tone: ScriptTone, type: ScriptFormat): Promise<FormattedScript> => {
  const ai = getAI();
  const prompt = `
    You are a viral content script editor.
    Analyze the following messy script and convert it into a structured viral-ready script with a Hook, Body, and CTA.
    
    Input Script: ${rawScript}
    Tone: ${tone}
    Format Type: ${type}

    Rules:
    - Hook: A scroll-stopping intro (attention-grabbing).
    - Body: Clear, structured main content.
    - CTA: A strong action-oriented ending.
    - Keep it concise and engaging.
    - Improve messy grammar while maintaining the original meaning.
    - Make it suitable for social media content.

    Return ONLY JSON in this format:
    {
      "hook": "...",
      "body": "...",
      "cta": "..."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          body: { type: Type.STRING },
          cta: { type: Type.STRING }
        },
        required: ['hook', 'body', 'cta']
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  const hookDuration = calculateDynamicDuration(result.hook);
  const bodyDuration = calculateDynamicDuration(result.body);

  return {
    ...result,
    timestamps: {
      hook: formatTime(0),
      body: formatTime(hookDuration),
      cta: formatTime(hookDuration + bodyDuration)
    }
  };
};

export const generateScript = async (userPrompt: string, tone: ScriptTone, type: ScriptFormat): Promise<FormattedScript> => {
  const ai = getAI();
  const prompt = `
    You are a viral content script writer.
    Generate a structured viral-ready script based on the following prompt.
    
    User Prompt: ${userPrompt}
    Tone: ${tone}
    Format Type: ${type}

    Rules:
    - Hook: A scroll-stopping intro (attention-grabbing).
    - Body: Clear, structured main content.
    - CTA: A strong action-oriented ending.
    - Keep it concise and engaging.
    - Make it suitable for social media content (Reels, TikTok, Shorts).

    Return ONLY JSON in this format:
    {
      "hook": "...",
      "body": "...",
      "cta": "..."
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          body: { type: Type.STRING },
          cta: { type: Type.STRING }
        },
        required: ['hook', 'body', 'cta']
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  const hookDuration = calculateDynamicDuration(result.hook);
  const bodyDuration = calculateDynamicDuration(result.body);

  return {
    ...result,
    timestamps: {
      hook: formatTime(0),
      body: formatTime(hookDuration),
      cta: formatTime(hookDuration + bodyDuration)
    }
  };
};

export const generatePosePrompts = async (modelName: string, mood: string, referenceUrl: string): Promise<string[]> => {
  const ai = getAI();
  const prompt = `
    You are an expert AI prompt engineer and creative director.
    Your task is to generate 10 unique, highly detailed image generation prompts for a specific character model.
    
    Model Name: ${modelName}
    Scene/Mood: ${mood || 'Not specified, be creative'}
    Reference URL/Inspiration: ${referenceUrl || 'None provided'}
    
    Rules:
    - Generate exactly 10 distinct prompts.
    - Each prompt must feature the model "${modelName}".
    - Each prompt should describe a different pose, camera angle, or scenario that fits the mood.
    - Use cinematic, descriptive language (lighting, camera angle, textures, environment).
    - If a reference URL is provided, draw inspiration from its likely content based on the URL structure or general vibe.
    
    Return ONLY JSON in this format:
    {
      "prompts": ["prompt 1", "prompt 2", ...]
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ['prompts']
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result.prompts || [];
};

export const craftPrompt = async (dna: CharacterDNA, scene: string): Promise<string> => {
  const ai = getAI();
  const prompt = `
    You are a professional AI image prompt engineer.
    Your task is to craft a highly detailed, cinematic image generation prompt by combining a Character's DNA with a scene description.
    
    Character DNA:
    - Face Structure: ${dna.faceStructure}
    - Skin Tone: ${dna.skinTone}
    - Hair Signature: ${dna.hairSignature}
    - Body Proportions: ${dna.bodyProportions}
    
    Target Scene: ${scene}
    
    Rules:
    - Incorporate all DNA traits naturally into the prompt.
    - Use descriptive, cinematic language (lighting, camera angle, textures).
    - Focus on maintaining character consistency.
    - Output ONLY the final prompt string.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt
  });

  return response.text || scene;
};

export const generateCloneScene = async (model: CloneModel, prompt: string, aspectRatio: AspectRatio, seed: number) => {
  const ai = getAI();
  
  const systemPrompt = `
    AI Character Clone - Scene Generation Task:
    Character Name: ${model.name}
    Character DNA:
    - Face Structure: ${model.dna.faceStructure}
    - Skin Tone: ${model.dna.skinTone}
    - Hair Signature: ${model.dna.hairSignature}
    - Body Proportions: ${model.dna.bodyProportions}
    
    Target Action/Setting: ${prompt}
    Generation Seed: ${seed}
    
    Strict Execution Requirements:
    - CHARACTER CONSISTENCY: Use the DNA traits and provided reference images to maintain 100% consistency of the character's facial features, hair, and unique traits.
    - SCENE SYNTHESIS: Place the character described into the setting/action: "${prompt}".
    - REALISM: Ensure high-quality, professional rendering with realistic lighting and textures.
    - ASPECT RATIO: The output must be in ${aspectRatio} format.
  `;

  const parts: any[] = [
    { text: systemPrompt }
  ];

  // Add reference images
  model.referenceImages.forEach((img, idx) => {
    parts.push({
      inlineData: {
        data: img.split(',')[1],
        mimeType: 'image/png'
      }
    });
    parts.push({ text: `Reference Image ${idx + 1} for ${model.name}` });
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio === 'Auto' ? '1:1' : aspectRatio as any
        }
      }
    });

    const result = extractImageFromResponse(response);
    if (!result) {
      throw new Error("Generation failed: No content returned. This may be due to safety filters or model limitations.");
    }
    return result;
  } catch (error: any) {
    throw error;
  }
};

export const generateCSVMeta = async (images: { filename: string; data: string }[]): Promise<CSVMetaResult> => {
  const ai = getAI();
  const systemPrompt = `
    You are the core engine for "CSV Meta," an expert AI metadata engineer and prompt architect. Your mission is to transform visual data into high-value commercial metadata and technical generative prompts.

    ### CORE CAPABILITIES:
    1. DEEP IMAGE ANALYSIS: Identify subject matter, environment, lighting (e.g., golden hour, high-key), composition (e.g., rule of thirds, wide angle), and emotional resonance.
    2. COMMERCIAL METADATA:
       - TITLE: Descriptive, high-intent titles (max 200 chars) optimized for stock photography search.
       - KEYWORDS: 40-50 high-traffic, comma-separated tags. Include synonyms and conceptual terms (e.g., "solitude," "innovation").
       - DESCRIPTION: 1-2 sentences of objective visual summary.
    3. PROMPT REVERSE-ENGINEERING: Construct 5 high-quality prompts.
       - Master Prompt: A comprehensive technical prompt including medium (e.g., Unreal Engine 5, 35mm film), lighting, lens specs, and resolution.
       - 4 Styled Variations: Generate exactly 4 additional distinct prompts covering:
         1. Cinematic Storytelling (Epic drama/lighting)
         2. Minimalist/Product (Clean/Negative space)
         3. Editorial Fashion (Grit/Analog feel)
         4. Surreal/Artistic (Dreamlike/Unique textures)

    ### BATCH PROCESSING LOGIC:
    - Process each image as a unique entry in the JSON array.
    - Each asset must have exactly one 'ai_generation_prompt' and an array 'variations' containing the 4 styled versions.

    ### OPERATIONAL CONSTRAINTS:
    - No fluff or flowery adjectives. Be clinical and descriptive.
    - Prioritize "Deshi" cultural nuances or specific regional details if detected in the imagery.
    - Ensure 'ai_generation_prompt' follows this hierarchy: [Subject] [Environment] [Lighting/Atmosphere] [Camera Gear/Technical Specs] [Artistic Style/Resolution].
  `;

  const parts: any[] = [{ text: systemPrompt }];

  images.forEach(img => {
    parts.push({
      inlineData: {
        data: img.data.split(",")[1],
        mimeType: "image/png"
      }
    });
    parts.push({ text: `Analyze this image (Filename: ${img.filename})` });
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          assets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                filename: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                keywords: { type: Type.STRING },
                ai_generation_prompt: { type: Type.STRING },
                variations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["filename", "title", "description", "keywords", "ai_generation_prompt", "variations"]
            }
          }
        },
        required: ["assets"]
      }
    }
  });

  return JSON.parse(response.text || '{"assets": []}');
};

export const generatePromptVariations = async (imageBase64: string, title: string, description: string, keywords: string): Promise<string[]> => {
  const ai = getAI();
  const systemPrompt = `
    You are a Prompt Engineer specialized in diverse creative styles.
    Based on the provided metadata and the original image content (if provided), generate 4 distinct and highly detailed AI image generation prompts.
    
    CRITICAL: Refine the generated prompts by analyzing the detected image content (using the image and metadata).
    You MUST include more specific parameters such as:
    - Specific camera lens types (e.g., 85mm f/1.4, 24mm tilt-shift, 50mm macro).
    - Specific artistic movements, visual styles, or film aesthetics (e.g., Kodak Portra, Cyberpunk, Cinematic Noir).
    - Exact lighting setups appropriate to the scene (e.g., Rembrandt lighting, volumetric god rays, softbox studio lighting).
    
    Metadata:
    Title: ${title}
    Description: ${description}
    Keywords: ${keywords}
    
    Styles to cover:
    1. Cinematic Storytelling: Focus on epic lighting, drama, and atmosphere.
    2. Minimalist Architecture/Product: Focus on clean lines, negative space, and studio lighting.
    3. Editorial Fashion/Lifestyle: Focus on grain, authentic moments, and natural light.
    4. Hyper-realistic Macro/Surreal: Focus on extreme detail, bokeh, and unique perspectives.
    
    Each prompt must be highly technical and include lens specs, lighting, and medium.
  `;

  const parts: any[] = [{ text: systemPrompt }];
  if (imageBase64 && imageBase64.includes(',')) {
    parts.push({
      inlineData: { data: imageBase64.split(',')[1], mimeType: 'image/png' }
    });
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-2.5-flash", // Use standard model, as it handles inlineData with JSON reliably
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          variations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["variations"]
      }
    }
  }));

  const parsed = JSON.parse(response.text || '{"variations": []}');
  return parsed.variations || [];
};
