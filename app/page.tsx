"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. Definimos la forma de los datos para que TypeScript no se queje
interface Destacado {
  id: number;
  titulo: string;
  slug: string;
  idioma_code: string;
  imagen_url?: string;
}

export default function Home() {
  // 2. Inicializamos el estado con el tipo correcto <Destacado[]>
  const [destacados, setDestacados] = useState<Destacado[]>([]);
  const [idiomas] = useState([
    { id: 'he', name: 'Hebreo', icon: '🇮🇱' },
    { id: 'el', name: 'Griego', icon: '🇬🇷' },
    { id: 'en', name: 'Inglés', icon: '🇺🇸' },
    { id: 'fr', name: 'Francés', icon: '🇫🇷' }
  ]);

  useEffect(() => {
    const cargarDestacados = async () => {
      try {
        const res = await fetch('/api/textos/destacados');
        if (!res.ok) throw new Error("Error en la respuesta de la API");
        
        // 3. Casteamos la respuesta para asegurar la compatibilidad
        const data = (await res.json()) as Destacado[];
        
        if (Array.isArray(data)) {
          setDestacados(data);
        }
      } catch (err) {
        console.error("Error cargando destacados:", err);
      }
    };

    cargarDestacados();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <header className="bg-indigo-900 text-white py-16 px-6 text-center">
        <h1 className="text-5xl font-extrabold mb-4">Políglota Bíblico</h1>
        <p className="text-indigo-200 text-xl">Explora lenguas sagradas y literatura clásica.</p>
      </header>

      {/* Selector de Idiomas Principal */}
      <nav className="max-w-6xl mx-auto -mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
        {idiomas.map(idioma => (
          <Link href={`/categoria/${idioma.id}`} key={idioma.id}>
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:scale-105 transition cursor-pointer text-center border-b-4 border-indigo-500">
              <span className="text-4xl mb-2 block">{idioma.icon}</span>
              <span className="font-bold text-slate-700 uppercase tracking-wider">{idioma.name}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Grid de Contenido Visual (Destacados) */}
      <section className="max-w-6xl mx-auto py-16 px-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">Lecturas Sugeridas</h2>
        
        {destacados.length === 0 ? (
          <p className="text-slate-500 text-center py-10">Cargando sugerencias...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {destacados.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition group">
                <div className="h-48 overflow-hidden">
                  <img 
                    src={item.imagen_url || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=500'} 
                    alt={item.titulo}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                  />
                </div>
                <div className="p-6">
                  <span className="text-indigo-500 text-xs font-bold uppercase">{item.idioma_code}</span>
                  <h3 className="text-xl font-bold mb-3">{item.titulo}</h3>
                  <Link href={`/lector/${item.slug || item.id}`}>
                    <button className="w-full py-3 bg-slate-100 text-indigo-900 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition">
                      Empezar a leer
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}