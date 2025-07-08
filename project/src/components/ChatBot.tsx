import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader, Import, Download } from 'lucide-react';
import type { Workout, ExerciseType, Exercise, Set } from '../types';
import { ConfigManager } from '../utils/config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  onWorkoutGenerated: (workout: Workout | Workout[]) => void;
  onClose: () => void;
}

export const ChatBot: React.FC<ChatBotProps> = ({ onWorkoutGenerated, onClose }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chatBotMessages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch {
        return [{
          id: '1',
          role: 'assistant' as const,
          content: `¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪

Hi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪`,
          timestamp: new Date()
        }];
      }
    }
    return [{
      id: '1',
      role: 'assistant' as const,
      content: `¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪

Hi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪`,
      timestamp: new Date()
    }];
  });

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const key = ConfigManager.getInstance().getApiKey();
    if (key) {
      setApiKey(key);
      console.log('✅ API key loaded successfully');
    } else {
      console.log('⚠️ No API key found - showing input form');
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
    localStorage.setItem('chatBotMessages', JSON.stringify(messages));
  }, [messages]);

  const resetChat = () => {
    const initialMessage = {
      id: '1',
      role: 'assistant' as const,
      content: `¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪

Hi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪`,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    localStorage.setItem('chatBotMessages', JSON.stringify([initialMessage]));
  };

  const formatMessage = (content: string) => {
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/💪|🏋️‍♂️|🏋️‍♀️|🔥|⚡|✅|🎯/g, (match) => match);
    return formatted;
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim() && apiKey.startsWith('sk-')) {
      ConfigManager.getInstance().setApiKey(apiKey);
      setShowApiKeyInput(false);
    } else {
      alert('Por favor, ingresa una API key válida que comience con "sk-"');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (!apiKey || !apiKey.startsWith('sk-')) {
      setShowApiKeyInput(true);
      return;
    }

    const userMessage = message.trim();

    if (userMessage.toLowerCase().includes('clear history') || 
        userMessage.toLowerCase().includes('clear chat') || 
        userMessage.toLowerCase().includes('reset chat')) {
      resetChat();
      setMessage('');
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const apiKey = ConfigManager.getInstance().getApiKey();
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
              content: `You are a highly experienced and certified personal trainer with over 15 years of experience. You specialize in creating personalized workout routines for people of all fitness levels.

Your expertise includes:
- Strength training and muscle building
- Cardiovascular fitness and endurance
- Weight loss and body composition
- Functional fitness and mobility
- Exercise form and injury prevention
- Progressive overload principles
- Nutrition basics for fitness goals

Guidelines for your responses:
1. Always ask about the user's current fitness level, goals, available equipment, and time constraints
2. Provide detailed, structured workout plans when requested
3. MANDATORY: Structure ALL workouts using EXACTLY these 4 categories IN THIS ORDER:
   - **CALENTAMIENTO** (5-10 min warm-up exercises)
   - **FUERZA** (20-30 min strength/power exercises) 
   - **CARDIO** (15-25 min cardiovascular exercises)
   - **ESTIRAMIENTOS** (5-10 min stretching/cooldown exercises)
4. MANDATORY: Specify sets, reps, rest periods (in seconds), and weights when applicable
5. CRITICAL: ALWAYS include specific rest times for each exercise between sets
6. Explain the purpose of each exercise
7. Give safety tips and form cues
8. Suggest modifications for different fitness levels
9. Be encouraging and motivational
10. Use emojis to make responses engaging
11. Provide structured workout data that can be imported

When creating workouts, ALWAYS organize exercises into these 4 sections with clear headers. Each section should have appropriate exercises for that category.

Focus on proper form, safety, and progressive overload. Adapt recommendations based on the user's fitness level.

Always end your response by telling users they can click the "Import Workout" button to add the routine to their fitness tracker.

CRITICAL REST TIME REQUIREMENTS:
- CALENTAMIENTO: 15-30 seconds rest between exercises
- FUERZA: 60-120 seconds rest between sets (longer for heavy compound movements)
- CARDIO: 30-60 seconds rest between intervals
- ESTIRAMIENTOS: 10-15 seconds rest between stretches

MANDATORY FORMAT for each exercise:
Exercise Name: [sets] sets x [reps] reps, [rest_time] seconds rest, [weight]kg

Examples:
- Sentadillas: 3 sets x 12 reps, 90 seconds rest, 20kg
- Flexiones: 3 sets x 15 reps, 60 seconds rest, bodyweight
- Plancha: 3 sets x 30 seconds, 45 seconds rest, bodyweight
- Burpees: 4 sets x 8 reps, 60 seconds rest, bodyweight

NEVER omit rest times - they are essential for workout structure and safety.`
            },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error connecting to OpenAI. Please check your API key and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const convertTextToWorkoutJSON = async (workoutText: string) => {
    try {
      console.log('🤖 INICIANDO CONVERSIÓN CON IA PARA DÍA INDIVIDUAL...');
      console.log('📝 Texto a procesar:', workoutText.substring(0, 200) + '...');

      const apiKey = ConfigManager.getInstance().getApiKey();
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
              content: `You are an expert workout parser. Convert workout text into structured JSON for a SINGLE DAY with ABSOLUTE PRECISION.

🎯 CRITICAL REQUIREMENTS:
1. Generate UNIQUE dayId (format: day-YYYYMMDD-UNIQUEID)
2. Create proper exercise hierarchy: exerciseTypes -> exercises -> setDetails
3. Each exercise MUST have unique id, name, setDetails array, and MANDATORY restTime
4. setDetails format: [{"set": 1, "reps": 12, "weight": "bodyweight", "completed": false}]
5. MANDATORY: Use ONLY these 4 exercise categories in SPANISH:

MANDATORY EXERCISE CATEGORIES (USE EXACTLY THESE):
- "Calentamiento" (for warm-up exercises)
- "Fuerza" (for strength/power exercises) 
- "Cardio" (for cardiovascular exercises)
- "Estiramientos" (for stretching/cooldown exercises)

CRITICAL: EVERY exercise MUST include restTime field with appropriate values:
- Calentamiento: 15-30 seconds
- Fuerza: 60-120 seconds
- Cardio: 30-60 seconds
- Estiramientos: 10-15 seconds

EXACT JSON STRUCTURE REQUIRED:
{
  "id": "workout-UNIQUETIMESTAMP",
  "dayId": "day-20240101-001", 
  "name": "Workout Name",
  "date": "2024-01-01",
  "estimatedDuration": 45,
  "exerciseTypes": [
    {
      "id": "warmup-TIMESTAMP",
      "name": "Calentamiento",
      "nameSpanish": "Calentamiento",
      "duration": "5-10 min",
      "exercises": [
        {
          "id": "exercise-TIMESTAMP",
          "name": "Exercise Name",
          "exerciseCode": "EX001",
          "sets": 3,
          "reps": 12,
          "weight": 0,
          "weightUnit": "kg",
          "exerciseSubType": "reps",
          "restTime": 60,
          "completed": false,
          "setDetails": [
            {"set": 1, "reps": 12, "weight": "bodyweight", "completed": false},
            {"set": 2, "reps": 12, "weight": "bodyweight", "completed": false},
            {"set": 3, "reps": 12, "weight": "bodyweight", "completed": false}
          ]
        }
      ]
    }
  ]
}

NEVER omit restTime - it is MANDATORY for every exercise. Extract rest times from text like "60 seconds rest" or "90 segundos descanso".

RESPOND WITH CLEAN JSON ONLY - NO MARKDOWN, NO EXPLANATIONS, NO TEXT BEFORE/AFTER`
            },
            {
              role: 'user',
              content: `Parse this single day workout text to structured JSON:\n\n${workoutText}`
            }
          ],
          max_tokens: 4000,
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

      console.log('🤖 IA generated JSON:', jsonContent);
      const parsed = cleanAndParseJSON(jsonContent);
      console.log('✅ Cleaned and parsed JSON:', parsed);
      return parsed;

    } catch (error) {
      console.error('❌ Error in AI conversion:', error);
      throw error;
    }
  };

  const cleanAndParseJSON = (jsonString: string) => {
    let cleaned = jsonString.trim();

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```json\s*/, '').replace(/\s*```$/, '');
    cleaned = cleaned.replace(/```\s*/, '').replace(/\s*```$/, '');

    // Find JSON start
    const jsonStart = Math.min(
      cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
      cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
    );

    if (jsonStart !== Infinity) {
      cleaned = cleaned.substring(jsonStart);
    }

    // Find JSON end
    let braceCount = 0;
    let bracketCount = 0;
    let jsonEnd = -1;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;

      if (braceCount === 0 && bracketCount === 0 && i > 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonEnd !== -1) {
      cleaned = cleaned.substring(0, jsonEnd);
    }

    // Fix common JSON issues
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1').replace(/([}\]])\s*([{\[])/g, '$1,$2');

    console.log('🧹 Final cleaned JSON:', cleaned);

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('❌ JSON parse failed:', error);
      console.log('🔧 Attempting advanced fixes...');

      // Try to fix unquoted values
      let fixed = cleaned.replace(/:\s*([a-zA-Z][^",}]*)\s*([,}])/g, ': "$1"$2');
      fixed = fixed.replace(/"\s*:\s*"([^"]*)"([^",}])/g, '": "$1$2"');

      return JSON.parse(fixed);
    }
  };

  const handleImportWorkout = async () => {
    setIsImporting(true);

    try {
      console.log('🚀 INICIANDO IMPORTACIÓN SECUENCIAL DÍA POR DÍA...');

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('No hay mensaje del asistente para procesar');
      }

      const workoutText = lastMessage.content;
      console.log('📝 Texto completo del workout:', workoutText.substring(0, 500) + '...');

      // Detectar si es múltiples días
      const dayMatches = workoutText.match(/d[íi]a\s*\d+|day\s*\d+/gi) || [];
      const isDays = dayMatches.length > 1;

      console.log('🔍 Días detectados:', dayMatches.length, isDays ? 'MÚLTIPLES DÍAS' : 'DÍA ÚNICO');

      if (isDays) {
        // Procesamiento secuencial para múltiples días
        console.log('📅 PROCESANDO MÚLTIPLES DÍAS SECUENCIALMENTE...');

        const processedWorkouts: Workout[] = [];

        // Dividir el texto por días
        const daysSplit = workoutText.split(/(?=d[íi]a\s*\d+|day\s*\d+)/gi).filter(day => day.trim());
        console.log('📊 Días divididos:', daysSplit.length);

        for (let i = 0; i < daysSplit.length; i++) {
          const dayText = daysSplit[i].trim();
          if (!dayText) continue;

          console.log(`\n=== 📅 PROCESANDO DÍA ${i + 1}/${daysSplit.length} ===`);
          console.log('📝 Texto del día:', dayText.substring(0, 200) + '...');

          try {
            const workoutData = await convertTextToWorkoutJSON(dayText);
            const processedWorkout = processWorkoutData(workoutData, i);

            if (processedWorkout && processedWorkout.id && processedWorkout.name) {
              processedWorkouts.push(processedWorkout);
              console.log(`✅ DÍA ${i + 1} PROCESADO EXITOSAMENTE:`, processedWorkout.name);
              console.log(`🆔 ID: ${processedWorkout.id}, DayId: ${processedWorkout.dayId}`);
            } else {
              console.warn(`⚠️ Workout procesado para día ${i + 1} es inválido:`, processedWorkout);
            }
          } catch (error) {
            console.error(`❌ Error procesando día ${i + 1}:`, error);
            // Continuar con el siguiente día en lugar de fallar completamente
          }
        }

        // Enviar todos los workouts procesados juntos
        if (processedWorkouts.length > 0) {
          console.log(`\n🚀 ENVIANDO ${processedWorkouts.length} WORKOUTS PROCESADOS COMO ARRAY...`);
          processedWorkouts.forEach((workout, index) => {
            console.log(`   ${index + 1}. "${workout.name}" (ID: ${workout.id}, DayId: ${workout.dayId})`);
          });

          // Validar que todos los workouts tengan datos mínimos requeridos
          const validWorkouts = processedWorkouts.filter(w => 
            w && w.id && w.name && w.exerciseTypes && Array.isArray(w.exerciseTypes)
          );

          if (validWorkouts.length > 0) {
            onWorkoutGenerated(validWorkouts);
            console.log('✅ TODOS LOS WORKOUTS ENVIADOS EXITOSAMENTE');

            // Mensaje de éxito al usuario
            const successMessage: Message = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: `✅ ¡Importación exitosa! Se importaron ${validWorkouts.length} rutina(s) de entrenamiento. Puedes verlas en "Your Workouts".`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, successMessage]);
          } else {
            throw new Error('No se pudieron validar los workouts procesados');
          }
        } else {
          throw new Error('No se pudieron procesar workouts válidos');
        }

      } else {
        // Procesamiento de día único
        console.log('📅 PROCESANDO DÍA ÚNICO...');
        const workoutData = await convertTextToWorkoutJSON(workoutText);
        const processedWorkout = processWorkoutData(workoutData, 0);

        if (processedWorkout && processedWorkout.id && processedWorkout.name) {
          console.log('🚀 ENVIANDO WORKOUT ÚNICO...');
          onWorkoutGenerated(processedWorkout);
          console.log('✅ WORKOUT ÚNICO ENVIADO EXITOSAMENTE');

          // Mensaje de éxito al usuario
          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✅ ¡Importación exitosa! La rutina "${processedWorkout.name}" ha sido importada. Puedes verla en "Your Workouts".`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, successMessage]);
        } else {
          throw new Error('El workout procesado no es válido');
        }
      }

    } catch (error) {
      console.error('❌ Error importing workout:', error);
      const errorDetails = error instanceof Error ? error.message : 'Error desconocido';

      // Mensaje de error al usuario
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: `❌ Error al importar la rutina: ${errorDetails}. Por favor, intenta nuevamente o reformula tu solicitud de rutina.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);

      // No mostrar alert para evitar interrumpir la UX
    } finally {
      setIsImporting(false);
    }
  };

  const processWorkoutData = (data: any, dayIndex: number): Workout | null => {
    try {
      console.log(`🔄 Procesando datos del workout día ${dayIndex + 1}:`, data);

      if (!data || typeof data !== 'object') {
        console.error('❌ Datos de workout inválidos:', data);
        return null;
      }

      const timestamp = Date.now() + dayIndex * 1000; // Mayor separación entre IDs
      const uniqueId = `workout-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      const dayId = `day-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(dayIndex + 1).padStart(3, '0')}`;

      console.log(`🆔 IDs generados - WorkoutId: ${uniqueId}, DayId: ${dayId}`);

      const workout: Workout = {
        id: data.id || uniqueId,
        dayId: data.dayId || dayId,
        name: data.name || `Entrenamiento ${dayIndex + 1}`,
        date: data.date || new Date().toISOString().split('T')[0],
        estimatedDuration: Number(data.estimatedDuration) || 45,
        exerciseTypes: [],
        completed: false
      };

      if (data.exerciseTypes && Array.isArray(data.exerciseTypes)) {
        workout.exerciseTypes = data.exerciseTypes
          .filter((type: any) => type && typeof type === 'object')
          .map((type: any, typeIndex: number) => {
            const exerciseType = {
              id: type.id || `type-${timestamp}-${typeIndex}-${Math.random().toString(36).substr(2, 5)}`,
              name: type.name || 'Ejercicios',
              nameSpanish: type.nameSpanish || type.name || 'Ejercicios',
              duration: type.duration || '30 min',
              exercises: []
            };

            if (Array.isArray(type.exercises)) {
              exerciseType.exercises = type.exercises
                .filter((exercise: any) => exercise && typeof exercise === 'object' && exercise.name)
                .map((exercise: any, exerciseIndex: number) => {
                  // Determinar tiempo de descanso por defecto basado en el tipo de ejercicio
                  const getDefaultRestTime = (exerciseTypeName: string) => {
                    const typeName = exerciseTypeName.toLowerCase();
                    if (typeName.includes('calentamiento')) return 20;
                    if (typeName.includes('fuerza')) return 90;
                    if (typeName.includes('cardio')) return 45;
                    if (typeName.includes('estiramiento')) return 15;
                    return 60; // Default fallback
                  };

                  const defaultRestTime = getDefaultRestTime(type.nameSpanish || type.name || '');

                  const processedExercise = {
                    id: exercise.id || `exercise-${timestamp}-${typeIndex}-${exerciseIndex}-${Math.random().toString(36).substr(2, 5)}`,
                    name: exercise.name || `Ejercicio ${exerciseIndex + 1}`,
                    exerciseCode: exercise.exerciseCode || `EX${String(exerciseIndex + 1).padStart(3, '0')}`,
                    sets: Number(exercise.sets) || 3,
                    reps: Number(exercise.reps) || 10,
                    weight: Number(exercise.weight) || 0,
                    weightUnit: exercise.weightUnit || 'kg',
                    exerciseSubType: exercise.exerciseSubType || 'reps',
                    restTime: Number(exercise.restTime) || defaultRestTime,
                    completed: false,
                    setDetails: []
                  };

                  // Procesar setDetails si existen
                  if (Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0) {
                    processedExercise.setDetails = exercise.setDetails.map((set: any, setIndex: number) => ({
                      id: set.id || `set-${timestamp}-${setIndex}`,
                      set: Number(set.set) || setIndex + 1,
                      reps: Number(set.reps) || processedExercise.reps,
                      weight: set.weight === 'bodyweight' ? 'bodyweight' : Number(set.weight) || processedExercise.weight,
                      completed: Boolean(set.completed),
                      weightUnit: set.weightUnit || processedExercise.weightUnit
                    }));
                  } else {
                    // Crear setDetails por defecto
                    processedExercise.setDetails = Array.from({ length: processedExercise.sets }, (_, setIndex) => ({
                      id: `set-${timestamp}-${exerciseIndex}-${setIndex}`,
                      set: setIndex + 1,
                      reps: processedExercise.reps,
                      weight: processedExercise.weight,
                      completed: false,
                      weightUnit: processedExercise.weightUnit
                    }));
                  }

                  return processedExercise;
                });
            }

            return exerciseType;
          });
      }

      // Validar que el workout tenga al menos un ejercicio
      const totalExercises = workout.exerciseTypes.reduce((total, type) => total + type.exercises.length, 0);
      if (totalExercises === 0) {
        console.warn(`⚠️ Workout ${workout.name} no tiene ejercicios válidos`);
        return null;
      }

      console.log(`✅ Workout procesado para día ${dayIndex + 1}:`, {
        id: workout.id,
        dayId: workout.dayId,
        name: workout.name,
        exerciseTypesCount: workout.exerciseTypes.length,
        totalExercises
      });

      return workout;
    } catch (error) {
      console.error(`❌ Error procesando workout para día ${dayIndex + 1}:`, error);
      return null;
    }
  };

  if (showApiKeyInput) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">OpenAI API Key Required</h3>
          <form onSubmit={handleApiKeySubmit}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key (sk-...)"
              className="w-full p-2 border rounded mb-4"
              required
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <Bot className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-semibold">AI Fitness Coach</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-start">
                  {msg.role === 'assistant' && (
                    <Bot className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  {msg.role === 'user' && (
                    <User className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  )}
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
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
              disabled={isImporting}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImporting ? (
                <Loader className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Import className="w-4 h-4 mr-1" />
              )}
              {isImporting ? 'Importing...' : 'Import Workout'}
            </button>
            <button
              onClick={resetChat}
              className="flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Reset Chat
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Ask about workouts, exercises, or fitness advice... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[60px] max-h-[200px] overflow-y-auto"
              disabled={isLoading}
              rows={Math.min(Math.max(1, message.split('\n').length), 8)}
              style={{
                height: 'auto',
                minHeight: '60px',
                maxHeight: '200px'
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !message.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};