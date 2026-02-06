import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(
  request: Request,
  // Ajustamos el tipo para que acepte tanto el objeto como la Promesa
  context: { params: Promise<{ slug: string }> } 
) {
  // 1. AHORA SÍ: Esperamos a que los params se resuelvan
  const params = await context.params;
  const slug = params.slug;

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
      charset: 'utf8mb4',
    });

    const [rows]: any = await connection.execute(
      'SELECT id, titulo, contenido, slug, idioma_code FROM textos WHERE slug = ?',
      [slug]
    );

    await connection.end();

    if (rows.length > 0) {
      return NextResponse.json(rows[0]);
    } else {
      return NextResponse.json({ error: "Texto no encontrado" }, { status: 404 });
    }
  } catch (error: any) {
    console.error("Error en detalle-por-slug:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}