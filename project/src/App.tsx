import React, { useState, useEffect } from 'react';
// CONFIGURACIÓN: Parsea y configura la API key de forma segura - mantén esta línea
import './utils/setup-api-key';
import { Dumbbell, Plus, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { WorkoutCard } from './components/WorkoutCard';
import { WorkoutDetail } from './components/WorkoutDetail';
import { ExerciseScreen } from './components/ExerciseScreen';
import { WeeklyPlanManager } from './components/WeeklyPlanManager';
import { ChatBot } from './components/ChatBot';
import type { Workout, Exercise, Set } from './types';
import { defaultWorkouts } from './types';

function App() {
  // Función para sincronizar el estado de completitud desde localStorage
  const syncExerciseCompletion = (workouts: Workout[]): Workout[] => {
    return workouts.map(workout => ({
      ...workout,
      exerciseTypes: (workout.exerciseTypes || []).map(exerciseType => ({
        ...exerciseType,
        exercises: (exerciseType.exercises || []).map(exercise => {
          try {
            // Cargar progreso guardado del ejercicio
            const savedProgress = localStorage.getItem(`gymTracker_exercise_${exercise.id}`);
            if (savedProgress) {
              const progress = JSON.parse(savedProgress);
              const savedSetDetails = progress.setDetails || exercise.setDetails || [];
              
              // Verificar si todos los sets están completados
              const allSetsCompleted = savedSetDetails.length > 0 && 
                                     savedSetDetails.every((set: any) => set && set.completed);
              
              return {
                ...exercise,
                setDetails: savedSetDetails,
                completed: allSetsCompleted
              };
            }
          } catch (error) {
            console.error(`Error loading progress for exercise ${exercise.id}:`, error);
          }
          return exercise;
        })
      }))
    }));
  };

  // Cargar workouts desde localStorage o usar defaultWorkouts como fallback
  const [workouts, setWorkouts] = useState<Workout[]>(() => {
    try {
      const savedWorkouts = localStorage.getItem('gymTracker_workouts');
      if (savedWorkouts) {
        const parsedWorkouts = JSON.parse(savedWorkouts);
        // Sincronizar estado de completitud con el progreso guardado
        return syncExerciseCompletion(parsedWorkouts);
      }
    } catch (error) {
      console.error('Error loading workouts from localStorage:', error);
    }
    return defaultWorkouts;
  });
  
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [currentExercise, setCurrentExercise] = useState<number | null>(null);
  const [showChatBot, setShowChatBot] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0); // Total workout time
  const [isWorkoutActive, setIsWorkoutActive] = useState(false); // Estado del cronómetro global
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);

  // Guardar workouts en localStorage cada vez que cambien
  useEffect(() => {
    try {
      localStorage.setItem('gymTracker_workouts', JSON.stringify(workouts));
      
      // También sincronizar el estado de completitud cuando cambian los workouts
      const syncedWorkouts = syncExerciseCompletion(workouts);
      if (JSON.stringify(syncedWorkouts) !== JSON.stringify(workouts)) {
        // Solo actualizar si hay diferencias para evitar loops infinitos
        setTimeout(() => {
          setWorkouts(syncedWorkouts);
        }, 0);
      }
    } catch (error) {
      console.error('Error saving workouts to localStorage:', error);
    }
  }, [workouts]);

  // Cronómetro global de la rutina - persistente usando timestamps
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWorkoutActive && workoutStartTime) {
      // Actualizar inmediatamente
      setTotalWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      
      // Continuar actualizando cada segundo
      interval = setInterval(() => {
        setTotalWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorkoutActive, workoutStartTime]);

  // Actualizar el cronómetro cuando la aplicación recibe foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isWorkoutActive && workoutStartTime) {
        // Actualizar el tiempo cuando la aplicación vuelve a tener foco
        setTotalWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }
    };

    const handleFocus = () => {
      if (isWorkoutActive && workoutStartTime) {
        // Actualizar el tiempo cuando la ventana recibe foco
        setTotalWorkoutTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isWorkoutActive, workoutStartTime]);

  // Sincronizar estado cuando el usuario vuelve a la aplicación
  useEffect(() => {
    const handleFocus = () => {
      setWorkouts(currentWorkouts => syncExerciseCompletion(currentWorkouts));
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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
    // Iniciar cronómetro global de rutina
    const startTime = Date.now();
    setWorkoutStartTime(startTime);
    setTotalWorkoutTime(0);
    setIsWorkoutActive(true);
  };

  const handleEndWorkout = () => {
    // Marcar todos los ejercicios como completados al finalizar la rutina
    if (selectedWorkout) {
      const updatedWorkout = {
        ...selectedWorkout,
        completed: true,
        exerciseTypes: (selectedWorkout.exerciseTypes || []).map(exerciseType => ({
          ...exerciseType,
          exercises: (exerciseType.exercises || []).map(exercise => ({
            ...exercise,
            completed: true,
            setDetails: (exercise.setDetails || []).map(set => ({
              ...set,
              completed: true,
              actualReps: set.actualReps || exercise.reps,
              actualWeight: set.actualWeight || exercise.weight,
              actualDuration: set.actualDuration || exercise.duration
            }))
          }))
        }))
      };

      // Actualizar los workouts con el workout completado
      const updatedWorkouts = workouts.map(w => 
        w.id === selectedWorkout.id ? updatedWorkout : w
      );
      setWorkouts(updatedWorkouts);

      // Limpiar el progreso guardado de todos los ejercicios
      try {
        const allExercises = selectedWorkout.exerciseTypes.flatMap(type => type.exercises || []);
        allExercises.forEach(exercise => {
          if (exercise) {
            localStorage.removeItem(`gymTracker_exercise_${exercise.id}`);
          }
        });
      } catch (error) {
        console.error('Error clearing exercise progress:', error);
      }
    }

    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setCurrentExercise(null);
    setSelectedWorkout(null);
    setTotalWorkoutTime(0);
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

    // Limpiar el progreso guardado del ejercicio completado
    try {
      localStorage.removeItem(`gymTracker_exercise_${exerciseId}`);
    } catch (error) {
      console.error('Error clearing exercise progress:', error);
    }

    // Move to next exercise or finish workout
    handleNextExercise();
  };

  const handleNextExercise = () => {
    if (selectedWorkout && currentExercise !== null) {
      const allExercises = (selectedWorkout.exerciseTypes || []).flatMap(type => (type.exercises || [])).filter(ex => ex);
      if (currentExercise < allExercises.length - 1) {
        setCurrentExercise(currentExercise + 1);
      } else {
        // Al finalizar el último ejercicio, seguir con el cronómetro activo
        // El usuario deberá presionar el botón "Finalizar Rutina" para terminar completamente
        setCurrentExercise(null);
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
        onBack={() => {
          // Regresar a la pantalla de detalle del workout manteniendo el cronómetro activo
          setCurrentExercise(null);
          // NO cambiar isWorkoutActive ni workoutStartTime - mantener el cronómetro corriendo
        }}
        onNext={handleNextExercise}
        onEndWorkout={handleEndWorkout}
        isLast={currentExercise === allExercises.length - 1}
        totalWorkoutTime={totalWorkoutTime}
        currentStage={currentStage}
        isWorkoutActive={isWorkoutActive}
      />
    );
  }

  // Pantalla de finalización cuando se completan todos los ejercicios pero el cronómetro sigue activo
  if (selectedWorkout && currentExercise === null && isWorkoutActive && selectedWorkout.completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Rutina Completada!</h2>
            <p className="text-gray-600 mb-6">
              Has completado todos los ejercicios de "{selectedWorkout.name}"
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-blue-600 mb-1">Tiempo total de rutina</div>
              <div className="text-3xl font-bold text-blue-800">
                {Math.floor(totalWorkoutTime / 60)}:{String(totalWorkoutTime % 60).padStart(2, '0')}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleEndWorkout}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Finalizar Rutina
              </button>
              <button
                onClick={() => setCurrentExercise(0)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Repetir Rutina
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        onBack={() => setSelectedWorkout(null)}
        onUpdateWorkout={handleUpdateWorkout}
        onStartExercise={() => handleStartExercise(selectedWorkout)}
        onEndWorkout={handleEndWorkout}
        isWorkoutActive={isWorkoutActive}
        totalWorkoutTime={totalWorkoutTime}
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