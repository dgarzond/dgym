import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Download, Loader } from 'lucide-react';
import type { Workout, Exercise } from '../types';
import { ConfigManager } from '../utils/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  onWorkoutGenerated: (workout: Workout) => void;
  onClose: () => void;
}

export function ChatBot({ onWorkoutGenerated, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from localStorage or use default
    const savedMessages = localStorage.getItem('chatBotMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
    return [
      {
        id: '1',
        role: 'assistant',
        content: "¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪\n\nHi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪",
        timestamp: new Date(),
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Initialize API key from ConfigManager
  useEffect(() => {
    const configManager = ConfigManager.getInstance();
    const savedApiKey = configManager.getApiKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Save messages to localStorage whenever they change
    localStorage.setItem('chatBotMessages', JSON.stringify(messages));
  }, [messages]);

  const clearChatHistory = () => {
    const initialMessage = {
      id: '1',
      role: 'assistant' as const,
      content: "¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪\n\nHi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪",
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
    localStorage.setItem('chatBotMessages', JSON.stringify([initialMessage]));
  };

  // Function to format message content with markdown-like styling
  const formatMessageContent = (content: string) => {
    // Convert **text** to bold
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert *text* to italic
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Preserve line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Add some emoji enhancements for fitness terms
    formatted = formatted.replace(/💪|🏋️‍♂️|🏋️‍♀️|🔥|⚡|✅|🎯/g, (match) => match);

    return formatted;
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && apiKey.startsWith('sk-')) {
      const configManager = ConfigManager.getInstance();
      configManager.setApiKey(apiKey);
      setShowApiKeyInput(false);
    } else {
      alert('Por favor, ingresa una API key válida que comience con "sk-"');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Check if API key is valid
    if (!apiKey || !apiKey.startsWith('sk-')) {
      setShowApiKeyInput(true);
      return;
    }

    const currentInput = input.trim();

    // Check if user wants to clear chat history
    if (currentInput.toLowerCase().includes('clear history') || 
        currentInput.toLowerCase().includes('clear chat') ||
        currentInput.toLowerCase().includes('reset chat')) {
      clearChatHistory();
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a highly experienced and certified personal trainer with over 15 years of experience helping people achieve their fitness goals. You have expertise in:

🏆 PROFESSIONAL CREDENTIALS:
- Certified Strength & Conditioning Specialist (CSCS)
- Nutrition coaching certification
- Functional movement specialist
- Experience with athletes, beginners, and special populations

💬 COMMUNICATION STYLE:
- DETECT the user's language from their first message and respond in the SAME language throughout the conversation
- If they write in Spanish, respond in Spanish. If they write in English, respond in English
- Be motivational, supportive, and professional like a real personal trainer
- Use appropriate emojis to make conversations engaging
- Provide scientific explanations when relevant
- Ask clarifying questions to create the best possible program

🎯 YOUR EXPERTISE:
- Strength training and muscle building
- Weight loss and body composition
- Cardiovascular fitness and endurance
- Flexibility and mobility
- Injury prevention and rehabilitation
- Program periodization and progression

Create engaging, professional responses with emojis explaining workout plans. Use this specific format for exercises:

MULTI-DAY FORMAT:
When creating plans with multiple days, clearly separate them:

Día 1:
🔥 Calentamiento:
- Exercise: sets x reps/duration

💪 Fuerza:
- Exercise: sets x reps/duration

⚡ Cardio:
- Exercise: sets x duration

✅ Estiramiento:
- Exercise: sets x duration

Día 2:
🔥 Calentamiento:
... (continue format)

EXERCISE FORMAT:
Use sections with emojis:
🔥 Calentamiento: (for warm-up exercises)
💪 Fuerza: (for strength exercises)  
⚡ Cardio: (for cardio exercises)
✅ Estiramiento: (for stretching exercises)

For each exercise, use this format:
- Exercise name: sets x reps/duration

Examples:
- Sentadillas: 3 sets x 12 reps
- Plancha: 3 sets x 30 seconds
- Caminata: 1 set x 20 minutes
- Bicicleta estática: 1 set x 5 kilometers

RULES:
- Always use "sets" and "x" between sets and reps/duration
- For strength exercises: use "reps" 
- For time-based exercises: use "seconds" or "minutes"
- For cardio distance: use "meters" or "kilometers"
- Include weight if relevant: "- Press militar: 3 sets x 10 reps @ 20 kg"
- When creating multiple days, clearly label each as "Día 1:", "Día 2:", etc.

Focus on proper form, safety, and progressive overload. Adapt recommendations based on the user's fitness level.

Always end your response by telling users they can click the "Import Workout" button to add the routine to their fitness tracker.`
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: currentInput
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error connecting to OpenAI. Please check your API key and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes('beginner') || lowerInput.includes('start')) {
      return `Great! For beginners, I recommend starting with a full-body workout 3 times per week. Here's a sample workout plan:

**Beginner Full Body Workout**
- Bodyweight Squats: 3 sets of 10-12 reps
- Push-ups (modified if needed): 3 sets of 8-10 reps
- Bent-over Rows: 3 sets of 10-12 reps
- Plank: 3 sets of 20-30 seconds
- Walking Lunges: 3 sets of 10 per leg

Would you like me to create this workout plan for your tracker? Just say "create workout" and I'll add it to your app!`;
    }

    if (lowerInput.includes('create workout') || lowerInput.includes('add workout')) {
      return `Perfect! I'll create a workout plan for you. Click the "Import Workout" button below to add it to your tracker.`;
    }

    if (lowerInput.includes('push') || lowerInput.includes('chest')) {
      return `Excellent choice! Push workouts focus on chest, shoulders, and triceps. Here's a solid push day routine:

**Push Day Workout**
- Bench Press: 4 sets of 8-10 reps
- Overhead Press: 3 sets of 8-10 reps
- Incline Dumbbell Press: 3 sets of 10-12 reps
- Lateral Raises: 3 sets of 12-15 reps
- Tricep Dips: 3 sets of 10-12 reps
- Close-grip Push-ups: 3 sets of 8-10 reps

Ready to add this to your tracker?`;
    }

    return `That's interesting! Based on what you've told me, I can help create a personalized workout plan. Could you tell me more about:

- Your current fitness level (beginner, intermediate, advanced)
- Your main goals (strength, muscle building, weight loss, endurance)
- Available equipment (gym, home equipment, bodyweight only)
- How many days per week you want to work out
- Any specific muscle groups you want to focus on

This will help me create the perfect workout plan for you!`;
  };

  // Helper function to group exercises by type
  const groupExercisesByType = (exercises: any[]) => {
    const exerciseTypes: { [key: string]: any } = {};

    exercises.forEach(exercise => {
      const typeId = exercise.type.id;
      if (!exerciseTypes[typeId]) {
        exerciseTypes[typeId] = {
          ...exercise.type,
          exercises: []
        };
      }
      exerciseTypes[typeId].exercises.push(exercise);
    });

    return Object.values(exerciseTypes);
  };

  const convertTextToWorkoutJSON = async (textToProcess: string) => {
    try {
      console.log('Converting text to JSON with AI...', textToProcess);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a workout parser. Convert the provided workout text into a structured JSON format.

If the text contains multiple days (Día 1, Day 1, etc.), return an array of workouts. If it's a single day, return a single workout object.

RESPOND ONLY WITH VALID JSON - NO OTHER TEXT:

For single day:
{
  "workoutName": "extracted name or generate one",
  "estimatedDuration": "estimated duration",
  "exerciseTypes": [...]
}

For multiple days:
{
  "workouts": [
    {
      "workoutName": "Day 1 name",
      "estimatedDuration": "estimated duration",
      "exerciseTypes": [...]
    },
    {
      "workoutName": "Day 2 name", 
      "estimatedDuration": "estimated duration",
      "exerciseTypes": [...]
    }
  ]
}

Exercise format:
{
  "id": "warmup|power|cardio|stretching",
  "name": "English name",
  "nameSpanish": "Spanish name", 
  "duration": "5-10 min",
  "exercises": [
    {
      "name": "Exercise name",
      "sets": number,
      "reps": number (only for rep-based),
      "duration": number (only for time-based),
      "durationUnit": "seconds|minutes|meters|kilometers",
      "exerciseSubType": "reps|duration",
      "weight": number,
      "weightUnit": "kg"
    }
  ]
}

RULES:
- CRITICAL: Look for day separators like "Día 1:", "Day 1:", "Día 2:", "Day 2:", etc. If found, return multiple workouts array
- Use category IDs: "warmup", "power", "cardio", "stretching"
- exerciseSubType: "reps" for strength exercises, "duration" for time/distance
- For reps: include "reps", omit "duration" and "durationUnit"
- For time/distance: include "duration" and "durationUnit", omit "reps"
- Extract weight from text like "@ 20 kg" or default to 0
- Map Spanish categories: Calentamiento=warmup, Fuerza=power, Cardio=cardio, Estiramiento=stretching
- Parse patterns like "3 sets x 12 reps", "3 sets x 30 seconds", "1 set x 20 minutes"
- ALWAYS check for multiple days first - if "Día 1" and "Día 2" exist, use workouts array format`
            },
            {
              role: 'user',
              content: `Convert this workout text to JSON:\n\n${textToProcess}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI conversion failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const jsonContent = data.choices[0]?.message?.content?.trim();

      if (!jsonContent) {
        throw new Error('No content received from AI');
      }

      console.log('AI generated JSON:', jsonContent);

      // Clean the JSON content to ensure it's valid
      let cleanJsonContent = jsonContent;

      // Remove markdown code blocks if present
      if (cleanJsonContent.includes('```json')) {
        cleanJsonContent = cleanJsonContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJsonContent.includes('```')) {
        cleanJsonContent = cleanJsonContent.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      return JSON.parse(cleanJsonContent);

    } catch (error) {
      console.error('Error in AI conversion:', error);
      throw error;
    }
  };

  const handleImportWorkout = async (responseText?: string) => {
    try {
      let textToProcess = responseText;

      if (!textToProcess) {
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (!lastAssistantMessage || !lastAssistantMessage.content) {
          alert('No hay mensaje del asistente para importar.');
          return;
        }
        textToProcess = lastAssistantMessage.content;
      }

      console.log('Processing text for import:', textToProcess);

      // Check if API key is available for AI conversion
      if (!apiKey || !apiKey.startsWith('sk-')) {
        console.log('No API key available, using fallback parsing...');
        return handleImportWorkoutFallback(textToProcess);
      }

      // Use AI to convert text to structured JSON
      const workoutData = await convertTextToWorkoutJSON(textToProcess);
      console.log('AI converted workout data:', workoutData);

      // Check if it's multiple days or single day
      if (workoutData.workouts && Array.isArray(workoutData.workouts)) {
        // Multiple days - import each day as separate workout
        console.log('Processing multiple days:', workoutData.workouts.length);

        const importedWorkouts = [];
        for (let dayIndex = 0; dayIndex < workoutData.workouts.length; dayIndex++) {
          const dayWorkout = workoutData.workouts[dayIndex];

          if (!dayWorkout.exerciseTypes || !Array.isArray(dayWorkout.exerciseTypes)) {
            console.warn(`Day ${dayIndex + 1} has invalid exercise types, skipping`);
            continue;
          }

          const processedWorkout = processWorkoutData(dayWorkout, dayIndex + 1);
          if (processedWorkout) {
            importedWorkouts.push(processedWorkout);
            onWorkoutGenerated(processedWorkout);
            console.log(`Successfully processed day ${dayIndex + 1}:`, processedWorkout.name);
          } else {
            console.warn(`Failed to process day ${dayIndex + 1}`);
          }
        }

        if (importedWorkouts.length === 0) {
          throw new Error('No se pudieron procesar días válidos de la rutina');
        }

        const totalExercises = importedWorkouts.reduce((sum, workout) => {
          return sum + (workout.exerciseTypes || []).reduce((typeSum, type) => typeSum + (type?.exercises?.length || 0), 0);
        }, 0);

        alert(`¡${importedWorkouts.length} rutinas importadas exitosamente!\n\n📊 Detalles:\n• ${totalExercises} ejercicios en total\n• ${importedWorkouts.length} días de entrenamiento\n• Rutinas creadas: ${importedWorkouts.map(w => `"${w.name}"`).join(', ')}`);
        
        console.log('Successfully imported multiple workouts:', importedWorkouts.map(w => ({ name: w.name, exerciseCount: w.exerciseTypes.reduce((sum, type) => sum + type.exercises.length, 0) })));
        return;
      }

      // Single day workout
      if (!workoutData.exerciseTypes || !Array.isArray(workoutData.exerciseTypes)) {
        throw new Error('Formato JSON inválido: falta exerciseTypes o no es un array');
      }

      const processedWorkout = processWorkoutData(workoutData, 1);
      if (!processedWorkout) {
        throw new Error('No se pudo procesar la rutina');
      }

      onWorkoutGenerated(processedWorkout);

      const totalExercises = (processedWorkout.exerciseTypes || []).reduce((sum, type) => sum + (type?.exercises?.length || 0), 0);
      alert(`¡Rutina "${processedWorkout.name}" importada exitosamente!\n\n📊 Detalles:\n• ${totalExercises} ejercicios\n• ${processedWorkout.exerciseTypes.length} categorías\n• Duración estimada: ${processedWorkout.name.match(/\(([^)]+)\)$/)?.[1] || 'N/A'}`);

    } catch (error) {
      console.error('Error importing workout:', error);
      alert(`Error al importar la rutina: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nIntentando con método de respaldo...`);

      // Try fallback method if AI conversion fails
      try {
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastAssistantMessage?.content) {
          handleImportWorkoutFallback(lastAssistantMessage.content);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        alert('Error: No se pudo procesar la rutina con ningún método disponible.');
      }
    }
  };

  // Helper function to process workout data
  const processWorkoutData = (workoutData: any, dayNumber: number) => {
    try {
      // Process exercise types and exercises with proper validation
      const processedExerciseTypes = (workoutData.exerciseTypes || []).map((exerciseType: any, typeIndex: number) => {
        // Validate exerciseType
        if (!exerciseType || typeof exerciseType !== 'object') {
          console.warn('Invalid exercise type at index', typeIndex);
          return null;
        }

        const processedExercises = (exerciseType.exercises || []).map((exercise: any, exerciseIndex: number) => {
          // Validate exercise
          if (!exercise || typeof exercise !== 'object' || !exercise.name) {
            console.warn('Invalid exercise at index', exerciseIndex, 'in type', exerciseType.id);
            return null;
          }

          const exerciseId = `ex-${Date.now()}-${typeIndex}-${exerciseIndex}-${Math.random().toString(36).substr(2, 9)}`;
          const sets = Math.max(1, parseInt(exercise.sets || 1));

          // Create set details with proper validation
          const setDetails = Array(sets).fill(null).map((_, setIndex) => {
            const setId = `${exerciseId}-set-${setIndex + 1}`;
            const baseSet = {
              id: setId,
              weight: Math.max(0, parseInt(exercise.weight) || 0),
              completed: false,
              weightUnit: (exercise.weightUnit === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs'
            };

            if (exercise.exerciseSubType === 'duration') {
              return {
                ...baseSet,
                duration: Math.max(1, parseInt(exercise.duration) || 30),
                durationUnit: (['seconds', 'minutes', 'meters', 'kilometers'].includes(exercise.durationUnit) 
                  ? exercise.durationUnit 
                  : 'seconds') as 'seconds' | 'minutes' | 'meters' | 'kilometers'
              };
            } else {
              return {
                ...baseSet,
                reps: Math.max(1, parseInt(exercise.reps) || 10)
              };
            }
          });

          // Validate exercise sub type
          const exerciseSubType = exercise.exerciseSubType === 'duration' ? 'duration' : 'reps';

          // Validate exercise type data
          const typeData = {
            id: exerciseType.id || 'power',
            name: exerciseType.name || 'Power',
            nameSpanish: exerciseType.nameSpanish || 'Fuerza',
            duration: exerciseType.duration || '20-30 min'
          };

          const processedExercise = {
            id: exerciseId,
            name: String(exercise.name).trim() || 'Ejercicio sin nombre',
            sets: sets,
            exerciseSubType: exerciseSubType,
            weight: Math.max(0, parseInt(exercise.weight) || 0),
            weightUnit: (exercise.weightUnit === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs',
            completed: false,
            type: typeData,
            setDetails: setDetails,
            restTime: exerciseType.id === 'cardio' ? 0 : (sets > 1 ? 90 : 60)
          };

          // Add duration or reps based on exercise type
          if (exerciseSubType === 'duration') {
            processedExercise.duration = Math.max(1, parseInt(exercise.duration) || 30);
            processedExercise.durationUnit = (['seconds', 'minutes', 'meters', 'kilometers'].includes(exercise.durationUnit) 
              ? exercise.durationUnit 
              : 'seconds') as 'seconds' | 'minutes' | 'meters' | 'kilometers';
          } else {
            processedExercise.reps = Math.max(1, parseInt(exercise.reps) || 10);
          }

          return processedExercise;
        }).filter(exercise => exercise !== null); // Remove invalid exercises

        // Return null if no valid exercises
        if (processedExercises.length === 0) {
          console.warn('No valid exercises in exercise type', exerciseType.id);
          return null;
        }

        return {
          id: exerciseType.id || 'power',
          name: exerciseType.name || 'Power',
          nameSpanish: exerciseType.nameSpanish || 'Fuerza',
          duration: exerciseType.duration || '20-30 min',
          exercises: processedExercises
        };
      }).filter(type => type !== null); // Remove invalid exercise types

      // Validate we have at least one valid exercise type
      if (processedExerciseTypes.length === 0) {
        throw new Error('No se pudieron procesar ejercicios válidos de la rutina');
      }

      const workoutName = String(workoutData.workoutName || `Rutina IA Día ${dayNumber}`).trim();
      const estimatedDuration = String(workoutData.estimatedDuration || '30-45 min').trim();
      const finalWorkoutName = `${workoutName} (${estimatedDuration})`;

      // Create workout object with additional validation
      const newWorkout: Workout = {
        id: `ai-workout-${Date.now()}-${dayNumber}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        name: finalWorkoutName,
        exerciseTypes: processedExerciseTypes,
        completed: false
      };

      // Final validation of workout structure
      if (!newWorkout.id || !newWorkout.name || !Array.isArray(newWorkout.exerciseTypes)) {
        throw new Error('Error en la estructura del workout creado');
      }

      console.log(`Final workout created for day ${dayNumber}:`, newWorkout);
      return newWorkout;

    } catch (error) {
      console.error(`Error processing workout data for day ${dayNumber}:`, error);
      return null;
    }
  };

  // Fallback function for text parsing (keeping the old method as backup)
  const handleImportWorkoutFallback = (textToProcess: string) => {
    try {
      console.log('Using fallback text parsing method...');

      // Clean text from HTML and markdown formatting
      const cleanText = textToProcess
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\*/g, '') // Remove italic markdown
        .trim();

      // Extract exercises using the old method
      const exercises = extractExercisesFromText(cleanText, 0);

      if (exercises.length === 0) {
        alert('No se pudieron extraer ejercicios del plan. Pide al asistente que use el formato JSON estructurado.');
        return;
      }

      // Group exercises by type with safety checks
      const exerciseTypesMap: { [key: string]: any } = {};

      exercises.forEach(exercise => {
        if (!exercise || !exercise.type || !exercise.type.id) {
          console.warn('Invalid exercise found, skipping:', exercise);
          return;
        }

        const typeId = exercise.type.id;
        if (!exerciseTypesMap[typeId]) {
          exerciseTypesMap[typeId] = {
            ...exercise.type,
            exercises: []
          };
        }
        exerciseTypesMap[typeId].exercises.push(exercise);
      });

      const exerciseTypes = Object.values(exerciseTypesMap).filter(type => 
        type && type.exercises && type.exercises.length > 0
      );

      // Generate workout name from text
      let workoutName = 'Rutina IA (Texto Parseado)';
      const totalExercises = exercises.length;
      let estimatedDuration = '30-45 min';
      if (totalExercises > 10) {
        estimatedDuration = '60-75 min';
      } else if (totalExercises > 6) {
        estimatedDuration = '45-60 min';
      }

      const finalWorkoutName = `${workoutName} (${estimatedDuration})`;

      // Validate we have exercise types before creating workout
      if (exerciseTypes.length === 0) {
        throw new Error('No se pudieron extraer ejercicios válidos del texto');
      }

      // Create workout object
      const newWorkout: Workout = {
        id: `ai-workout-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        name: finalWorkoutName,
        exerciseTypes: exerciseTypes,
        completed: false
      };

      // Final validation
      if (!newWorkout.exerciseTypes || newWorkout.exerciseTypes.length === 0) {
        throw new Error('Error creando la rutina: estructura inválida');
      }

      onWorkoutGenerated(newWorkout);
      alert(`¡Rutina importada con método de respaldo!\n\n📊 Detalles:\n• ${exercises.length} ejercicios\n• ${exerciseTypes.length} categorías\n• Duración estimada: ${estimatedDuration}`);

    } catch (error) {
      console.error('Error in fallback parsing:', error);
      alert('Error al procesar la rutina. Pide al asistente que use el formato JSON estructurado.');
    }
  };

  const extractExercisesFromText = (text: string, dayIndex: number): any[] => {
    const exercises: any[] = [];
    console.log('Extracting exercises from text:', text);

    // Clean text and split by lines
    const cleanText = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
    let currentCategory = 'power'; // default category

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and very short lines
      if (!trimmedLine || trimmedLine.length < 5) continue;

      // Detect category headers with emojis and markdown - more robust detection
      const categoryLower = trimmedLine.toLowerCase().replace(/[*#:]/g, '');

      if (categoryLower.includes('🔥') || categoryLower.includes('calentamiento') || categoryLower.includes('warm')) {
        currentCategory = 'warmup';
        console.log('Category changed to warmup for line:', trimmedLine);
        continue;
      } else if (categoryLower.includes('💪') || categoryLower.includes('fuerza') || categoryLower.includes('power') || categoryLower.includes('strength')) {
        currentCategory = 'power';
        console.log('Category changed to power for line:', trimmedLine);
        continue;
      } else if (categoryLower.includes('⚡') || categoryLower.includes('cardio') || categoryLower.includes('cardiovascular')) {
        currentCategory = 'cardio';
        console.log('Category changed to cardio for line:', trimmedLine);
        continue;
      } else if (categoryLower.includes('✅') || categoryLower.includes('estiramiento') || categoryLower.includes('stretch') || categoryLower.includes('cool')) {
        currentCategory = 'stretching';
        console.log('Category changed to stretching for line:', trimmedLine);
        continue;
      }

      // Skip headers, instructions, and other non-exercise lines but be more specific
      if ((trimmedLine.startsWith('**') && !trimmedLine.includes(':')) ||
          trimmedLine.toLowerCase().includes('focus on') ||
          trimmedLine.toLowerCase().includes('enfócate en') ||
          trimmedLine.toLowerCase().includes('always end') ||
          trimmedLine.toLowerCase().includes('import workout') ||
          trimmedLine.toLowerCase().includes('click') ||
          trimmedLine.toLowerCase().includes('haz clic') ||
          (trimmedLine.length < 8 && !trimmedLine.includes(':'))) {
        console.log('Skipping non-exercise line:', trimmedLine);
        continue;
      }

      // Enhanced exercise extraction patterns - more flexible and comprehensive
      const exercisePatterns = [
        // "- Exercise name: 3 sets de 12 reps @ 60 kg" or "- Exercise name: 3 sets of 12 reps @ 60 kg"
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s*sets?\s+(of|de)\s+(\d+)\s+(reps?|repeticiones|seconds?|segundos|minutes?|minutos|meters?|metros|kilometers?|kilómetros|km)(?:\s*@\s*(\d+)\s*kg)?/i,
        // "Exercise name: 20 minutes" or "Exercise name: 5 kilometers" (cardio without sets)
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s+(minutes?|minutos|mins?|meters?|metros|kilometers?|kilómetros|km)/i,
        // "Exercise name: 3 x 12" (alternative format)
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s*[x×]\s*(\d+)/i
      ];

      let exerciseMatch = null;
      let patternIndex = -1;

      for (let p = 0; p < exercisePatterns.length; p++) {
        exerciseMatch = trimmedLine.match(exercisePatterns[p]);
        if (exerciseMatch) {
          patternIndex = p;
          console.log(`Pattern ${p} matched for line "${trimmedLine}":`, exerciseMatch);
          break;
        }
      }

      if (exerciseMatch && exerciseMatch.length >= 3) {
        let exerciseName, sets, amount, unit = 'reps', weight = 0;

        if (patternIndex === 0) {
          // Full format: "Exercise: 3 sets of/de 12 reps @ 60 kg"
          [, exerciseName, sets, , amount, unit, weight] = exerciseMatch;
          weight = weight ? parseInt(weight) : 0;
        } else if (patternIndex === 1) {
          // Time/distance format: "Exercise: 20 minutes" or "Exercise: 5 kilometers" (cardio without sets)
          [, exerciseName, amount, unit] = exerciseMatch;
          sets = 1;
        } else if (patternIndex === 2) {
          // Short format: "Exercise: 3 x 12"
          [, exerciseName, sets, amount] = exerciseMatch;
          unit = 'reps';
        }

        if (exerciseName && exerciseName.trim()) {
          const cleanName = exerciseName.trim()
            .replace(/^\d+\.\s*/, '')
            .replace(/[*]/g, '')
            .replace(/^[-•*]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();

          // Skip very short names or invalid names
          if (cleanName.length < 3) {
            console.log('Skipping exercise with short name:', cleanName);
            continue;
          }

          const exerciseId = `ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const exerciseWeight = parseInt(weight?.toString() || '0') || 0;
          const exerciseSets = Math.max(1, parseInt(sets?.toString() || '1'));
          const exerciseAmount = Math.max(1, parseInt(amount?.toString() || '10'));

          // Get exercise type based on current category
          const EXERCISE_TYPES = {
            warmup: { id: 'warmup', name: 'Warm-up', nameSpanish: 'Calentamiento', duration: '5-10 min' },
            power: { id: 'power', name: 'Power', nameSpanish: 'Fuerza', duration: '20-30 min' },
            cardio: { id: 'cardio', name: 'Cardio', nameSpanish: 'Cardio', duration: '15-25 min' },
            stretching: { id: 'stretching', name: 'Stretching', nameSpanish: 'Estiramiento', duration: '5-10 min' }
          };

          const exerciseType = EXERCISE_TYPES[currentCategory as keyof typeof EXERCISE_TYPES] || EXERCISE_TYPES.power;

          // Determine if it's duration/distance or reps based
          const unitLower = (unit || 'reps').toLowerCase();
          const isDuration = unitLower.includes('second') || unitLower.includes('minute') || 
                            unitLower.includes('segundo') || unitLower.includes('minuto');
          const isDistance = unitLower.includes('meter') || unitLower.includes('metro') ||
                            unitLower.includes('kilometer') || unitLower.includes('kilómetro') || 
                            unitLower.includes('km');

          let durationUnit: 'seconds' | 'minutes' | 'meters' | 'kilometers' = 'seconds';
          if (unitLower.includes('minute') || unitLower.includes('minuto')) {
            durationUnit = 'minutes';
          } else if (unitLower.includes('meter') || unitLower.includes('metro')) {
            durationUnit = 'meters';
          } else if (unitLower.includes('kilometer') || unitLower.includes('kilómetro') || unitLower.includes('km')) {
            durationUnit = 'kilometers';
          }

          const isTimeBased = isDuration || isDistance || currentCategory === 'cardio';

          const exercise: any = {
            id: exerciseId,
            name: cleanName,
            sets: exerciseSets,
            ...(isTimeBased ? { 
              duration: exerciseAmount, 
              durationUnit: durationUnit 
            } : { 
              reps: exerciseAmount 
            }),
            exerciseSubType: isTimeBased ? 'duration' : 'reps',
            weight: exerciseWeight,
            weightUnit: 'kg' as const,
            completed: false,
            type: exerciseType,
            setDetails: Array(exerciseSets).fill(null).map((_, setIndex) => ({
              id: `${exerciseId}-set-${setIndex + 1}`,
              ...(isTimeBased ? { 
                duration: exerciseAmount, 
                durationUnit: durationUnit 
              } : { 
                reps: exerciseAmount 
              }),
              weight: exerciseWeight,
              completed: false,
              weightUnit: 'kg' as const
            })),
            restTime: currentCategory === 'cardio' ? 0 : (exerciseSets > 1 ? 90 : 60)
          };

          console.log(`Exercise created in category "${currentCategory}":`, exercise);
          exercises.push(exercise);
        }
      } else {
        console.log('No pattern matched for line:', trimmedLine);
      }
    }

    console.log('Total exercises extracted:', exercises.length);
    console.log('Exercise categories:', exercises.map(e => ({ name: e.name, category: e.type.id })));
    return exercises;
  };



  const parseExercises = (text: string, dayIndex: number) => {
    // Use the same function for consistency
    return extractExercisesFromText(text, dayIndex);
  };

  if (showApiKeyInput) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">OpenAI API Key</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleApiKeySubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
              </p>
              {ConfigManager.getInstance().hasApiKey() && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ API key está configurada y guardada de forma segura
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setShowApiKeyInput(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Skip (Demo Mode)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[600px] mx-4 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">AI Fitness Coach</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start">
                  {message.role === 'assistant' && (
                    <Bot className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  {message.role === 'user' && (
                    <User className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div 
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMessageContent(message.content) 
                    }}
                  />
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center">
                <Loader className="w-4 h-4 animate-spin mr-2" />
                <span className="text-gray-600">AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleImportWorkout()}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4 mr-1" />
              Import Workout
            </button>
            <button
              onClick={clearChatHistory}
              className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              <X className="w-4 h-4 mr-1" />
              Clear History
            </button>
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              Configure API
            </button>
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder="Ask about workouts, exercises, or fitness advice... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
              disabled={isLoading}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                height: Math.min(120, Math.max(40, input.split('\n').length * 20 + 20)) + 'px'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}