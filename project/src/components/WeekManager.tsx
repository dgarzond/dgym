
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Play, ChevronDown, ChevronUp, CheckCircle, RotateCcw } from 'lucide-react';
import type { WeeklyPlan, Workout } from '../types';
import { ChatBot } from './ChatBot';

interface WeekManagerProps {
  onSelectWeek: (week: WeeklyPlan) => void;
  onCreateWorkout: (workout: Workout | Workout[]) => void;
}

export function WeekManager({ onSelectWeek, onCreateWorkout }: WeekManagerProps) {
  const [weeks, setWeeks] = useState<WeeklyPlan[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showChatBot, setShowChatBot] = useState(false);
  const [selectedWeekForChat, setSelectedWeekForChat] = useState<WeeklyPlan | null>(null);
  const [showCreateWeek, setShowCreateWeek] = useState(false);
  const [newWeekName, setNewWeekName] = useState('');
  const [chatBotUsedThisWeek, setChatBotUsedThisWeek] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Cargar semanas desde localStorage
    const savedWeeks = localStorage.getItem('gymTracker_weeks');
    if (savedWeeks) {
      try {
        const parsedWeeks = JSON.parse(savedWeeks);
        const weeksWithDates = parsedWeeks.map((week: any) => ({
          ...week,
          weekStart: new Date(week.weekStart),
          weekEnd: new Date(week.weekEnd),
          createdAt: new Date(week.createdAt)
        }));
        setWeeks(weeksWithDates);
      } catch (error) {
        console.error('Error loading weeks:', error);
      }
    }

    // Cargar estado del chatbot usado
    const savedChatBotUsed = localStorage.getItem('gymTracker_chatBotUsedThisWeek');
    if (savedChatBotUsed) {
      try {
        const parsedUsed = JSON.parse(savedChatBotUsed);
        setChatBotUsedThisWeek(new Set(parsedUsed));
      } catch (error) {
        console.error('Error loading chatbot used state:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Guardar semanas en localStorage
    if (weeks.length > 0) {
      localStorage.setItem('gymTracker_weeks', JSON.stringify(weeks));
    }
  }, [weeks]);

  useEffect(() => {
    // Guardar estado del chatbot usado
    localStorage.setItem('gymTracker_chatBotUsedThisWeek', JSON.stringify(Array.from(chatBotUsedThisWeek)));
  }, [chatBotUsedThisWeek]);

  const getWeekDates = (year: number, weekNumber: number) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const firstWeekStart = new Date(firstDayOfYear);
    firstWeekStart.setDate(firstDayOfYear.getDate() - firstDayOfYear.getDay());
    
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return { weekStart, weekEnd };
  };

  const getCurrentWeekNumber = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  const createNewWeek = () => {
    if (!newWeekName.trim()) return;

    const currentYear = new Date().getFullYear();
    const currentWeekNumber = getCurrentWeekNumber();
    const { weekStart, weekEnd } = getWeekDates(currentYear, currentWeekNumber);

    const newWeek: WeeklyPlan = {
      id: `week-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      weekNumber: currentWeekNumber,
      year: currentYear,
      weekStart,
      weekEnd,
      name: newWeekName.trim(),
      workouts: [],
      completed: false,
      createdAt: new Date(),
      isActive: true
    };

    setWeeks(prev => [...prev, newWeek]);
    setNewWeekName('');
    setShowCreateWeek(false);
  };

  const toggleWeekExpansion = (weekId: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekId)) {
      newExpanded.delete(weekId);
    } else {
      newExpanded.add(weekId);
    }
    setExpandedWeeks(newExpanded);
  };

  const calculateWeekProgress = (week: WeeklyPlan) => {
    const totalWorkouts = week.workouts.length;
    if (totalWorkouts === 0) return 0;
    
    const completedWorkouts = week.workouts.filter(w => w.completed).length;
    return Math.round((completedWorkouts / totalWorkouts) * 100);
  };

  const handleWorkoutGenerated = (workoutData: Workout | Workout[]) => {
    if (!selectedWeekForChat) return;

    const workoutsToAdd = Array.isArray(workoutData) ? workoutData : [workoutData];
    
    // Agregar workouts a la semana seleccionada
    const updatedWeeks = weeks.map(week => {
      if (week.id === selectedWeekForChat.id) {
        return {
          ...week,
          workouts: [...week.workouts, ...workoutsToAdd]
        };
      }
      return week;
    });

    setWeeks(updatedWeeks);
    
    // Marcar el chatbot como usado para esta semana
    markChatBotAsUsed(selectedWeekForChat.id);
    
    // También llamar al callback para agregar a la lista principal
    onCreateWorkout(workoutData);
    
    setShowChatBot(false);
    setSelectedWeekForChat(null);
  };

  const canUseChatBot = (weekId: string) => {
    return !chatBotUsedThisWeek.has(weekId);
  };

  const markChatBotAsUsed = (weekId: string) => {
    setChatBotUsedThisWeek(prev => new Set([...prev, weekId]));
  };

  const resetWeek = (weekId: string) => {
    if (confirm('¿Estás seguro de que quieres reiniciar esta semana? Se eliminarán todos los días de entrenamiento y podrás usar el chatbot nuevamente.')) {
      // Reiniciar la semana eliminando todos los workouts
      setWeeks(prev => prev.map(week => 
        week.id === weekId 
          ? { ...week, workouts: [], completed: false }
          : week
      ));
      
      // Permitir usar el chatbot nuevamente para esta semana
      setChatBotUsedThisWeek(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekId);
        return newSet;
      });
    }
  };

  const deleteWeek = (weekId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta semana?')) {
      setWeeks(prev => prev.filter(w => w.id !== weekId));
      // También limpiar el estado del chatbot para esta semana
      setChatBotUsedThisWeek(prev => {
        const newSet = new Set(prev);
        newSet.delete(weekId);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Calendar className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-800">Plan Semanal</h2>
        </div>
        <button
          onClick={() => setShowCreateWeek(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Semana
        </button>
      </div>

      {showCreateWeek && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium mb-3">Crear Nueva Semana</h3>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newWeekName}
              onChange={(e) => setNewWeekName(e.target.value)}
              placeholder="Nombre de la semana (ej: Semana de Fuerza)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={createNewWeek}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreateWeek(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {weeks.map((week) => {
          const isExpanded = expandedWeeks.has(week.id);
          const progress = calculateWeekProgress(week);

          return (
            <div key={week.id} className="border border-gray-200 rounded-lg">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleWeekExpansion(week.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-800">{week.name}</h3>
                    {week.completed && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                  <p className="text-sm text-gray-600">
                    Semana {week.weekNumber}, {week.year} • {week.weekStart.toLocaleDateString()} - {week.weekEnd.toLocaleDateString()}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {week.workouts.length} días • {progress}% completado
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {canUseChatBot(week.id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWeekForChat(week);
                        setShowChatBot(true);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600"
                      title="Usar ChatBot para agregar días"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetWeek(week.id);
                      }}
                      className="p-2 text-gray-500 hover:text-orange-600"
                      title="Reiniciar semana (permite usar ChatBot nuevamente)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectWeek(week);
                    }}
                    className="p-2 text-gray-500 hover:text-green-600"
                    title="Ver detalles de la semana"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWeek(week.id);
                    }}
                    className="p-2 text-gray-500 hover:text-red-600"
                    title="Eliminar semana"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <h4 className="font-medium text-gray-800 mb-3">Días de Entrenamiento</h4>
                  {week.workouts.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {week.workouts.map((workout, index) => (
                          <div key={workout.id} className="bg-white rounded border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-800">
                                Día {index + 1}: {workout.name}
                              </h5>
                              {workout.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              {(workout.exerciseTypes || []).length} tipos de ejercicio
                            </p>
                            <div className="text-xs text-gray-500">
                              {new Date(workout.date).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      {!canUseChatBot(week.id) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm text-orange-700 mb-2">
                            ChatBot ya usado esta semana. Para agregar más días:
                          </p>
                          <button
                            onClick={() => resetWeek(week.id)}
                            className="flex items-center text-sm text-orange-600 hover:text-orange-800"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reiniciar semana
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No hay días de entrenamiento en esta semana</p>
                      {canUseChatBot(week.id) ? (
                        <button
                          onClick={() => {
                            setSelectedWeekForChat(week);
                            setShowChatBot(true);
                          }}
                          className="mt-2 text-blue-600 hover:text-blue-800"
                        >
                          Agregar días de entrenamiento
                        </button>
                      ) : (
                        <div className="mt-2">
                          <p className="text-sm text-orange-600 mb-2">ChatBot ya usado esta semana</p>
                          <button
                            onClick={() => resetWeek(week.id)}
                            className="flex items-center text-orange-600 hover:text-orange-800 mx-auto"
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reiniciar semana
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {weeks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No hay semanas de entrenamiento</p>
            <p className="mb-4">Crea tu primera semana para organizar tus rutinas</p>
            <button
              onClick={() => setShowCreateWeek(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Crear Primera Semana
            </button>
          </div>
        )}
      </div>

      {showChatBot && selectedWeekForChat && (
        <ChatBot
          onWorkoutGenerated={handleWorkoutGenerated}
          onClose={() => {
            setShowChatBot(false);
            setSelectedWeekForChat(null);
          }}
        />
      )}
    </div>
  );
}
