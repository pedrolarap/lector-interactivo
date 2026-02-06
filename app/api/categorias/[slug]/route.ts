import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// FUERZA A NEXT.JS A LEER LA BASE DE DATOS EN TIEMPO REAL (SIN CACHÉ)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ slug: string }> }
) {
  // 1. Esperamos a que los params se resuelvan (Requisito de Next.js 15)
  const { slug } = await params;
  
  try {
    // 2. Establecemos conexión con la base de datos
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
      charset: 'utf8mb4', // Fundamental para caracteres hebreos/griegos
    });

    // 3. Buscamos el ID de la categoría basado en el slug (en, he, etc.)
    const [cats]: any = await connection.execute(
      'SELECT id, nombre FROM categorias WHERE slug = ?', 
      [slug]
    );

    if (cats.length === 0) {
      await connection.end();
      return NextResponse.json({ error: `El slug '${slug}' no existe.` }, { status: 404 });
    }

    const catId = cats[0].id;

    // 4. Traer subcategorías (ej: Biblia dentro de Hebreo)
    const [subcats]: any = await connection.execute(
      'SELECT id, nombre, slug, false as es_texto FROM categorias WHERE padre_id = ?', 
      [catId]
    );

    // 5. Traer textos vinculados a esta categoría
    // SE AGREGÓ 'slug' A LA CONSULTA SQL
    const [textos]: any = await connection.execute(
      'SELECT id, titulo, slug, contenido, idioma_code, imagen_url, clicks, true as es_texto FROM textos WHERE categoria_id = ?', 
      [catId]
    );

    // 6. Cerramos conexión
    await connection.end();
        await connection.end();

    // 7. Unimos todo en una sola lista para el Frontend
    const respuestaFinal = [...subcats, ...textos];

    return NextResponse.json(respuestaFinal);

  } catch (error: any) {
    console.error("--- ERROR EN API CATEGORIAS ---");
    console.error(error.message);
    return NextResponse.json({ 
      error: "Error interno del servidor", 
      detalles: error.message 
    }, { status: 500 });
  }
}