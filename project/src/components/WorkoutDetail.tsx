import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Circle, Edit2, Play } from 'lucide-react';
import type { Workout, Exercise, Set } from '../types';

interface WorkoutDetailProps {
  workout: Workout;
  onBack: () => void;
  onUpdateWorkout: (workout: Workout) => void;
  onStartExercise: () => void;
}

export function WorkoutDetail({ workout, onBack, onUpdateWorkout, onStartExercise }: WorkoutDetailProps) {
  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const handleSetComplete = (exerciseId: string, setId: string, setData?: Partial<Set>) => {
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            setDetails: exercise.setDetails.map(set => {
              if (set.id === setId) {
                return {
                  ...set,
                  ...setData,
                  completed: !set.completed,
                };
              }
              return set;
            }),
            completed: exercise.setDetails.every(set => set.completed),
          };
        }
        return exercise;
      }),
    };
    onUpdateWorkout(updatedWorkout);
  };

  const handleSetDataUpdate = (exerciseId: string, setId: string, data: Partial<Set>) => {
    handleSetComplete(exerciseId, setId, data);
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-blue-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Workouts
          </button>
          <button
            onClick={onStartExercise}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Workout
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{workout.name}</h1>
        <p className="text-gray-500 mb-8">
          {new Date(workout.date).toLocaleDateString()}
        </p>

        <div className="space-y-8">
          {workout.exercises.map((exercise) => (
            <div key={exercise.id} className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {exercise.name}
                </h2>
                <button
                  onClick={() => setActiveExercise(activeExercise === exercise.id ? null : exercise.id)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exercise.setDetails.map((set, index) => (
                  <div
                    key={set.id}
                    className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">Set {index + 1}</span>
                      <button
                        onClick={() => handleSetComplete(exercise.id, set.id)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        {set.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {activeExercise === exercise.id && (
                      <div className="space-y-2 mt-3">
                        <div>
                          <label className="text-sm text-gray-600">Actual Reps</label>
                          <input
                            type="number"
                            value={set.actualReps || exercise.reps}
                            onChange={(e) => handleSetDataUpdate(exercise.id, set.id, {
                              actualReps: parseInt(e.target.value)
                            })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">Actual Weight (lbs)</label>
                          <input
                            type="number"
                            value={set.actualWeight || exercise.weight}
                            onChange={(e) => handleSetDataUpdate(exercise.id, set.id, {
                              actualWeight: parseInt(e.target.value)
                            })}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-2 text-sm text-gray-600">
                      Target: {exercise.reps} reps @ {exercise.weight}lbs
                    </div>
                    {set.completed && (set.actualReps || set.actualWeight) && (
                      <div className="mt-1 text-sm text-green-600">
                        Actual: {set.actualReps || exercise.reps} reps @ {set.actualWeight || exercise.weight}lbs
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}