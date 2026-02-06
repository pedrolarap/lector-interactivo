"use client";
import { useState, useEffect, useRef } from 'react';

// Definición de tipos para TypeScript
interface Cuento {
  id: number;
  titulo: string;
  contenido: string;
}

interface AnalisisPalabra {
  palabra: string;
  tipo: string;
  trad: string;
}

export default function LectorInteractivo() {
  // Estados para la data
  const [listaCuentos, setListaCuentos] = useState<Cuento[]>([]);
  const [cuentoActual, setCuentoActual] = useState<Cuento | null>(null);
  const [palabras, setPalabras] = useState<string[]>([]);
  const [analisis, setAnalisis] = useState<AnalisisPalabra>({ palabra: "-", tipo: "-", trad: "-" });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Al cargar la página
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    cargarCuentos();
  }, []);

  const cargarCuentos = async () => {
    try {
      const res = await fetch('/api/cuento'); // Asegúrate que el nombre de tu carpeta sea 'cuento'
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setListaCuentos(data);
        if (data.length > 0) procesarCuento(data[0]);
      } else if (data.contenido) {
        // En caso de que la API devuelva un solo objeto
        setListaCuentos([data]);
        procesarCuento(data);
      }
    } catch (err) {
      setError("No se pudo conectar con la base de datos.");
    }
  };

  const procesarCuento = (cuento: Cuento) => {
    setCuentoActual(cuento);
    // Dividir palabras: Soporta espacios y el guion hebreo (Maqqef \u05BE)
    const tokens = cuento.contenido.split(/[\s\u05BE]+/);
    setPalabras(tokens);
  };

  // Detecta si hay caracteres hebreos
  const esHebreo = (text: string) => /[\u0590-\u05FF]/.test(text);

  const leerYAnalizar = async (word: string) => {
    if (!synthRef.current) return;
    setCargando(true);
    setError("");

    // 1. Locución
    synthRef.current.cancel();
    const isHeb = esHebreo(word);
    const ut = new SpeechSynthesisUtterance(word);
    ut.lang = isHeb ? 'he-IL' : 'en-US';
    synthRef.current.speak(ut);

    // Limpiar signos de puntuación
    const wordClean = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();

    try {
      if (isHeb) {
        // --- LÓGICA HEBREO (API SEFARIA) ---
        const res = await fetch(`https://www.sefaria.org/api/words/${wordClean}`);
        const data = await res.json();
        setAnalisis({
          palabra: word,
          tipo: data.morphology || "Hebreo Bíblico",
          trad: data.definitions?.[0] || "Traducción no disponible en el Lexicon."
        });
      } else {
        // --- LÓGICA INGLÉS (MYMEMORY API) ---
        const resTrad = await fetch(`https://api.mymemory.translated.net/get?q=${wordClean}&langpair=en|es`);
        const dataTrad = await resTrad.json();
        setAnalisis({
          palabra: word,
          tipo: "Inglés",
          trad: dataTrad.responseData.translatedText
        });
      }
    } catch (e) {
      setAnalisis({ palabra: word, tipo: "Desconocido", trad: "Error al traducir." });
    } finally {
      setCargando(false);
    }
  };

  const toggleLecturaCompleta = () => {
    if (!cuentoActual || !synthRef.current) return;
    const ut = new SpeechSynthesisUtterance(cuentoActual.contenido);
    ut.lang = esHebreo(cuentoActual.contenido) ? 'he-IL' : 'en-US';
    synthRef.current.speak(ut);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-stone-50 p-4 md:p-8 font-sans">
      
      {/* SECCIÓN PRINCIPAL: LECTOR */}
      <main className="flex-1 bg-white p-6 md:p-10 rounded-3xl shadow-lg border border-stone-200">
        
        {/* SELECTOR DE TEXTOS */}
        <div className="mb-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Biblioteca Railway</label>
          <select 
            onChange={(e) => {
              const selected = listaCuentos.find(c => c.id === parseInt(e.target.value));
              if (selected) procesarCuento(selected);
            }}
            className="w-full bg-white border-none text-indigo-900 text-lg font-medium rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {listaCuentos.map(c => (
              <option key={c.id} value={c.id}>
                {esHebreo(c.contenido) ? "🇮🇱 Hebreo" : "🇺🇸 Inglés"} - {c.titulo}
              </option>
            ))}
          </select>
        </div>

        {cuentoActual && (
          <>
            <h1 className="text-3xl font-serif font-bold text-slate-800 mb-6">{cuentoActual.titulo}</h1>
            
            <div className="flex gap-3 mb-10">
              <button onClick={toggleLecturaCompleta} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700 transition">▶️ Escuchar todo</button>
              <button onClick={() => synthRef.current?.pause()} className="bg-stone-200 text-stone-600 px-6 py-2 rounded-full font-bold">⏸ Pausar</button>
            </div>

            {/* CONTENEDOR DE TEXTO DINÁMICO */}
            <div 
              className={`text-2xl md:text-4xl leading-relaxed text-slate-700 transition-all ${esHebreo(cuentoActual.contenido) ? 'text-right font-serif' : 'text-left'}`}
              dir={esHebreo(cuentoActual.contenido) ? 'rtl' : 'ltr'}
            >
              {palabras.map((p, i) => (
                <span 
                  key={i} 
                  onClick={() => leerYAnalizar(p)}
                  className="cursor-pointer hover:bg-yellow-200 hover:text-black px-1 rounded transition-colors inline-block m-0.5"
                >
                  {p}
                </span>
              ))}
            </div>
          </>
        )}
        
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </main>

      {/* PANEL LATERAL: ANÁLISIS GRAMATICAL */}
      <aside className="w-full md:w-96 md:ml-8 mt-8 md:mt-0">
        <div className="bg-indigo-950 text-white p-8 rounded-3xl sticky top-8 shadow-2xl">
          <h2 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-6 border-b border-indigo-900 pb-2">Diccionario Inteligente</h2>
          
          <div className="space-y-8">
            <div>
              <p className="text-indigo-300 text-[10px] uppercase mb-1">Palabra Seleccionada</p>
              <p className={`text-5xl font-bold ${esHebreo(analisis.palabra) ? 'text-right' : 'text-left'}`}>
                {analisis.palabra}
              </p>
            </div>

            <div>
              <p className="text-indigo-300 text-[10px] uppercase mb-1">Morfología / Categoría</p>
              <p className="text-xl text-indigo-100 font-medium capitalize">{analisis.tipo}</p>
            </div>

            <div className="bg-indigo-900/50 p-5 rounded-2xl border border-indigo-800">
              <p className="text-indigo-300 text-[10px] uppercase mb-2">Traducción al Español</p>
              {cargando ? (
                <div className="animate-pulse flex space-x-2">
                  <div className="h-4 bg-indigo-700 rounded w-full"></div>
                </div>
              ) : (
                <p className="text-2xl text-yellow-400 italic font-serif leading-tight">
                  {analisis.trad}
                </p>
              )}
            </div>
          </div>

          <p className="text-indigo-500 text-[10px] mt-10 text-center">
            Conectado a Railway MySQL + Sefaria Lexicon API
          </p>
        </div>
      </aside>
    </div>
  );
}