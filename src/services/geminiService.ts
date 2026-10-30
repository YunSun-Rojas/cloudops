import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey: string = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Envía un mensaje general a Gemini y retorna la respuesta en texto.
 */
export async function consultarGemini(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error al conectar con Gemini:", error);
    throw new Error("No se pudo procesar la solicitud con la IA.");
  }
}