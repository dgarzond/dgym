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
  isWorkoutActive
}: ExerciseScreenProps) {
  // Crear clave única para el progreso del ejercicio
  const exerciseProgressKey = `gymTracker_exercise_${exercise.id}`;

  // Cargar progreso guardado o usar valores por defecto
  const [currentSet, setCurrentSet] = useState(() => {
    try {
      const saved = localStorage.getItem(exerciseProgressKey);
      if (saved) {
        const progress = JSON.parse(saved);
        return progress.currentSet || 0;
      }
    } catch (error) {
      console.error('Error loading exercise progress:', error);
    }
    return 0;
  });

  const [setDetails, setSetDetails] = useState<Set[]>(() => {
    try {
      const saved = localStorage.getItem(exerciseProgressKey);
      if (saved) {
        const progress = JSON.parse(saved);
        return progress.setDetails || exercise.setDetails || [];
      }
    } catch (error) {
      console.error('Error loading exercise progress:', error);
    }
    return exercise.setDetails || [];
  });

  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(exercise.restTime || 60);
  const [exerciseStartTime, setExerciseStartTime] = useState<number>(Date.now());

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
  const [timer, setTimer] = useState(0);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(exercise.weightUnit || 'kg');
  const [currentWeight, setCurrentWeight] = useState(exercise.weight || 0);

  // Reset state when exercise changes
  useEffect(() => {
    setCurrentSet(0);
    setTimer(0);
    setIsResting(false);
    setRestTimer(exercise.restTime || 60);

    // Initialize setDetails if empty or incomplete
    const initialSetDetails = exercise.setDetails && exercise.setDetails.length > 0 
      ? exercise.setDetails 
      : Array.from({ length: exercise.sets }, (_, index) => ({
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

    // Reset to first uncompleted set
    const firstUncompletedSet = initialSetDetails.findIndex(set => !set.completed);
    if (firstUncompletedSet !== -1) {
      setCurrentSet(firstUncompletedSet);
    }
  }, [exercise.id]);

  useEffect(() => {
    let interval: number | undefined;
    if (!isResting) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isResting]);

  useEffect(() => {
    let interval: number | undefined;
    if (isResting && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => prev - 1);
      }, 1000);
    } else if (isResting && restTimer === 0) {
      setIsResting(false);
      setRestTimer(exercise.restTime || 60);

      // Si estamos en la última serie y acabamos de terminar el descanso, completar el ejercicio
      if (currentSet === exercise.sets - 1 && setDetails[currentSet]?.completed) {
        clearExerciseProgress();
        // Verificar que todos los sets estén completados antes de finalizar
        const allSetsCompleted = setDetails.every(set => set.completed);
        if (allSetsCompleted) {
          onComplete(exercise.id, setDetails);
        }
      }
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer, currentSet, exercise.sets, setDetails, exercise.id, onComplete, clearExerciseProgress]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationInSeconds = (duration: number, unit: 'seconds' | 'minutes' = 'seconds') => {
    return unit === 'minutes' ? duration * 60 : duration;
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

  const handleSetComplete = (actualReps?: number, actualWeight?: number, actualDuration?: number) => {
    const newSetDetails = [...setDetails];

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

    // Siempre ir al descanso después de completar un set (excepto si es el último ejercicio y último set)
    const isLastSet = currentSet === exercise.sets - 1;
    
    if (!isLastSet) {
      // No es la última serie, ir al descanso y luego al siguiente set
      setIsResting(true);
      setRestTimer(exercise.restTime || 60);
      setCurrentSet(prev => prev + 1);
    } else {
      // Es la última serie, ir al descanso antes de completar el ejercicio
      setIsResting(true);
      setRestTimer(exercise.restTime || 60);
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
            Back
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
              <button
                onClick={() => {
                  setIsResting(false);
                  setRestTimer(exercise.restTime || 60);

                  // Si estamos en la última serie, completar el ejercicio
                  if (currentSet === exercise.sets - 1 && setDetails[currentSet]?.completed) {
                    clearExerciseProgress();
                    onComplete(exercise.id, setDetails);
                  }
                }}
                className="flex items-center mx-auto text-blue-600 hover:text-blue-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Skip Rest
              </button>
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