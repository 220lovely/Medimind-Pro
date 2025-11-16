import React, { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { GoogleGenAI, LiveSession, Modality, Chat, GenerateContentResponse, LiveServerMessage } from '@google/genai';
import { analyzeSymptoms, getMedicineInfo, analyzeMedicalReport, findNearbyFacilities, createChat } from '../services/geminiService';
import type { Page, NavItem, ChatMessage, MedicineInfo, FacilityInfo } from '../types';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
  
// Audio Utilities for Live API
const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};
const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};
const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
};


// --- ICON COMPONENTS ---
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const SymptomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const MedicineIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10H3a1 1 0 00-1 1v4a1 1 0 001 1h11M14 10l5-5m0 0l5 5m-5-5v12" /></svg>;
const ReportIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const FacilitiesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const EmergencyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

// --- PAGE COMPONENTS ---
const PageCard: React.FC<{title: string, children: ReactNode, icon: ReactNode}> = ({ title, children, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 h-full">
        <div className="flex items-center text-2xl font-bold text-gray-800 dark:text-white mb-6">
            <span className="text-blue-500 mr-3">{icon}</span>
            {title}
        </div>
        <div>{children}</div>
    </div>
);

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
);

const Disclaimer: React.FC<{ children: ReactNode }> = ({ children }) => (
    <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-300 p-4 rounded-r-lg my-4">
        <p className="font-bold">Disclaimer</p>
        <p className="text-sm">{children}</p>
    </div>
);

const HomePage = () => (
    <PageCard title="Dashboard" icon={<HomeIcon/>}>
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Welcome to MediMind Pro!</h3>
            <p>Your intelligent health companion is ready to assist you. Select a feature from the sidebar to get started.</p>
            <p>You can analyze symptoms, look up medication, get insights from your medical reports, find nearby health facilities, and even get real-time first aid guidance.</p>
            <Disclaimer>
                MediMind Pro is an AI-powered tool and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </Disclaimer>
        </div>
    </PageCard>
);

const SymptomAnalyzerPage = () => {
    const [symptoms, setSymptoms] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!symptoms.trim()) {
            setError('Please describe your symptoms.');
            return;
        }
        setError('');
        setLoading(true);
        setResult('');
        const response = await analyzeSymptoms(symptoms);
        setResult(response);
        setLoading(false);
    };

    return (
        <PageCard title="Symptom Analyzer" icon={<SymptomIcon/>}>
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">Describe your symptoms in detail below. Our AI will provide a potential analysis and suggest next steps. Powered by Gemini 2.5 Pro for advanced reasoning.</p>
                <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full h-40 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200"
                    placeholder="e.g., I have a persistent dry cough, a slight fever, and feel tired..."
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                    {loading ? 'Analyzing...' : 'Analyze Symptoms'}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {loading && <LoadingSpinner />}
                {result && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {result}
                    </div>
                )}
            </div>
        </PageCard>
    );
};

