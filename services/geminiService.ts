import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

const initAI = () => {
    // In a real app, strict checks would be here, but for this demo, we assume the env var or user will provide it elsewhere (or we fail gracefully).
    // Note: The prompt instructed NOT to ask user for API Key in UI, but rely on process.env.
    // However, if process.env.API_KEY is missing, this will throw.
    if (!process.env.API_KEY) {
        console.warn("Missing API_KEY in environment");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const analyzeDailyReport = async (date: string, orders: Order[]): Promise<string> => {
  const ai = initAI();
  if (!ai) return "Gemini API Key is not configured. Please check your environment variables.";

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const itemCount: Record<string, number> = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      itemCount[item.name] = (itemCount[item.name] || 0) + item.quantity;
    });
  });

  const sortedItems = Object.entries(itemCount)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');

  const prompt = `
    You are a business consultant for a coffee shop. 
    Analyze the following sales data for ${date}.
    
    Data:
    - Total Orders: ${orders.length}
    - Total Revenue: $${totalRevenue.toFixed(2)}
    - Items Sold (Ranked): ${sortedItems}
    
    Provide a concise, 3-bullet point summary of the day's performance and 1 actionable tip for tomorrow. 
    Keep the tone professional yet encouraging.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate AI analysis. Please try again later.";
  }
};