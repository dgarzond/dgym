export interface Set {
  id?: string;
  reps?: number; // Optional for duration-based exercises
  duration?: number; // Duration in seconds for time-based exercises
  durationUnit?: 'seconds' | 'minutes' | 'meters' | 'kilometers'; // Unit for duration/distance-based exercises
  weight: number;
  completed: boolean;
  actualReps?: number;
  actualDuration?: number; // Actual duration for time-based exercises
  actualWeight?: number;
  weightUnit?: 'kg' | 'lbs';
}

export interface Exercise {
  id: string;
  name: string;
  exerciseCode?: string; // Unique code for exercise identification (e.g., "EX001")
  sets: number;
  reps?: number; // Optional for duration-based exercises
  duration?: number; // Duration value for time-based exercises
  durationUnit?: 'seconds' | 'minutes' | 'meters' | 'kilometers'; // Unit for duration/distance-based exercises
  exerciseSubType: 'reps' | 'duration'; // New field to specify sub-type
  weight: number;
  weightUnit: 'kg' | 'lbs';
  completed: boolean;
  setDetails: Set[];
  restTime?: number; // in seconds
  type: ExerciseType; // New field to categorize exercises
}

export interface ExerciseType {
  id: string;
  name: string;
  nameSpanish: string;
  duration: string;
  exercises: Exercise[];
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exerciseTypes: ExerciseType[]; // Changed from exercises to exerciseTypes
  completed: boolean;
}

// Weight conversion functions
export const kgToLbs = (kg: number): number => Math.round(kg * 2.20462);
export const lbsToKg = (lbs: number): number => Math.round(lbs / 2.20462);

// Exercise type definitions
export const EXERCISE_TYPES = {
  WARMUP: {
    id: 'warmup',
    name: 'Warm-up',
    nameSpanish: 'Calentamiento',
    duration: '5-10 min'
  },
  POWER: {
    id: 'power',
    name: 'Power',
    nameSpanish: 'Fuerza',
    duration: '20-30 min'
  },
  CARDIO: {
    id: 'cardio',
    name: 'Cardio',
    nameSpanish: 'Cardio',
    duration: '15-25 min'
  },
  STRETCHING: {
    id: 'stretching',
    name: 'Stretching',
    nameSpanish: 'Estiramiento',
    duration: '5-10 min'
  }
};

// Sample workouts data - completely empty
export const defaultWorkouts: Workout[] = [];

// Sample exercises for testing - completely empty  
export const SAMPLE_EXERCISES: Exercise[] = [];