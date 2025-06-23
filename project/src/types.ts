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
  name: string;
  exercises: Exercise[];
  date: string;
  completed: boolean;
}

// Weight conversion functions
export const kgToLbs = (kg: number): number => Math.round(kg * 2.20462);
export const lbsToKg = (lbs: number): number => Math.round(lbs / 2.20462);

export const defaultWorkouts: Workout[] = [
  {
    id: '1',
    name: 'Push Day',
    exercises: [
      {
        id: 'e1',
        name: 'Bench Press',
        sets: 3,
        reps: 8,
        weight: 60,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `bench-${i + 1}`,
          reps: 8,
          weight: 60,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 120
      },
      {
        id: 'e2',
        name: 'Shoulder Press',
        sets: 3,
        reps: 10,
        weight: 40,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `shoulder-${i + 1}`,
          reps: 10,
          weight: 40,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 90
      }
    ],
    date: new Date().toISOString().split('T')[0],
    completed: false
  },
  {
    id: '2',
    name: 'Pull Day',
    exercises: [
      {
        id: 'e3',
        name: 'Deadlift',
        sets: 3,
        reps: 5,
        weight: 100,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `deadlift-${i + 1}`,
          reps: 5,
          weight: 100,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 180
      },
      {
        id: 'e4',
        name: 'Pull-ups',
        sets: 3,
        reps: 8,
        weight: 0,
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({
          id: `pullup-${i + 1}`,
          reps: 8,
          weight: 0,
          completed: false,
          weightUnit: 'kg'
        })),
        restTime: 120
      }
    ],
    date: new Date().toISOString().split('T')[0],
    completed: false
  }
];