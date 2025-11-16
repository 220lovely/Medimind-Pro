import type { ReactNode } from 'react';
import type { Chat, GroundingChunk } from '@google/genai';

export interface NavItem {
  id: Page;
  label: string;
  icon: ReactNode;
}

export type Page = 
  | 'home' 
  | 'symptom-analyzer' 
  | 'medicine-database' 
  | 'medical-reports' 
  | 'find-facilities' 
  | 'ai-health-chat' 
  | 'emergency-aid' 
  | 'profile';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface MedicineInfo {
  text: string;
  sources: GroundingChunk[];
}

export interface FacilityInfo {
  text: string;
  places: GroundingChunk[];
}

// Add a declaration for the global aistudio object for Veo API key selection if needed, though not used in this implementation.
declare global {
  // Fix: Define the AIStudio interface and use it for `window.aistudio`.
  // This resolves a TypeScript error caused by conflicting type declarations,
  // where an anonymous type was used instead of the required named `AIStudio` type.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
  }
}
