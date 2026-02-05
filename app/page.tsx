"use client";
import { useState, useEffect, useRef } from 'react';

export default function LectorDeRailway() {
  const [datos, setDatos] = useState({ titulo: "Cargando...", contenido: "" });
  const [palabras, setPalabras] = useState<string[]>([]);
  const [analisis, setAnalisis] = useState({ palabra: "-", tipo: "-", trad: "-" });
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // 1. Cargar datos de la base de datos al abrir la página
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    const traerDatos = async () => {
      try {
        const respuesta = await fetch('/api/cuento');
        const data = await respuesta.json();
        if (data.contenido) {
          setDatos({ titulo: data.titulo, contenido: data.contenido });
          setPalabras(data.contenido.split(/\s+/));
        }
      } catch (error) {
        console.error("Error cargando el cuento:", error);
      }
    };

    traerDatos();
  }, []);

  // 2. Función para leer palabra individual y mostrar gramática
  const leerYAnalizar = (word: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const ut = new SpeechSynthesisUtterance(word);
    ut.lang = 'en-US'; 
    synthRef.current.speak(ut);

    // Diccionario simple para el ejemplo
    const wordClean = word.toLowerCase().replace(/[^a-z]/g, "");
    const mockDict: any = {
      "leo": { t: "Proper Noun", tr: "Leo" },
      "slumped": { t: "Verb", tr: "Desplomarse" },
      "spectacles": { t: "Noun", tr: "Gafas/Anteojos" },
      "magic": { t: "Noun", tr: "Magia" }
    };

    setAnalisis({
      palabra: word,
      tipo: mockDict[wordClean]?.t || "Common Word",
      trad: mockDict[wordClean]?.tr || "Check dictionary"
    });
  };

  // 3. Funciones de lectura general
  const leerTodo = () => {
    const ut = new SpeechSynthesisUtterance(datos.contenido);
    ut.lang = 'en-US';
    synthRef.current?.speak(ut);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 p-6">
      <main className="flex-1 bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-indigo-900 mb-4">{datos.titulo}</h1>
        
        <div className="flex gap-2 mb-6">
          <button onClick={leerTodo} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">▶️ Leer Cuento</button>
          <button onClick={() => synthRef.current?.pause()} className="bg-amber-500 text-white px-4 py-2 rounded">⏸️ Pausar</button>
          <button onClick={() => synthRef.current?.resume()} className="bg-green-500 text-white px-4 py-2 rounded">⏯️ Reanudar</button>
        </div>

        <div className="text-lg leading-relaxed text-gray-700">
          {palabras.map((p, i) => (
            <span 
              key={i} 
              onClick={() => leerYAnalizar(p)}
              className="cursor-pointer hover:bg-indigo-100 hover:text-indigo-700 px-1 rounded transition"
            >
              {p}{" "}
            </span>
          ))}
        </div>
      </main>

      <aside className="w-full md:w-80 md:ml-6 mt-6 md:mt-0 bg-indigo-900 text-white p-6 rounded-xl h-fit sticky top-6">
        <h2 className="text-xl font-bold mb-4 border-b border-indigo-700 pb-2">Gramática</h2>
        <div className="space-y-4">
          <div><p className="text-indigo-300 text-xs uppercase">Palabra</p><p className="text-2xl font-bold">{analisis.palabra}</p></div>
          <div><p className="text-indigo-300 text-xs uppercase">Tipo</p><p className="text-lg">{analisis.tipo}</p></div>
          <div><p className="text-indigo-300 text-xs uppercase">Traducción</p><p className="text-xl text-yellow-400 italic">{analisis.trad}</p></div>
        </div>
      </aside>
    </div>
  );
}