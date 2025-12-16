import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API with process.env.API_KEY as per guidelines.
// We assume process.env.API_KEY is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGenZWish = async (): Promise<string> => {
  try {
    // Use gemini-2.5-flash for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Đóng vai một người bạn thân cực kỳ lầy lội, phũ mồm nhưng hài hước. Hãy viết 1 câu troll (trêu chọc) ngắn gọn về Giáng Sinh (dưới 25 từ). Chủ đề: Đòi quà, than nghèo, trêu ế, bóc phốt. Tuyệt đối KHÔNG dùng văn mẫu sến súa. KHÔNG dùng từ ngữ gượng gạo kiểu 'keo lỳ', 'tái châu'. Ví dụ: 'Lớn đầu rồi đừng đòi quà nữa', 'Tầm này liêm sỉ gì nữa', 'Alo mẹ à, con không về đâu'.",
    });
    
    return response.text || "Giáng sinh vui vẻ, bớt ế đi má! 🌚";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Noel vui vẻ không quạu! (Mạng lag rùi) 🎄";
  }
};