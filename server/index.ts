import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;

// Load environment variables from .env or database_url.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
// Fallback to database_url.env if .env doesn't exist
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: join(__dirname, '../database_url.env') });
}
// Final fallback: read directly from database_url.env if still not set
if (!process.env.DATABASE_URL) {
  try {
    const envContent = readFileSync(join(__dirname, '../database_url.env'), 'utf-8');
    const match = envContent.match(/DATABASE_URL="?([^"]+)"?/);
    if (match) {
      process.env.DATABASE_URL = match[1];
    }
  } catch (error) {
    // File doesn't exist or can't be read, that's okay
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de PostgreSQL con manejo de errores
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('⚠️ DATABASE_URL no está configurada en las variables de entorno');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Inicializar tablas con reintentos
async function initializeTables(retries = 3) {
  let client;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intentando conectar a la base de datos (intento ${attempt}/${retries})...`);
      client = await pool.connect();
      break;
    } catch (error: any) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      if (attempt === retries) {
        console.error('❌ No se pudo conectar a la base de datos después de varios intentos');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!client) {
    throw new Error('No se pudo obtener una conexión del pool');
  }

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
        status VARCHAR(20) DEFAULT 'ACTIVE',
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

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        workout_id VARCHAR(255) REFERENCES workouts(id) ON DELETE SET NULL,
        messages JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
      CREATE INDEX IF NOT EXISTS idx_workouts_weekly_routine ON workouts(weekly_routine_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_type_id ON exercises(exercise_type_id);
      CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON exercise_sets(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_weekly_routines_user_id ON weekly_routines(user_id);
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_chats_workout_id ON chats(workout_id);
    `);

    // Migración: asegurar que workouts tenga created_at/updated_at (bases creadas con esquema antiguo, ej. Replit dev)
    await client.query(`
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE workouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `).catch(() => {});

    console.log('✅ Tablas de base de datos inicializadas correctamente');
  } catch (error) {
    console.error('❌ Error inicializando tablas:', error);
  } finally {
    client.release();
  }
}

// API Routes

// Función helper para calcular el número de semana ISO
function getWeekNumber(date: Date): { weekNumber: number; year: number; weekStart: Date; weekEnd: Date } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  
  // Calcular inicio y fin de semana (lunes a domingo)
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a lunes
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekNumber, year, weekStart, weekEnd };
}

