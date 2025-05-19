import { Pool } from 'pg';

// Next.js maneja automáticamente los archivos .env, por lo que no se necesita dotenv.config() explícito aquí.
// Las variables de entorno son directamente accesibles mediante process.env.

const pool = new Pool({
  // Si DATABASE_URL está definida, úsala.
  // De lo contrario, usa las variables individuales.
  connectionString: 'UnionCatolica',
  user: 'postgres',
  password: 'coni',
  host: 'localhost',
  port: 5432, 
  database: 'FutbolTracker',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // Configura SSL para producción si es necesario
});

pool.on('connect', () => {
  console.log('Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err: any, client: any) => {
  console.error('Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1); // Salir del proceso si hay un error grave en la conexión
});

export async function findUserByEmail(email: string) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, password, role FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error al buscar el usuario por correo electrónico:', error);
    return null;
  }
}

export default pool;
