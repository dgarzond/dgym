import React, { useState, useEffect } from 'react';
// CONFIGURACIÓN: Parsea y configura la API key de forma segura - mantén esta línea
import './utils/setup-api-key';
import { Dumbbell, Plus, Calendar, MessageSquare, CheckCircle } from 'lucide-react';
import { WorkoutCard } from './components/WorkoutCard';
import { WorkoutDetail } from './components/WorkoutDetail';
import { ExerciseScreen } from './components/ExerciseScreen';
import { WeeklyPlanManager } from './components/WeeklyPlanManager';
import { ChatBot } from './components/ChatBot';
import { Login } from './components/Login';
import type { Workout, Exercise, Set } from './types';
import { defaultWorkouts } from './types';
import { api } from './utils/api';

// --- Componentes de Vista ---
// Estos componentes ahora gestionarán las diferentes secciones de la aplicación.

// Componente para mostrar la lista de semanas
function WeekListView() {
  // Aquí iría la lógica para mostrar las semanas y permitir la navegación
  // Por ahora, solo un placeholder
  return (
    <div className="text-center py-12">
      <p className="text-gray-500">Vista de Semanas. ¡Aún en desarrollo!</p>
      {/* Ejemplo: Renderizarías WeekCard aquí */}
    </div>
  );
}

// Componente para mostrar los detalles de una semana específica
function WeekDetailView({ week, onBack }: { week: any, onBack: () => void }) {
  // Aquí iría la lógica para mostrar los días de rutina y ejercicios de una semana
  // Por ahora, solo un placeholder
  return (
    <div className="p-8">
      <button onClick={onBack} className="text-blue-600 mb-4">← Volver a Semanas</button>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Detalles de la Semana</h2>
      <p className="text-gray-600">Semana: {week.name}</p>
      {/* Ejemplo: Renderizarías DayCard aquí */}
      <div className="text-center py-12">
        <p className="text-gray-500">Detalles de Semana. ¡Aún en desarrollo!</p>
      </div>
    </div>
  );
}

interface User {
  id: number;
  username: string;
  email?: string;
}

