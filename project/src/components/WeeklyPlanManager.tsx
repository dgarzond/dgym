
import React, { useState, useEffect } from 'react';
import { Calendar, MessageSquare, RefreshCw, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Workout } from '../types';
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

interface WorkoutSection {
  name: string;
  exercises: string[];
  duration?: string;
}

export function WeeklyPlanManager({ workouts, onAddWorkout }: WeeklyPlanManagerProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [showChatBot, setShowChatBot] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(getStartOfWeek(new Date()));
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load weekly plans from localStorage
    const savedPlans = localStorage.getItem('weeklyPlans');
    if (savedPlans) {
      const plans = JSON.parse(savedPlans).map((plan: any) => ({
        ...plan,
        weekStart: new Date(plan.weekStart),
        createdAt: new Date(plan.createdAt),
        workouts: plan.workouts.map((workout: any) => ({
          ...workout,
          date: workout.date
        }))
      }));
      setWeeklyPlans(plans);
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

  const parseWorkoutSections = (workout: Workout): WorkoutSection[] => {
    const sections: WorkoutSection[] = [];
    const exercises = workout.exercises;
    
    // Group exercises by section based on exercise names and patterns
    const warmupExercises: string[] = [];
    const powerExercises: string[] = [];
    const cardioExercises: string[] = [];
    const stretchExercises: string[] = [];
    
    exercises.forEach(exercise => {
      const name = exercise.name.toLowerCase();
      const formattedExercise = `${exercise.name}: ${exercise.sets} sets of ${exercise.reps} reps`;
      
      // Warm-up section (English and Spanish) - more specific patterns
      if (name.includes('warm') || name.includes('calentamiento') || 
          name.includes('rollo de espalda') || name.includes('back roll') ||
          name.includes('círculo') || name.includes('circle') ||
          name.includes('rotación') || name.includes('rotation') ||
          name.includes('balanceo') || name.includes('swing') ||
          name.includes('lunges laterales') || name.includes('lateral lunge') ||
          name.includes('estiramiento de flexores') || name.includes('hip flexor stretch') ||
          (name.includes('stretch') && name.includes('flexor'))) {
        warmupExercises.push(formattedExercise);
      } 
      // Cardio section (English and Spanish) - more specific patterns
      else if (name.includes('cardio') || name.includes('cardiovascular') || 
               name.includes('bike') || name.includes('bicicleta') || 
               name.includes('treadmill') || name.includes('cinta') ||
               name.includes('elliptical') || name.includes('elíptica') || 
               name.includes('swimming') || name.includes('natación') || 
               name.includes('caminata') || name.includes('walk') || 
               name.includes('correr') || name.includes('running') ||
               name.includes('minutos de cardio') || name.includes('minutes of cardio') ||
               name.includes('bajo impacto') || name.includes('low impact')) {
        cardioExercises.push(formattedExercise);
      } 
      // Stretch section (English and Spanish) - more specific patterns
      else if (name.includes('estiramiento') || name.includes('stretch') || 
               name.includes('cool') || name.includes('enfriamiento') || 
               name.includes('foam') || name.includes('rodillo') ||
               name.includes('relajación') || name.includes('flexibilidad') ||
               name.includes('estiramientos enfocados') || name.includes('focused stretch') ||
               name.includes('espalda baja') || name.includes('lower back')) {
        stretchExercises.push(formattedExercise);
      } 
      // Power section (strength exercises)
      else {
        powerExercises.push(formattedExercise);
      }
    });

    if (warmupExercises.length > 0) {
      sections.push({ name: 'Calentamiento', exercises: warmupExercises, duration: '5-10 min' });
    }
    
    if (powerExercises.length > 0) {
      sections.push({ name: 'Fuerza', exercises: powerExercises, duration: '20-30 min' });
    }
    
    if (cardioExercises.length > 0) {
      sections.push({ name: 'Cardio', exercises: cardioExercises, duration: '15-25 min' });
    }
    
    if (stretchExercises.length > 0) {
      sections.push({ name: 'Estiramiento', exercises: stretchExercises, duration: '5-10 min' });
    }

    return sections;
  };

  const calculateWorkoutDuration = (sections: WorkoutSection[]): string => {
    let minDuration = 0;
    let maxDuration = 0;
    
    sections.forEach(section => {
      if (section.duration) {
        const match = section.duration.match(/(\d+)-(\d+)/);
        if (match) {
          minDuration += parseInt(match[1]);
          maxDuration += parseInt(match[2]);
        }
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
    const currentPlan = getCurrentWeekPlan();
    
    if (currentPlan) {
      // Add to existing plan
      const updatedPlan = {
        ...currentPlan,
        workouts: [...currentPlan.workouts, workout]
      };
      setWeeklyPlans(plans => 
        plans.map(plan => 
          plan.id === currentPlan.id ? updatedPlan : plan
        )
      );
    } else {
      // Create new plan
      const newPlan: WeeklyPlan = {
        id: Date.now().toString(),
        weekStart: currentWeek,
        workouts: [workout],
        createdAt: new Date(),
        isActive: true
      };
      setWeeklyPlans(plans => [...plans, newPlan]);
    }
    
    onAddWorkout(workout);
  };

  const handleNewWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
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
                  const sections = parseWorkoutSections(workout);
                  const duration = calculateWorkoutDuration(sections);
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
                            {sections.length} sections • {duration}
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
                          {sections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="mb-3 last:mb-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-xs font-semibold text-blue-600 uppercase">
                                  {section.name}
                                </h4>
                                {section.duration && (
                                  <span className="text-xs text-gray-500">
                                    {section.duration}
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                {section.exercises.map((exercise, exerciseIndex) => (
                                  <div key={exerciseIndex} className="text-xs text-gray-600 pl-2">
                                    • {exercise}
                                  </div>
                                ))}
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
            {weeklyPlans
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
        <p className="text-sm text-blue-800">
          <strong>Cómo funciona:</strong> Chatea con nuestro entrenador AI para obtener planes de entrenamiento personalizados. 
          Cada entrenamiento está organizado en secciones: Calentamiento, Fuerza, Cardio, y Estiramiento con duraciones estimadas. 
          Haz clic en cualquier entrenamiento para ver el desglose detallado por sección.
          {weekExpired && " ¡Tu semana actual ha terminado - es hora de planificar la próxima semana!"}
        </p>
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
