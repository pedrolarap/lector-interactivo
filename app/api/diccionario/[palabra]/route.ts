import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET(req: Request, { params }: { params: Promise<{ palabra: string }> }) {
  const { palabra } = await params;

  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
      charset: 'utf8mb4'
    });

    // Buscamos la palabra exacta
    const [rows]: any = await connection.execute(
      'SELECT traduccion_espanol FROM diccionario_hebreo WHERE palabra_hebrea = ?',
      [palabra]
    );

    await connection.end();

    if (rows.length > 0) {
      return NextResponse.json({ traduccion: rows[0].traduccion_espanol });
    } else {
      return NextResponse.json({ traduccion: null });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}