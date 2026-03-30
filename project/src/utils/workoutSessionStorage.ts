/**
 * Persists which workout the user is in and where they left off (detail vs exercise screen).
 * Aligned with the global workout timer TTL (~24h): stale sessions are discarded.
 */

export const WORKOUT_SESSION_KEY = 'gymTracker_workoutSession';

/** Max age for session + timer sanity (matches App.tsx 24h cap). */
export const WORKOUT_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type WorkoutSessionView = 'detail' | 'exercise';

export interface WorkoutSessionSnapshot {
  workoutId: string;
  /** Current or last-focused exercise when in detail/exercise view */
  exerciseId: string | null;
  view: WorkoutSessionView;
  exerciseStage: string;
  lastUpdated: number;
}

export function parseWorkoutSession(raw: string | null): WorkoutSessionSnapshot | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<WorkoutSessionSnapshot>;
    if (!o.workoutId || typeof o.workoutId !== 'string') return null;
    if (o.view !== 'detail' && o.view !== 'exercise') return null;
    return {
      workoutId: o.workoutId,
      exerciseId: typeof o.exerciseId === 'string' ? o.exerciseId : null,
      view: o.view,
      exerciseStage: typeof o.exerciseStage === 'string' ? o.exerciseStage : '',
      lastUpdated: typeof o.lastUpdated === 'number' ? o.lastUpdated : 0,
    };
  } catch {
    return null;
  }
}

export function isWorkoutSessionFresh(s: WorkoutSessionSnapshot): boolean {
  return Date.now() - s.lastUpdated < WORKOUT_SESSION_MAX_AGE_MS;
}

/** Read session without mutating storage (safe for render/useMemo). */
export function peekWorkoutSession(): WorkoutSessionSnapshot | null {
  try {
    const s = parseWorkoutSession(localStorage.getItem(WORKOUT_SESSION_KEY));
    if (!s || !isWorkoutSessionFresh(s)) return null;
    return s;
  } catch {
    return null;
  }
}

export function readWorkoutSession(): WorkoutSessionSnapshot | null {
  try {
    const s = parseWorkoutSession(localStorage.getItem(WORKOUT_SESSION_KEY));
    if (!s || !isWorkoutSessionFresh(s)) {
      if (s && !isWorkoutSessionFresh(s)) clearWorkoutSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function writeWorkoutSession(snapshot: Omit<WorkoutSessionSnapshot, 'lastUpdated'> & { lastUpdated?: number }): void {
  try {
    const full: WorkoutSessionSnapshot = {
      ...snapshot,
      lastUpdated: snapshot.lastUpdated ?? Date.now(),
    };
    localStorage.setItem(WORKOUT_SESSION_KEY, JSON.stringify(full));
  } catch (e) {
    console.error('writeWorkoutSession:', e);
  }
}

export function clearWorkoutSession(): void {
  try {
    localStorage.removeItem(WORKOUT_SESSION_KEY);
  } catch (e) {
    console.error('clearWorkoutSession:', e);
  }
}
