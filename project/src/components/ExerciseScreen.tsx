import React, { useState, useEffect } from 'react';
import { Timer, ArrowLeft, ArrowRight, RotateCcw, Scale } from 'lucide-react';
import type { Exercise, Set } from '../types';
import { kgToLbs, lbsToKg } from '../types';

interface ExerciseScreenProps {
  exercise: Exercise;
  onComplete: (exerciseId: string, setDetails: Set[]) => void;
  onBack: () => void;
  onNext: () => void;
  onEndWorkout: () => void;
  isLast: boolean;
  totalWorkoutTime: number;
  currentStage: string;
  isWorkoutActive: boolean;
  nextExerciseName?: string;
  nextExerciseStage?: string;
}

export function ExerciseScreen({ 
  exercise, 
  onComplete, 
  onBack, 
  onNext, 
  onEndWorkout,
  isLast, 
  totalWorkoutTime, 
  currentStage,
  isWorkoutActive,
  nextExerciseName,
  nextExerciseStage
}: ExerciseScreenProps) {
  // Crear clave única para el progreso del ejercicio
  const exerciseProgressKey = `gymTracker_exercise_${exercise.id}`;

  // Inicializar estado con valores del ejercicio (sin cargar progreso previo)
  const [currentSet, setCurrentSet] = useState(0);

  const [setDetails, setSetDetails] = useState<Set[]>(() => {
    // Siempre usar los datos frescos del ejercicio, no cargar progreso previo
    return exercise.setDetails || [];
  });

  const [timer, setTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(exercise.restTime || 60);
  const [exerciseStartTime, setExerciseStartTime] = useState<number>(Date.now());
  const [restStartTime, setRestStartTime] = useState<number | null>(null);

  // Timer de trabajo para ejercicios por tiempo (subtype time/seconds/minutes/duration)
  const [isWorkTimerActive, setIsWorkTimerActive] = useState(false);
  const [workTimerRemaining, setWorkTimerRemaining] = useState(0);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [workDurationTotalSeconds, setWorkDurationTotalSeconds] = useState(0);

  // Guardar progreso en localStorage
  useEffect(() => {
    try {
      const progress = {
        currentSet,
        setDetails,
        lastUpdated: Date.now()
      };
      localStorage.setItem(exerciseProgressKey, JSON.stringify(progress));
    } catch (error) {
      console.error('Error saving exercise progress:', error);
    }
  }, [currentSet, setDetails, exerciseProgressKey]);

  // Limpiar progreso cuando se completa el ejercicio
  const clearExerciseProgress = () => {
    try {
      localStorage.removeItem(exerciseProgressKey);
    } catch (error) {
      console.error('Error clearing exercise progress:', error);
    }
  };

  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(exercise.weightUnit || 'kg');
  const [currentWeight, setCurrentWeight] = useState(exercise.weight || 0);

  // Reset state when exercise changes
  useEffect(() => {
    if (!exercise) return;
    
    // Initialize setDetails if empty or incomplete
    const initialSetDetails = exercise.setDetails && exercise.setDetails.length > 0 
      ? exercise.setDetails 
      : Array.from({ length: exercise.sets || 1 }, (_, index) => ({
          id: `set-${exercise.id}-${index}`,
          set: index + 1,
          reps: exercise.reps || 10,
          duration: exercise.duration || 30,
          durationUnit: exercise.durationUnit || 'seconds',
          weight: exercise.weight || 0,
          completed: false,
          weightUnit: exercise.weightUnit || 'kg'
        }));

    setSetDetails(initialSetDetails);
    setWeightUnit(exercise.weightUnit || 'kg');
    setCurrentWeight(exercise.weight || 0);

    // Siempre empezar desde el primer set en una nueva sesión
    setCurrentSet(0);

    // Reset all timers and states with system time
    setTimer(0);
    setExerciseStartTime(Date.now());
    setIsResting(false);
    setRestTimer(exercise.restTime || 60);
    setRestStartTime(null);
    setIsWorkTimerActive(false);
    setWorkTimerRemaining(0);
    setWorkStartTime(null);
    setWorkDurationTotalSeconds(0);
  }, [exercise?.id]);

  // Timer de ejercicio basado en tiempo del sistema
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (!isResting) {
      const updateExerciseTimer = () => {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - exerciseStartTime) / 1000);
        setTimer(elapsedTime);
      };

      // Actualizar inmediatamente
      updateExerciseTimer();

      // Actualizar cada segundo
      interval = setInterval(updateExerciseTimer, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isResting, exerciseStartTime]);

  // Timer de descanso basado en tiempo del sistema
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isResting && restStartTime) {
      const updateRestTimer = () => {
        const currentTime = Date.now();
        const elapsedRestTime = Math.floor((currentTime - restStartTime) / 1000);
        const remainingTime = Math.max(0, (exercise.restTime || 60) - elapsedRestTime);
        
        setRestTimer(remainingTime);
        
        if (remainingTime <= 0) {
          handleRestComplete();
        }
      };

      // Actualizar inmediatamente
      updateRestTimer();

      // Actualizar cada segundo
      interval = setInterval(updateRestTimer, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isResting, restStartTime, exercise.restTime]);

  // Timer de trabajo (cuenta atrás) para ejercicios por tiempo: al llegar a 0 → completar set y pasar a descanso
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWorkTimerActive && workStartTime !== null && workDurationTotalSeconds > 0) {
      const updateWorkTimer = () => {
        const elapsed = Math.floor((Date.now() - workStartTime!) / 1000);
        const remaining = Math.max(0, workDurationTotalSeconds - elapsed);
        setWorkTimerRemaining(remaining);

        if (remaining <= 0) {
          setIsWorkTimerActive(false);
          setWorkStartTime(null);
          setWorkTimerRemaining(0);
          handleSetComplete(undefined, currentWeight, workDurationTotalSeconds);
        }
      };

      updateWorkTimer();
      interval = setInterval(updateWorkTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkTimerActive, workStartTime, workDurationTotalSeconds]);

  // Función para manejar el final del descanso
  const handleRestComplete = () => {
    setIsResting(false);
    setRestTimer(exercise.restTime || 60);
    setRestStartTime(null);
    
    // Reset exercise timer when resuming from rest
    setExerciseStartTime(Date.now());

    // Si acabamos de completar la última serie, terminar el ejercicio
    if (currentSet >= exercise.sets - 1 && setDetails[currentSet]?.completed) {
      clearExerciseProgress();
      onComplete(exercise.id, setDetails);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationInSeconds = (duration: number, unit: 'seconds' | 'minutes' = 'seconds') => {
    return unit === 'minutes' ? duration * 60 : duration;
  };

  // Ejercicios por tiempo: subtype en { time, seconds, minutes, duration } muestran contador antes del descanso
  const isTimeBasedSubType = (): boolean => {
    const sub = exercise.exerciseSubType?.toLowerCase?.();
    return sub === 'duration' || sub === 'time' || sub === 'seconds' || sub === 'minutes';
  };

  const getCurrentSetDurationSeconds = (): number => {
    const duration = setDetails[currentSet]?.duration ?? exercise.duration ?? 30;
    const unit = (setDetails[currentSet] as Set & { durationUnit?: string })?.durationUnit ?? exercise.durationUnit ?? 'seconds';
    return getDurationInSeconds(Number(duration), unit === 'minutes' ? 'minutes' : 'seconds');
  };

  const formatDuration = (duration: number, unit: 'seconds' | 'minutes' = 'seconds') => {
    if (unit === 'minutes') {
      return `${duration} min`;
    }
    return `${duration}s`;
  };

  const handleWeightUnitToggle = () => {
    const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
    const newWeight = weightUnit === 'kg' ? kgToLbs(currentWeight) : lbsToKg(currentWeight);
    setWeightUnit(newUnit);
    setCurrentWeight(newWeight);
  };

  const handleStartWorkTimer = () => {
    const totalSeconds = getCurrentSetDurationSeconds();
    setWorkDurationTotalSeconds(totalSeconds);
    setWorkTimerRemaining(totalSeconds);
    setWorkStartTime(Date.now());
    setIsWorkTimerActive(true);
  };

  const handleSetComplete = (actualReps?: number, actualWeight?: number, actualDuration?: number) => {
    const newSetDetails = [...setDetails];

    // Completar el set actual
    if (exercise.exerciseSubType === 'duration') {
      newSetDetails[currentSet] = {
        ...newSetDetails[currentSet],
        completed: true,
        actualDuration: actualDuration || exercise.duration,
        actualWeight: actualWeight || currentWeight,
        weightUnit: weightUnit,
      };
    } else {
      newSetDetails[currentSet] = {
        ...newSetDetails[currentSet],
        completed: true,
        actualReps: actualReps || exercise.reps,
        actualWeight: actualWeight || currentWeight,
        weightUnit: weightUnit,
      };
    }

    setSetDetails(newSetDetails);
    
    const isLastSet = currentSet >= exercise.sets - 1;

    // Siempre iniciar el descanso después de completar un set (incluso el último)
    setIsResting(true);
    setRestTimer(exercise.restTime || 60);
    setRestStartTime(Date.now());

    // Si NO es la última serie, avanzar al siguiente set después de un pequeño delay
    if (!isLastSet) {
      setTimeout(() => {
        setCurrentSet(prev => prev + 1);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-blue-600 flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a Rutina
          </button>
          <div className="text-center">
            {currentStage && (
              <div className="text-sm font-medium text-blue-600 mb-1">
                Parte de rutina: {currentStage}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{exercise.name}</h1>
          </div>
          <div className="w-20" />
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Timer className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-lg">Total Workout: {formatTime(totalWorkoutTime)}</span>
            </div>
            <span className="text-lg font-medium">
              Set {currentSet + 1} of {exercise.sets}
            </span>
          </div>

          {isResting ? (
            <div className="text-center p-8 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Rest Time</h2>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {formatTime(restTimer)}
              </div>
              
              {/* Mostrar próximo ejercicio si es la última serie y no es el último ejercicio */}
              {currentSet >= exercise.sets - 1 && !isLast && nextExerciseName && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm font-medium text-green-700 mb-1">
                    Próximo ejercicio:
                  </div>
                  <div className="text-lg font-bold text-green-800 mb-1">
                    {nextExerciseName}
                  </div>
                  {nextExerciseStage && (
                    <div className="text-sm text-green-600">
                      Parte: {nextExerciseStage}
                    </div>
                  )}
                </div>
              )}

              {/* Mostrar mensaje si es el último ejercicio */}
              {currentSet >= exercise.sets - 1 && isLast && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm font-medium text-yellow-700 mb-1">
                    ¡Último ejercicio completado!
                  </div>
                  <div className="text-lg font-bold text-yellow-800">
                    Rutina finalizada 🎉
                  </div>
                </div>
              )}

              <button
                onClick={handleRestComplete}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Saltar Descanso
              </button>
            </div>
          ) : isTimeBasedSubType() && isWorkTimerActive ? (
            <div className="text-center p-8 bg-amber-50 rounded-lg border-2 border-amber-200">
              <h2 className="text-xl font-semibold mb-4 text-amber-800">Tiempo del ejercicio</h2>
              <div className="text-4xl font-bold text-amber-600 mb-4">
                {formatTime(workTimerRemaining)}
              </div>
              <p className="text-sm text-amber-700 mb-4">
                Mantén el ejercicio hasta que termine el contador. Luego pasarás al descanso.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsWorkTimerActive(false);
                  setWorkStartTime(null);
                  setWorkTimerRemaining(0);
                  handleSetComplete(undefined, currentWeight, workDurationTotalSeconds);
                }}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center mx-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Completar y pasar a descanso
              </button>
            </div>
          ) : isTimeBasedSubType() ? (
            <div className="space-y-6">
              <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                <div className="flex items-center">
                  <Timer className="w-5 h-5 text-amber-600 mr-2" />
                  <span className="font-medium text-amber-800">Ejercicio por tiempo</span>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  Pulsa &quot;Empezar con el tiempo&quot; y mantén el ejercicio durante el tiempo indicado. Al terminar el contador irás al descanso.
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <h3 className="text-lg font-medium mb-2">Duración del set</h3>
                <p className="text-3xl font-bold text-amber-600 mb-6">
                  {getCurrentSetDurationSeconds() >= 60
                    ? `${Math.floor(getCurrentSetDurationSeconds() / 60)}:${String(getCurrentSetDurationSeconds() % 60).padStart(2, '0')} min`
                    : `${getCurrentSetDurationSeconds()} segundos`}
                </p>
                <button
                  type="button"
                  onClick={handleStartWorkTimer}
                  className="w-full py-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-lg font-medium"
                >
                  ⏱️ Empezar con el tiempo
                </button>
                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⏳ Después del tiempo: descanso de <span className="font-medium">{exercise.restTime || 60} segundos</span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Indicador del tipo de ejercicio */}
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <div className="flex items-center">
                  <Timer className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-800">
                    {exercise.exerciseSubType === 'duration' 
                      ? `Ejercicio por tiempo/distancia`
                      : `Ejercicio por repeticiones`
                    }
                  </span>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {exercise.exerciseSubType === 'duration' 
                    ? `Mantén la actividad durante el tiempo/distancia especificado`
                    : `Completa el número de repeticiones indicado`
                  }
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Objetivo del Set</h3>
                <div className="grid grid-cols-2 gap-4">
                  {exercise.exerciseSubType === 'duration' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {exercise.durationUnit === 'meters' ? '🏃‍♂️ Distancia (metros)' : 
                         exercise.durationUnit === 'kilometers' ? '🏃‍♂️ Distancia (kilómetros)' :
                         exercise.durationUnit === 'minutes' ? '⏱️ Duración (minutos)' : '⏱️ Duración (segundos)'}
                      </label>
                      <input
                        type="number"
                        defaultValue={exercise.duration || setDetails[currentSet]?.duration || 30}
                        min="1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-lg"
                        id="duration-input"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        🔢 Repeticiones
                      </label>
                      <input
                        type="number"
                        defaultValue={exercise.reps || 10}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-lg"
                        id="reps-input"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      💪 Peso ({weightUnit})
                      <button
                        onClick={handleWeightUnitToggle}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <Scale className="w-4 h-4 inline" />
                      </button>
                    </label>
                    <input
                      type="number"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 text-lg"
                    />
                  </div>
                </div>

                {/* Información del descanso */}
                <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⏳ Tiempo de descanso después del set: <span className="font-medium">{exercise.restTime || 60} segundos</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (exercise.exerciseSubType === 'duration') {
                    const durationInput = document.getElementById('duration-input') as HTMLInputElement;
                    handleSetComplete(undefined, currentWeight, Number(durationInput.value));
                  } else {
                    const repsInput = document.getElementById('reps-input') as HTMLInputElement;
                    handleSetComplete(Number(repsInput.value), currentWeight);
                  }
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                {exercise.exerciseSubType === 'duration' 
                  ? '✅ Completar Tiempo/Distancia'
                  : '✅ Completar Repeticiones'
                }
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex space-x-2">
            {Array.from({ length: exercise.sets || 1 }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  setDetails[index] && setDetails[index].completed
                    ? 'bg-green-500'
                    : index === currentSet
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          {setDetails.every(set => set.completed) && setDetails.length > 0 && (
            <button
              onClick={onNext}
              className="flex items-center text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {isLast ? 'Finish Workout' : 'Next Exercise'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}