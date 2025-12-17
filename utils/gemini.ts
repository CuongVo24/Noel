import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.API_KEY;

// Generate a batch of wishes to cache
export const generateWishBatch = async (): Promise<string[]> => {
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return ["Giáng sinh vui vẻ!", "Noel ấm áp nha!", "Chúc bạn trăm năm hạnh phúc!", "Sớm có người yêu nha!"];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });
    
    const prompt = `
      Đóng vai một người bạn thân Gen Z Việt Nam cực lầy lội, hài hước nhưng rất có chất xám, mồm phũ thông minh kiểu "troll bằng IQ", biết inside joke tinh tế
      Hãy viết 10 câu chúc/troll Giáng Sinh ngắn gọn (dưới 20 từ mỗi câu). 
      Chủ đề đa dạng: than ế, chúc qua môn, cà khịa người yêu cũ, bóng đá, liên quân, showbiz Việt Nam, học tập, âm nhạc(indie)
      
      YÊU CẦU BẮT BUỘC:
      1. Trả về kết quả là một JSON Array chứa các chuỗi string (List<String>).
      2. Không dùng Markdown code block, chỉ trả về raw JSON.
      3. Văn phong tự nhiên, dùng slang Gen Z (nhưng không cringe).
      
      Ví dụ output: ["Lớn rồi đừng đòi quà nữa", "Noel này vẫn giống Noel xưa, vẫn chưa có bồ", "Chúc mừng bạn quay vào ô mất lượt"]
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Parse JSON safely
    try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
            return json.map(item => String(item));
        }
        return [];
    } catch (parseError) {
        console.error("Failed to parse Gemini JSON:", text);
        return ["Noel vui vẻ không quạu!", "Mạng lag nhưng tình bạn không lag!"];
    }

  } catch (error) {
    console.error("Gemini Batch Error:", error);
    return [];
  }
};

// Fallback for single execution (legacy support or dire need)
export const generateGenZWish = async (): Promise<string> => {
    const batch = await generateWishBatch();
    return batch[0] || "Noel vui vẻ!";
};