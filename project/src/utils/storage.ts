
// Utilidad para manejar localStorage de forma segura y centralizada
export class StorageManager {
  private static readonly KEYS = {
    WORKOUTS: 'gymTracker_workouts',
    CHAT_MESSAGES: 'gymTracker_chatMessages',
    EXERCISE_PROGRESS: 'gymTracker_exercise_',
    WEEKLY_PLANS: 'gymTracker_weeklyPlans',
    USER_PREFERENCES: 'gymTracker_userPreferences'
  } as const;

  static saveWorkouts(workouts: any[]): boolean {
    try {
      localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(workouts));
      return true;
    } catch (error) {
      console.error('Error saving workouts:', error);
      return false;
    }
  }

  static loadWorkouts(): any[] | null {
    try {
      const saved = localStorage.getItem(this.KEYS.WORKOUTS);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading workouts:', error);
      return null;
    }
  }

  static saveChatMessages(messages: any[]): boolean {
    try {
      localStorage.setItem(this.KEYS.CHAT_MESSAGES, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error('Error saving chat messages:', error);
      return false;
    }
  }

  static loadChatMessages(): any[] | null {
    try {
      const saved = localStorage.getItem(this.KEYS.CHAT_MESSAGES);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading chat messages:', error);
      return null;
    }
  }

  static saveExerciseProgress(exerciseId: string, progress: any): boolean {
    try {
      localStorage.setItem(this.KEYS.EXERCISE_PROGRESS + exerciseId, JSON.stringify(progress));
      return true;
    } catch (error) {
      console.error('Error saving exercise progress:', error);
      return false;
    }
  }

  static loadExerciseProgress(exerciseId: string): any | null {
    try {
      const saved = localStorage.getItem(this.KEYS.EXERCISE_PROGRESS + exerciseId);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error loading exercise progress:', error);
      return null;
    }
  }

  static clearExerciseProgress(exerciseId: string): boolean {
    try {
      localStorage.removeItem(this.KEYS.EXERCISE_PROGRESS + exerciseId);
      return true;
    } catch (error) {
      console.error('Error clearing exercise progress:', error);
      return false;
    }
  }

  static clearAllData(): boolean {
    try {
      Object.values(this.KEYS).forEach(key => {
        if (key.includes('_')) {
          // Para claves con prefijo, limpiar todas las que coincidan
          Object.keys(localStorage)
            .filter(storageKey => storageKey.startsWith(key))
            .forEach(storageKey => localStorage.removeItem(storageKey));
        } else {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Error clearing all data:', error);
      return false;
    }
  }

  static getStorageSize(): { used: number; total: number; percentage: number } {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      
      // LocalStorage típicamente tiene 5-10MB de límite
      const limit = 5 * 1024 * 1024; // 5MB en bytes
      const percentage = (total / limit) * 100;
      
      return {
        used: total,
        total: limit,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}
