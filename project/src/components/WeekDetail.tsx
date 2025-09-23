
import React, { useState } from 'react';
import { ArrowLeft, Calendar, Play, CheckCircle, Plus } from 'lucide-react';
import type { WeeklyPlan, Workout } from '../types';
import { WorkoutCard } from './WorkoutCard';
import { ChatBot } from './ChatBot';

interface WeekDetailProps {
  week: WeeklyPlan;
  onBack: () => void;
  onUpdateWeek: (week: WeeklyPlan) => void;
  onSelectWorkout: (workout: Workout) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onToggleExercise: (workoutId: string, exerciseId: string) => void;
  onStartWorkout: (workout: Workout) => void;
}

export function WeekDetail({ 
  week, 
  onBack, 
  onUpdateWeek, 
  onSelectWorkout,
  onDeleteWorkout,
  onToggleExercise,
  onStartWorkout
}: WeekDetailProps) {
  const [showChatBot, setShowChatBot] = useState(false);

  const calculateWeekProgress = () => {
    const totalWorkouts = week.workouts.length;
    if (totalWorkouts === 0) return 0;
    
    const completedWorkouts = week.workouts.filter(w => w.completed).length;
    return Math.round((completedWorkouts / totalWorkouts) * 100);
  };

  const handleWorkoutGenerated = (workoutData: Workout | Workout[]) => {
    const workoutsToAdd = Array.isArray(workoutData) ? workoutData : [workoutData];
    
    const updatedWeek = {
      ...week,
      workouts: [...week.workouts, ...workoutsToAdd]
    };
    
    onUpdateWeek(updatedWeek);
    setShowChatBot(false);
  };

  const handleDeleteWorkout = (workoutId: string) => {
    const updatedWeek = {
      ...week,
      workouts: week.workouts.filter(w => w.id !== workoutId)
    };
    
    onUpdateWeek(updatedWeek);
    onDeleteWorkout(workoutId);
  };

  const progress = calculateWeekProgress();
  const totalExercises = week.workouts.reduce((total, workout) => {
    return total + (workout.exerciseTypes || []).reduce((exerciseTotal, type) => {
      return exerciseTotal + (type.exercises || []).length;
    }, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a Semanas
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{week.name}</h1>
              <div className="flex items-center space-x-4 text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  <span>Semana {week.weekNumber}, {week.year}</span>
                </div>
                <span>•</span>
                <span>{week.weekStart.toLocaleDateString()} - {week.weekEnd.toLocaleDateString()}</span>
              </div>
            </div>
            <button
              onClick={() => setShowChatBot(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Día
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Progreso Semanal</p>
                  <p className="text-2xl font-bold text-blue-800">{progress}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Días Planificados</p>
                  <p className="text-2xl font-bold text-green-800">{week.workouts.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Total Ejercicios</p>
                  <p className="text-2xl font-bold text-purple-800">{totalExercises}</p>
                </div>
                <Play className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-gray-200 rounded-full h-3 mb-6">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Días de Entrenamiento</h2>
          
          {week.workouts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {week.workouts.map((workout, index) => (
                <div key={workout.id} className="relative">
                  <div className="absolute -top-2 -left-2 bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <WorkoutCard
                    workout={workout}
                    onEdit={onSelectWorkout}
                    onDelete={handleDeleteWorkout}
                    onToggleExercise={onToggleExercise}
                    onStartExercise={() => onStartWorkout(workout)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay días planificados
              </h3>
              <p className="text-gray-600 mb-4">
                Agrega días de entrenamiento a esta semana
              </p>
              <button
                onClick={() => setShowChatBot(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Agregar Primer Día
              </button>
            </div>
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
