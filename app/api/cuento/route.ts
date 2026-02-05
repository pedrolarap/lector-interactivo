import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  try {
    // Creamos la conexión usando las variables que pusimos en el .env.local
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
    });

    // Consultamos el cuento (el último que hayas subido)
    const [rows]: any = await connection.execute(
      'SELECT titulo, contenido FROM cuentos ORDER BY id DESC LIMIT 1'
    );
    
    await connection.end();

    if (rows.length === 0) {
      return NextResponse.json({ error: "No hay cuentos" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error en DB:", error);
    return NextResponse.json({ error: "Error de conexión" }, { status: 500 });
  }
}