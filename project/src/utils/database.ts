
import { Pool } from 'pg';

// Singleton para manejar la conexión a la base de datos
class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool;

  private constructor() {
    const databaseUrl = import.meta.env.VITE_DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('⚠️ No se encontró DATABASE_URL en las variables de entorno');
    }

    // Usar connection pooling para mejor rendimiento
    const poolUrl = databaseUrl?.replace('.us-east-2', '-pooler.us-east-2') || '';
    
    this.pool = new Pool({
      connectionString: poolUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Inicializar tablas
  async initializeTables() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS workouts (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          date VARCHAR(50),
          day_id VARCHAR(255),
          completed BOOLEAN DEFAULT FALSE,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS exercise_progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          exercise_id VARCHAR(255) NOT NULL,
          workout_id VARCHAR(255) REFERENCES workouts(id) ON DELETE CASCADE,
          progress_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
        CREATE INDEX IF NOT EXISTS idx_exercise_progress_user_id ON exercise_progress(user_id);
      `);
      console.log('✅ Tablas de base de datos inicializadas correctamente');
    } catch (error) {
      console.error('❌ Error inicializando tablas:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Crear o obtener usuario
  async getOrCreateUser(username: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO UPDATE SET updated_at = CURRENT_TIMESTAMP RETURNING *',
        [username]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Guardar workouts
  async saveWorkout(userId: number, workout: any) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO workouts (id, user_id, name, date, day_id, completed, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           date = EXCLUDED.date,
           day_id = EXCLUDED.day_id,
           completed = EXCLUDED.completed,
           data = EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
        [workout.id, userId, workout.name, workout.date, workout.dayId, workout.completed, JSON.stringify(workout)]
      );
    } finally {
      client.release();
    }
  }

  // Obtener workouts del usuario
  async getUserWorkouts(userId: number) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT data FROM workouts WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return result.rows.map(row => row.data);
    } finally {
      client.release();
    }
  }

  // Guardar progreso de ejercicio
  async saveExerciseProgress(userId: number, exerciseId: string, workoutId: string, progressData: any) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO exercise_progress (user_id, exercise_id, workout_id, progress_data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ON CONSTRAINT exercise_progress_pkey DO UPDATE SET
           progress_data = EXCLUDED.progress_data,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, exerciseId, workoutId, JSON.stringify(progressData)]
      );
    } finally {
      client.release();
    }
  }

  // Cerrar conexiones
  async close() {
    await this.pool.end();
  }
}

export default DatabaseService;
