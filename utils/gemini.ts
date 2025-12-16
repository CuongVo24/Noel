import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API with process.env.API_KEY as per guidelines.
// We assume process.env.API_KEY is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGenZWish = async (): Promise<string> => {
  try {
    // Use gemini-2.5-flash for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Bạn là một Gen Z Việt Nam hài hước, 'xéo xắt' nhưng đáng yêu. Hãy viết 1 câu chúc Giáng Sinh ngắn gọn (dưới 25 từ) cho bạn bè. Dùng slang như 'keo lỳ', 'chốt đơn', 'xu cà na', '10 điểm'. Không dùng văn mẫu.",
    });
    
    return response.text || "Giáng sinh keo lỳ tái châu! 💅";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Noel vui vẻ không quạu! (Mạng lag rùi) 🎄";
  }
};