
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
        -- Tabla de usuarios
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255),
          google_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de rutinas semanales
        CREATE TABLE IF NOT EXISTS weekly_routines (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          week_number INTEGER NOT NULL,
          year INTEGER NOT NULL,
          week_start DATE NOT NULL,
          week_end DATE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, week_number, year)
        );

        -- Tabla de workouts (días de entrenamiento)
        CREATE TABLE IF NOT EXISTS workouts (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          weekly_routine_id INTEGER REFERENCES weekly_routines(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          date DATE,
          day_id VARCHAR(255),
          estimated_duration INTEGER DEFAULT 45,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de tipos de ejercicio (warmup, power, cardio, stretching)
        CREATE TABLE IF NOT EXISTS exercise_types (
          id SERIAL PRIMARY KEY,
          workout_id VARCHAR(255) REFERENCES workouts(id) ON DELETE CASCADE,
          type_code VARCHAR(50) NOT NULL,
          name VARCHAR(100) NOT NULL,
          name_spanish VARCHAR(100) NOT NULL,
          duration VARCHAR(50),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de ejercicios
        CREATE TABLE IF NOT EXISTS exercises (
          id VARCHAR(255) PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          exercise_type_id INTEGER REFERENCES exercise_types(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          exercise_code VARCHAR(50),
          sets INTEGER NOT NULL,
          reps INTEGER,
          duration INTEGER,
          duration_unit VARCHAR(20),
          exercise_sub_type VARCHAR(20) DEFAULT 'reps',
          weight DECIMAL(10,2) DEFAULT 0,
          weight_unit VARCHAR(10) DEFAULT 'kg',
          rest_time INTEGER DEFAULT 60,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de detalles de sets
        CREATE TABLE IF NOT EXISTS exercise_sets (
          id SERIAL PRIMARY KEY,
          exercise_id VARCHAR(255) REFERENCES exercises(id) ON DELETE CASCADE,
          set_number INTEGER NOT NULL,
          target_reps INTEGER,
          target_duration INTEGER,
          target_weight DECIMAL(10,2),
          actual_reps INTEGER,
          actual_duration INTEGER,
          actual_weight DECIMAL(10,2),
          weight_unit VARCHAR(10) DEFAULT 'kg',
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(exercise_id, set_number)
        );

        -- Índices para mejorar el rendimiento
        CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
        CREATE INDEX IF NOT EXISTS idx_workouts_weekly_routine ON workouts(weekly_routine_id);
        CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
        CREATE INDEX IF NOT EXISTS idx_exercises_type_id ON exercises(exercise_type_id);
        CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON exercise_sets(exercise_id);
        CREATE INDEX IF NOT EXISTS idx_weekly_routines_user_id ON weekly_routines(user_id);
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
  async getOrCreateUser(username: string, email?: string, googleId?: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (username, email, google_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (username) DO UPDATE 
         SET email = COALESCE(EXCLUDED.email, users.email),
             google_id = COALESCE(EXCLUDED.google_id, users.google_id),
             updated_at = CURRENT_TIMESTAMP 
         RETURNING *`,
        [username, email, googleId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Crear rutina semanal
  async createWeeklyRoutine(userId: number, weekData: any) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO weekly_routines (user_id, week_number, year, week_start, week_end, name, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, week_number, year) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             is_active = EXCLUDED.is_active,
             updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, weekData.weekNumber, weekData.year, weekData.weekStart, weekData.weekEnd, weekData.name, weekData.description, weekData.isActive]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Guardar workout completo con ejercicios
  async saveWorkoutComplete(userId: number, workout: any, weeklyRoutineId?: number) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar workout
      await client.query(
        `INSERT INTO workouts (id, user_id, weekly_routine_id, name, date, day_id, estimated_duration, completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           date = EXCLUDED.date,
           completed = EXCLUDED.completed,
           updated_at = CURRENT_TIMESTAMP`,
        [workout.id, userId, weeklyRoutineId, workout.name, workout.date, workout.dayId, workout.estimatedDuration || 45, workout.completed]
      );

      // Procesar exercise types y ejercicios
      if (workout.exerciseTypes && Array.isArray(workout.exerciseTypes)) {
        for (let i = 0; i < workout.exerciseTypes.length; i++) {
          const exType = workout.exerciseTypes[i];
          
          // Insertar exercise type
          const typeResult = await client.query(
            `INSERT INTO exercise_types (workout_id, type_code, name, name_spanish, duration, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [workout.id, exType.id, exType.name, exType.nameSpanish, exType.duration, i]
          );
          const exerciseTypeId = typeResult.rows[0].id;

          // Insertar ejercicios de este tipo
          if (exType.exercises && Array.isArray(exType.exercises)) {
            for (const exercise of exType.exercises) {
              await client.query(
                `INSERT INTO exercises (id, user_id, exercise_type_id, name, exercise_code, sets, reps, duration, duration_unit, exercise_sub_type, weight, weight_unit, rest_time, completed)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (id) DO UPDATE SET
                   completed = EXCLUDED.completed,
                   updated_at = CURRENT_TIMESTAMP`,
                [exercise.id, userId, exerciseTypeId, exercise.name, exercise.exerciseCode, exercise.sets, exercise.reps, exercise.duration, exercise.durationUnit, exercise.exerciseSubType, exercise.weight, exercise.weightUnit, exercise.restTime, exercise.completed]
              );

              // Insertar detalles de sets
              if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
                for (let j = 0; j < exercise.setDetails.length; j++) {
                  const set = exercise.setDetails[j];
                  await client.query(
                    `INSERT INTO exercise_sets (exercise_id, set_number, target_reps, target_duration, target_weight, actual_reps, actual_duration, actual_weight, weight_unit, completed)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (exercise_id, set_number) DO UPDATE SET
                       actual_reps = EXCLUDED.actual_reps,
                       actual_duration = EXCLUDED.actual_duration,
                       actual_weight = EXCLUDED.actual_weight,
                       completed = EXCLUDED.completed,
                       updated_at = CURRENT_TIMESTAMP`,
                    [exercise.id, j + 1, set.reps, set.duration, set.weight, set.actualReps, set.actualDuration, set.actualWeight, set.weightUnit || 'kg', set.completed]
                  );
                }
              }
            }
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error guardando workout:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Obtener workouts del usuario con todos los datos
  async getUserWorkouts(userId: number) {
    const client = await this.pool.connect();
    try {
      const workoutsResult = await client.query(
        `SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC, created_at DESC`,
        [userId]
      );

      const workouts = [];
      for (const workout of workoutsResult.rows) {
        const exerciseTypesResult = await client.query(
          `SELECT * FROM exercise_types WHERE workout_id = $1 ORDER BY sort_order`,
          [workout.id]
        );

        const exerciseTypes = [];
        for (const exType of exerciseTypesResult.rows) {
          const exercisesResult = await client.query(
            `SELECT * FROM exercises WHERE exercise_type_id = $1`,
            [exType.id]
          );

          const exercises = [];
          for (const exercise of exercisesResult.rows) {
            const setsResult = await client.query(
              `SELECT * FROM exercise_sets WHERE exercise_id = $1 ORDER BY set_number`,
              [exercise.id]
            );

            exercises.push({
              ...exercise,
              setDetails: setsResult.rows.map(set => ({
                id: `${exercise.id}-set-${set.set_number}`,
                reps: set.target_reps,
                duration: set.target_duration,
                weight: set.target_weight,
                actualReps: set.actual_reps,
                actualDuration: set.actual_duration,
                actualWeight: set.actual_weight,
                weightUnit: set.weight_unit,
                completed: set.completed
              }))
            });
          }

          exerciseTypes.push({
            id: exType.type_code,
            name: exType.name,
            nameSpanish: exType.name_spanish,
            duration: exType.duration,
            exercises
          });
        }

        workouts.push({
          id: workout.id,
          name: workout.name,
          date: workout.date,
          dayId: workout.day_id,
          estimatedDuration: workout.estimated_duration,
          completed: workout.completed,
          exerciseTypes
        });
      }

      return workouts;
    } finally {
      client.release();
    }
  }

  // Obtener rutinas semanales del usuario
  async getUserWeeklyRoutines(userId: number) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM weekly_routines WHERE user_id = $1 ORDER BY year DESC, week_number DESC`,
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Marcar workout como completado
  async markWorkoutCompleted(workoutId: string, completed: boolean) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE workouts SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [completed, workoutId]
      );
    } finally {
      client.release();
    }
  }

  // Marcar ejercicio como completado
  async markExerciseCompleted(exerciseId: string, completed: boolean) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE exercises SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [completed, exerciseId]
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
