import pool from './src/lib/db';

async function checkDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1');
    if (result.rows.length > 0 && result.rows[0].'?column?' === 1) {
      console.log('Conexión a la base de datos PostgreSQL exitosa.');
    } else {
      console.error('La consulta de prueba "SELECT 1" no devolvió el resultado esperado.');
    }
  } catch (error: any) {
    console.error('Error al verificar la conexión a la base de datos:', error.message);
  } finally {
    // Cierra el pool de conexiones después de la verificación
    pool.end().then(() => {
      console.log('Pool de conexiones cerrado.');
      process.exit();
    });
  }
}

checkDatabaseConnection();