// Crear o obtener usuario y verificar/crear weekly routine
app.post('/api/users', async (req, res) => {
  const { username, email, googleId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Crear o obtener usuario
    const userResult = await client.query(
      `INSERT INTO users (username, email, google_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO UPDATE 
       SET email = COALESCE(EXCLUDED.email, users.email),
           google_id = COALESCE(EXCLUDED.google_id, users.google_id),
           updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [username, email, googleId]
    );
    
    const user = userResult.rows[0];
    const userId = user.id;
    
    // Calcular semana actual
    const now = new Date();
    const { weekNumber, year, weekStart, weekEnd } = getWeekNumber(now);
    
    // Verificar si existe weekly routine para esta semana
    const existingRoutine = await client.query(
      `SELECT * FROM weekly_routines 
       WHERE user_id = $1 AND week_number = $2 AND year = $3`,
      [userId, weekNumber, year]
    );
    
    let weeklyRoutine = null;
    
    if (existingRoutine.rows.length === 0) {
      // Crear weekly routine automáticamente
      console.log(`📅 Creando weekly routine automática para usuario ${userId}, semana ${weekNumber} del ${year}`);
      
      const routineResult = await client.query(
        `INSERT INTO weekly_routines (user_id, week_number, year, week_start, week_end, name, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId,
          weekNumber,
          year,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          `Semana ${weekNumber} - ${year}`,
          `Rutina semanal automática para la semana ${weekNumber} del año ${year}`,
          true
        ]
      );
      
      weeklyRoutine = routineResult.rows[0];
      console.log(`✅ Weekly routine creada automáticamente con ID: ${weeklyRoutine.id}`);
    } else {
      weeklyRoutine = existingRoutine.rows[0];
      console.log(`✅ Weekly routine existente encontrada con ID: ${weeklyRoutine.id}`);
    }
    
    await client.query('COMMIT');
    
    // Retornar usuario con información de weekly routine
    res.json({
      ...user,
      currentWeeklyRoutine: weeklyRoutine
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating/getting user:', error);
    res.status(500).json({ error: 'Error creating user', details: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
});

// Obtener usuario por ID
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
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

// Generar ID único para workout (número secuencial simple)
app.get('/api/generate-id/workout', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Buscar el último ID numérico de workouts
    const result = await client.query(
      `SELECT id FROM workouts 
       WHERE id ~ '^[0-9]+$'
       ORDER BY CAST(id AS INTEGER) DESC 
       LIMIT 1
       FOR UPDATE`
    );
    
    let maxId = 0;
    if (result.rows.length > 0) {
      const lastId = parseInt(result.rows[0].id, 10);
      if (!isNaN(lastId)) {
        maxId = lastId;
      }
    }
    
    // Si no hay IDs numéricos, buscar cualquier ID y extraer el número más alto
    if (maxId === 0) {
      const allResult = await client.query('SELECT id FROM workouts FOR UPDATE');
      for (const row of allResult.rows) {
        const idStr = row.id.toString();
        const match = idStr.match(/(\d+)$/);
        if (match) {
          const numId = parseInt(match[1], 10);
          if (!isNaN(numId) && numId > maxId) {
            maxId = numId;
          }
        }
      }
    }
    
    const workoutId = (maxId + 1).toString();
    
    await client.query('COMMIT');
    
    res.json({ id: workoutId });
  } catch (error) {
    await client.query('ROLLBACK');
    // Si falla, usar timestamp como fallback
    console.error('Error generating workout ID, using timestamp:', error);
    res.json({ id: Date.now().toString() });
  } finally {
    client.release();
  }
});

// Generar ID único para exercise (numérico, único globalmente)
app.get('/api/generate-id/exercise', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Obtener todos los IDs de exercises y extraer el número más alto
    const result = await client.query('SELECT id FROM exercises FOR UPDATE');
    
    let maxId = 0;
    for (const row of result.rows) {
      const idStr = row.id.toString();
      // Si el ID es numérico, usarlo directamente
      if (/^\d+$/.test(idStr)) {
        const numId = parseInt(idStr, 10);
        if (numId > maxId) {
          maxId = numId;
        }
      } else {
        // Si tiene prefijo, extraer el número al final
        const match = idStr.match(/(\d+)$/);
        if (match) {
          const numId = parseInt(match[1], 10);
          if (numId > maxId) {
            maxId = numId;
          }
        }
      }
    }
    
    const nextId = maxId + 1;
    await client.query('COMMIT');
    
    res.json({ id: nextId.toString() });
  } catch (error) {
    await client.query('ROLLBACK');
    // Si falla, usar timestamp como fallback
    console.error('Error generating exercise ID, using timestamp:', error);
    res.json({ id: Date.now().toString() });
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

// Función auxiliar: Consultar o crear weekly_routine_id basándose en la fecha del workout
async function getOrCreateWeeklyRoutineId(
  client: any,
  userId: number,
  workoutDate: string | Date,
  providedWeeklyRoutineId?: number
): Promise<number> {
  // Si se proporciona un weeklyRoutineId, verificar que existe y pertenece al usuario
  if (providedWeeklyRoutineId) {
    console.log(`🔍 Verificando weeklyRoutineId proporcionado: ${providedWeeklyRoutineId}`);
    const verifyResult = await client.query(
      `SELECT id FROM weekly_routines WHERE id = $1 AND user_id = $2`,
      [providedWeeklyRoutineId, userId]
    );
    
    if (verifyResult.rows.length > 0) {
      const verifiedId = verifyResult.rows[0].id;
      console.log(`✅ Weekly routine ID válido y verificado: ${verifiedId}`);
      return verifiedId;
    } else {
      console.log(`⚠️ Weekly routine ${providedWeeklyRoutineId} no existe o no pertenece al usuario, consultando por fecha...`);
    }
  }
  
  // Si no se proporcionó o no es válido, consultar por fecha del workout
  if (!workoutDate) {
    throw new Error('No se puede determinar weekly_routine_id: falta fecha del workout y weeklyRoutineId no es válido');
  }
  
  const date = new Date(workoutDate);
  const { weekNumber, year, weekStart, weekEnd } = getWeekNumber(date);
  
  console.log(`🔍 CONSULTANDO weekly routine por fecha del workout:`);
  console.log(`   - Fecha workout: ${workoutDate}`);
  console.log(`   - Semana ISO: ${weekNumber}, Año: ${year}`);
  
  // CONSULTAR la weekly routine de esa semana
  const routineResult = await client.query(
    `SELECT id FROM weekly_routines 
     WHERE user_id = $1 AND week_number = $2 AND year = $3`,
    [userId, weekNumber, year]
  );
  
  if (routineResult.rows.length > 0) {
    const foundId = routineResult.rows[0].id;
    console.log(`✅ Weekly routine ENCONTRADA en BD con ID: ${foundId}`);
    return foundId;
  }
  
  // Si no existe, CREAR una nueva
  console.log(`⚠️ No existe weekly routine para semana ${weekNumber} del ${year}, CREANDO una nueva...`);
  
  const createResult = await client.query(
    `INSERT INTO weekly_routines (user_id, week_number, year, week_start, week_end, name, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      userId,
      weekNumber,
      year,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0],
      `Semana ${weekNumber} - ${year}`,
      `Rutina semanal automática para la semana ${weekNumber} del año ${year}`,
      true
    ]
  );
  
  const newId = createResult.rows[0].id;
  console.log(`✅ Weekly routine CREADA con ID: ${newId}`);
  return newId;
}

// Lógica compartida para Guardar/Actualizar Workouts
async function saveOrUpdateWorkout(req: express.Request, res: express.Response) {
  const { userId, workout, weeklyRoutineId } = req.body;
  console.log('💾 POST/PUT /api/workouts - Recibiendo datos:');
  console.log('  - userId:', userId);
  console.log('  - workout.id:', workout?.id);
  console.log('  - workout.name:', workout?.name);
  console.log('  - weeklyRoutineId recibido:', weeklyRoutineId);
  console.log('  - workout.date:', workout?.date);
  console.log('  - exerciseTypes count:', workout?.exerciseTypes?.length || 0);
  
  // Log detallado de exercises para debugging de restTime
  if (workout?.exerciseTypes && Array.isArray(workout.exerciseTypes)) {
    workout.exerciseTypes.forEach((et: any, etIndex: number) => {
      if (et.exercises && Array.isArray(et.exercises)) {
        et.exercises.forEach((ex: any, exIndex: number) => {
          console.log(`  📋 Exercise [${etIndex}][${exIndex}]: "${ex.name}"`, {
            sets: ex.sets,
            reps: ex.reps,
            restTime: ex.restTime,
            weight: ex.weight
          });
        });
      }
    });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const parseWeight = (w: any) => {
      if (w === 'bodyweight' || typeof w !== 'number') return 0;
      return w;
    };

    const getExerciseSubType = (ex: any): string => {
      const value = ex?.exerciseSubType ?? ex?.exercise_sub_type;
      if (value != null && String(value).trim() !== '') return String(value).trim();
      return 'reps';
    };

    // ============================================
    // PASO 1: Verificar si el workout ya existe (UPDATE) o es nuevo (INSERT)
    // ============================================
    let workoutId = workout.id;
    let existingWorkout = null;
    
    if (workoutId) {
      // Verificar si el workout ya existe en la BD
      const existingResult = await client.query(
        'SELECT weekly_routine_id FROM workouts WHERE id = $1',
        [workoutId]
      );
      
      if (existingResult.rows.length > 0) {
        existingWorkout = existingResult.rows[0];
        console.log(`📋 Workout existente encontrado con weekly_routine_id: ${existingWorkout.weekly_routine_id}`);
      }
    }
    
    // ============================================
    // PASO 2: Determinar el weekly_routine_id
    // ============================================
    let finalWeeklyRoutineId: number | null = null;
    
    if (existingWorkout && existingWorkout.weekly_routine_id) {
      // Si el workout ya existe, MANTENER su weekly_routine_id original
      finalWeeklyRoutineId = existingWorkout.weekly_routine_id;
      console.log(`🔒 Manteniendo weekly_routine_id original del workout: ${finalWeeklyRoutineId}`);
    } else if (weeklyRoutineId) {
      // Si se proporciona weeklyRoutineId y el workout no existe, verificar y usarlo
      const verifyResult = await client.query(
        `SELECT id FROM weekly_routines WHERE id = $1 AND user_id = $2`,
        [weeklyRoutineId, userId]
      );
      
      if (verifyResult.rows.length > 0) {
        finalWeeklyRoutineId = weeklyRoutineId;
        console.log(`✅ Usando weeklyRoutineId proporcionado: ${finalWeeklyRoutineId}`);
      } else {
        console.log(`⚠️ weeklyRoutineId ${weeklyRoutineId} no válido, consultando por fecha...`);
        // Si no es válido, consultar por fecha
        finalWeeklyRoutineId = await getOrCreateWeeklyRoutineId(
          client,
          userId,
          workout.date,
          undefined
        );
      }
    } else {
      // Si no se proporciona y el workout no existe, consultar por fecha
      finalWeeklyRoutineId = await getOrCreateWeeklyRoutineId(
        client,
        userId,
        workout.date,
        undefined
      );
    }
    
    console.log(`📌 Weekly routine ID final determinado: ${finalWeeklyRoutineId}`);
    
    // ============================================
    // PASO 3: Generar ID del workout (si no existe)
    // ============================================

    // Generar ID del workout automáticamente si no se proporciona (número secuencial simple)
    if (!workoutId) {
      // Buscar el último ID numérico de workouts
      const result = await client.query(
        `SELECT id FROM workouts 
         WHERE id ~ '^[0-9]+$'
         ORDER BY CAST(id AS INTEGER) DESC 
         LIMIT 1
         FOR UPDATE`
      );
      
      let maxId = 0;
      if (result.rows.length > 0) {
        const lastId = parseInt(result.rows[0].id, 10);
        if (!isNaN(lastId)) {
          maxId = lastId;
        }
      }
      
      // Si no hay IDs numéricos, buscar cualquier ID y extraer el número más alto
      if (maxId === 0) {
        const allResult = await client.query('SELECT id FROM workouts FOR UPDATE');
        for (const row of allResult.rows) {
          const idStr = row.id.toString();
          // Extraer número del ID (puede tener formato antiguo)
          const match = idStr.match(/(\d+)$/);
          if (match) {
            const numId = parseInt(match[1], 10);
            if (!isNaN(numId) && numId > maxId) {
              maxId = numId;
            }
          }
        }
      }
      
      workoutId = (maxId + 1).toString();
      console.log('🆔 ID generado automáticamente para workout (código numérico):', workoutId);
    }
    
    console.log(`📝 CREANDO workout con:`);
    console.log(`   - workoutId: ${workoutId}`);
    console.log(`   - weekly_routine_id: ${finalWeeklyRoutineId} (consultado de BD)`);

    // ============================================
    // PASO 4: CREAR/ACTUALIZAR el workout
    // ============================================
    if (existingWorkout) {
      // UPDATE: Solo actualizar campos permitidos, NO cambiar weekly_routine_id ni exercise_types
      await client.query(
        `UPDATE workouts SET
         name = $1,
         date = $2,
         completed = $3,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [workout.name, workout.date, workout.completed, workoutId]
      );
      console.log(`✅ Workout existente actualizado (weekly_routine_id y exercise_types preservados)`);
      // Para workout existente: solo actualizar ejercicios y sets (igual que production PUT), NUNCA tocar exercise_types
      if (workout.exerciseTypes && Array.isArray(workout.exerciseTypes)) {
        for (const exType of workout.exerciseTypes) {
          if (!exType.exercises || !Array.isArray(exType.exercises)) continue;
          for (const exercise of exType.exercises) {
            const exerciseId = (exercise.id != null && String(exercise.id).trim() !== '') ? String(exercise.id).trim() : null;
            if (!exerciseId) continue;
            let restTimeValue = exercise.restTime;
            if (restTimeValue == null || restTimeValue === '' || isNaN(Number(restTimeValue)) || Number(restTimeValue) <= 0) {
              restTimeValue = 60;
            } else {
              restTimeValue = Number(restTimeValue);
            }
            await client.query(
              `UPDATE exercises SET
                 name = $1, exercise_code = $2, sets = $3, reps = $4, duration = $5, duration_unit = $6,
                 exercise_sub_type = $7, weight = $8, weight_unit = $9, rest_time = $10, completed = $11,
                 updated_at = CURRENT_TIMESTAMP
               WHERE id = $12 AND user_id = $13`,
              [exercise.name, exercise.exerciseCode ?? null, exercise.sets, exercise.reps ?? null, exercise.duration ?? null, exercise.durationUnit ?? null, getExerciseSubType(exercise), parseWeight(exercise.weight), exercise.weightUnit ?? 'kg', restTimeValue, exercise.completed ?? false, exerciseId, userId]
            );
            if (exercise.setDetails && Array.isArray(exercise.setDetails)) {
              for (let k = 0; k < exercise.setDetails.length; k++) {
                const set = exercise.setDetails[k];
                await client.query(
                  `INSERT INTO exercise_sets (exercise_id, set_number, target_reps, target_duration, target_weight, actual_reps, actual_duration, actual_weight, weight_unit, completed)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                   ON CONFLICT (exercise_id, set_number) DO UPDATE SET
                     actual_reps = EXCLUDED.actual_reps,
                     actual_duration = EXCLUDED.actual_duration,
                     actual_weight = EXCLUDED.actual_weight,
                     completed = EXCLUDED.completed,
                     updated_at = CURRENT_TIMESTAMP`,
                  [exerciseId, k + 1, set.reps ?? null, set.duration ?? null, parseWeight(set.weight), set.actualReps ?? null, set.actualDuration ?? null, parseWeight(set.actualWeight), set.weightUnit || 'kg', set.completed ?? false]
                );
              }
            }
          }
        }
      }
    } else {
      // INSERT: Crear nuevo workout con el weekly_routine_id determinado
      await client.query(
        `INSERT INTO workouts (id, user_id, weekly_routine_id, name, date, day_id, estimated_duration, completed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [workoutId, userId, finalWeeklyRoutineId, workout.name, workout.date, workout.dayId, workout.estimatedDuration || 45, workout.completed]
      );
      console.log(`✅ Workout creado con weekly_routine_id: ${finalWeeklyRoutineId}`);
    }

    // Solo eliminar y recrear exercise_types cuando el workout es NUEVO (no existía en BD)
    if (!existingWorkout && workout.exerciseTypes && Array.isArray(workout.exerciseTypes) && workout.exerciseTypes.length > 0) {
      await client.query('DELETE FROM exercise_types WHERE workout_id = $1', [workoutId]);
      for (let i = 0; i < workout.exerciseTypes.length; i++) {
        const exType = workout.exerciseTypes[i];
        const typeResult = await client.query(
          `INSERT INTO exercise_types (workout_id, type_code, name, name_spanish, duration, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [workoutId, exType.id, exType.name, exType.nameSpanish, exType.duration, i]
        );
        const exerciseTypeId = typeResult.rows[0].id;

        if (exType.exercises && Array.isArray(exType.exercises)) {
          for (const exercise of exType.exercises) {
            // Generar ID automáticamente si no se proporciona
            let exerciseId = exercise.id;
            if (!exerciseId) {
              const exerciseResult = await client.query(
                `SELECT id FROM exercises 
                 WHERE id ~ '^[0-9]+$' 
                 ORDER BY CAST(id AS INTEGER) DESC 
                 LIMIT 1
                 FOR UPDATE`
              );
              
              let maxId = 0;
              if (exerciseResult.rows.length > 0) {
                const lastId = parseInt(exerciseResult.rows[0].id, 10);
                maxId = lastId;
              }
              
              exerciseId = (maxId + 1).toString();
              console.log('🆔 ID generado automáticamente para exercise:', exerciseId);
            }

            // Validar y normalizar restTime antes de guardar
            let restTimeValue = exercise.restTime;
            if (restTimeValue == null || restTimeValue === '' || isNaN(Number(restTimeValue)) || Number(restTimeValue) <= 0) {
              // Si restTime no es válido, usar valor por defecto basado en el tipo de ejercicio
              const exerciseTypeName = exType.nameSpanish || exType.name || '';
              const typeName = exerciseTypeName.toLowerCase();
              if (typeName.includes('calentamiento')) {
                restTimeValue = 20;
              } else if (typeName.includes('fuerza')) {
                restTimeValue = 90;
              } else if (typeName.includes('cardio')) {
                restTimeValue = 45;
              } else if (typeName.includes('estiramiento')) {
                restTimeValue = 15;
              } else {
                restTimeValue = 60; // Default
              }
              console.log(`⚠️ restTime inválido o faltante para "${exercise.name}" (valor recibido: ${exercise.restTime}), usando default: ${restTimeValue}`);
            } else {
              restTimeValue = Number(restTimeValue);
            }
            
            console.log(`💾 Guardando ejercicio "${exercise.name}":`, {
              sets: exercise.sets,
              reps: exercise.reps,
              restTime: restTimeValue,
              weight: exercise.weight
            });

            await client.query(
              `INSERT INTO exercises (id, user_id, exercise_type_id, name, exercise_code, sets, reps, duration, duration_unit, exercise_sub_type, weight, weight_unit, rest_time, completed)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 exercise_code = EXCLUDED.exercise_code,
                 sets = EXCLUDED.sets,
                 reps = EXCLUDED.reps,
                 duration = EXCLUDED.duration,
                 duration_unit = EXCLUDED.duration_unit,
                 exercise_sub_type = EXCLUDED.exercise_sub_type,
                 weight = EXCLUDED.weight,
                 weight_unit = EXCLUDED.weight_unit,
                 rest_time = EXCLUDED.rest_time,
                 completed = EXCLUDED.completed,
                 updated_at = CURRENT_TIMESTAMP`,
              [exerciseId, userId, exerciseTypeId, exercise.name, exercise.exerciseCode, exercise.sets, exercise.reps, exercise.duration, exercise.durationUnit, getExerciseSubType(exercise), parseWeight(exercise.weight), exercise.weightUnit, restTimeValue, exercise.completed]
            );

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
                  [exerciseId, j + 1, set.reps, set.duration, parseWeight(set.weight), set.actualReps, set.actualDuration, parseWeight(set.actualWeight), set.weightUnit || 'kg', set.completed]
                );
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Workout guardado exitosamente en BD:', workoutId);
    res.json({ success: true, message: 'Workout saved successfully', workoutId: workoutId });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving workout:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Error saving workout', details: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
}

app.post('/api/workouts', saveOrUpdateWorkout);
app.put('/api/workouts/:id', saveOrUpdateWorkout);

// Obtener weekly routine de la semana actual
app.get('/api/users/:userId/current-weekly-routine', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const today = new Date();
    const { weekNumber, year } = getWeekNumber(today);
    
    console.log(`🔍 Buscando weekly routine para usuario ${userId}, semana ${weekNumber} del año ${year}`);
    
    const routineResult = await client.query(
      `SELECT * FROM weekly_routines 
       WHERE user_id = $1 AND week_number = $2 AND year = $3`,
      [userId, weekNumber, year]
    );
    
    if (routineResult.rows.length > 0) {
      const weeklyRoutine = routineResult.rows[0];
      console.log(`✅ Weekly routine encontrada con ID: ${weeklyRoutine.id}`);
      res.json(weeklyRoutine);
    } else {
      console.log(`⚠️ No existe weekly routine para semana ${weekNumber} del ${year}, creando una...`);
      
      // Crear weekly routine automáticamente
      const { weekStart, weekEnd } = getWeekNumber(today);
      const createResult = await client.query(
        `INSERT INTO weekly_routines (user_id, week_number, year, week_start, week_end, name, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId,
          weekNumber,
          year,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0],
          `Semana ${weekNumber} - ${year}`,
          `Rutina semanal automática para la semana ${weekNumber} del año ${year}`,
          true
        ]
      );
      
      const newWeeklyRoutine = createResult.rows[0];
      console.log(`✅ Weekly routine creada con ID: ${newWeeklyRoutine.id}`);
      res.json(newWeeklyRoutine);
    }
  } catch (error: any) {
    console.error('❌ Error obteniendo weekly routine:', error);
    res.status(500).json({ error: 'Error obteniendo weekly routine', details: error.message });
  } finally {
    client.release();
  }
});

// Helper: normalizar fecha a ISO para que Replit y local envíen lo mismo (evita diferencias por driver pg)
function toISO(val: unknown): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

// Obtener workouts por weekly_routine_id
app.get('/api/weekly-routines/:weeklyRoutineId/workouts', async (req, res) => {
  const { weeklyRoutineId } = req.params;
  const client = await pool.connect();
  try {
    console.log(`🔍 Obteniendo workouts para weekly_routine_id: ${weeklyRoutineId}`);
    
    const workoutsResult = await client.query(
      `SELECT w.id, w.user_id, w.weekly_routine_id, w.name, w.date, w.day_id, w.estimated_duration, w.completed, w.status, w.created_at, w.updated_at,
       wr.id as weekly_routine_id, wr.week_number, wr.year, wr.name as weekly_routine_name, wr.week_start, wr.week_end
       FROM workouts w
       LEFT JOIN weekly_routines wr ON w.weekly_routine_id = wr.id
       WHERE w.weekly_routine_id = $1 AND (w.status IS NULL OR w.status != 'ARCHIVED')
       ORDER BY COALESCE(w.created_at, w.date) ASC, w.date ASC`,
      [weeklyRoutineId]
    );

    const workouts = [];
    for (const workout of workoutsResult.rows) {
      const row = workout as Record<string, unknown>;
      const createdAt = toISO(row.created_at ?? row.createdAt) ?? toISO(row.date) ?? new Date().toISOString();
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
            restTime: exercise.rest_time ?? 60,
            setDetails: setsResult.rows.map((set: any) => ({
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
        createdAt,
        weeklyRoutineId: workout.weekly_routine_id,
        weeklyRoutine: workout.weekly_routine_id ? {
          id: workout.weekly_routine_id,
          weekNumber: workout.week_number,
          year: workout.year,
          name: workout.weekly_routine_name,
          weekStart: workout.week_start,
          weekEnd: workout.week_end
        } : null,
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

// Archivar workout (soft delete - cambia status a ARCHIVED)
app.delete('/api/workouts/:workoutId', async (req, res) => {
  const { workoutId } = req.params;
  const { userId } = req.body;
  const client = await pool.connect();
  try {
    // Verificar que el workout pertenece al usuario
    const workoutCheck = await client.query(
      'SELECT id FROM workouts WHERE id = $1 AND user_id = $2',
      [workoutId, userId]
    );
    
    if (workoutCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found or access denied' });
    }

    // Archivar el workout (cambiar status a ARCHIVED)
    await client.query(
      'UPDATE workouts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ARCHIVED', workoutId]
    );
    
    res.json({ success: true, message: 'Workout archived successfully' });
  } catch (error) {
    console.error('Error archiving workout:', error);
    res.status(500).json({ error: 'Error archiving workout', details: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
});

// Crear ejercicio individual
app.post('/api/exercises', async (req, res) => {
  const { userId, exerciseTypeId, exercise, setDetails } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exerciseResult = await client.query(
      `INSERT INTO exercises (id, user_id, exercise_type_id, name, exercise_code, sets, reps, duration, duration_unit, exercise_sub_type, weight, weight_unit, rest_time, completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        exercise.id,
        userId,
        exerciseTypeId,
        exercise.name,
        exercise.exerciseCode || null,
        exercise.sets,
        exercise.reps || null,
        exercise.duration || null,
        exercise.durationUnit || null,
        exercise.exerciseSubType || 'reps',
        exercise.weight || 0,
        exercise.weightUnit || 'kg',
        exercise.restTime || 60,
        exercise.completed || false
      ]
    );

    const createdExercise = exerciseResult.rows[0];

    if (setDetails && Array.isArray(setDetails)) {
      for (let i = 0; i < setDetails.length; i++) {
        const set = setDetails[i];
        await client.query(
          `INSERT INTO exercise_sets (exercise_id, set_number, target_reps, target_duration, target_weight, actual_reps, actual_duration, actual_weight, weight_unit, completed)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (exercise_id, set_number) DO UPDATE SET
             target_reps = EXCLUDED.target_reps,
             target_duration = EXCLUDED.target_duration,
             target_weight = EXCLUDED.target_weight,
             actual_reps = EXCLUDED.actual_reps,
             actual_duration = EXCLUDED.actual_duration,
             actual_weight = EXCLUDED.actual_weight,
             weight_unit = EXCLUDED.weight_unit,
             completed = EXCLUDED.completed,
             updated_at = CURRENT_TIMESTAMP`,
          [
            exercise.id,
            i + 1,
            set.reps || null,
            set.duration || null,
            set.weight || 0,
            set.actualReps || null,
            set.actualDuration || null,
            set.actualWeight || null,
            set.weightUnit || 'kg',
            set.completed || false
          ]
        );
      }
    }

    await client.query('COMMIT');

    const setsResult = await client.query(
      'SELECT * FROM exercise_sets WHERE exercise_id = $1 ORDER BY set_number',
      [exercise.id]
    );

    const exerciseWithSets = {
      ...createdExercise,
      setDetails: setsResult.rows.map((set: any) => ({
        id: `${createdExercise.id}-set-${set.set_number}`,
        reps: set.target_reps,
        duration: set.target_duration,
        weight: set.target_weight,
        actualReps: set.actual_reps,
        actualDuration: set.actual_duration,
        actualWeight: set.actual_weight,
        weightUnit: set.weight_unit,
        completed: set.completed
      }))
    };

    res.json(exerciseWithSets);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Error creating exercise' });
  } finally {
    client.release();
  }
});

// Guardar chat asociado a un workout
app.post('/api/chats', async (req, res) => {
  const { userId, workoutId, messages } = req.body;
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO chats (user_id, workout_id, messages, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, workoutId, JSON.stringify(messages)]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({ error: 'Error saving chat', details: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    client.release();
  }
});

// Obtener chats de un usuario
app.get('/api/users/:userId/chats', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Error getting chats' });
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

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'DGym Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      users: {
        create: 'POST /api/users',
        get: 'GET /api/users/:id'
      },
      weeklyRoutines: {
        create: 'POST /api/weekly-routines',
        get: 'GET /api/users/:userId/weekly-routines'
      },
      workouts: {
        save: 'POST /api/workouts',
        get: 'GET /api/users/:userId/workouts',
        update: 'PUT /api/workouts/:id',
        complete: 'PATCH /api/workouts/:workoutId/complete'
      },
      exercises: {
        create: 'POST /api/exercises',
        complete: 'PATCH /api/exercises/:exerciseId/complete'
      }
    }
  });
});

