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
    };
  }, [slug, router]);

  const esHebreo = (t: string) => /[\u0590-\u05FF]/.test(t);

  // --- AUDIO PROXY HEBREO ---
  const reproducirAudioGoogle = (textoParaLeer: string, idioma: string, callbackFinal?: () => void) => {
    const textoLimpio = textoParaLeer.replace(/[\u0591-\u05C7]/g, "");
    const url = `/api/proxy-audio?q=${encodeURIComponent(textoLimpio)}&tl=${idioma}`;
    const audio = new Audio(url);
    
    audio.onended = () => {
      if (callbackFinal) callbackFinal();
    };

    audio.play().catch(e => console.error("Error Audio Proxy:", e));
    return audio;
  };

  const analizarPalabra = async (word: string, index: number) => {
    setCargando(true);
    setIndicePalabraActual(index);
    const isHeb = esHebreo(word);

    if (synthRef.current) synthRef.current.cancel();
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    setLeyendoTodo(false);

    if (isHeb) {
      reproducirAudioGoogle(word, 'he');
    } else if (synthRef.current) {
      const ut = new SpeechSynthesisUtterance(word);
      ut.lang = 'en-US';
      synthRef.current.speak(ut);
    }

    // GESTIÓN DE TRADUCCIÓN
    try {
      if (isHeb) {
        const resDb = await fetch(`/api/diccionario/${encodeURIComponent(word)}`);
        const dataDb = await resDb.json();
        if (dataDb.traduccion) {
          setAnalisis({ palabra: word, trad: dataDb.traduccion });
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
      const audio = reproducirAudioGoogle(fullText, 'he', () => {
        setLeyendoTodo(false);
        setIndicePalabraActual(null);
        if (intervaloRef.current) clearInterval(intervaloRef.current);
      });

      // Simulación de resaltado para Hebreo (Estimación: 500ms por palabra)
      let idx = 0;
      setIndicePalabraActual(0);
      intervaloRef.current = setInterval(() => {
        idx++;
        if (idx < words.length) {
          setIndicePalabraActual(idx);
        } else {
          if (intervaloRef.current) clearInterval(intervaloRef.current);
        }
      }, 600); // Ajusta este número según la velocidad del audio de Google

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
          // Buscamos el índice de la palabra basado en el carácter
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

  if (!texto) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-stone-50">
      <main className="flex-1 p-6 md:p-12 lg:p-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="mb-8 font-bold text-slate-400 hover:text-indigo-600">← VOLVER</button>

          <div className="flex justify-between items-center mb-10">
            <h1 className="text-4xl font-black text-slate-800">{texto.titulo}</h1>
            <button 
              onClick={() => leyendoTodo ? (synthRef.current?.cancel(), setLeyendoTodo(false), setIndicePalabraActual(null), intervaloRef.current && clearInterval(intervaloRef.current)) : reproducirConResaltado(texto.contenido, palabras)}
              className={`p-4 rounded-full shadow-lg text-white font-bold ${leyendoTodo ? 'bg-red-500' : 'bg-indigo-600'}`}
            >
              {leyendoTodo ? "⏹️ DETENER" : "🔊 LEER TODO"}
            </button>
          </div>

          <div 
            className={`text-3xl md:text-5xl leading-[2.2] ${esHebreo(texto.contenido) ? 'text-right font-serif' : 'text-left'}`}
            dir={esHebreo(texto.contenido) ? 'rtl' : 'ltr'}
          >
            {palabras.map((p, i) => (
              <span 
                key={i} 
                onClick={() => analizarPalabra(p, i)}
                className={`cursor-pointer px-1.5 py-1 rounded-xl transition-all inline-block m-1
                  ${indicePalabraActual === i 
                    ? 'bg-yellow-300 text-black scale-110 shadow-md ring-2 ring-yellow-400' 
                    : 'hover:bg-indigo-100 text-slate-700'}`}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </main>

      <aside className="w-full md:w-96 bg-slate-900 text-white p-8 border-l border-slate-800 shadow-2xl">
        <div className="sticky top-10">
          <h2 className="text-indigo-400 text-xs font-black tracking-widest mb-10 uppercase">Diccionario Inteligente</h2>
          <div className="space-y-8">
            <section>
              <span className="text-slate-500 text-[10px] block mb-2">PALABRA SELECCIONADA</span>
              <p className={`text-5xl font-bold ${esHebreo(analisis.palabra) ? 'text-right' : ''}`}>{analisis.palabra}</p>
            </section>
            <section className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
              <span className="text-slate-500 text-[10px] block mb-2">TRADUCCIÓN</span>
              {cargando ? <div className="animate-pulse h-6 bg-slate-700 rounded w-3/4"></div> : <p className="text-2xl text-green-400">{analisis.trad}</p>}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}