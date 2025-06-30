import React, { useState, useEffect } from 'react';
import { Calendar, MessageSquare, RefreshCw, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Workout, ExerciseType } from '../types';
import { ChatBot } from './ChatBot';

interface WeeklyPlan {
  id: string;
  weekStart: Date;
  workouts: Workout[];
  createdAt: Date;
  isActive: boolean;
}

interface WeeklyPlanManagerProps {
  workouts: Workout[];
  onAddWorkout: (workout: Workout) => void;
}

export function WeeklyPlanManager({ workouts, onAddWorkout }: WeeklyPlanManagerProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [showChatBot, setShowChatBot] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(getStartOfWeek(new Date()));
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load weekly plans from localStorage with comprehensive data migration and error handling
    const savedPlans = localStorage.getItem('weeklyPlans');
    if (savedPlans) {
      try {
        const parsedPlans = JSON.parse(savedPlans);
        if (!Array.isArray(parsedPlans)) {
          throw new Error('Invalid data format');
        }

        const plans = parsedPlans.map((plan: any) => {
          if (!plan || typeof plan !== 'object') {
            return null;
          }

          return {
            ...plan,
            weekStart: new Date(plan.weekStart),
            createdAt: new Date(plan.createdAt),
            workouts: (plan.workouts || []).map((workout: any) => {
              if (!workout || typeof workout !== 'object') {
                return null;
              }

              // Migrate old structure to new structure
              if (workout.exercises && !workout.exerciseTypes) {
                // Convert old exercises array to new exerciseTypes structure
                const validExercises = (workout.exercises || []).filter((ex: any) => ex && typeof ex === 'object');
                const exerciseTypes: ExerciseType[] = [
                  {
                    id: 'migrated',
                    name: 'Mixed Exercises',
                    nameSpanish: 'Ejercicios Mixtos',
                    duration: '30-45 min',
                    exercises: validExercises
                  }
                ];
                return {
                  ...workout,
                  exerciseTypes,
                  date: workout.date,
                  id: workout.id || `workout-${Date.now()}-${Math.random()}`,
                  name: workout.name || 'Entrenamiento',
                  completed: workout.completed || false
                };
              }

              // Return workout with new structure and safety checks
              const validExerciseTypes = (workout.exerciseTypes || []).map((type: any) => {
                if (!type || typeof type !== 'object') return null;
                return {
                  ...type,
                  exercises: (type.exercises || []).filter((ex: any) => ex && typeof ex === 'object')
                };
              }).filter(Boolean);

              return {
                ...workout,
                exerciseTypes: validExerciseTypes,
                date: workout.date,
                id: workout.id || `workout-${Date.now()}-${Math.random()}`,
                name: workout.name || 'Entrenamiento',
                completed: workout.completed || false
              };
            }).filter(Boolean)
          };
        }).filter(Boolean);

        setWeeklyPlans(plans);
      } catch (error) {
        console.error('Error loading plans from localStorage:', error);
        localStorage.removeItem('weeklyPlans');
        setWeeklyPlans([]);
        alert('Se encontraron datos corruptos y se han limpiado automáticamente. La aplicación debería funcionar correctamente ahora.');
      }
    }
  }, []);

  useEffect(() => {
    // Save weekly plans to localStorage
    localStorage.setItem('weeklyPlans', JSON.stringify(weeklyPlans));
  }, [weeklyPlans]);

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  function getEndOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 6);
    return d;
  }

  const getCurrentWeekPlan = (): WeeklyPlan | undefined => {
    return weeklyPlans.find(plan => 
      plan.weekStart.getTime() === currentWeek.getTime()
    );
  };

  const isWeekExpired = (weekStart: Date): boolean => {
    const weekEnd = getEndOfWeek(weekStart);
    return new Date() > weekEnd;
  };

  const canCreateNewPlan = (): boolean => {
    const currentPlan = getCurrentWeekPlan();
    if (!currentPlan) return true;
    return isWeekExpired(currentPlan.weekStart);
  };

  const calculateWorkoutDuration = (exerciseTypes: ExerciseType[]): string => {
    let minDuration = 0;
    let maxDuration = 0;

    exerciseTypes.forEach(type => {
      const match = type.duration.match(/(\d+)-(\d+)/);
      if (match) {
        minDuration += parseInt(match[1]);
        maxDuration += parseInt(match[2]);
      }
    });

    return `${minDuration}-${maxDuration} min`;
  };

  const toggleWorkoutExpansion = (workoutId: string) => {
    const newExpanded = new Set(expandedWorkouts);
    if (newExpanded.has(workoutId)) {
      newExpanded.delete(workoutId);
    } else {
      newExpanded.add(workoutId);
    }
    setExpandedWorkouts(newExpanded);
  };

  const handleWorkoutGenerated = (workout: Workout) => {
    console.log('WeeklyPlanManager receiving workout:', workout.name, 'with dayId:', workout.dayId);

    // Add to main workouts list first
    onAddWorkout(workout);
    console.log('Added workout to main list:', workout.name);

    // Update weekly plans immediately using functional state update
    setWeeklyPlans(currentPlans => {
      // Find current week plan using current state
      const currentPlan = currentPlans.find(plan => 
        plan.weekStart.getTime() === currentWeek.getTime()
      );

      if (currentPlan) {
        // Check for duplicate workouts using dayId (much more reliable)
        const workoutExists = currentPlan.workouts.some(existingWorkout => {
          // First check if both workouts have dayId - this is the primary check
          if (workout.dayId && existingWorkout.dayId) {
            console.log('🔍 Comparing dayIds:', existingWorkout.dayId, 'vs', workout.dayId);
            const isDuplicate = workout.dayId === existingWorkout.dayId;
            if (isDuplicate) {
              console.log('❌ Found duplicate dayId, skipping:', workout.dayId);
            }
            return isDuplicate;
          }
          
          // Log when dayId is missing
          if (!workout.dayId) {
            console.warn('⚠️ New workout missing dayId:', workout.name);
          }
          if (!existingWorkout.dayId) {
            console.warn('⚠️ Existing workout missing dayId:', existingWorkout.name);
          }
          
          // Fallback to name comparison only if no dayId is available for either workout
          if (!workout.dayId && !existingWorkout.dayId) {
            console.log('🔍 Comparing names (no dayId available):', existingWorkout.name, 'vs', workout.name);
            const nameMatch = existingWorkout.name === workout.name;
            if (nameMatch) {
              console.log('❌ Found duplicate name, skipping:', workout.name);
            }
            return nameMatch;
          }
          
          // If one has dayId and the other doesn't, they're different workouts
          return false;
        });

        if (!workoutExists) {
          const updatedPlans = currentPlans.map(plan => {
            if (plan.id === currentPlan.id) {
              const updatedPlan = {
                ...plan,
                workouts: [...plan.workouts, workout]
              };
              console.log('✅ Updated plan with new workout count:', updatedPlan.workouts.length);
              console.log('✅ Added workout:', workout.name, 'with dayId:', workout.dayId);
              return updatedPlan;
            }
            return plan;
          });
          console.log('✅ Successfully added workout to existing plan:', workout.name);
          console.log('✅ Total workouts in plan:', updatedPlans.find(p => p.id === currentPlan.id)?.workouts.length);
          return updatedPlans;
        } else {
          console.log('❌ Workout already exists in plan (duplicate detected):', workout.name, 'dayId:', workout.dayId);
          return currentPlans; // Return unchanged state
        }
      } else {
        // Create new plan
        const newPlan: WeeklyPlan = {
          id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          weekStart: currentWeek,
          workouts: [workout],
          createdAt: new Date(),
          isActive: true
        };
        const newPlans = [...currentPlans, newPlan];
        console.log('✅ Created new plan with workout:', workout.name, 'dayId:', workout.dayId);
        return newPlans;
      }
    });
  };

  const handleNewWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const clearCorruptedData = () => {
    localStorage.removeItem('weeklyPlans');
    setWeeklyPlans([]);
    window.location.reload();
  };

  const currentPlan = getCurrentWeekPlan();
  const weekExpired = currentPlan ? isWeekExpired(currentPlan.weekStart) : false;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Weekly Plan Manager</h2>
        </div>
        <div className="flex items-center space-x-2">
          {weekExpired && (
            <button
              onClick={handleNewWeek}
              className="flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Week
            </button>
          )}
          <button
            onClick={() => setShowChatBot(true)}
            disabled={!canCreateNewPlan() && !weekExpired}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat with AI Coach
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Current Week</h3>
          <p className="text-sm text-gray-600 mb-3">
            {currentWeek.toLocaleDateString()} - {getEndOfWeek(currentWeek).toLocaleDateString()}
          </p>

          {currentPlan ? (
            <div className="space-y-2">
              <div className="flex items-center">
                {weekExpired ? (
                  <Clock className="w-4 h-4 text-orange-500 mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                )}
                <span className="text-sm">
                  {weekExpired ? 'Week Expired - Time for new plan!' : 'Active Plan'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {currentPlan.workouts.length} workout(s) planned
              </p>
              <div className="space-y-2">
                {currentPlan.workouts.map((workout, index) => {
                  const duration = calculateWorkoutDuration(workout.exerciseTypes || []);
                  const isExpanded = expandedWorkouts.has(workout.id);

                  return (
                    <div key={workout.id} className="bg-white rounded border">
                      <div 
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleWorkoutExpansion(workout.id)}
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">
                            Day {index + 1}: {workout.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(workout.exerciseTypes || []).length} tipos • {duration}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-3">
                          {(workout.exerciseTypes || []).map((exerciseType, typeIndex) => (
                            <div key={typeIndex} className="mb-4 last:mb-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-blue-600 uppercase">
                                  {exerciseType.nameSpanish}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {exerciseType.duration}
                                </span>
                              </div>
                              <div className="space-y-1 pl-2">
                                {(exerciseType.exercises || []).map((exercise, exerciseIndex) => {
                                  const weightInfo = exercise.weight > 0 ? ` (${exercise.weight}${exercise.weightUnit})` : ' (Peso corporal)';
                                  const exerciseInfo = exercise.exerciseSubType === 'duration' 
                                    ? `${exercise.sets} sets x ${exercise.duration}s`
                                    : `${exercise.sets} sets x ${exercise.reps} reps`;
                                  return (
                                    <div key={exerciseIndex} className="text-xs text-gray-600">
                                      • {exercise.name}: {exerciseInfo}{weightInfo}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No plan for this week yet. Chat with AI to create one!
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Plan History</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {(weeklyPlans || [])
              .filter(plan => plan.weekStart.getTime() !== currentWeek.getTime())
              .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
              .slice(0, 3)
              .map((plan) => (
                <div key={plan.id} className="text-xs text-gray-600 bg-white rounded px-2 py-1">
                  <div className="font-medium">
                    {plan.weekStart.toLocaleDateString()} - {getEndOfWeek(plan.weekStart).toLocaleDateString()}
                  </div>
                  <div>{plan.workouts.length} workout(s)</div>
                </div>
              ))}
            {weeklyPlans.length === 0 && (
              <div className="text-sm text-gray-500">No previous plans</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-800">
            <strong>Estructura jerárquica:</strong> Cada entrenamiento está organizado en <strong>tipos de ejercicio</strong> (Calentamiento, Fuerza, Cardio, Estiramiento) que contienen <strong>ejercicios específicos</strong>. 
            Esta estructura permite una mejor organización y visualización del plan de entrenamiento.
            {weekExpired && " ¡Tu semana actual ha terminado - es hora de planificar la próxima semana!"}
          </p>
          <button
            onClick={clearCorruptedData}
            className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
            title="Limpiar datos corruptos si hay errores"
          >
            Reset Data
          </button>
        </div>
      </div>

      {showChatBot && (
        <ChatBot
          onWorkoutGenerated={handleWorkoutGenerated}
          onClose={() => setShowChatBot(false)}
        />
      )}
    </div>
  );
}