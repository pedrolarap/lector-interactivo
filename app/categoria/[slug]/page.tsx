"use client";
import { useState, useEffect, use } from 'react';
import Link from 'next/link';

// 1. Definimos la estructura de lo que esperamos de la API
interface Texto {
  id: number;
  titulo: string;
  slug: string;
  contenido?: string;
  idioma_code?: string;
  imagen_url?: string;
}

export default function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: idiomaId } = use(params); 
  
  // 2. Le decimos a useState que manejará un array de tipo Texto
  const [textos, setTextos] = useState<Texto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchTextos = async () => {
      try {
        const res = await fetch(`/api/categorias/${idiomaId}`);
        // 3. Le indicamos a TS que los datos vienen con esa forma
        const data = (await res.json()) as Texto[];
        
        if (Array.isArray(data)) {
          setTextos(data);
        }
      } catch (err) {
        console.error("Error al cargar textos de la categoría:", err);
      } finally {
        setCargando(false);
      }
    };

    if (idiomaId) fetchTextos();
  }, [idiomaId]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-800 transition flex items-center gap-2 mb-6">
            <span>←</span> Volver al Inicio
          </Link>
          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">
            Biblioteca: <span className="text-indigo-600">{idiomaId}</span>
          </h1>
        </header>

        {cargando ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {textos.map((texto) => (
              <article key={texto.id} className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col">
                <div className="flex-1">
                  {texto.idioma_code && (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase">
                      {texto.idioma_code}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-slate-800 mt-4 mb-4 leading-tight">
                    {texto.titulo}
                  </h2>
                </div>

                <Link href={`/lector/${texto.slug || texto.id}`}>
                  <button className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-colors">
                    Abrir lectura
                  </button>
                </Link>
              </article>
            ))}
          </div>
        )}

        {!cargando && textos.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 italic font-serif text-xl">
              Aún no hay textos registrados para este idioma.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}