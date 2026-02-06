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
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  // REFERENCIA CLAVE: Para evitar que el audio se quede "pegado" en la primera palabra
  const audioPalabraRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    
    const cargarDatos = async () => {
      try {
        const res = await fetch(`/api/texto-detalle-por-slug/${slug}`);
        const data = await res.json();
        
        if (data.error) {
          router.push('/');
          return;
        }
        
        setTexto(data);
        // Dividimos por espacios y Maqaf hebreo
        const palabrasArray = data.contenido.split(/[\s\u05BE]+/);
        setPalabras(palabrasArray);
      } catch (err) {
        console.error("Error al cargar el texto:", err);
      }
    };

    if (slug) cargarDatos();

    return () => {
      synthRef.current?.cancel();
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      if (audioPalabraRef.current) {
        audioPalabraRef.current.pause();
        audioPalabraRef.current.src = "";
      }
    };
  }, [slug, router]);

  const esHebreo = (t: string) => /[\u0590-\u05FF]/.test(t);

  // --- AUDIO PROXY PARA HEBREO (CON LIMPIEZA DE BUFFER) ---
  const reproducirAudioGoogle = (textoParaLeer: string, idioma: string, callbackFinal?: () => void) => {
    const textoLimpio = textoParaLeer.replace(/[\u0591-\u05C7]/g, "");
    const url = `/api/proxy-audio?q=${encodeURIComponent(textoLimpio)}&tl=${idioma}&cb=${Date.now()}`;
    
    // 1. Detenemos cualquier audio que esté sonando actualmente
   if (audioPalabraRef.current) {
    audioPalabraRef.current.pause();
    audioPalabraRef.current.src = ""; 
    audioPalabraRef.current.load();
  }

    // 2. Creamos la nueva instancia
    const nuevoAudio = new Audio(url);
    audioPalabraRef.current = nuevoAudio;

    nuevoAudio.onended = () => {
      if (callbackFinal) callbackFinal();
    };

    nuevoAudio.play().catch(e => console.error("Error Audio Proxy:", e));
    return nuevoAudio;
  };

  const analizarPalabra = async (word: string, index: number) => {
    setCargando(true);
    setIndicePalabraActual(index);
    const isHeb = esHebreo(word);

    // Cancelamos lecturas previas
    if (synthRef.current) synthRef.current.cancel();
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setLeyendoTodo(false);

    // Reproducción
    if (isHeb) {
      reproducirAudioGoogle(word, 'he');
    } else if (synthRef.current) {
      const ut = new SpeechSynthesisUtterance(word);
      ut.lang = 'en-US';
      synthRef.current.speak(ut);
    }

    // Traducción
    try {
      if (isHeb) {
        const resDb = await fetch(`/api/diccionario/${encodeURIComponent(word)}`);
        const dataDb = await resDb.json();
        if (dataDb.traduccion) {
          setAnalisis({ palabra: word, trad: dataDb.traduccion });
          setCargando(false);
          return;
        }
      }

      const wordClean = word.replace(/[.,/#!$%^&*;:{}=\-_`~()\u0591-\u05C7]/g, "").trim();
      const langPair = isHeb ? 'he|es' : 'en|es';
      const resExt = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(wordClean)}&langpair=${langPair}`);
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
    if (intervaloRef.current) clearInterval(intervaloRef.current);

    if (isHeb) {
      setLeyendoTodo(true);
      reproducirAudioGoogle(fullText, 'he', () => {
        setLeyendoTodo(false);
        setIndicePalabraActual(null);
        if (intervaloRef.current) clearInterval(intervaloRef.current);
      });

      let idx = 0;
      setIndicePalabraActual(0);
      intervaloRef.current = setInterval(() => {
        idx++;
        if (idx < words.length) {
          setIndicePalabraActual(idx);
        } else {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
        }
      }, 650); 

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
          let charCount = 0;
          for (let i = 0; i < words.length; i++) {
            if (charCount >= charIndex) {
              setIndicePalabraActual(i);
              break;
            }
            charCount += words[i].length + 1;
          }
        }
      };
      synthRef.current.speak(ut);
    }
  };

  if (!texto) return <div className="h-screen flex items-center justify-center font-bold text-indigo-600 animate-pulse">Cargando lectura...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-stone-50">
      <main className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="mb-8 font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase text-xs tracking-widest">
            ← Volver a Biblioteca
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <h1 className="text-5xl font-black text-slate-800 tracking-tighter italic">
              {texto.titulo}
            </h1>
            <button 
              onClick={() => {
                if (leyendoTodo) {
                   if (synthRef.current) synthRef.current.cancel();
                   if (audioPalabraRef.current) {
                      audioPalabraRef.current.pause();
                      audioPalabraRef.current.src = "";
                   }
                   setLeyendoTodo(false);
                   setIndicePalabraActual(null);
                   if (intervaloRef.current) clearInterval(intervaloRef.current);
                } else {
                  reproducirConResaltado(texto.contenido, palabras);
                }
              }}
              className={`px-8 py-4 rounded-2xl shadow-2xl text-white font-black transition-all transform hover:scale-105 ${leyendoTodo ? 'bg-red-500' : 'bg-indigo-600'}`}
            >
              {leyendoTodo ? "⏹️ DETENER" : "🔊 ESCUCHAR TODO"}
            </button>
          </div>

          <div 
            className={`text-4xl md:text-6xl leading-[2.2] select-none ${esHebreo(texto.contenido) ? 'text-right font-serif' : 'text-left font-light'}`}
            dir={esHebreo(texto.contenido) ? 'rtl' : 'ltr'}
          >
            {palabras.map((p, i) => (
              <span 
                key={i} 
                onClick={() => analizarPalabra(p, i)}
                className={`cursor-pointer px-2 py-1 rounded-2xl transition-all inline-block m-1
                  ${indicePalabraActual === i 
                    ? 'bg-yellow-300 text-black scale-110 shadow-xl ring-4 ring-yellow-400 z-10' 
                    : 'hover:bg-indigo-600 hover:text-white text-slate-700'}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </main>

      <aside className="w-full md:w-[400px] bg-slate-900 text-white p-10 border-l border-slate-800 shadow-2xl">
        <div className="sticky top-10">
          <h2 className="text-indigo-400 text-[10px] font-black tracking-[0.4em] mb-12 uppercase">Análisis Gramatical</h2>
          <div className="space-y-12">
            <section>
              <span className="text-slate-500 text-[10px] block mb-4 font-bold uppercase">Morfología</span>
              <p className={`text-6xl font-black tracking-tighter ${esHebreo(analisis.palabra) ? 'text-right' : ''}`}>
                {analisis.palabra}
              </p>
            </section>
            <section className="bg-white/5 p-8 rounded-[2rem] border border-white/10 backdrop-blur-sm">
              <span className="text-slate-500 text-[10px] block mb-4 font-bold uppercase">Traducción Literal</span>
              {cargando ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                </div>
              ) : (
                <p className="text-3xl text-green-400 font-serif leading-tight">
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