export interface Set {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
  targetSets: number;
  targetReps: number;
  restTime: number; // in seconds
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
  date: string;
  completed: boolean;
}

export const defaultWorkouts: Workout[] = [
  {
    id: '1',
    name: 'Push Day',
    exercises: [
      {
        id: 'e1',
        name: 'Bench Press',
        sets: [
          { reps: 10, weight: 135, completed: false },
          { reps: 8, weight: 145, completed: false },
          { reps: 6, weight: 155, completed: false }
        ],
        targetSets: 3,
        targetReps: 8,
        restTime: 120
      },
      {
        id: 'e2',
        name: 'Shoulder Press',
        sets: [
          { reps: 12, weight: 85, completed: false },
          { reps: 10, weight: 95, completed: false },
          { reps: 8, weight: 105, completed: false }
        ],
        targetSets: 3,
        targetReps: 10,
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
        sets: [
          { reps: 5, weight: 225, completed: false },
          { reps: 5, weight: 245, completed: false },
          { reps: 5, weight: 265, completed: false }
        ],
        targetSets: 3,
        targetReps: 5,
        restTime: 180
      },
      {
        id: 'e4',
        name: 'Pull-ups',
        sets: [
          { reps: 8, weight: 0, completed: false },
          { reps: 6, weight: 0, completed: false },
          { reps: 4, weight: 0, completed: false }
        ],
        targetSets: 3,
        targetReps: 8,
        restTime: 120
      }
    ],
    date: new Date().toISOString().split('T')[0],
    completed: false
  }
];