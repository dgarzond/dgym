import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Loader, Import } from 'lucide-react';
import type { Workout } from '../types';
import { api } from '../utils/api';
import {
  parseWorkoutImportJsonString,
  ParseWorkoutImportJsonError,
} from '../utils/workoutImportJsonParse';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  onWorkoutGenerated: (workout: Workout | Workout[]) => void;
  onClose: () => void;
  userId?: number;
}

/** Browsers/devtools often truncate one long string in console.log; log length + chunks. */
function debugLogLongJson(label: string, text: string | undefined): void {
  if (text == null || text === '') {
    console.log(label, '(vacío)');
    return;
  }
  console.log(label, `(${text.length} caracteres)`);
  const chunkSize = 8000;
  for (let i = 0; i < text.length; i += chunkSize) {
    const part = text.slice(i, i + chunkSize);
    console.log(`${label} [${i}–${i + part.length}]`, part);
  }
}

export const ChatBot: React.FC<ChatBotProps> = ({ onWorkoutGenerated, onClose, userId }) => {
  // Keep the chat ephemeral (memory-only). We persist only the final routine event
  // to the backend as a "generated routine" record, not the full conversation.
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: '1',
      role: 'assistant' as const,
      content: `¡Hola! 👋 Soy tu entrenador personal con IA. Te ayudaré a crear rutinas de entrenamiento personalizadas basadas en tus objetivos, nivel de experiencia y equipo disponible. ¡Cuéntame sobre tus metas fitness y empecemos a entrenar! 💪

Hi! 👋 I'm your AI personal trainer. I'll help you create personalized workout routines based on your goals, experience level, and available equipment. Tell me about your fitness goals and let's start training! 💪`,
      timestamp: new Date(),
    },
  ]);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const generatedRoutineIdByAssistantMessageId = useRef<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
  };

  const formatMessage = (content: string) => {
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/💪|🏋️‍♂️|🏋️‍♀️|🔥|⚡|✅|🎯/g, (match) => match);
    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

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
      const systemPrompt = `You are a highly experienced and certified personal trainer with over 15 years of experience. You specialize in creating personalized workout routines for people of all fitness levels.

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

      const data = await api.aiChat({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data?.content || "I'm sorry, I couldn't generate a response.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Persist only the final assistant result as a "generated routine" record.
      // This avoids storing the full multi-turn conversation.
      if (userId) {
        try {
          const created = await api.createGeneratedRoutine({
            userId,
            clientGeneratedId: aiMessage.id,
            routineText: aiMessage.content,
            imported: false,
            source: 'ai',
          });
          if (created?.id) {
            generatedRoutineIdByAssistantMessageId.current[aiMessage.id] = Number(created.id);
          }
        } catch (error) {
          console.error('❌ Error guardando rutina generada:', error);
        }
      }
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

      const data = await api.aiChat({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
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
            // Avoid template literals: assistant text may contain ` or ${...} and break interpolation.
            content: 'Parse this single day workout text to structured JSON:\n\n' + workoutText,
          },
        ],
        max_tokens: 4096,
        temperature: 0.1,
      });

      const jsonContent = (data?.content as string | undefined)?.trim();
      console.log('🤖 IA single-day JSON meta:', {
        length: jsonContent?.length ?? 0,
        completionTokens: data?.usage?.completion_tokens,
      });
      debugLogLongJson('🤖 IA generated JSON', jsonContent);

      if (!jsonContent) {
        throw new Error('No content received from AI');
      }
      const parsed = parseWorkoutImportJsonString(jsonContent);
      console.log('✅ Cleaned and parsed JSON:', parsed);
      return parsed;

    } catch (error) {
      console.error('❌ Error in AI conversion:', error);
      throw error;
    }
  };

  const convertTextToWeeklyRoutineJSON = async (workoutText: string) => {
    try {
      console.log('🤖 INICIANDO CONVERSIÓN CON IA PARA RUTINA SEMANAL COMPLETA...');

      const data = await api.aiChat({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert workout parser. Convert workout text into a single structured JSON for a WHOLE WEEK with ABSOLUTE PRECISION.

🎯 CRITICAL REQUIREMENTS:
1. Return an object representing a WEEKLY PLAN.
2. Structure: { "isWeeklyPlan": true, "weekNumber": number, "year": number, "name": "Weekly Plan Name", "workouts": [ ... ] }
3. Each workout in the array must follow the SINGLE DAY format (id, dayId, name, date, estimatedDuration, exerciseTypes).
4. For each workout, create proper exercise hierarchy: exerciseTypes -> exercises -> setDetails.

MANDATORY EXERCISE CATEGORIES (USE EXACTLY THESE IN SPANISH):
- "Calentamiento" (for warm-up exercises)
- "Fuerza" (for strength/power exercises) 
- "Cardio" (for cardiovascular exercises)
- "Estiramientos" (for stretching/cooldown exercises)

EXACT JSON STRUCTURE REQUIRED FOR EACH WORKOUT:
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

CRITICAL RULES:
- EVERY exercise MUST have: sets, reps (or duration), weight, weightUnit, exerciseSubType, restTime at the EXERCISE level
- setDetails should ONLY have: set, reps (or duration), weight, completed - NOT "sets" or "restTime"
- restTime belongs at EXERCISE level, NOT in setDetails
- NEVER put "sets" field inside setDetails array
- restTime values: Calentamiento 15-30s, Fuerza 60-120s, Cardio 30-60s, Estiramientos 10-15s

RESPOND WITH CLEAN JSON ONLY - NO MARKDOWN, NO EXPLANATIONS.`
          },
          {
            role: 'user',
            // Avoid template literals: assistant text may contain ` or ${...} and break interpolation.
            content: 'Parse this weekly workout plan to a single structured JSON:\n\n' + workoutText,
          },
        ],
        max_tokens: 12000,
        temperature: 0.1,
      });

      const jsonContent = (data?.content as string | undefined)?.trim();
      console.log('🤖 IA weekly JSON meta:', {
        length: jsonContent?.length ?? 0,
        completionTokens: data?.usage?.completion_tokens,
      });
      debugLogLongJson('🤖 IA generated Weekly JSON', jsonContent);
      if (!jsonContent) {
        throw new Error('No content received from AI');
      }
      return parseWorkoutImportJsonString(jsonContent);
    } catch (error) {
      console.error('❌ Error in AI weekly conversion:', error);
      throw error;
    }
  };

  const handleImportWorkout = async () => {
    setIsImporting(true);

    try {
      console.log('🚀 INICIANDO IMPORTACIÓN...');

      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'assistant') {
        throw new Error('No hay mensaje del asistente para procesar');
      }

      const workoutText = lastMessage.content;
      const generatedRoutineId = userId
        ? generatedRoutineIdByAssistantMessageId.current[lastMessage.id]
        : undefined;
      
      // Detectar si parece ser una semana completa
      const dayMatches = workoutText.match(/d[íi]a\s*\d+|day\s*\d+/gi) || [];
      const isMultipleDays = dayMatches.length > 1;

      console.log('🔍 Análisis de texto:', dayMatches.length, isMultipleDays ? 'MÚLTIPLES DÍAS' : 'DÍA ÚNICO');

      if (isMultipleDays) {
        console.log('📅 PROCESANDO COMO RUTINA SEMANAL...');
        const weeklyData = await convertTextToWeeklyRoutineJSON(workoutText);

        if (!weeklyData || typeof weeklyData !== 'object') {
          throw new Error(
            'La rutina semanal no tiene un formato válido después de convertirla. Pide a la IA un plan con array "workouts".'
          );
        }
        if (!Array.isArray((weeklyData as { workouts?: unknown }).workouts)) {
          throw new Error(
            'Falta el array "workouts" en el JSON del plan semanal. Vuelve a generar la rutina o importa día por día.'
          );
        }
        const workoutsRaw = (weeklyData as { workouts: unknown[] }).workouts;
        if (workoutsRaw.length === 0) {
          throw new Error('El plan semanal no contiene ningún día en "workouts".');
        }

        const processedWorkouts: Workout[] = [];
        for (let i = 0; i < workoutsRaw.length; i++) {
          const processed = await processWorkoutData(workoutsRaw[i], i);
          if (processed) {
            processedWorkouts.push(processed);
          }
        }

        if (processedWorkouts.length === 0) {
          throw new Error(
            'Ningún día se pudo importar: revisa que cada día tenga ejercicios válidos o pide a la IA una rutina más clara.'
          );
        }

        const finalPlan = {
          ...weeklyData,
          isWeeklyPlan: true,
          workouts: processedWorkouts,
        };
        console.log('📦 Enviando plan semanal a App.tsx:', finalPlan);
        onWorkoutGenerated(finalPlan);

        // Mark generated routine as imported and attach structured JSON.
        // (We intentionally do NOT persist the whole chat transcript.)
        if (userId && generatedRoutineId) {
          try {
            await api.updateGeneratedRoutine({
              id: generatedRoutineId,
              userId,
              imported: true,
              routineJson: finalPlan,
            });
          } catch (error) {
            console.error('❌ Error actualizando rutina generada (weekly):', error);
          }
        }

        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ ¡Importación semanal exitosa! Se han importado ${processedWorkouts.length} rutinas vinculadas a la semana ${(weeklyData as { weekNumber?: number }).weekNumber ?? 'actual'}.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        console.log('🏋️‍♂️ PROCESANDO COMO DÍA ÚNICO...');
        const workoutData = await convertTextToWorkoutJSON(workoutText);
        const processedWorkout = await processWorkoutData(workoutData, 0);

        // No verificar el ID aquí porque el backend lo generará automáticamente
        // Solo verificar que el workout tenga un nombre válido
        if (processedWorkout && processedWorkout.name) {
          onWorkoutGenerated(processedWorkout);

          console.log(
            '📝 Workout enviado a App.tsx. El chat se guardará después de que el workout tenga ID.'
          );

          const successMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `✅ ¡Importación exitosa! La rutina "${processedWorkout.name}" ha sido importada.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, successMessage]);

          if (userId && generatedRoutineId) {
            try {
              await api.updateGeneratedRoutine({
                id: generatedRoutineId,
                userId,
                imported: true,
                routineJson: processedWorkout,
              });
            } catch (error) {
              console.error('❌ Error actualizando rutina generada (single):', error);
            }
          }
        } else {
          throw new Error(
            'No se pudo construir la rutina del día (sin nombre o sin datos válidos). Pide a la IA la tabla de ejercicios de nuevo.'
          );
        }
      }

    } catch (error) {
      console.error('❌ Error importing:', error);
      const detail =
        error instanceof ParseWorkoutImportJsonError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Error desconocido';
      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: `❌ No se pudo importar la rutina.\n\n${detail}\n\nPuedes pedir otra vez el plan en formato JSON o usar **Import Workout** tras una respuesta más corta.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsImporting(false);
    }
  };

  // Helper function to get start of week (Monday)
  const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    return new Date(d.setDate(diff));
  };

  const processWorkoutData = async (data: any, dayIndex: number): Promise<Workout | null> => {
    try {
      console.log(`🔄 Procesando datos del workout día ${dayIndex + 1}:`, data);

      if (!data || typeof data !== 'object') {
        console.error('❌ Datos de workout inválidos:', data);
        return null;
      }

      // Calcular la fecha del workout basándose en el inicio de la semana actual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = getStartOfWeek(today);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      let workoutDate: string;
      
      // Si el AI proporcionó una fecha, validarla contra el rango de la semana
      if (data.date) {
        const providedDate = new Date(data.date);
        providedDate.setHours(0, 0, 0, 0);
        
        // Si la fecha proporcionada está dentro del rango de la semana, usarla
        if (providedDate >= weekStart && providedDate <= weekEnd) {
          workoutDate = providedDate.toISOString().split('T')[0];
        } else {
          // Si está fuera del rango, calcular basándose en dayIndex
          const calculatedDate = new Date(weekStart);
          calculatedDate.setDate(weekStart.getDate() + Math.min(dayIndex, 6));
          workoutDate = calculatedDate.toISOString().split('T')[0];
        }
      } else {
        // Si no hay fecha proporcionada, calcular basándose en dayIndex
        // dayIndex 0 = lunes, 1 = martes, etc.
        const calculatedDate = new Date(weekStart);
        calculatedDate.setDate(weekStart.getDate() + Math.min(dayIndex, 6));
        
        // Asegurar que la fecha no sea anterior a hoy (si estamos en la semana actual)
        const todayDate = new Date(today);
        if (calculatedDate < todayDate && todayDate >= weekStart && todayDate <= weekEnd) {
          // Si la fecha calculada es anterior a hoy, usar hoy o el próximo día disponible
          workoutDate = todayDate.toISOString().split('T')[0];
        } else {
          workoutDate = calculatedDate.toISOString().split('T')[0];
        }
      }
      
      // Validación final: asegurar que la fecha esté dentro del rango de la semana
      const finalDateObj = new Date(workoutDate);
      if (finalDateObj < weekStart) {
        workoutDate = weekStart.toISOString().split('T')[0];
      } else if (finalDateObj > weekEnd) {
        workoutDate = weekEnd.toISOString().split('T')[0];
      }
      const dayId = `day-${workoutDate.replace(/-/g, '')}-${String(dayIndex + 1).padStart(3, '0')}`;
      
      console.log(`📅 Fecha asignada al workout día ${dayIndex + 1}:`, {
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        workoutDate: workoutDate,
        dayIndex: dayIndex
      });

      console.log(`🔄 Preparando workout - DayId: ${dayId}, Date: ${workoutDate}`);
      console.log('ℹ️ El ID será generado automáticamente por el backend (código numérico secuencial)');

      const workout: Workout = {
        id: undefined, // El backend generará el ID automáticamente
        dayId: data.dayId || dayId,
        name: data.name || `Entrenamiento ${dayIndex + 1}`,
        date: workoutDate,
        estimatedDuration: Number(data.estimatedDuration) || 45,
        exerciseTypes: [],
        completed: false
      };

      if (data.exerciseTypes && Array.isArray(data.exerciseTypes)) {
        workout.exerciseTypes = await Promise.all(
          data.exerciseTypes
            .filter((type: any) => type && typeof type === 'object')
            .map(async (type: any, typeIndex: number) => {
              const exerciseType = {
                id: type.id || `type-${dayIndex}-${typeIndex}`, // ID temporal basado en índice
                name: type.name || 'Ejercicios',
                nameSpanish: type.nameSpanish || type.name || 'Ejercicios',
                duration: type.duration || '30 min',
                exercises: []
              };

            if (Array.isArray(type.exercises)) {
              // Procesar exercises de forma asíncrona para generar IDs únicos
              const exercisesPromises = type.exercises
                .filter((exercise: any) => exercise && typeof exercise === 'object' && exercise.name)
                .map(async (exercise: any, exerciseIndex: number) => {
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

                  // NORMALIZACIÓN: Extraer información de setDetails si no está en el ejercicio
                  let setsFromDetails = 0;
                  let repsFromDetails: number | null = null;
                  let durationFromDetails: number | null = null;
                  let restTimeFromDetails: number | null = null;
                  let weightFromDetails: number = 0;

                  if (Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0) {
                    setsFromDetails = exercise.setDetails.length;
                    // Extraer reps del primer set si existe
                    if (exercise.setDetails[0]?.reps != null) {
                      repsFromDetails = Number(exercise.setDetails[0].reps);
                    }
                    // Extraer duration del primer set si existe
                    if (exercise.setDetails[0]?.duration != null) {
                      durationFromDetails = Number(exercise.setDetails[0].duration);
                    }
                    // Extraer restTime del primer set si existe (aunque debería estar en el ejercicio)
                    // Buscar en diferentes formatos: restTime, rest, rest_time
                    if (exercise.setDetails[0]?.restTime != null) {
                      restTimeFromDetails = Number(exercise.setDetails[0].restTime);
                    } else if (exercise.setDetails[0]?.rest != null) {
                      restTimeFromDetails = Number(exercise.setDetails[0].rest);
                    } else if (exercise.setDetails[0]?.rest_time != null) {
                      restTimeFromDetails = Number(exercise.setDetails[0].rest_time);
                    } else {
                      // Buscar restTime en cualquier set con diferentes nombres de campo
                      for (const set of exercise.setDetails) {
                        if (set.restTime != null && set.restTime !== '') {
                          restTimeFromDetails = Number(set.restTime);
                          break;
                        } else if (set.rest != null && set.rest !== '') {
                          restTimeFromDetails = Number(set.rest);
                          break;
                        } else if (set.rest_time != null && set.rest_time !== '') {
                          restTimeFromDetails = Number(set.rest_time);
                          break;
                        }
                      }
                    }
                    
                    // También buscar restTime directamente en el objeto exercise si viene en diferentes formatos
                    if (restTimeFromDetails == null && exercise.rest != null && exercise.rest !== '') {
                      restTimeFromDetails = Number(exercise.rest);
                    }
                    if (restTimeFromDetails == null && exercise.rest_time != null && exercise.rest_time !== '') {
                      restTimeFromDetails = Number(exercise.rest_time);
                    }
                    
                    // Extraer weight del primer set si existe
                    if (exercise.setDetails[0]?.weight != null) {
                      const weight = exercise.setDetails[0].weight;
                      weightFromDetails = weight === 'bodyweight' ? 0 : Number(weight) || 0;
                    }
                  }
                  
                  // Log para debugging del restTime
                  console.log(`🔍 Debug restTime para ejercicio "${exercise.name}":`, {
                    'exercise.restTime': exercise.restTime,
                    'exercise.rest': exercise.rest,
                    'exercise.rest_time': exercise.rest_time,
                    'restTimeFromDetails': restTimeFromDetails,
                    'defaultRestTime': defaultRestTime,
                    'final restTime calculado': exercise.restTime != null && exercise.restTime !== '' ? Number(exercise.restTime) : (restTimeFromDetails != null ? restTimeFromDetails : defaultRestTime)
                  });

                  // El backend generará el ID automáticamente
                  // Usar nullish coalescing (??) en lugar de || para evitar que 0 se convierta en valor por defecto
                  const processedExercise = {
                    id: undefined, // El backend generará el ID automáticamente
                    name: exercise.name || `Ejercicio ${exerciseIndex + 1}`,
                    exerciseCode: exercise.exerciseCode || `EX${String(exerciseIndex + 1).padStart(3, '0')}`,
                    // Extraer sets del ejercicio, o de setDetails, o usar default
                    sets: exercise.sets != null ? Number(exercise.sets) : (setsFromDetails > 0 ? setsFromDetails : 3),
                    // Extraer reps del ejercicio, o de setDetails, o null si es ejercicio de duración
                    reps: exercise.reps != null ? Number(exercise.reps) : repsFromDetails,
                    // Extraer duration del ejercicio, o de setDetails
                    duration: exercise.duration != null ? Number(exercise.duration) : durationFromDetails,
                    durationUnit: exercise.durationUnit || 'seconds',
                    // Extraer weight del ejercicio, o de setDetails, o 0
                    weight: exercise.weight != null ? Number(exercise.weight) : weightFromDetails,
                    weightUnit: exercise.weightUnit || 'kg',
                    // Determinar si es reps o duration basado en los datos disponibles
                    exerciseSubType: exercise.exerciseSubType || (durationFromDetails != null || exercise.duration != null ? 'duration' : 'reps'),
                    // Extraer restTime del ejercicio, o de setDetails, o usar default
                    // Convertir a número y asegurar que no sea NaN o 0
                    restTime: (() => {
                      let restTimeValue: number;
                      if (exercise.restTime != null && exercise.restTime !== '') {
                        restTimeValue = Number(exercise.restTime);
                        if (!isNaN(restTimeValue) && restTimeValue > 0) {
                          return restTimeValue;
                        }
                      }
                      if (restTimeFromDetails != null) {
                        restTimeValue = Number(restTimeFromDetails);
                        if (!isNaN(restTimeValue) && restTimeValue > 0) {
                          return restTimeValue;
                        }
                      }
                      return defaultRestTime;
                    })(),
                    completed: false,
                    setDetails: []
                  };

                  // Procesar setDetails si existen
                  if (Array.isArray(exercise.setDetails) && exercise.setDetails.length > 0) {
                    processedExercise.setDetails = exercise.setDetails.map((set: any, setIndex: number) => {
                      // Normalizar: si setDetails tiene "sets", ignorarlo y usar el índice
                      const setNumber = set.set != null ? Number(set.set) : (setIndex + 1);
                      
                      return {
                        id: set.id || `set-${setIndex + 1}`, // ID temporal, se actualizará con el exerciseId del backend
                        set: setNumber,
                        // Extraer reps del set, o del ejercicio
                        reps: set.reps != null ? Number(set.reps) : processedExercise.reps,
                        // Extraer duration del set, o del ejercicio
                        duration: set.duration != null ? Number(set.duration) : processedExercise.duration,
                        // Extraer weight del set, o del ejercicio
                        weight: set.weight === 'bodyweight' ? 'bodyweight' : (set.weight != null ? Number(set.weight) : processedExercise.weight),
                        completed: Boolean(set.completed),
                        weightUnit: set.weightUnit || processedExercise.weightUnit
                      };
                    });
                  } else {
                    // Crear setDetails por defecto basado en los valores del ejercicio
                    processedExercise.setDetails = Array.from({ length: processedExercise.sets }, (_, setIndex) => ({
                      id: `set-${setIndex + 1}`, // ID temporal, se actualizará con el exerciseId del backend
                      set: setIndex + 1,
                      reps: processedExercise.reps,
                      duration: processedExercise.duration,
                      weight: processedExercise.weight,
                      completed: false,
                      weightUnit: processedExercise.weightUnit
                    }));
                  }

                  return processedExercise;
                });
              
              exerciseType.exercises = await Promise.all(exercisesPromises);
            }

            return exerciseType;
          })
        );
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