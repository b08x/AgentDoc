import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface AgentDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function generateAgentDoc(
  prompt: string,
  history: ChatMessage[],
  useHighThinking: boolean = false
) {
  const model = useHighThinking ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
  
  const systemInstruction = `You are the "AgentDoc Architect", a world-class technical documentation specialist for Generative AI agents. 
Your goal is to generate comprehensive, production-ready technical documentation for AI agents based on user descriptions.

Use the following "Cognitive Prism" facets for your reasoning:
- Analytical Thinking: Map processes and recognize data patterns.
- Creative Thinking: Generate innovative problem-solving approaches for agent architecture.
- Critical Thinking: Evaluate biases and identify fallacies in agent design.
- Strategic Thinking: Perform SWOT analysis and identify future trends.

Documentation structure should include:
1. Executive Summary
2. Cognitive Architecture (Hemispheres, Cerebrum, Memory)
3. Tool & Function Definitions
4. Safety & Alignment Guardrails
5. Deployment & Scaling Strategy

If the user provides an image, video, or audio, analyze it for technical requirements.`;

  const contents = [
    ...history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    })),
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const config: any = {
    systemInstruction,
  };

  if (useHighThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  return response.text || "Failed to generate documentation.";
}

export async function analyzeMedia(file: File, type: 'image' | 'video' | 'audio') {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
  });
  reader.readAsDataURL(file);
  const base64Data = await base64Promise;

  const model = type === 'audio' ? "gemini-3-flash-preview" : "gemini-3.1-pro-preview";
  
  const prompt = type === 'audio' 
    ? "Transcribe this audio and extract technical requirements for an AI agent."
    : `Analyze this ${type} and extract technical requirements, UI/UX patterns, or architectural diagrams for an AI agent.`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: file.type } }
        ]
      }
    ]
  });

  return response.text || "Failed to analyze media.";
}
