import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
    });

    // IMPORTANTE: Pedimos el 'slug' para que el botón de "Leer" funcione
    const [rows]: any = await connection.execute(
      'SELECT id, titulo, slug, idioma_code, imagen_url FROM textos LIMIT 6'
    );

    await connection.end();
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error en API Destacados:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}