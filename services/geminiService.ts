import { GoogleGenAI, Chat, GroundingChunk } from "@google/genai";
import type { MedicineInfo, FacilityInfo } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeSymptoms = async (symptoms: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: `Analyze the following symptoms described by a user. Provide a potential analysis, possible conditions, and suggest appropriate next steps (e.g., consult a specific type of doctor, lifestyle changes). IMPORTANT: Start your response with a clear disclaimer that you are an AI and not a medical professional, and this analysis is not a substitute for professional medical advice. User's symptoms: "${symptoms}"`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Symptom analysis error:", error);
    return "An error occurred while analyzing symptoms. Please try again.";
  }
};

export const getMedicineInfo = async (medicine: string): Promise<MedicineInfo> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide comprehensive information about the medicine: "${medicine}". Include its uses, dosage, side effects, and precautions.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return { text: response.text, sources };
  } catch (error) {
    console.error("Medicine info error:", error);
    return { text: "An error occurred while fetching medicine information.", sources: [] };
  }
};

export const analyzeMedicalReport = async (
  image: { mimeType: string; data: string },
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: image.mimeType, data: image.data } },
                { text: `Analyze this medical report. ${prompt}. IMPORTANT: Start your response with a clear disclaimer that you are an AI and this is not a substitute for professional medical consultation.` }
            ]
        },
    });
    return response.text;
  } catch (error) {
    console.error("Medical report analysis error:", error);
    return "An error occurred while analyzing the medical report.";
  }
};

export const findNearbyFacilities = async (coords: {
  latitude: number;
  longitude: number;
}): Promise<FacilityInfo> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Find nearby hospitals, clinics, and pharmacies.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: { latLng: coords },
        },
      },
    });
    const places = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    return { text: response.text, places };
  } catch (error) {
    console.error("Find facilities error:", error);
    return { text: "An error occurred while finding nearby facilities.", places: [] };
  }
};

export const createChat = (): Chat => {
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'You are MediMind, a friendly and knowledgeable AI health assistant. Provide helpful and safe information, but always remind users to consult a healthcare professional for medical advice.',
    }
  });
};
