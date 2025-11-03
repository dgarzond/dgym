
// Auto-detect API URL based on environment
const getApiUrl = () => {
  // Check if we have an explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production deployment on .replit.app - same origin, no port
    if (hostname.includes('.replit.app')) {
      return `${window.location.protocol}//${hostname}`;
    }
    
    // Development on .replit.dev - use port 3001
    if (hostname.includes('.repl.co') || hostname.includes('.replit.dev')) {
      return `${window.location.protocol}//${hostname}:3001`;
    }
  }
  
  // Fallback for local development
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();
console.log('🔗 API URL configured:', API_URL);

export const api = {
  // Usuarios
  async createOrGetUser(username: string, email?: string, googleId?: string) {
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, googleId })
    });
    if (!response.ok) throw new Error('Error creating user');
    return response.json();
  },

  async getUser(username: string) {
    const response = await fetch(`${API_URL}/api/users/${username}`);
    if (!response.ok) throw new Error('Error getting user');
    return response.json();
  },

  // Rutinas semanales
  async createWeeklyRoutine(userId: number, weekData: any) {
    const response = await fetch(`${API_URL}/api/weekly-routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, weekData })
    });
    if (!response.ok) throw new Error('Error creating weekly routine');
    return response.json();
  },

  async getWeeklyRoutines(userId: number) {
    const response = await fetch(`${API_URL}/api/users/${userId}/weekly-routines`);
    if (!response.ok) throw new Error('Error getting weekly routines');
    return response.json();
  },

  // Workouts
  async saveWorkout(userId: number, workout: any, weeklyRoutineId?: number) {
    const response = await fetch(`${API_URL}/api/workouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workout, weeklyRoutineId })
    });
    if (!response.ok) throw new Error('Error saving workout');
    return response.json();
  },

  async getUserWorkouts(userId: number) {
    const response = await fetch(`${API_URL}/api/users/${userId}/workouts`);
    if (!response.ok) throw new Error('Error getting workouts');
    return response.json();
  },

  async markWorkoutCompleted(workoutId: string, completed: boolean) {
    const response = await fetch(`${API_URL}/api/workouts/${workoutId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    if (!response.ok) throw new Error('Error updating workout');
    return response.json();
  },

  async markExerciseCompleted(exerciseId: string, completed: boolean) {
    const response = await fetch(`${API_URL}/api/exercises/${exerciseId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    if (!response.ok) throw new Error('Error updating exercise');
    return response.json();
  },

  async updateWorkout(userId: number, workout: any) {
    const response = await fetch(`${API_URL}/api/workouts/${workout.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workout })
    });
    if (!response.ok) throw new Error('Error updating workout');
    return response.json();
  },

  async deleteWorkout(userId: number, workoutId: string) {
    const response = await fetch(`${API_URL}/api/workouts/${workoutId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Error deleting workout');
    return response.json();
  }
};
