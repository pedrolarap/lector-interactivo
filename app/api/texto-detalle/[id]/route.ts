import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// ESTAS DOS LÍNEAS MATAN LA CACHÉ
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: Number(process.env.MYSQLPORT),
      charset: 'utf8mb4'
    });

    const [rows]: any = await connection.execute(
      'SELECT * FROM textos WHERE id = ?', 
      [id]
    );

    await connection.end();
    
    if (rows.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}