export interface Set {
  id: string;
  completed: boolean;
  actualReps?: number;
  actualWeight?: number;
  weightUnit: 'kg' | 'lbs';
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  weightUnit: 'kg' | 'lbs';
  completed?: boolean;
  setDetails: Set[];
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: Exercise[];
}

export type WorkoutDay = 'Push' | 'Pull' | 'Legs' | 'Rest';

// Conversion functions
export const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
export const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462);

export const defaultWorkouts: Workout[] = [
  {
    id: '1',
    date: new Date().toISOString(),
    name: 'Push Day',
    exercises: [
      { 
        id: '1', 
        name: 'Bench Press', 
        sets: 4, 
        reps: 8, 
        weight: 60, // Changed to a reasonable kg value
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(4).fill(null).map((_, i) => ({ 
          id: `bench-${i + 1}`, 
          completed: false,
          weightUnit: 'kg'
        }))
      },
      { 
        id: '2', 
        name: 'Shoulder Press', 
        sets: 3, 
        reps: 10, 
        weight: 40, // Changed to a reasonable kg value
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({ 
          id: `shoulder-${i + 1}`, 
          completed: false,
          weightUnit: 'kg'
        }))
      },
      { 
        id: '3', 
        name: 'Tricep Extensions', 
        sets: 3, 
        reps: 12, 
        weight: 20, // Changed to a reasonable kg value
        weightUnit: 'kg',
        completed: false,
        setDetails: Array(3).fill(null).map((_, i) => ({ 
          id: `tricep-${i + 1}`, 
          completed: false,
          weightUnit: 'kg'
        }))
      },
    ],
  },
];