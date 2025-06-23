import React, { useState, useEffect } from 'react';
import { Calendar, MessageSquare, RefreshCw, CheckCircle, Clock } from 'lucide-react';
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

export function WeeklyPlanManager({ workouts, onAddWorkout }: WeeklyPlanManagerProps) {
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlan[]>([]);
  const [showChatBot, setShowChatBot] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(getStartOfWeek(new Date()));

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
              <div className="space-y-1">
                {currentPlan.workouts.map((workout, index) => (
                  <div key={workout.id} className="text-xs text-gray-500 bg-white rounded px-2 py-1">
                    {index + 1}. {workout.name}
                  </div>
                ))}
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
          <strong>How it works:</strong> Chat with our AI coach to get personalized workout plans. 
          Each week, you can create a new plan based on your progress and goals. 
          {weekExpired && " Your current week has ended - time to plan for the next week!"}
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