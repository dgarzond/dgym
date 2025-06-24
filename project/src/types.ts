export interface Set {
  id?: string;
  reps: number;
  weight: number;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
  weightUnit?: 'kg' | 'lbs';
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  completed: boolean;
  setDetails: Set[];
  restTime?: number; // in seconds
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: Exercise[];
  completed: boolean;
}

// Weight conversion functions
export const kgToLbs = (kg: number): number => Math.round(kg * 2.20462);
export const lbsToKg = (lbs: number): number => Math.round(lbs / 2.20462);

export const defaultWorkouts: Workout[] = [
  {
    id: '1',
    date: new Date().toISOString().split('T')[0],
    name: 'Día 1 - Entrenamiento Completo (45-60 min)',
    exercises: [
      // Calentamiento
      {
        id: 'e1',
        name: 'Rollo de espalda',
        sets: 2,
        reps: 10,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
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
        weight: 0,
        weightUnit: 'kg',
        completed: false,
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
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `warmup3-${i + 1}`,
          reps: 10,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 30
      },
      // Power
      {
        id: 'e4',
        name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 60,
        weightUnit: 'kg',
        completed: false,
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
        weight: 50,
        weightUnit: 'kg',
        completed: false,
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
        weight: 0,
        weightUnit: 'kg',
        completed: false,
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
        reps: 30,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `power4-${i + 1}`,
          reps: 30,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 60
      },
      // Cardio
      {
        id: 'e8',
        name: '20 minutos de cardio de bajo impacto (bicicleta estática)',
        sets: 1,
        reps: 20,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: [{
          id: 'cardio1-1',
          reps: 20,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        }],
        restTime: 0
      },
      // Estiramiento
      {
        id: 'e9',
        name: 'Estiramiento de flexores de cadera',
        sets: 2,
        reps: 30,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `stretch1-${i + 1}`,
          reps: 30,
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
        reps: 30,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `stretch2-${i + 1}`,
          reps: 30,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 30
      }
    ],
    completed: false
  },
  {
    id: '2',
    date: new Date().toISOString().split('T')[0],
    name: 'Día 2 - Entrenamiento de Fuerza (50-65 min)',
    exercises: [
      // Calentamiento
      {
        id: 'e11',
        name: 'Lunges laterales',
        sets: 2,
        reps: 10,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
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
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `warmup5-${i + 1}`,
          reps: 10,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 30
      },
      // Power
      {
        id: 'e13',
        name: 'Deadlift',
        sets: 3,
        reps: 5,
        weight: 100,
        weightUnit: 'kg',
        completed: false,
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
        weight: 40,
        weightUnit: 'kg',
        completed: false,
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
        weight: 45,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `power7-${i + 1}`,
          reps: 10,
          weight: 45,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 120
      },
      // Cardio
      {
        id: 'e16',
        name: '15 minutos de caminata intensa',
        sets: 1,
        reps: 15,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: [{
          id: 'cardio2-1',
          reps: 15,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        }],
        restTime: 0
      },
      // Estiramiento
      {
        id: 'e17',
        name: 'Estiramientos enfocados en piernas',
        sets: 2,
        reps: 30,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `stretch3-${i + 1}`,
          reps: 30,
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
        reps: 30,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(2).fill(null).map((_, i) => ({
          id: `stretch4-${i + 1}`,
          reps: 30,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 30
      }
    ],
    completed: false
  }
];