const MedicineDatabasePage = () => {
    const [medicine, setMedicine] = useState('');
    const [result, setResult] = useState<MedicineInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!medicine.trim()) {
            setError('Please enter a medicine name.');
            return;
        }
        setError('');
        setLoading(true);
        setResult(null);
        const response = await getMedicineInfo(medicine);
        setResult(response);
        setLoading(false);
    };

    return (
        <PageCard title="Medicine Database" icon={<MedicineIcon/>}>
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">Search for information about any medicine. This feature uses Google Search grounding for up-to-date results.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="text"
                        value={medicine}
                        onChange={(e) => setMedicine(e.target.value)}
                        className="flex-grow p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200"
                        placeholder="e.g., Paracetamol"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {loading && <LoadingSpinner />}
                {result && (
                    <div className="mt-6 space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {result.text}
                        </div>
                        {result.sources.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white">Sources:</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                                    {result.sources.map((source, index) => (
                                        source.web && <li key={index}>
                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                {source.web.title || source.web.uri}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageCard>
    );
};

const MedicalReportsPage = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };
    
    const handleSubmit = async () => {
        if (!file) {
            setError('Please upload a report file.');
            return;
        }
        setError('');
        setLoading(true);
        setResult('');
        try {
            const base64Data = await fileToBase64(file);
            const imagePart = { mimeType: file.type, data: base64Data };
            const response = await analyzeMedicalReport(imagePart, prompt);
            setResult(response);
        } catch (e) {
            setError('Failed to process file.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageCard title="Medical Report Analyzer" icon={<ReportIcon/>}>
            <div className="space-y-4">
                 <p className="text-gray-600 dark:text-gray-300">Upload an image of your medical report (e.g., blood test, X-ray) and ask a question about it.</p>
                <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                    <input type="file" id="report-upload" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                    <label htmlFor="report-upload" className="cursor-pointer text-blue-500 font-semibold">
                        {file ? `Selected: ${file.name}` : 'Click to upload a report image'}
                    </label>
                </div>
                {preview && <img src={preview} alt="Report preview" className="max-h-60 rounded-lg mx-auto" />}
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-24 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200"
                    placeholder="e.g., What are the key takeaways from this blood report? Are any values outside the normal range?"
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading || !file}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    {loading ? 'Analyzing...' : 'Analyze Report'}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {loading && <LoadingSpinner />}
                {result && (
                     <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                        {result}
                    </div>
                )}
            </div>
        </PageCard>
    );
};

const FindFacilitiesPage = () => {
    const [result, setResult] = useState<FacilityInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFind = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setError('');
        setLoading(true);
        setResult(null);

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const response = await findNearbyFacilities({ latitude, longitude });
                setResult(response);
                setLoading(false);
            },
            () => {
                setError('Unable to retrieve your location. Please enable location services.');
                setLoading(false);
            }
        );
    };

    return (
        <PageCard title="Find Medical Facilities" icon={<FacilitiesIcon/>}>
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">Find hospitals, clinics, and pharmacies near your current location. This feature uses Google Maps grounding for accurate place information.</p>
                <button
                    onClick={handleFind}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                    {loading ? 'Searching...' : 'Find Facilities Near Me'}
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {loading && <LoadingSpinner />}
                 {result && (
                    <div className="mt-6 space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {result.text}
                        </div>
                        {result.places.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white">Places Found:</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                                    {result.places.map((source, index) => (
                                       source.maps && <li key={index}>
                                            <a href={source.maps.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                                {source.maps.title || 'Unknown Place'}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PageCard>
    );
};

const AIHealthChatPage = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setChat(createChat());
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleSubmit = async () => {
        if (!input.trim() || !chat || loading) return;
        setLoading(true);
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        setHistory(prev => [...prev, userMessage]);
        setInput('');

        try {
            const result = await chat.sendMessageStream({ message: input });
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);
            
            for await (const chunk of result) {
                const chunkText = chunk.text;
                setHistory(prev => {
                    const newHistory = [...prev];
                    const lastMessage = newHistory[newHistory.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.parts[0].text += chunkText;
                    }
                    return newHistory;
                });
            }
        } catch (error) {
            console.error("Chat error:", error);
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: 'Sorry, I encountered an error.' }] }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageCard title="AI Health Chat" icon={<ChatIcon/>}>
            <div className="flex flex-col h-[70vh]">
                <div className="flex-grow overflow-y-auto pr-4 space-y-4">
                    {history.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                {msg.parts[0].text}
                            </div>
                        </div>
                    ))}
                    {loading && history[history.length-1].role === 'user' && (
                        <div className="flex justify-start">
                            <div className="max-w-lg p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                <span className="animate-pulse">...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        className="flex-grow p-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-gray-200"
                        placeholder="Ask a health question..."
                        disabled={loading}
                    />
                    <button onClick={handleSubmit} disabled={loading || !input.trim()} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                        Send
                    </button>
                </div>
            </div>
        </PageCard>
    );
};

const EmergencyAidPage = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcription, setTranscription] = useState<{user: string, model: string}[]>([]);
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const stopListening = useCallback(() => {
        if(sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
        setIsListening(false);
    }, []);

    const startListening = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            setIsListening(true);
            setTranscription([]);
            let currentInputTranscription = '';
            let currentOutputTranscription = '';
            let nextStartTime = 0;
            const sources = new Set<AudioBufferSourceNode>();

            inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });

            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: 'You are an emergency first aid assistant. Provide clear, calm, step-by-step instructions. Start by asking what the emergency is. Prioritize life-threatening situations. Always advise calling emergency services as the first and most important step.',
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        sourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current!);
                        scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };

                            if(sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        sourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if(base64Audio && outputAudioContextRef.current) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current.destination);
                            source.addEventListener('ended', () => sources.delete(source));
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            sources.add(source);
                        }
                        if (message.serverContent?.interrupted) {
                            for (const source of sources.values()) source.stop();
                            sources.clear();
                            nextStartTime = 0;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            setTranscription(prev => [...prev, {user: currentInputTranscription, model: currentOutputTranscription}]);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }
                    },
                    onerror: (e) => {
                        console.error('Live API Error:', e);
                        stopListening();
                    },
                    onclose: () => {
                        // Handled by user action
                    },
                },
            });

        } catch (err) {
            console.error('Failed to start listening:', err);
            setIsListening(false);
        }
    };
    
    useEffect(() => {
        return () => {
            stopListening();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <PageCard title="Emergency Aid Assistant" icon={<EmergencyIcon/>}>
            <div className="space-y-4">
                <Disclaimer>This is an AI assistant for guidance ONLY. In a real emergency, your first action should always be to call your local emergency services (e.g., 911, 112, 999).</Disclaimer>
                <p className="text-gray-600 dark:text-gray-300">Press "Start" to begin a real-time voice conversation for first aid instructions. The AI will guide you through the necessary steps.</p>
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-full sm:w-auto px-6 py-3 text-white font-semibold rounded-lg transition-colors ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isListening ? 'Stop Session' : 'Start Emergency Session'}
                </button>

                {isListening && (
                    <div className="mt-4 flex items-center text-lg text-gray-700 dark:text-gray-300">
                        <span className="relative flex h-3 w-3 mr-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Listening...
                    </div>
                )}
                
                <div className="mt-6 space-y-4 h-96 overflow-y-auto pr-2">
                    {transcription.map((turn, index) => (
                        <div key={index}>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">You: <span className="font-normal text-gray-700 dark:text-gray-300">{turn.user}</span></p>
                            <p className="font-semibold text-green-600 dark:text-green-400">MediMind: <span className="font-normal text-gray-700 dark:text-gray-300">{turn.model}</span></p>
                        </div>
                    ))}
                </div>
            </div>
        </PageCard>
    );
};

