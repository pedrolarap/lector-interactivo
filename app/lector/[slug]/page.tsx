"use client";
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function LectorFinal() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [texto, setTexto] = useState<any>(null);
  const [palabras, setPalabras] = useState<string[]>([]);
  const [analisis, setAnalisis] = useState({ palabra: "-", trad: "-" });
  const [cargando, setCargando] = useState(false);
  const [leyendoTodo, setLeyendoTodo] = useState(false);
  const [indicePalabraActual, setIndicePalabraActual] = useState<number | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    
    // Cambiamos la búsqueda para usar el SLUG de la URL
    const cargarDatos = async () => {
      try {
        const res = await fetch(`/api/texto-detalle-por-slug/${slug}`);
        const data = await res.json();
        
        if (data.error) {
          router.push('/');
          return;
        }
        
        setTexto(data);
        // Dividimos por espacios y el guión hebreo (Maqaf)
        const palabrasArray = data.contenido.split(/[\s\u05BE]+/);
        setPalabras(palabrasArray);

        // Autoplay sugerido (opcional)
        setTimeout(() => {
            reproducirConResaltado(data.contenido, palabrasArray);
        }, 800);
      } catch (err) {
        console.error("Error al cargar el texto:", err);
      }
    };

    if (slug) cargarDatos();

    return () => synthRef.current?.cancel();
  }, [slug, router]);

  const esHebreo = (t: string) => /[\u0590-\u05FF]/.test(t);

  // --- FUNCIÓN DE AUDIO PROXY PARA HEBREO ---
  const reproducirAudioGoogle = (textoParaLeer: string, idioma: string) => {
    const textoLimpio = textoParaLeer.replace(/[\u0591-\u05C7]/g, "");
    const url = `/api/proxy-audio?q=${encodeURIComponent(textoLimpio)}&tl=${idioma}`;
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Error Audio Proxy:", e));
  };

  const analizarPalabra = async (word: string, index: number) => {
    setCargando(true);
    setIndicePalabraActual(index);
    const isHeb = esHebreo(word);

    // 1. GESTIÓN DE AUDIO
    if (synthRef.current) synthRef.current.cancel();
    setLeyendoTodo(false);

    if (isHeb) {
      reproducirAudioGoogle(word, 'he');
    } else if (synthRef.current) {
      const ut = new SpeechSynthesisUtterance(word);
      ut.lang = 'en-US';
      synthRef.current.speak(ut);
    }

    // 2. GESTIÓN DE TRADUCCIÓN (DB Propia -> API Externa)
    try {
      if (isHeb) {
        // Intento 1: Tu Diccionario en SQL
        const resDb = await fetch(`/api/diccionario/${encodeURIComponent(word)}`);
        const dataDb = await resDb.json();

        if (dataDb.traduccion) {
          setAnalisis({ palabra: word, trad: dataDb.traduccion });
          setCargando(false);
          return;
        }
      }

      // Intento 2: MyMemory API (Respaldo)
      const wordClean = isHeb 
        ? word.replace(/[\u0591-\u05C7]/g, "").trim() 
        : word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();

      const langPair = isHeb ? 'he|es' : 'en|es';
      const resExt = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(wordClean)}&langpair=${langPair}`
      );
      const dataExt = await resExt.json();
      
      setAnalisis({
        palabra: word,
        trad: dataExt.responseData.translatedText || "Traducción no encontrada"
      });

    } catch (e) {
      setAnalisis({ palabra: word, trad: "Error de conexión" });
    } finally {
      setCargando(false);
    }
  };

  const reproducirConResaltado = (fullText: string, words: string[]) => {
    const isHeb = esHebreo(fullText);

    if (isHeb) {
      setLeyendoTodo(true);
      reproducirAudioGoogle(fullText, 'he');
      // En hebreo (proxy) no tenemos onBoundary, detenemos el pulso tras un tiempo estimado
      setTimeout(() => setLeyendoTodo(false), 8000); 
    } else {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const ut = new SpeechSynthesisUtterance(fullText);
      ut.lang = 'en-US';
      ut.onstart = () => setLeyendoTodo(true);
      ut.onend = () => {
        setLeyendoTodo(false);
        setIndicePalabraActual(null);
      };
      ut.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          let currentCount = 0;
          for (let i = 0; i < words.length; i++) {
            if (currentCount >= charIndex) {
              setIndicePalabraActual(i);
              break;
            }
            currentCount += words[i].length + 1;
          }
        }
      };
      synthRef.current.speak(ut);
    }
  };

  if (!texto) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-white text-slate-900">
      <main className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto bg-stone-50/30">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => router.back()}
            className="mb-8 flex items-center text-sm font-bold text-slate-400 hover:text-indigo-600 transition-colors"
          >
            ← VOLVER
          </button>

          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-serif font-black text-slate-800">
              {texto.titulo}
            </h1>
            <button 
              onClick={() => {
                if (leyendoTodo) {
                    if (synthRef.current) synthRef.current.cancel();
                    setLeyendoTodo(false);
                } else {
                    reproducirConResaltado(texto.contenido, palabras);
                }
              }}
              className={`p-4 rounded-full shadow-lg transition-all text-white font-bold ${leyendoTodo ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {leyendoTodo ? "⏹️ DETENER" : "🔊 LEER TODO"}
            </button>
          </div>

          <div 
            className={`text-3xl md:text-5xl leading-[2] ${
              esHebreo(texto.contenido) ? 'text-right font-serif' : 'text-left font-light'
            }`}
            dir={esHebreo(texto.contenido) ? 'rtl' : 'ltr'}
          >
            {palabras.map((p, i) => (
              <span 
                key={i} 
                onClick={() => analizarPalabra(p, i)}
                className={`cursor-pointer px-1.5 py-0.5 rounded-lg transition-all inline-block m-1 border-b-2 
                  ${indicePalabraActual === i 
                    ? 'bg-yellow-300 text-black border-yellow-500 scale-110 shadow-md' 
                    : 'hover:bg-indigo-600 hover:text-white border-transparent'}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </main>

      <aside className="w-full md:w-96 bg-slate-900 text-white p-8 md:p-10 border-l border-slate-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0">
          <h2 className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">
            DICCIONARIO PERSONALIZADO
          </h2>
          
          <div className="space-y-12">
            <section>
              <label className="text-slate-500 text-[9px] font-bold uppercase block mb-4">Palabra Original</label>
              <p className={`text-6xl font-bold break-words ${esHebreo(analisis.palabra) ? 'text-right' : 'font-sans'}`}>
                {analisis.palabra}
              </p>
            </section>

            <section className="bg-slate-800/40 p-8 rounded-3xl border border-white/5">
              <label className="text-slate-500 text-[9px] font-bold uppercase block mb-4">Traducción Literal</label>
              {cargando ? (
                <div className="animate-pulse h-8 bg-slate-700 rounded w-full"></div>
              ) : (
                <p className="text-2xl text-green-400 font-serif leading-relaxed">
                  {analisis.trad}
                </p>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}