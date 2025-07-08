import React, { useState, useEffect } from 'react';
// CONFIGURACIÓN: Parsea y configura la API key de forma segura - mantén esta línea
import './utils/setup-api-key';
import { Dumbbell, Plus, Calendar, MessageSquare } from 'lucide-react';
import { WorkoutCard } from './components/WorkoutCard';
import { WorkoutDetail } from './components/WorkoutDetail';
import { ExerciseScreen } from './components/ExerciseScreen';
import { WeeklyPlanManager } from './components/WeeklyPlanManager';
import { ChatBot } from './components/ChatBot';
import type { Workout, Exercise, Set } from './types';
import { defaultWorkouts } from './types';

function App() {
  const [workouts, setWorkouts] = useState<Workout[]>(defaultWorkouts);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [currentExercise, setCurrentExercise] = useState<number | null>(null);
  const [showChatBot, setShowChatBot] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0); // Total workout time

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
          exerciseTypes: (workout.exerciseTypes || []).map(exerciseType => ({
            ...exerciseType,
            exercises: (exerciseType.exercises || []).map(exercise => {
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
            })
          }))
        };
      }
      return workout;
    }));
  };

  const handleUpdateWorkout = (updatedWorkout: Workout) => {
    if (updatedWorkout && updatedWorkout.id) {
      setWorkouts(workouts.map(w => 
        w.id === updatedWorkout.id ? updatedWorkout : w
      ));
      setSelectedWorkout(updatedWorkout);
    }
  };

  const handleStartExercise = (workout: Workout) => {
    setSelectedWorkout(workout);
    setCurrentExercise(0);
    setTotalWorkoutTime(0); // Reset workout time when starting a new workout
  };

  const handleExerciseComplete = (exerciseId: string, completedSetDetails: Set[]) => {
    if (!selectedWorkout) return;

    // Verificar que todos los sets estén realmente completados
    const allSetsCompleted = completedSetDetails.every(set => set.completed);
    if (!allSetsCompleted) {
      console.warn('Intentando completar ejercicio con sets incompletos');
      return;
    }

    const updatedWorkout = {
      ...selectedWorkout,
      exerciseTypes: (selectedWorkout.exerciseTypes || []).map(exerciseType => ({
        ...exerciseType,
        exercises: (exerciseType.exercises || []).map(exercise => {
          if (exercise.id === exerciseId) {
            return {
              ...exercise,
              setDetails: completedSetDetails,
              completed: true
            };
          }
          return exercise;
        })
      }))
    };

    // Verificar si todo el workout está completo
    const allExercisesInWorkout = updatedWorkout.exerciseTypes.flatMap(type => type.exercises || []);
    const workoutCompleted = allExercisesInWorkout.every(exercise => exercise.completed);

    const finalUpdatedWorkout = {
      ...updatedWorkout,
      completed: workoutCompleted
    };

    const updatedWorkouts = workouts.map(w => 
      w.id === selectedWorkout.id ? finalUpdatedWorkout : w
    );
    setWorkouts(updatedWorkouts);
    setSelectedWorkout(finalUpdatedWorkout);

    // Move to next exercise or finish workout
    handleNextExercise();
  };

  const handleNextExercise = () => {
    if (selectedWorkout && currentExercise !== null) {
      const allExercises = (selectedWorkout.exerciseTypes || []).flatMap(type => (type.exercises || [])).filter(ex => ex);
      if (currentExercise < allExercises.length - 1) {
        setCurrentExercise(currentExercise + 1);
      } else {
        setCurrentExercise(null);
        setSelectedWorkout(null);
      }
    }
  };

  const handleAddWorkout = (newWorkout: Workout | Workout[]) => {
    console.log('=== 🎯 APP.TSX - HANDLE ADD WORKOUT ===');

    // Handle both single workout and array of workouts
    const workoutsToAdd = Array.isArray(newWorkout) ? newWorkout : [newWorkout];

    console.log('📊 Total workouts to add to main list:', workoutsToAdd.length);
    console.log('📋 Current workouts in main list before adding:', workouts.length);

    workoutsToAdd.forEach((workout, index) => {
      console.log(`=== 📅 ADDING WORKOUT ${index + 1}/${workoutsToAdd.length} TO MAIN LIST ===`);
      console.log('🆔 Workout ID:', workout.id);
      console.log('📝 Workout Name:', workout.name);
      console.log('🏷️ Workout DayId:', workout.dayId || 'NO DAYID');
      console.log('📊 Exercise Types Count:', workout.exerciseTypes?.length || 0);
      console.log('📅 Workout Date:', workout.date);

      // Check for duplicates in main list
      const existsInMain = workouts.some(existing => 
        existing.id === workout.id || 
        (existing.dayId && workout.dayId && existing.dayId === workout.dayId)
      );

      console.log('🔍 Duplicate check in main list:', existsInMain ? 'DUPLICATE FOUND' : 'UNIQUE WORKOUT');

      if (existsInMain) {
        console.warn('⚠️ DUPLICATE WORKOUT DETECTED IN MAIN LIST - SKIPPING');
      }
    });

    // Add all workouts to main list (remove duplicates first)
    const currentWorkoutIds = new Set(workouts.map(w => w.id));
    const currentDayIds = new Set(workouts.map(w => w.dayId).filter(Boolean));

    const uniqueWorkouts = workoutsToAdd.filter(workout => {
      const idExists = currentWorkoutIds.has(workout.id);
      const dayIdExists = workout.dayId && currentDayIds.has(workout.dayId);
      return !idExists && !dayIdExists;
    });

    console.log('✅ Unique workouts to add:', uniqueWorkouts.length);

    if (uniqueWorkouts.length > 0) {
      const updatedWorkouts = [...workouts, ...uniqueWorkouts];
      console.log('🚀 UPDATING MAIN WORKOUTS LIST');
      console.log('📊 New total count will be:', updatedWorkouts.length);
      setWorkouts(updatedWorkouts);

      // Log the final state
      setTimeout(() => {
        console.log('=== 🏁 FINAL STATE CHECK ===');
        console.log('📋 Workouts in state after update:', updatedWorkouts.length);
        updatedWorkouts.forEach((w, i) => {
          console.log(`   ${i + 1}. "${w.name}" (ID: ${w.id}, DayId: ${w.dayId || 'NO DAYID'})`);
        });
      }, 100);
    } else {
      console.warn('⚠️ NO UNIQUE WORKOUTS TO ADD - ALL WERE DUPLICATES');
    }
  };

  if (selectedWorkout && currentExercise !== null) {
    const allExercises = (selectedWorkout.exerciseTypes || []).flatMap(type => (type.exercises || [])).filter(ex => ex);
    const exercise = allExercises[currentExercise];

    if (!exercise) {
      setCurrentExercise(null);
      return null;
    }

    // Get the current exercise type for stage display
    let currentStage = 'Ejercicio';
    if (selectedWorkout.exerciseTypes) {
      for (const exerciseType of selectedWorkout.exerciseTypes) {
        if (exerciseType.exercises?.some(ex => ex.id === exercise.id)) {
          currentStage = exerciseType.name;
          break;
        }
      }
    }

    return (
      <ExerciseScreen
        exercise={exercise}
        onComplete={handleExerciseComplete}
        onBack={() => setCurrentExercise(null)}
        onNext={handleNextExercise}
        isLast={currentExercise === allExercises.length - 1}
        totalWorkoutTime={totalWorkoutTime}
        currentStage={currentStage}
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
            <div className="flex space-x-2">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Plus className="h-5 w-5 mr-2" />
                New Workout
              </button>
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                onClick={() => setShowChatBot(true)}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                ChatBot
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Weekly Plan Manager Component */}
        <WeeklyPlanManager 
          workouts={workouts}
          onAddWorkout={handleAddWorkout}
        />

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

      {showChatBot && (
        <ChatBot
          onWorkoutGenerated={handleAddWorkout}
          onClose={() => setShowChatBot(false)}
        />
      )}
    </div>
  );
}

export default App;