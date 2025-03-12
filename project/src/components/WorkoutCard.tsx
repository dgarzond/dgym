import React from 'react';
import { Dumbbell, Pencil, Trash2, CheckCircle, Circle, Play } from 'lucide-react';
import type { Workout, Exercise } from '../types';

interface WorkoutCardProps {
  workout: Workout;
  onEdit: (workout: Workout) => void;
  onDelete: (id: string) => void;
  onToggleExercise: (workoutId: string, exerciseId: string) => void;
  onStartExercise: () => void;
}

export function WorkoutCard({ workout, onEdit, onDelete, onToggleExercise, onStartExercise }: WorkoutCardProps) {
  const completedExercises = workout.exercises.filter(ex => ex.completed).length;
  const progress = (completedExercises / workout.exercises.length) * 100;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Dumbbell className="w-6 h-6 text-blue-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">{workout.name}</h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(workout)}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(workout.id)}
            className="p-2 text-gray-600 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className="mb-4 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="space-y-3">
        {workout.exercises.map((exercise) => (
          <div 
            key={exercise.id} 
            className="flex items-center justify-between py-2 border-b border-gray-100"
          >
            <div className="flex items-center">
              <button
                onClick={() => onToggleExercise(workout.id, exercise.id)}
                className="mr-3 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {exercise.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span className={`text-gray-700 ${exercise.completed ? 'line-through text-gray-400' : ''}`}>
                {exercise.name}
              </span>
            </div>
            <span className="text-gray-600">
              {exercise.sets} × {exercise.reps} @ {exercise.weight}{exercise.weightUnit}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-gray-500">
          {new Date(workout.date).toLocaleDateString()}
        </span>
        <div className="flex items-center space-x-4">
          <span className="text-blue-600 font-medium">
            {completedExercises} of {workout.exercises.length} completed
          </span>
          <button
            onClick={onStartExercise}
            className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </button>
        </div>
      </div>
    </div>
  );
}