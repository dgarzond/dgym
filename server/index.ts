
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Inicializar tablas
async function initializeTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
  } finally {
    client.release();
  }
}

// API Routes

// Crear o obtener usuario
app.post('/api/users', async (req, res) => {
  const { username, email, googleId } = req.body;
  const client = await pool.connect();
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
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating/getting user:', error);
    res.status(500).json({ error: 'Error creating user' });
  } finally {
    client.release();
  }
});

// Obtener usuario por username
app.get('/api/users/:username', async (req, res) => {
  const { username } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Error getting user' });
  } finally {
    client.release();
  }
});

// Crear rutina semanal
app.post('/api/weekly-routines', async (req, res) => {
  const { userId, weekData } = req.body;
  const client = await pool.connect();
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
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating weekly routine:', error);
    res.status(500).json({ error: 'Error creating weekly routine' });
  } finally {
    client.release();
  }
});

// Obtener rutinas semanales del usuario
app.get('/api/users/:userId/weekly-routines', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM weekly_routines WHERE user_id = $1 ORDER BY year DESC, week_number DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting weekly routines:', error);
    res.status(500).json({ error: 'Error getting weekly routines' });
  } finally {
    client.release();
  }
});

// Guardar workout completo
app.post('/api/workouts', async (req, res) => {
  const { userId, workout, weeklyRoutineId } = req.body;
  const client = await pool.connect();
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

        // Insertar ejercicios
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

            // Insertar sets
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
    res.json({ success: true, message: 'Workout saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving workout:', error);
    res.status(500).json({ error: 'Error saving workout' });
  } finally {
    client.release();
  }
});

// Obtener workouts del usuario
app.get('/api/users/:userId/workouts', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const workoutsResult = await client.query(
      'SELECT * FROM workouts WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [userId]
    );

    const workouts = [];
    for (const workout of workoutsResult.rows) {
      const exerciseTypesResult = await client.query(
        'SELECT * FROM exercise_types WHERE workout_id = $1 ORDER BY sort_order',
        [workout.id]
      );

      const exerciseTypes = [];
      for (const exType of exerciseTypesResult.rows) {
        const exercisesResult = await client.query(
          'SELECT * FROM exercises WHERE exercise_type_id = $1',
          [exType.id]
        );

        const exercises = [];
        for (const exercise of exercisesResult.rows) {
          const setsResult = await client.query(
            'SELECT * FROM exercise_sets WHERE exercise_id = $1 ORDER BY set_number',
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

    res.json(workouts);
  } catch (error) {
    console.error('Error getting workouts:', error);
    res.status(500).json({ error: 'Error getting workouts' });
  } finally {
    client.release();
  }
});

// Marcar workout como completado
app.patch('/api/workouts/:workoutId/complete', async (req, res) => {
  const { workoutId } = req.params;
  const { completed } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE workouts SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [completed, workoutId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking workout as completed:', error);
    res.status(500).json({ error: 'Error updating workout' });
  } finally {
    client.release();
  }
});

// Marcar ejercicio como completado
app.patch('/api/exercises/:exerciseId/complete', async (req, res) => {
  const { exerciseId } = req.params;
  const { completed } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      'UPDATE exercises SET completed = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [completed, exerciseId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking exercise as completed:', error);
    res.status(500).json({ error: 'Error updating exercise' });
  } finally {
    client.release();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
async function startServer() {
  await initializeTables();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
