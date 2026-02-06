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

    // Usamos UNION para traer datos de ambas tablas en una sola lista
    // IMPORTANTE: Ambas tablas deben tener columnas compatibles (id, titulo, contenido)
    const [rows]: any = await connection.execute(`
      SELECT id, titulo, contenido, 'ingles' as tabla FROM cuentos
      UNION
      SELECT id, titulo, contenido, 'hebreo' as tabla FROM hebreo
      ORDER BY id DESC
    `);
    
    await connection.end();

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error en DB:", error);
    return NextResponse.json({ error: "Error al unir las tablas" }, { status: 500 });
  }
}