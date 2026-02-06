import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const tl = searchParams.get('tl') || 'he';

  if (!q) {
    return NextResponse.json({ error: "Falta el texto" }, { status: 400 });
  }

  // Esta es la URL real de Google que el navegador bloquea, pero el servidor NO
  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${tl}&client=tw-ob`;

  try {
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error('Error al conectar con Google');

    const arrayBuffer = await response.arrayBuffer();
    
    // Le devolvemos al navegador el audio como si fuera nuestro
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      },
    });
  } catch (error) {
    console.error("Error en Proxy Audio:", error);
    return NextResponse.json({ error: "Error al generar el audio" }, { status: 500 });
  }
}