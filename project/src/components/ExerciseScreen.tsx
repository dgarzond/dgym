import React, { useState, useEffect } from 'react';
import { Timer, ArrowLeft, ArrowRight, RotateCcw, Scale } from 'lucide-react';
import type { Exercise, Set } from '../types';
import { kgToLbs, lbsToKg } from '../types';

interface ExerciseScreenProps {
  exercise: Exercise;
  onComplete: (exerciseId: string, setDetails: Set[]) => void;
  onBack: () => void;
  onNext: () => void;
  isLast: boolean;
}

export function ExerciseScreen({ exercise, onComplete, onBack, onNext, isLast }: ExerciseScreenProps) {
  const [currentSet, setCurrentSet] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimer, setRestTimer] = useState(60);
  const [setDetails, setSetDetails] = useState<Set[]>(exercise.setDetails);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(exercise.weightUnit);
  const [currentWeight, setCurrentWeight] = useState(exercise.weight);

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
    } else if (restTimer === 0) {
      setIsResting(false);
      setRestTimer(60);
    }
    return () => clearInterval(interval);
  }, [isResting, restTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWeightUnitToggle = () => {
    const newUnit = weightUnit === 'kg' ? 'lbs' : 'kg';
    const newWeight = weightUnit === 'kg' ? kgToLbs(currentWeight) : lbsToKg(currentWeight);
    setWeightUnit(newUnit);
    setCurrentWeight(newWeight);
  };

  const handleSetComplete = (actualReps?: number, actualWeight?: number) => {
    const newSetDetails = [...setDetails];
    newSetDetails[currentSet] = {
      ...newSetDetails[currentSet],
      completed: true,
      actualReps: actualReps || exercise.reps,
      actualWeight: actualWeight || currentWeight,
      weightUnit: weightUnit,
    };
    setSetDetails(newSetDetails);

    if (currentSet < exercise.sets - 1) {
      setIsResting(true);
      setCurrentSet(prev => prev + 1);
    } else {
      onComplete(exercise.id, newSetDetails);
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
          <h1 className="text-2xl font-bold text-center text-gray-900">{exercise.name}</h1>
          <div className="w-20" />
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Timer className="w-5 h-5 mr-2 text-blue-600" />
              <span className="text-lg">Workout Time: {formatTime(timer)}</span>
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
                onClick={() => setIsResting(false)}
                className="flex items-center mx-auto text-blue-600 hover:text-blue-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Skip Rest
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Target</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600">Reps</label>
                    <input
                      type="number"
                      defaultValue={exercise.reps}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600">
                      Weight ({weightUnit})
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
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSetComplete()}
                className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Complete Set
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex space-x-2">
            {Array.from({ length: exercise.sets }).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  setDetails[index].completed
                    ? 'bg-green-500'
                    : index === currentSet
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          {setDetails[exercise.sets - 1].completed && (
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