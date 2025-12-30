import { useState, useEffect } from 'react';
import { Calendar, MessageSquare, RefreshCw, CheckCircle, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import type { Workout, ExerciseType } from '../types';
import { ChatBot } from './ChatBot';
import { api } from '../utils/api';

interface WeeklyPlan {
  id: string;
  weekStart: Date;
  workouts: Workout[];
  createdAt: Date;
  isActive: boolean;
}

interface WeeklyPlanManagerProps {
  workouts: Workout[];
  onAddWorkout: (workout: Workout | Workout[]) => void;
  userId?: number;
  isVisible?: boolean; // Indica si el componente está visible (en la pantalla principal)
}

interface Statistics {
  totalWorkouts: number;
  completedWorkouts: number;
  activeWorkouts: number;
  completionPercentage: number;
  weeksSinceFirstRoutine: number;
  weeksWithCompletedWorkouts: number;
  weeksPercentage: number;
}

export function WeeklyPlanManager({ workouts, onAddWorkout, userId, isVisible = true }: WeeklyPlanManagerProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [showChatBot, setShowChatBot] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(getStartOfWeek(new Date()));
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loadingStatistics, setLoadingStatistics] = useState(false);

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
                  name: workout.name || 'Workout',
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
                name: workout.name || 'Workout',
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

  // Cargar estadísticas desde el backend cuando el componente está visible
  useEffect(() => {
    if (userId && isVisible) {
      setLoadingStatistics(true);
      api.getStatistics(userId)
        .then((stats: Statistics) => {
          setStatistics(stats);
          setLoadingStatistics(false);
        })
        .catch((error: any) => {
          console.error('Error loading statistics:', error);
          setLoadingStatistics(false);
        });
    }
  }, [userId, isVisible]);

  useEffect(() => {
    // Save weekly plans to localStorage
    localStorage.setItem('weeklyPlans', JSON.stringify(weeklyPlans));
  }, [weeklyPlans]);

  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Normalizar a medianoche
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes como inicio de semana
    return new Date(d.setDate(diff));
  }

  function getEndOfWeek(date: Date): Date {
    const weekStart = getStartOfWeek(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999); // Fin del día domingo
    return weekEnd;
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

  // Calcular estadísticas de la semana actual basadas en los workouts de la BD
  const calculateWeekSummary = () => {
    // Obtener inicio de la semana actual (hoy)
    const today = new Date();
    const normalizedWeekStart = getStartOfWeek(today);
    
    console.log('🔍 Calculando resumen de semana:');
    console.log('  - Total workouts recibidos:', workouts.length);
    console.log('  - Semana actual (normalizada):', normalizedWeekStart.toISOString());
    console.log('  - Workouts recibidos:', workouts.map(w => ({ 
      name: w.name, 
      date: w.date, 
      createdAt: w.createdAt 
    })));
    
    const currentWeekWorkouts = workouts.filter(workout => {
      // Usar createdAt en lugar de date para determinar la semana
      const workoutCreatedDate = workout.createdAt || workout.date;
      
      if (!workoutCreatedDate) {
        console.log('  ⚠️ Workout sin createdAt ni date:', workout.name);
        return false;
      }
      
      const workoutDate = new Date(workoutCreatedDate);
      workoutDate.setHours(0, 0, 0, 0); // Normalizar fecha del workout
      const workoutWeekStart = getStartOfWeek(workoutDate);
      
      // Comparar semanas normalizadas (usar la semana actual de hoy)
      const matches = workoutWeekStart.getTime() === normalizedWeekStart.getTime();
      
      if (matches) {
        console.log('  ✅ Workout incluido:', workout.name, 'createdAt:', workoutCreatedDate, 'WeekStart:', workoutWeekStart.toISOString());
      } else {
        console.log('  ❌ Workout excluido:', workout.name, 'createdAt:', workoutCreatedDate, 'WeekStart:', workoutWeekStart.toISOString());
      }
      
      return matches;
    });
    
    console.log('  - Workouts de la semana actual:', currentWeekWorkouts.length);

    const totalWorkouts = currentWeekWorkouts.length;
    const completedWorkouts = currentWeekWorkouts.filter(w => w.completed).length;
    const totalExercises = currentWeekWorkouts.reduce((total, workout) => {
      return total + (workout.exerciseTypes || []).reduce((typeTotal, type) => {
        return typeTotal + (type.exercises || []).length;
      }, 0);
    }, 0);
    
    const totalEstimatedDuration = currentWeekWorkouts.reduce((total, workout) => {
      return total + (workout.estimatedDuration || 0);
    }, 0);

    const exerciseTypesCount = currentWeekWorkouts.reduce((total, workout) => {
      return total + (workout.exerciseTypes || []).length;
    }, 0);

    return {
      totalWorkouts,
      completedWorkouts,
      pendingWorkouts: totalWorkouts - completedWorkouts,
      totalExercises,
      totalEstimatedDuration,
      exerciseTypesCount,
      workouts: currentWeekWorkouts
    };
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

  const handleWorkoutGenerated = (workoutData: Workout | Workout[]) => {
    console.log('=== 🚀 WEEKLY PLAN MANAGER - INICIANDO IMPORTACIÓN ===');
    
    // Determinar si es un workout único o un array de workouts
    const workoutsToProcess = Array.isArray(workoutData) ? workoutData : [workoutData];
    
    console.log('📊 Total de workouts recibidos:', workoutsToProcess.length);
    console.log('📋 Workouts recibidos:', workoutsToProcess.map(w => `"${w.name}" (${w.dayId || 'NO DAYID'})`));
    
    // Add ALL workouts to main list FIRST using the array
    console.log('⚡ ENVIANDO TODOS LOS WORKOUTS A APP.TSX...');
    onAddWorkout(workoutData); // Pass original data (single or array)
    console.log('✅ WORKOUTS ENVIADOS A APP.TSX');
    
    // Then process each workout for weekly plans
    workoutsToProcess.forEach((workout, index) => {
      console.log(`=== 📅 PROCESANDO WORKOUT ${index + 1}/${workoutsToProcess.length} PARA PLAN SEMANAL ===`);
      console.log('📅 Workout:', workout.name);
      console.log('🆔 DayId:', workout.dayId || 'SIN DAYID');
      console.log('📊 Tipos de ejercicio:', workout.exerciseTypes?.length || 0);
      console.log('🗓️ Semana actual:', currentWeek.toLocaleDateString());

    // Update weekly plans using functional state update to avoid race conditions
      setWeeklyPlans(currentPlans => {
        console.log(`=== 📋 ACTUALIZANDO PLANES SEMANALES PARA WORKOUT ${index + 1} ===`);
        console.log('📅 Total planes existentes:', currentPlans.length);
        
        // Find current week plan using current state
        const currentPlan = currentPlans.find(plan => 
          plan.weekStart.getTime() === currentWeek.getTime()
        );

        console.log('🔍 Plan de semana actual encontrado:', !!currentPlan);
        if (currentPlan) {
          console.log('📊 Workouts existentes en plan actual:', currentPlan.workouts.length);
          currentPlan.workouts.forEach((w, idx) => {
            console.log(`   • Workout ${idx + 1}: "${w.name}" (dayId: ${w.dayId || 'SIN DAYID'})`);
          });
        }

        if (currentPlan) {
          console.log('=== 🔍 VERIFICANDO DUPLICADOS EN PLAN SEMANAL ===');
          
          // Check for duplicates using both ID and dayId to ensure accuracy
          const workoutExists = currentPlan.workouts.some(existingWorkout => {
            const idMatch = workout.id === existingWorkout.id;
            const dayIdMatch = workout.dayId && existingWorkout.dayId && workout.dayId === existingWorkout.dayId;
            console.log(`🔍 Comparando: ID(${idMatch}) DayId(${dayIdMatch}) - "${existingWorkout.name}" vs "${workout.name}"`);
            return idMatch || dayIdMatch;
          });

          console.log(`🎯 Resultado de verificación: ${workoutExists ? 'DUPLICADO ENCONTRADO' : 'WORKOUT ÚNICO'}`);

          if (!workoutExists) {
            console.log('=== ✅ AGREGANDO WORKOUT AL PLAN SEMANAL ===');
            
            const updatedWorkouts = [...currentPlan.workouts, workout];
            const updatedPlan = {
              ...currentPlan,
              workouts: updatedWorkouts
            };

            const updatedPlans = currentPlans.map(plan => 
              plan.id === currentPlan.id ? updatedPlan : plan
            );

            console.log('📊 Plan semanal actualizado exitosamente:');
            console.log(`   • Total workouts en plan: ${updatedWorkouts.length}`);
            updatedWorkouts.forEach((w, idx) => {
              console.log(`   • Workout ${idx + 1}: "${w.name}" (dayId: ${w.dayId || 'SIN DAYID'})`);
            });

            console.log(`=== ✅ ACTUALIZACIÓN DE PLAN SEMANAL COMPLETADA PARA WORKOUT ${index + 1} ===`);
            return updatedPlans;
          } else {
            console.log('=== ⚠️ WORKOUT YA EXISTE EN PLAN SEMANAL - SALTANDO ===');
            return currentPlans; // Return unchanged state
          }
        } else {
          console.log('=== 🆕 CREANDO NUEVO PLAN SEMANAL ===');
          
          const newPlan: WeeklyPlan = {
            id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            weekStart: currentWeek,
            workouts: [workout],
            createdAt: new Date(),
            isActive: true
          };
          
          const newPlans = [...currentPlans, newPlan];
          
          console.log('✅ Nuevo plan semanal creado exitosamente:');
          console.log(`   • ID del plan: ${newPlan.id}`);
          console.log(`   • Semana: ${newPlan.weekStart.toLocaleDateString()}`);
          console.log(`   • Primer workout: "${workout.name}" (dayId: ${workout.dayId || 'SIN DAYID'})`);
          console.log('=== ✅ CREACIÓN DE PLAN COMPLETADA ===');
          
          return newPlans;
        }
      });
    });

    console.log('=== ✅ IMPORTACIÓN DE TODOS LOS WORKOUTS COMPLETADA ===');
  };

  const handleNewWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const currentPlan = getCurrentWeekPlan();
  const weekExpired = currentPlan ? isWeekExpired(currentPlan.weekStart) : false;

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
      <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 flex-wrap">
        <div className="flex items-center min-w-0 flex-shrink">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 mr-1 sm:mr-2 flex-shrink-0" />
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-800 whitespace-nowrap">Weekly Plan Manager</h2>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {weekExpired && (
            <button
              onClick={handleNewWeek}
              className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden xs:inline sm:inline">New Week</span>
            </button>
          )}
          <button
            onClick={() => setShowChatBot(true)}
            className="flex items-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
          >
            <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1 md:mr-2" />
            <span className="hidden sm:inline">Chat with AI Coach</span>
            <span className="sm:hidden">Chat</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Current Week</h3>
          <p className="text-sm text-gray-600 mb-3">
            {getStartOfWeek(new Date()).toLocaleDateString()} - {getEndOfWeek(new Date()).toLocaleDateString()}
          </p>

          {(() => {
            const weekSummary = calculateWeekSummary();
            const completionPercentage = weekSummary.totalWorkouts > 0 
              ? Math.round((weekSummary.completedWorkouts / weekSummary.totalWorkouts) * 100) 
              : 0;
            
            return weekSummary.totalWorkouts > 0 ? (
              <div className="space-y-3">
                {/* Resumen de estadísticas */}
                <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-sm mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Week Summary</h4>
                  
                  {/* Main statistics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{weekSummary.totalWorkouts}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">Total Workouts</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{weekSummary.completedWorkouts}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">✅ Completed</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-600">{weekSummary.pendingWorkouts}</div>
                      <div className="text-xs text-gray-600 font-medium mt-1">⏳ Pending</div>
                    </div>
                  </div>
                  
                  {/* Completion percentage highlight */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-3">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800 mb-1">{completionPercentage}%</div>
                      <div className="text-sm text-gray-600 font-medium">Completed this week</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300 shadow-sm"
                        style={{ width: `${completionPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Additional information */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Exercises:</span>
                      <span className="font-semibold text-gray-800">{weekSummary.totalExercises}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Estimated time:</span>
                      <span className="font-semibold text-gray-800">{weekSummary.totalEstimatedDuration} min</span>
                    </div>
                  </div>
                </div>

                {/* Workouts list */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">This week's workouts:</h4>
                  {weekSummary.workouts.map((workout, index) => {
                    const duration = calculateWorkoutDuration(workout.exerciseTypes || []);
                    const workoutId = workout.id || `workout-${index}-${workout.name || 'unnamed'}`;
                    const isExpanded = expandedWorkouts.has(workoutId);
                    const workoutKey = workoutId;
                    const exerciseCount = (workout.exerciseTypes || []).reduce((total, type) => {
                      return total + (type.exercises || []).length;
                    }, 0);
                    const isCompleted = workout.completed;

                    return (
                      <div 
                        key={workoutKey} 
                        className={`bg-white rounded-lg border-2 transition-all ${
                          isCompleted 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <div 
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-opacity-50"
                          onClick={() => toggleWorkoutExpansion(workoutId)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {/* Indicador de estado */}
                            <div className="flex-shrink-0">
                              {isCompleted ? (
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                  <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
                                  <Circle className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Información del workout */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`text-sm font-semibold ${
                                  isCompleted ? 'text-green-800' : 'text-gray-800'
                                }`}>
                                  {workout.name || `Workout ${index + 1}`}
                                </div>
                                {isCompleted && (
                                  <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                    Completed
                                  </span>
                                )}
                                {!isCompleted && (
                                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-medium">
                                    Pending
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">{exerciseCount}</span> exercises
                                </span>
                                <span>•</span>
                                <span>{duration}</span>
                                {workout.estimatedDuration && (
                                  <>
                                    <span>•</span>
                                    <span>{workout.estimatedDuration} min</span>
                                  </>
                                )}
                              </div>
                              {workout.date && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(workout.date).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    day: 'numeric', 
                                    month: 'short' 
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Botón expandir */}
                          <div className="flex-shrink-0 ml-2">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-gray-50 p-3">
                          {(workout.exerciseTypes || []).map((exerciseType, typeIndex) => {
                            const exerciseTypeKey = exerciseType.id || `exerciseType-${workoutKey}-${typeIndex}`;
                            return (
                              <div key={exerciseTypeKey} className="mb-4 last:mb-0">
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
                                    const weightInfo = exercise.weight > 0 ? ` (${exercise.weight}${exercise.weightUnit})` : ' (Bodyweight)';
                                    const exerciseInfo = exercise.exerciseSubType === 'duration' 
                                      ? `${exercise.sets} sets x ${exercise.duration}s`
                                      : `${exercise.sets} sets x ${exercise.reps} reps`;
                                    const exerciseKey = exercise.id || `exercise-${exerciseTypeKey}-${exerciseIndex}`;
                                    return (
                                      <div key={exerciseKey} className="text-xs text-gray-600">
                                        • {exercise.name}: {exerciseInfo}{weightInfo}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            ) : (
              <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                <div className="text-gray-400 mb-2">
                  <Calendar className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  No workouts for this week
                </p>
                <p className="text-xs text-gray-500">
                  Chat with the AI Coach to create your weekly routine
                </p>
              </div>
            );
          })()}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-3">Plan History</h3>
          {loadingStatistics ? (
            <div className="text-sm text-gray-500">Loading statistics...</div>
          ) : statistics ? (
            <div className="space-y-3">
              {/* # Workouts */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1"># Workouts</div>
                <div className="text-2xl font-bold text-gray-800">{statistics.totalWorkouts}</div>
              </div>

              {/* % Number of Workouts Completed */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">% Workouts Completed</div>
                <div className="text-2xl font-bold text-green-600">{statistics.completionPercentage}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {statistics.completedWorkouts} of {statistics.activeWorkouts} workouts
                </div>
              </div>

              {/* % Workout Weeks */}
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">% Weeks with Completed Workouts</div>
                <div className="text-2xl font-bold text-blue-600">{statistics.weeksPercentage}%</div>
                <div className="text-xs text-gray-500 mt-1">
                  {statistics.weeksWithCompletedWorkouts} of {statistics.weeksSinceFirstRoutine} weeks
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No statistics available</div>
          )}
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