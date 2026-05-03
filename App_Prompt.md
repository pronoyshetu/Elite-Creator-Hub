# E-Commerce AI Photography & Marketing Studio

Please build a comprehensive React (Vite) Single Page Application using TypeScript, Tailwind CSS, Lucide React icons, and Framer Motion for animations. The application is a futuristic, dark-themed AI photography and utility suite designed for e-commerce marketers to generate and enhance product/model photography using Gemini 2.5 Flash.

The app should include the following core features and use Firebase (Auth via Google and Firestore) for backend storage.

## 1. Authentication & Firebase Setup
- Connect to Firebase for Google Login. 
- Use Firestore to store user profiles and their credit balances (default 1000 credits). 
- Configure strict Firestore Security Rules protecting data based on `auth.uid`.

## 2. Consistency Engine & Model Swap
- Develop a "Consistency Engine" interface where users can save "AI Influencers" (custom generated models) to the database.
- A user should be able to upload up to 10 reference images, extract an "AI DNA" profile (face structure, skin tone, hair signature), and save it.
- Allow swapping a base model in a photo with the saved customized influencer using Gemini vision models to combine the reference images and the original photo seamlessly.

## 3. CSV Meta Data Analyzer
- A bulk-processing interface where users upload a series of images.
- Use the Gemini 2.5 Flash model to analyze each image and generate: 
  - SEO Titles, Descriptions, and comma-separated Keywords.
  - "Styled Variations" of prompt ideas by detecting the camera lens type, lighting setup, and artistic movement presented in the image.
- Allow users to download the batch data to a CSV.

## 4. Virtual Try-On
- Provide an interface where users can upload a garment image and a model photo.
- Use a prompt engineering approach with Gemini to generate an image of the model wearing the garment.

## 5. Skin Refiner & Image Enhancer
- Provide distinct tools to upscale, relight, and fix skin blemishes on AI-generated images using tailored Gemini generation prompts.
- Allow batch downloading results as a ZIP file.

## 6. Concept Maker & Script Studio
- A creative ideation section where marketers provide a product image.
- AI generates a compelling storyboard, social media ad scripts (TikTok/Reels), and artistic art direction prompts.

## Design & UI Rules
- **Theme:** Strict Dark Mode. Use slate/gray-900 backgrounds with bright emerald (`text-emerald-500`) and cyan highlights for interactive elements.
- **Components:** Create glassmorphic cards, custom loaders, and rich tooltip states. 
- **Animations:** Use `framer-motion` for smooth page transitions and micro-interactions (hover states, loaders).
- **Error Handling:** Implement robust centralized error handling for Firestore permission issues and API Quote limits with exponential backoff and user-friendly alert messages.