const ProfilePage = () => (
    <PageCard title="Profile" icon={<ProfileIcon/>}>
        <div className="space-y-4">
             <div className="flex items-center space-x-4">
                <img className="h-24 w-24 rounded-full" src="https://picsum.photos/200" alt="User" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Demo User</h3>
                    <p className="text-gray-500 dark:text-gray-400">demo@medimind.pro</p>
                </div>
            </div>
            <div className="pt-4">
                <button className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                    Edit Profile
                </button>
            </div>
        </div>
    </PageCard>
);

// --- MAIN DASHBOARD COMPONENT ---
interface DashboardProps {
  onLogout: () => void;
}
const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
    const [activePage, setActivePage] = useState<Page>('home');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems: NavItem[] = [
        { id: 'home', label: 'Home', icon: <HomeIcon /> },
        { id: 'symptom-analyzer', label: 'Symptom Analyzer', icon: <SymptomIcon /> },
        { id: 'medicine-database', label: 'Medicine Database', icon: <MedicineIcon /> },
        { id: 'medical-reports', label: 'Medical Reports', icon: <ReportIcon /> },
        { id: 'find-facilities', label: 'Find Facilities', icon: <FacilitiesIcon /> },
        { id: 'ai-health-chat', label: 'AI Health Chat', icon: <ChatIcon /> },
        { id: 'emergency-aid', label: 'Emergency Aid', icon: <EmergencyIcon /> },
    ];

    const renderPage = () => {
        switch (activePage) {
            case 'home': return <HomePage />;
            case 'symptom-analyzer': return <SymptomAnalyzerPage />;
            case 'medicine-database': return <MedicineDatabasePage />;
            case 'medical-reports': return <MedicalReportsPage />;
            case 'find-facilities': return <FindFacilitiesPage />;
            case 'ai-health-chat': return <AIHealthChatPage />;
            case 'emergency-aid': return <EmergencyAidPage />;
            case 'profile': return <ProfilePage />;
            default: return <HomePage />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            {/* Sidebar */}
            <aside className={`bg-white dark:bg-gray-800 shadow-xl fixed inset-y-0 left-0 z-30 w-64 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
                <div className="flex items-center justify-center p-4 border-b border-gray-200 dark:border-gray-700 h-16">
                    <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">MediMind Pro</h1>
                </div>
                <nav className="flex-grow p-4 space-y-2">
                    {navItems.map(item => (
                        <a
                            key={item.id}
                            href="#"
                            onClick={(e) => { e.preventDefault(); setActivePage(item.id); setSidebarOpen(false); }}
                            className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${activePage === item.id ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {item.icon}
                            <span className="ml-4 font-medium">{item.label}</span>
                        </a>
                    ))}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
                     <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('profile'); setSidebarOpen(false); }} className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 mb-2 ${activePage === 'profile' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                        <ProfileIcon />
                        <span className="ml-4 font-medium">Profile</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); }} className="flex items-center px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-800/50 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <LogoutIcon />
                        <span className="ml-4 font-medium">Logout</span>
                    </a>
                </div>
            </aside>
            
            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex justify-between md:justify-end items-center h-16 bg-white dark:bg-gray-800 shadow-md p-4">
                     <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-500 dark:text-gray-400 focus:outline-none">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <div className="font-semibold text-lg">Demo User</div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