// Obtener estadísticas del usuario para Plan History
app.get('/api/users/:userId/statistics', async (req, res) => {
  const { userId } = req.params;
  const client = await pool.connect();
  try {
    // 1. Total de workouts sin importar el estado
    const totalWorkoutsResult = await client.query(
      'SELECT COUNT(*) as total FROM workouts WHERE user_id = $1',
      [userId]
    );
    const totalWorkouts = parseInt(totalWorkoutsResult.rows[0].total, 10);

    // 2. Total de workouts completados (excluyendo eliminados)
    const completedWorkoutsResult = await client.query(
      `SELECT COUNT(*) as total FROM workouts 
       WHERE user_id = $1 AND completed = true AND (status IS NULL OR status != 'ARCHIVED')`,
      [userId]
    );
    const completedWorkouts = parseInt(completedWorkoutsResult.rows[0].total, 10);

    // 3. Total de workouts (excluyendo eliminados)
    const activeWorkoutsResult = await client.query(
      `SELECT COUNT(*) as total FROM workouts 
       WHERE user_id = $1 AND (status IS NULL OR status != 'ARCHIVED')`,
      [userId]
    );
    const activeWorkouts = parseInt(activeWorkoutsResult.rows[0].total, 10);

    // 4. Primera weekly_routine (fecha más antigua)
    const firstWeeklyRoutineResult = await client.query(
      `SELECT week_start, created_at FROM weekly_routines 
       WHERE user_id = $1 
       ORDER BY week_start ASC, created_at ASC 
       LIMIT 1`,
      [userId]
    );

    let weeksSinceFirstRoutine = 0;
    let weeksWithCompletedWorkouts = 0;

    if (firstWeeklyRoutineResult.rows.length > 0) {
      const firstWeekStart = new Date(firstWeeklyRoutineResult.rows[0].week_start);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calcular semanas desde la primera weekly_routine hasta hoy
      const diffTime = today.getTime() - firstWeekStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      weeksSinceFirstRoutine = Math.ceil(diffDays / 7);
      if (weeksSinceFirstRoutine < 1) weeksSinceFirstRoutine = 1; // Mínimo 1 semana

      // 5. Número de semanas que tienen workouts asociados Y con workouts completados
      const weeksWithCompletedResult = await client.query(
        `SELECT DISTINCT wr.id, wr.week_number, wr.year
         FROM weekly_routines wr
         INNER JOIN workouts w ON w.weekly_routine_id = wr.id
         WHERE wr.user_id = $1 
           AND w.completed = true 
           AND (w.status IS NULL OR w.status != 'ARCHIVED')
         GROUP BY wr.id, wr.week_number, wr.year
         HAVING COUNT(DISTINCT w.id) > 0`,
        [userId]
      );
      weeksWithCompletedWorkouts = weeksWithCompletedResult.rows.length;
    }

    // Calcular porcentajes
    const completionPercentage = activeWorkouts > 0 
      ? Math.round((completedWorkouts / activeWorkouts) * 100) 
      : 0;
    
    const weeksPercentage = weeksSinceFirstRoutine > 0
      ? Math.round((weeksWithCompletedWorkouts / weeksSinceFirstRoutine) * 100)
      : 0;

    res.json({
      totalWorkouts,
      completedWorkouts,
      activeWorkouts,
      completionPercentage,
      weeksSinceFirstRoutine,
      weeksWithCompletedWorkouts,
      weeksPercentage
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Error getting statistics' });
  } finally {
    client.release();
  }
});

// Health check
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (error: any) {
    console.error('Database health check failed:', error.message);
  }
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Iniciar servidor
async function startServer() {
  try {
    await initializeTables();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend server running on port ${PORT}`);
      console.log(`📊 Base de datos conectada exitosamente`);
    });
  } catch (error: any) {
    console.error('❌ Error fatal al iniciar el servidor:', error.message);
    console.log('⚠️ El servidor continuará ejecutándose pero la base de datos no está disponible');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend server running on port ${PORT} (sin base de datos)`);
    });
  }
}

startServer().catch(console.error);

