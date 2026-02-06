import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  // Nota: En versiones nuevas de Next.js 15, params es una Promise. 
  // Si usas Next 14 o inferior, quita el 'await'.
  const { slug } = await params; 

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
      connectTimeout: 10000 // 10 segundos para evitar que se quede colgado
    });

    // IMPORTANTE: Buscamos por la columna slug
    const [rows]: any = await connection.execute(
      'SELECT * FROM textos WHERE slug = ?',
      [slug]
    );

    await connection.end();

    if (rows.length > 0) {
      return NextResponse.json(rows[0]);
    } else {
      return NextResponse.json({ error: "No se encontró el slug: " + slug }, { status: 404 });
    }
  } catch (error: any) {
    console.error("ERROR EN API SLUG:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}