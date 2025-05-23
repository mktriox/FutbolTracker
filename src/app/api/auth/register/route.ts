import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db'; // Asegúrate de que la ruta sea correcta
import bcrypt from 'bcrypt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. Validar que email y password estén presentes
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    // 2. Hashear la contraseña
    const saltRounds = 10; // Número de rondas de hashing. Un valor más alto es más seguro pero más lento.
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insertar el nuevo usuario en la base de datos
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, hashedPassword]
      );

      const newUser = result.rows[0];

      // 4. Devolver una respuesta JSON de éxito
      return NextResponse.json(
        {
          message: 'Usuario registrado exitosamente',
          user: {
            id: newUser.id,
            email: newUser.email,
            created_at: newUser.created_at,
          },
        },
        { status: 201 } // 201 Creado
      );
    } finally {
      // Asegúrate de liberar el cliente incluso si hay un error
      client.release();
    }
  } catch (error: any) {
    console.error('Error en el registro de usuario:', error);

    // Manejar el caso de email duplicado (error de UNIQUE constraint)
    if (error.code === '23505') { // Código de error unique_violation de PostgreSQL
        return NextResponse.json(
            { message: 'El correo electrónico ya está registrado' },
            { status: 409 } // 409 Conflicto
        );
    }

    // Manejar otros errores
    return NextResponse.json(
      { message: 'Error interno del servidor al registrar usuario' },
      { status: 500 }
    );
  }
}
