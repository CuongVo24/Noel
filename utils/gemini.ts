import { GoogleGenerativeAI } from "@google/generative-ai";

// Access API Key from environment variables as per system configuration
// The build environment is expected to inject this value.
const apiKey = process.env.API_KEY;

export const generateGenZWish = async (): Promise<string> => {
  // Graceful fallback if API key is missing (e.g. during development without env vars)
  if (!apiKey) {
    console.warn("Gemini API Key is missing in process.env.API_KEY");
    return "Giáng sinh vui vẻ! (Nhớ nạp tiền mua quà nha 💸)";
  }

  try {
    const ai = new GoogleGenerativeAI({ apiKey: apiKey });
    // Using 'gemini-2.5-flash' as it is efficient for short text generation
    const model = "gemini-2.5-flash";
    const prompt = "Đóng vai một người bạn thân sinh viên cực kỳ lầy lội hơi dâm xíu, phũ mồm nhưng hài hước. Hãy viết 1 câu troll (trêu chọc) ngắn gọn về Giáng Sinh (dưới 25 từ). Chủ đề: Đòi quà, than nghèo, trêu ế, bóc phốt, qua môn. Tuyệt đối KHÔNG dùng văn mẫu sến súa. KHÔNG dùng từ ngữ gượng gạo kiểu 'keo lỳ', 'tái châu'. Ví dụ: 'Lớn đầu rồi đừng đòi quà nữa', 'Tầm này liêm sỉ gì nữa', 'Alo mẹ à, con không về đâu'.";

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    const text = response.text;
    return text || "Noel vui vẻ không quạu! 🎄";
  } catch (error) {
    console.error("Gemini Client Error:", error);
    // Return a funny fallback message on error so the UI doesn't break
    return "Mạng lag quá, nghỉ troll nhau đi! 🎅";
  }
};