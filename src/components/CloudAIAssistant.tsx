import React, { useState, FormEvent, JSX } from 'react';
import { consultarGemini } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export function CloudAIAssistant(): JSX.Element {
  const [input, setInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setChatHistory((prev) => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const aiResponse = await consultarGemini(userMessage);
      setChatHistory((prev) => [...prev, { role: 'model', text: aiResponse }]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'model', text: 'Lo siento, ocurrió un error al generar la respuesta.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-[600px]">
      <div className="border-b pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">Asistente CloudOps con Gemini</h2>
        <p className="text-sm text-gray-500">Pregúntale sobre configuraciones, comandos o análisis de infraestructura.</p>
      </div>

      {/* Contenedor de mensajes */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            Escribe una consulta para comenzar a interactuar con la IA.
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 p-3 rounded-lg text-sm animate-pulse">
              Gemini está pensando...
            </div>
          </div>
        )}
      </div>

      {/* Formulario de entrada */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ej: ¿Cómo optimizo un clúster de Kubernetes?"
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}