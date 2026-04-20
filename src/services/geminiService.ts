import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AnalysisResult {
  errors: {
    type: 'syntax' | 'structure' | 'semantic' | 'optimization';
    message: string;
    suggestion: string;
    context: string;
  }[];
  explanation: string;
  bestPractices: string[];
}

export async function analyzeCode(html: string, css: string): Promise<AnalysisResult> {
  const prompt = `Bạn đóng vai trò là một giáo viên tin học kỳ cựu. Hãy phân tích mã nguồn HTML và CSS sau đây.
  
  Mã HTML:
  \`\`\`html
  ${html}
  \`\`\`
  
  Mã CSS:
  \`\`\`css
  ${css}
  \`\`\`
  
  Yêu cầu:
  1. Phát hiện các lỗi cú pháp (syntax), cấu trúc (structure), và ngữ nghĩa (semantic).
  2. Phân tích ngữ cảnh để đưa ra gợi ý sửa lỗi thông minh và mang tính sư phạm.
  3. Gợi ý các kỹ thuật tối ưu hóa mã nguồn (shorthand CSS, semantic HTML).
  4. Trả về kết quả dưới định dạng JSON theo schema đã định sẵn.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: "Loại lỗi: syntax, structure, semantic, optimization" },
                  message: { type: Type.STRING, description: "Mô tả lỗi" },
                  suggestion: { type: Type.STRING, description: "Gợi ý sửa lỗi" },
                  context: { type: Type.STRING, description: "Đoạn mã gây lỗi" }
                },
                required: ["type", "message", "suggestion", "context"]
              }
            },
            explanation: { type: Type.STRING, description: "Giải thích tổng quan mang tính sư phạm" },
            bestPractices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Các thực hành tốt nhất gợi ý thêm"
            }
          },
          required: ["errors", "explanation", "bestPractices"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AnalysisResult;
  } catch (error) {
    console.error('Error analyzing code with Gemini:', error);
    throw error;
  }
}