function App() {
  // Estado de autenticación del usuario
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);


  // Estados para la navegación entre vistas
  type CurrentView = 'weekList' | 'weekDetail' | 'workoutList' | 'workoutDetail' | 'exercise';
  const [currentView, setCurrentView] = useState<CurrentView>('workoutList'); // Vista inicial

  // Estado para la semana seleccionada (para weekDetail)
  const [selectedWeek, setSelectedWeek] = useState<any>(null);

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

  // Workouts state - loaded from DB after login
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [currentExerciseIndex, setCurrentExercise] = useState<number | null>(null);
  const [currentExerciseStage, setCurrentExerciseStage] = useState<string>('');
  const [showChatBot, setShowChatBot] = useState(false);
  const [totalWorkoutTime, setTotalWorkoutTime] = useState(0); // Total workout time
  const [isWorkoutActive, setIsWorkoutActive] = useState(false); // Estado del cronómetro global
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0); // Tiempo acumulado cuando está pausado

  // Initialize timer state from localStorage on mount
  useEffect(() => {
    try {
      const savedIsActive = localStorage.getItem('gymTracker_isWorkoutActive');
      const savedStartTime = localStorage.getItem('gymTracker_workoutStartTime');
      const savedPausedTime = localStorage.getItem('gymTracker_pausedTime');

      const isActive = savedIsActive === 'true';
      const startTime = savedStartTime ? parseInt(savedStartTime, 10) : null;
      const paused = savedPausedTime ? parseInt(savedPausedTime, 10) : 0;

      // Only restore state if the values are reasonable (less than 24 hours)
      const maxReasonableTime = 24 * 60 * 60; // 24 hours in seconds

      if (isActive && startTime && paused < maxReasonableTime) {
        setIsWorkoutActive(isActive);
        setWorkoutStartTime(startTime);
        setPausedTime(paused);

        // Calculate current total time
        const currentElapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const totalElapsedTime = paused + currentElapsedTime;

        // Only set if reasonable
        if (totalElapsedTime < maxReasonableTime) {
          setTotalWorkoutTime(totalElapsedTime);
        } else {
          // Reset if unreasonable
          handleResetTimer();
        }
      } else if (paused >= maxReasonableTime || !isActive) {
        // Reset if time is unreasonable or workout is not active
        handleResetTimer();
      }
    } catch (error) {
      console.error('Error loading workout timer state:', error);
      handleResetTimer();
    }
  }, []);

  const handleResetTimer = () => {
    setIsWorkoutActive(false);
    setWorkoutStartTime(null);
    setTotalWorkoutTime(0);
    setPausedTime(0);

    try {
      localStorage.removeItem('gymTracker_totalWorkoutTime');
      localStorage.removeItem('gymTracker_pausedTime');
      localStorage.removeItem('gymTracker_workoutStartTime');
      localStorage.removeItem('gymTracker_isWorkoutActive');
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
  };

  // No need to persist workouts to localStorage - using DB only


  // Guardar estado del cronómetro en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gymTracker_isWorkoutActive', isWorkoutActive.toString());
      localStorage.setItem('gymTracker_totalWorkoutTime', totalWorkoutTime.toString());
      localStorage.setItem('gymTracker_pausedTime', pausedTime.toString());
      if (workoutStartTime !== null) {
        localStorage.setItem('gymTracker_workoutStartTime', workoutStartTime.toString());
      } else {
        localStorage.removeItem('gymTracker_workoutStartTime');
      }
    } catch (error) {
      console.error('Error saving workout timer state to localStorage:', error);
    }
  }, [isWorkoutActive, workoutStartTime, totalWorkoutTime, pausedTime]);

  // Cronómetro global de la rutina - usa tiempo del sistema
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWorkoutActive && workoutStartTime) {
      // Función para actualizar el tiempo basado en el tiempo del sistema
      const updateTime = () => {
        const currentElapsedTime = Math.floor((Date.now() - workoutStartTime) / 1000);
        const totalElapsedTime = pausedTime + currentElapsedTime;
        setTotalWorkoutTime(totalElapsedTime);
      };

      // Actualizar inmediatamente
      updateTime();

      // Actualizar cada segundo
      interval = setInterval(updateTime, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorkoutActive, workoutStartTime, pausedTime]);

  // Sincronizar tiempo cuando la página recibe foco o se vuelve visible
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (isWorkoutActive && workoutStartTime) {
        // Siempre sincronizar con el tiempo del sistema cuando la página es visible
        const currentElapsedTime = Math.floor((Date.now() - workoutStartTime) / 1000);
        const totalElapsedTime = pausedTime + currentElapsedTime;
        setTotalWorkoutTime(totalElapsedTime);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
    };
  }, [isWorkoutActive, workoutStartTime, pausedTime]);

  // Sincronizar estado cuando el usuario vuelve a la aplicación
  useEffect(() => {
    const handleFocus = () => {
      setWorkouts(currentWorkouts => syncExerciseCompletion(currentWorkouts));
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Manejar el login del usuario
  const handleLogin = async (name: string, email?: string, googleId?: string) => {
    console.log('🔐 Starting login process for:', name);

    try {
      // Crear o obtener usuario de la base de datos
      console.log('👤 Creating/getting user in DB...');
      const userData: User = await api.createOrGetUser(name, email, googleId);
      
      console.log('✅ User loaded from DB:', userData);
      
      // Establecer estados de usuario
      setUser(userData);
      setCurrentUser(name);

      // Cargar workouts del usuario desde la base de datos
      console.log('📥 Loading workouts from DB...');
      const dbWorkouts = await api.getUserWorkouts(userData.id);
      console.log('✅ Workouts loaded from DB:', dbWorkouts.length);

      setWorkouts(dbWorkouts.length > 0 ? dbWorkouts : []);
      
    } catch (error) {
      console.error('❌ Error during login:', error);
      // Mostrar error al usuario sin hacer fallback a localStorage
      alert('Error al iniciar sesión. Por favor, verifica tu conexión e intenta nuevamente.');
      throw error;
    }
  };

  // Manejar el logout del usuario
  const handleLogout = () => {
    setCurrentUser(null);
    setUser(null);
    setWorkouts([]);
    handleResetTimer();
    console.log('✅ User logged out successfully');
  };

  const handleEdit = (workout: Workout) => {
    setSelectedWorkout(workout);
    setCurrentView('workoutDetail'); // Navegar a la vista de detalle del workout
  };

  const handleDelete = async (id: string) => {
    if (!user?.id) {
      console.warn('User not logged in, cannot delete workout');
      return;
    }

    try {
      console.log(`🗑️ Deleting workout ${id} from DB...`);
      await api.deleteWorkout(user.id, id);
      setWorkouts(workouts.filter(w => w.id !== id));
      console.log('✅ Workout deleted successfully from DB');
    } catch (error) {
      console.error('❌ Error deleting workout from DB:', error);
      alert('Error al eliminar el workout. Por favor, intenta nuevamente.');
    }
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

  const handleUpdateWorkout = async (updatedWorkout: Workout) => {
    if (!user?.id) {
      console.warn('User not logged in, cannot update workout');
      return;
    }

    try {
      console.log('📝 Updating workout in DB:', updatedWorkout.id);
      await api.updateWorkout(user.id, updatedWorkout);
      setWorkouts(workouts.map(w =>
        w.id === updatedWorkout.id ? updatedWorkout : w
      ));
      setSelectedWorkout(updatedWorkout);
      console.log('✅ Workout updated successfully in DB');
    } catch (error) {
      console.error('❌ Error updating workout in DB:', error);
      alert('Error al actualizar el workout. Por favor, intenta nuevamente.');
    }
  };

  const handleStartExercise = (workout: Workout) => {
    // Establecer el workout seleccionado primero
    setSelectedWorkout(workout);

    // Limpiar todo el progreso guardado de ejercicios al iniciar una nueva rutina
    try {
      const allExercises = (workout.exerciseTypes || []).flatMap(type => type.exercises || []);
      allExercises.forEach(exercise => {
        if (exercise && exercise.id) {
          localStorage.removeItem(`gymTracker_exercise_${exercise.id}`);
        }
      });
    } catch (error) {
      console.error('Error clearing exercise progress:', error);
    }

    // Resetear el estado de completitud de todos los ejercicios en el workout
    const resetWorkout = {
      ...workout,
      completed: false,
      exerciseTypes: (workout.exerciseTypes || []).map(exerciseType => ({
        ...exerciseType,
        exercises: (exerciseType.exercises || []).map(exercise => ({
          ...exercise,
          completed: false,
          setDetails: (exercise.setDetails || []).map(set => ({
            ...set,
            completed: false,
            actualReps: undefined,
            actualWeight: undefined,
            actualDuration: undefined
          }))
        }))
      }))
    };

    // Actualizar el workout en el estado principal
    setWorkouts(currentWorkouts =>
      currentWorkouts.map(w => w.id === workout.id ? resetWorkout : w)
    );
    setSelectedWorkout(resetWorkout);

    // Buscar el primer ejercicio (ahora todos están incompletos)
    let firstExercise: Exercise | null = null;
    let exerciseTypeStage = '';

    for (const exerciseType of resetWorkout.exerciseTypes || []) {
      const exercise = (exerciseType.exercises || [])[0];
      if (exercise) {
        firstExercise = exercise;
        exerciseTypeStage = exerciseType.nameSpanish || exerciseType.name || '';
        break;
      }
    }

    if (firstExercise) {
      setCurrentExercise(firstExercise.id);
      setCurrentExerciseStage(exerciseTypeStage);
      setCurrentView('exercise');

      // Siempre resetear y iniciar nuevo cronómetro cuando se inicia una rutina
      setPausedTime(0);
      setTotalWorkoutTime(0);
      const startTime = Date.now();
      setWorkoutStartTime(startTime);
      setIsWorkoutActive(true);
    } else {
      // Si no hay ejercicios, ir al detalle del workout
      setCurrentView('workoutDetail');
    }
  };


  const handleEndWorkout = async () => {
    if (!selectedWorkout) return;

    // Marcar todos los ejercicios como completados al finalizar la rutina
    const updatedWorkout = {
      ...selectedWorkout,
      completed: true,
      exerciseTypes: (selectedWorkout.exerciseTypes || []).map(exerciseType => ({
        ...exerciseType,
        exercises: (exerciseType.exercises || []).map(exercise => {
          // Ensure setDetails exists and is an array before mapping
          const currentSetDetails = Array.isArray(exercise.setDetails) ? exercise.setDetails : [];
          return {
            ...exercise,
            completed: true,
            setDetails: currentSetDetails.map(set => ({
              ...set,
              completed: true,
              actualReps: set.actualReps || exercise.reps,
              actualWeight: set.actualWeight || exercise.weight,
              actualDuration: set.actualDuration || exercise.duration
            }))
          };
        })
      }))
    };

    // Actualizar los workouts con el workout completado
    const updatedWorkoutsList = workouts.map(w =>
      w.id === selectedWorkout.id ? updatedWorkout : w
    );
    setWorkouts(updatedWorkoutsList);

    // Guardar el workout actualizado en la base de datos
    if (user?.id) {
      try {
        console.log(`Updating completed workout ${updatedWorkout.id} in DB...`);
        await api.updateWorkout(user.id, updatedWorkout); // Assuming updateWorkout handles the full object
        console.log('Workout updated successfully in DB after completion.');
      } catch (error) {
        console.error('Error updating workout in DB after completion:', error);
      }
    } else {
      console.warn('User not logged in, cannot save workout completion status to DB.');
    }

    // Limpiar el progreso guardado de todos los ejercicios
    try {
      const allExercises = selectedWorkout.exerciseTypes.flatMap(type => type.exercises || []);
      allExercises.forEach(exercise => {
        if (exercise && exercise.id) {
          localStorage.removeItem(`gymTracker_exercise_${exercise.id}`);
        }
      });
    } catch (error) {
      console.error('Error clearing exercise progress:', error);
    }

    handleResetTimer();
    setCurrentExercise(null);
    setSelectedWorkout(null);
    setCurrentView('workoutList'); // Volver a la lista de workouts
  };

  const handleExerciseComplete = async (exerciseId: string, completedSetDetails: Set[]) => {
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
    const workoutCompleted = allExercisesInWorkout.length > 0 && allExercisesInWorkout.every(exercise => exercise.completed);

    const finalUpdatedWorkout = {
      ...updatedWorkout,
      completed: workoutCompleted
    };

    const updatedWorkoutsList = workouts.map(w =>
      w.id === selectedWorkout.id ? finalUpdatedWorkout : w
    );
    setWorkouts(updatedWorkoutsList);
    setSelectedWorkout(finalUpdatedWorkout);

    // Guardar el progreso actualizado en la base de datos
    if (user?.id) {
      try {
        console.log(`Saving exercise completion for ${exerciseId} to DB...`);
        await api.updateWorkout(user.id, finalUpdatedWorkout); // Assuming updateWorkout handles the full object
        console.log('Workout progress saved successfully to DB.');
      } catch (error) {
        console.error('Error saving workout progress to DB:', error);
      }
    } else {
      console.warn('User not logged in, cannot save exercise completion to DB.');
    }

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
    if (selectedWorkout && currentExerciseIndex !== null) {
      const allExercises = (selectedWorkout.exerciseTypes || []).flatMap(type => (type.exercises || [])).filter(ex => ex);
      const currentIndex = allExercises.findIndex(ex => ex && ex.id === currentExerciseIndex);

      if (currentIndex !== -1 && currentIndex < allExercises.length - 1) {
        const nextExercise = allExercises[currentIndex + 1];
        if (nextExercise) {
          setCurrentExercise(nextExercise.id);

          // Find the stage of the next exercise
          let nextExerciseStage = '';
          if (selectedWorkout.exerciseTypes) {
            for (const exerciseType of selectedWorkout.exerciseTypes) {
              if (exerciseType.exercises?.some(ex => ex && ex.id === nextExercise.id)) {
                nextExerciseStage = exerciseType.nameSpanish || exerciseType.name || '';
                break;
              }
            }
          }
          setCurrentExerciseStage(nextExerciseStage);
        }
      } else {
        // Al finalizar el último ejercicio, seguir con el cronómetro activo
        setCurrentExercise(null);
        // Verificar si el workout está completado para mostrar la pantalla de finalización
        const allExercisesInWorkout = allExercises.length > 0 && allExercises.every(exercise => exercise.completed);

        if (allExercisesInWorkout) {
          // La pantalla de "Rutina Completada" se mostrará automáticamente
          return;
        } else {
          setCurrentView('workoutDetail');
        }
      }
    }
  };

  const handleAddWorkout = async (workoutData: Workout | Workout[]) => {
    console.log('=== 🎯 APP.TSX - HANDLE ADD WORKOUT ===');

    const workoutsToAdd = Array.isArray(workoutData) ? workoutData : [workoutData];
    console.log('📊 Total workouts to add to main list:', workoutsToAdd.length);
    console.log('📋 Current workouts in main list before adding:', workouts.length);

    workoutsToAdd.forEach((workout, index) => {
      console.log(`=== 📅 ADDING WORKOUT ${index + 1}/${workoutsToAdd.length} TO MAIN LIST ===`);
      console.log('🆔 Workout ID:', workout.id);
      console.log('📝 Workout Name:', workout.name);
      console.log('🏷️ Workout DayId:', workout.dayId || 'NO DAYID');
      console.log('📊 Exercise Types Count:', workout.exerciseTypes?.length || 0);
      console.log('📅 Workout Date:', workout.date);
    });

    setWorkouts(currentWorkouts => {
      const isDuplicate = (existing: Workout, newWorkout: Workout) => {
        const idMatch = existing.id === newWorkout.id;
        const dayIdMatch = existing.dayId && newWorkout.dayId && existing.dayId === newWorkout.dayId;
        return idMatch || dayIdMatch;
      };

      const uniqueWorkouts = workoutsToAdd.filter(newWorkout => {
        const duplicate = currentWorkouts.some(existingWorkout => isDuplicate(existingWorkout, newWorkout));
        console.log(`🔍 Duplicate check in main list: ${duplicate ? 'DUPLICATE FOUND' : 'UNIQUE WORKOUT'}`);
        return !duplicate;
      });

      console.log('✅ Unique workouts to add:', uniqueWorkouts.length);

      if (uniqueWorkouts.length > 0) {
        console.log('🚀 UPDATING MAIN WORKOUTS LIST');
        const updatedWorkouts = [...currentWorkouts, ...uniqueWorkouts];
        console.log('📊 New total count will be:', updatedWorkouts.length);

        // Guardar en la base de datos
        if (user?.id) {
          uniqueWorkouts.forEach(async (workout) => {
            try {
              console.log('💾 Guardando workout en base de datos:', workout.name);
              await api.saveWorkout(user.id, workout);
              console.log('✅ Workout guardado en BD exitosamente');
            } catch (error) {
              console.error('❌ Error guardando workout en BD:', error);
            }
          });
        } else {
          console.warn('⚠️ No hay usuario logueado, no se puede guardar workout');
        }

        return updatedWorkouts;
      }

      return currentWorkouts;
    });
  };

  // Mostrar pantalla de login si no hay usuario autenticado
  if (!currentUser || !user) { // Check both currentUser and user state
    return <Login onLogin={handleLogin} />;
  }

  // Renderizado basado en la vista actual
  if (currentView === 'exercise' && selectedWorkout && currentExerciseIndex !== null) {
    const allExercises = (selectedWorkout.exerciseTypes || []).flatMap(type => (type.exercises || [])).filter(ex => ex);
    const exercise = allExercises.find(ex => ex && ex.id === currentExerciseIndex); // Find exercise by ID

    if (!exercise) {
      console.warn('Exercise not found, returning to workout detail');
      setCurrentExercise(null); // Reset if exercise not found
      setCurrentView('workoutDetail');
      return null;
    }

    // Get next exercise info
    let nextExerciseName = '';
    let nextExerciseStage = '';
    const currentIndex = allExercises.findIndex(ex => ex && ex.id === currentExerciseIndex);
    const nextExerciseIndex = currentIndex + 1;
    if (nextExerciseIndex < allExercises.length && allExercises[nextExerciseIndex]) {
      const nextExercise = allExercises[nextExerciseIndex];
      nextExerciseName = nextExercise.name;

      // Find the stage of the next exercise
      if (selectedWorkout.exerciseTypes) {
        for (const exerciseType of selectedWorkout.exerciseTypes) {
          if (exerciseType.exercises?.some(ex => ex && ex.id === nextExercise.id)) {
            nextExerciseStage = exerciseType.nameSpanish || exerciseType.name || '';
            break;
          }
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
          setCurrentView('workoutDetail'); // Volver a la vista de detalle del workout
          // NO cambiar isWorkoutActive ni workoutStartTime - mantener el cronómetro corriendo
        }}
        onNext={handleNextExercise}
        onEndWorkout={handleEndWorkout}
        isLast={currentIndex === allExercises.length - 1}
        totalWorkoutTime={totalWorkoutTime}
        currentStage={currentExerciseStage}
        isWorkoutActive={isWorkoutActive}
        nextExerciseName={nextExerciseName}
        nextExerciseStage={nextExerciseStage}
      />
    );
  }

  // Pantalla de finalización cuando se completan todos los ejercicios pero el cronómetro sigue activo
  if (selectedWorkout && currentExerciseIndex === null && isWorkoutActive && selectedWorkout.completed) {
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
                onClick={() => {
                  handleStartExercise(selectedWorkout); // Reinicia el cronómetro y el estado del ejercicio
                  setCurrentView('exercise'); // Asegura que se muestre la vista de ejercicio
                }}
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
        onBack={() => {
          setSelectedWorkout(null);
          setCurrentView('workoutList'); // Volver a la lista de workouts
        }}
        onUpdateWorkout={handleUpdateWorkout}
        onStartExercise={() => handleStartExercise(selectedWorkout)}
        onEndWorkout={handleEndWorkout}
        isWorkoutActive={isWorkoutActive}
        totalWorkoutTime={totalWorkoutTime}
      />
    );
  }

  // Renderizado principal basado en la vista
  switch (currentView) {
    case 'weekList':
      return (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Dumbbell className="h-8 w-8 text-blue-600" />
                  <h1 className="ml-2 text-2xl font-bold text-gray-900">GymTracker</h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Hola, {currentUser}</span>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={() => setShowChatBot(true)}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    ChatBot
                  </button>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleLogout}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Aquí se mostraría la vista de lista de semanas */}
            <WeekListView />

            {/* La lista de workouts se muestra ahora como parte de la gestión de semanas o días */}
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
    case 'weekDetail':
      // Aquí deberías pasar la semana seleccionada a WeekDetailView
      // const weekData = ... // Obtener los datos de la semana seleccionada
      return (
        <div>
          {/* Aquí se mostraría la vista de detalle de semana */}
          <WeekDetailView week={selectedWeek} onBack={() => setCurrentView('weekList')} />
        </div>
      );
    case 'workoutList': // Si se desea volver a la lista de workouts desde otra vista
      return (
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Dumbbell className="h-8 w-8 text-blue-600" />
                  <h1 className="ml-2 text-2xl font-bold text-gray-900">GymTracker</h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Hola, {currentUser}</span>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    onClick={() => setShowChatBot(true)}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    ChatBot
                  </button>
                  <button
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={handleLogout}
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    default:
      return null;
  }
}

export default App;