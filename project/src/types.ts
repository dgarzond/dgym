

export interface Set {
  id?: string;
  reps?: number; // Optional for duration-based exercises
  duration?: number; // Duration in seconds for time-based exercises
  durationUnit?: 'seconds' | 'minutes'; // Unit for duration-based exercises
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
  sets: number;
  reps?: number; // Optional for duration-based exercises
  duration?: number; // Duration value for time-based exercises
  durationUnit?: 'seconds' | 'minutes'; // Unit for duration-based exercises
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

export const defaultWorkouts: Workout[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0],
    name: 'Día 1 - Entrenamiento Completo (45-60 min)',
    exerciseTypes: [
      {
        ...EXERCISE_TYPES.WARMUP,
        exercises: [
          {
            id: 'e1',
            name: 'Rollo de espalda',
            sets: 2,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.WARMUP,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `warmup1-${i + 1}`,
              reps: 10,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          },
          {
            id: 'e2',
            name: 'Círculos de brazos',
            sets: 2,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.WARMUP,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `warmup2-${i + 1}`,
              reps: 10,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          },
          {
            id: 'e3',
            name: 'Rotaciones de hombros',
            sets: 2,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.WARMUP,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `warmup3-${i + 1}`,
              reps: 10,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          }
        ]
      },
      {
        ...EXERCISE_TYPES.POWER,
        exercises: [
          {
            id: 'e4',
            name: 'Bench Press',
            sets: 3,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 60,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power1-${i + 1}`,
              reps: 10,
              weight: 60,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 120
          },
          {
            id: 'e5',
            name: 'Squats con barra',
            sets: 3,
            reps: 12,
            exerciseSubType: 'reps',
            weight: 50,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power2-${i + 1}`,
              reps: 12,
              weight: 50,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 120
          },
          {
            id: 'e6',
            name: 'Pull-ups asistidos',
            sets: 3,
            reps: 8,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power3-${i + 1}`,
              reps: 8,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 90
          },
          {
            id: 'e7',
            name: 'Planks con elevación',
            sets: 3,
            duration: 30,
            durationUnit: 'seconds',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power4-${i + 1}`,
              duration: 30,
              durationUnit: 'seconds',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 60
          }
        ]
      },
      {
        ...EXERCISE_TYPES.CARDIO,
        exercises: [
          {
            id: 'e8',
            name: '20 minutos de cardio de bajo impacto (bicicleta estática)',
            sets: 1,
            duration: 20,
            durationUnit: 'minutes',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.CARDIO,
            setDetails: [{
              id: 'cardio1-1',
              duration: 20,
              durationUnit: 'minutes',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            }],
            restTime: 0
          }
        ]
      },
      {
        ...EXERCISE_TYPES.STRETCHING,
        exercises: [
          {
            id: 'e9',
            name: 'Estiramiento de flexores de cadera',
            sets: 2,
            duration: 30,
            durationUnit: 'seconds',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.STRETCHING,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `stretch1-${i + 1}`,
              duration: 30,
              durationUnit: 'seconds',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          },
          {
            id: 'e10',
            name: 'Estiramientos enfocados en el pecho y hombros',
            sets: 2,
            duration: 30,
            durationUnit: 'seconds',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.STRETCHING,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `stretch2-${i + 1}`,
              duration: 30,
              durationUnit: 'seconds',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          }
        ]
      }
    ],
    completed: false
  },
  {
    id: '2',
    date: new Date().toISOString().split('T')[0],
    name: 'Día 2 - Entrenamiento de Fuerza (50-65 min)',
    exerciseTypes: [
      {
        ...EXERCISE_TYPES.WARMUP,
        exercises: [
          {
            id: 'e11',
            name: 'Lunges laterales',
            sets: 2,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.WARMUP,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `warmup4-${i + 1}`,
              reps: 10,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          },
          {
            id: 'e12',
            name: 'Rollo de espalda',
            sets: 2,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.WARMUP,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `warmup5-${i + 1}`,
              reps: 10,
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          }
        ]
      },
      {
        ...EXERCISE_TYPES.POWER,
        exercises: [
          {
            id: 'e13',
            name: 'Deadlift',
            sets: 3,
            reps: 5,
            exerciseSubType: 'reps',
            weight: 100,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power5-${i + 1}`,
              reps: 5,
              weight: 100,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 180
          },
          {
            id: 'e14',
            name: 'Shoulder Press',
            sets: 3,
            reps: 8,
            exerciseSubType: 'reps',
            weight: 40,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power6-${i + 1}`,
              reps: 8,
              weight: 40,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 90
          },
          {
            id: 'e15',
            name: 'Bent-over Rows',
            sets: 3,
            reps: 10,
            exerciseSubType: 'reps',
            weight: 45,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.POWER,
            setDetails: Array(3).fill(null).map((_, i) => ({
              id: `power7-${i + 1}`,
              reps: 10,
              weight: 45,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 120
          }
        ]
      },
      {
        ...EXERCISE_TYPES.CARDIO,
        exercises: [
          {
            id: 'e16',
            name: '15 minutos de caminata intensa',
            sets: 1,
            duration: 15,
            durationUnit: 'minutes',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.CARDIO,
            setDetails: [{
              id: 'cardio2-1',
              duration: 15,
              durationUnit: 'minutes',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            }],
            restTime: 0
          }
        ]
      },
      {
        ...EXERCISE_TYPES.STRETCHING,
        exercises: [
          {
            id: 'e17',
            name: 'Estiramientos enfocados en piernas',
            sets: 2,
            duration: 30,
            durationUnit: 'seconds',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.STRETCHING,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `stretch3-${i + 1}`,
              duration: 30,
              durationUnit: 'seconds',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          },
          {
            id: 'e18',
            name: 'Estiramiento de espalda baja',
            sets: 2,
            duration: 30,
            durationUnit: 'seconds',
            exerciseSubType: 'duration',
            weight: 0,
            weightUnit: 'kg',
            completed: false,
            type: EXERCISE_TYPES.STRETCHING,
            setDetails: Array(2).fill(null).map((_, i) => ({
              id: `stretch4-${i + 1}`,
              duration: 30,
              durationUnit: 'seconds',
              weight: 0,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: 30
          }
        ]
      }
    ],
    completed: false
  }
];

