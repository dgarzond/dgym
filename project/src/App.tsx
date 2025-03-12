import React, { useState } from 'react';
import { Plus, Calendar, Dumbbell } from 'lucide-react';
import { WorkoutCard } from './components/WorkoutCard';
import { WorkoutDetail } from './components/WorkoutDetail';
import { ExerciseScreen } from './components/ExerciseScreen';
import type { Workout, Exercise, Set } from './types';
import { defaultWorkouts } from './types';

function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(defaultWorkouts);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [currentExercise, setCurrentExercise] = useState<number | null>(null);

  const handleEdit = (workout: Workout) => {
    setSelectedWorkout(workout);
  };

  const handleDelete = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  const handleToggleExercise = (workoutId: string, exerciseId: string) => {
    setWorkouts(workouts.map(workout => {
      if (workout.id === workoutId) {
        return {
          ...workout,
          exercises: workout.exercises.map(exercise => {
            if (exercise.id === exerciseId) {
              const allSetsCompleted = exercise.setDetails.every(set => set.completed);
              return { 
                ...exercise, 
                completed: !allSetsCompleted,
                setDetails: exercise.setDetails.map(set => ({
                  ...set,
                  completed: !allSetsCompleted
                }))
              };
            }
            return exercise;
          }),
        };
      }
      return workout;
    }));
  };

  const handleUpdateWorkout = (updatedWorkout: Workout) => {
    setWorkouts(workouts.map(w => 
      w.id === updatedWorkout.id ? updatedWorkout : w
    ));
    setSelectedWorkout(updatedWorkout);
  };

  const handleStartExercise = (workout: Workout) => {
    setSelectedWorkout(workout);
    setCurrentExercise(0);
  };

  const handleExerciseComplete = (exerciseId: string, setDetails: Set[]) => {
    if (selectedWorkout) {
      const updatedWorkout = {
        ...selectedWorkout,
        exercises: selectedWorkout.exercises.map(exercise => 
          exercise.id === exerciseId
            ? { ...exercise, setDetails, completed: true }
            : exercise
        ),
      };
      handleUpdateWorkout(updatedWorkout);
    }
  };

  const handleNextExercise = () => {
    if (selectedWorkout && currentExercise !== null) {
      if (currentExercise < selectedWorkout.exercises.length - 1) {
        setCurrentExercise(currentExercise + 1);
      } else {
        setCurrentExercise(null);
        setSelectedWorkout(null);
      }
    }
  };

  if (selectedWorkout && currentExercise !== null) {
    const exercise = selectedWorkout.exercises[currentExercise];
    return (
      <ExerciseScreen
        exercise={exercise}
        onComplete={handleExerciseComplete}
        onBack={() => setCurrentExercise(null)}
        onNext={handleNextExercise}
        isLast={currentExercise === selectedWorkout.exercises.length - 1}
      />
    );
  }

  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        onBack={() => setSelectedWorkout(null)}
        onUpdateWorkout={handleUpdateWorkout}
        onStartExercise={() => handleStartExercise(selectedWorkout)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Dumbbell className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">GymTracker</h1>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Plus className="h-5 w-5 mr-2" />
              New Workout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Workouts</h2>
          <div className="flex items-center text-gray-500">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleExercise={handleToggleExercise}
              onStartExercise={() => handleStartExercise(workout)}
            />
          ))}
        </div>

        {workouts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No workouts yet. Start by adding a new workout!</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;