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
  onWorkoutGenerated: (workout: Workout | Workout[]) => void;
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
  const [isImporting, setIsImporting] = useState(false);

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

🏷️ EXERCISE IDENTIFICATION SYSTEM:
CRITICAL: For each exercise, assign a unique CODE in the format [EX001], [EX002], etc. This code must be:
- Unique for each different exercise type
- Stable (same exercise = same code across all workouts)
- Included at the end of exercise name

Example: "Sentadillas [EX001]: 3 sets x 12 reps"

🆔 DAY IDENTIFICATION SYSTEM:
CRITICAL: When creating multiple-day workouts, assign a unique DAY ID to each day in the format [DAY001], [DAY002], etc.
- Each day must have a unique day ID
- Include the day ID in the workout name
- This prevents duplicate days from being created
- ALWAYS generate dayId even for single day workouts (use [DAY001])

Example: "Día 1 - Tren Superior [DAY001]", "Día 2 - Tren Inferior [DAY002]"

Standard exercise codes to use:
- [EX001] Sentadillas/Squats
- [EX002] Press de banca/Bench press
- [EX003] Peso muerto/Deadlift
- [EX004] Press militar/Military press
- [EX005] Dominadas/Pull-ups
- [EX006] Flexiones/Push-ups
- [EX007] Plancha/Plank
- [EX008] Burpees
- [EX009] Caminata/Walking
- [EX010] Trote/Jogging
- [EX011] Bicicleta/Cycling
- [EX012] Estiramiento de cuádriceps/Quad stretch
- [EX013] Estiramiento de isquiotibiales/Hamstring stretch
- [EX014] Remo con barra/Barbell row
- [EX015] Curl de bíceps/Bicep curl
- [EX016] Extensión de tríceps/Tricep extension
- [EX017] Elevaciones laterales/Lateral raises
- [EX018] Zancadas/Lunges
- [EX019] Fondos/Dips
- [EX020] Abdominales/Crunches

For new exercises not in this list, assign the next available number (EX021, EX022, etc.)

MULTI-DAY FORMAT:
When creating plans with multiple days, clearly separate them:

Día 1:
🔥 Calentamiento:
- Exercise name [EX###]: sets x reps/duration

💪 Fuerza:
- Exercise name [EX###]: sets x reps/duration

⚡ Cardio:
- Exercise name [EX###]: sets x duration

✅ Estiramiento:
- Exercise name [EX###]: sets x duration

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
- Exercise name [EX###]: sets x reps/duration

Examples:
- Sentadillas [EX001]: 3 sets x 12 reps
- Plancha [EX007]: 3 sets x 30 seconds
- Caminata [EX009]: 1 set x 20 minutes
- Bicicleta estática [EX011]: 1 set x 5 kilometers

RULES:
- ALWAYS include exercise codes [EX###] at the end of exercise names
- Always use "sets" and "x" between sets and reps/duration
- For strength exercises: use "reps" 
- For time-based exercises: use "seconds" or "minutes"
- For cardio distance: use "meters" or "kilometers"
- Include weight if relevant: "- Press militar [EX004]: 3 sets x 10 reps @ 20 kg"
- When creating multiple days, clearly label each as "Día 1:", "Día 2:", etc.
- Exercise codes ensure unique identification and prevent duplicates

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
          max_tokens: 1000, // Increased for better responses
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

  // 🚀 OPTIMIZED AI CONVERSION FUNCTION
  const convertTextToWorkoutJSON = async (textToProcess: string) => {
    try {
      console.log('🤖 INICIANDO CONVERSIÓN CON IA OPTIMIZADA...');
      console.log('📝 Texto a procesar:', textToProcess.substring(0, 200) + '...');

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
              content: `You are an expert workout parser. Convert workout text into structured JSON with ABSOLUTE PRECISION.

🎯 CRITICAL PARSING RULES:

1. DETECT MULTIPLE DAYS:
   - Look for patterns: "Día 1:", "Day 1:", "Día 2:", "Day 2:", etc.
   - If found: Return {"workouts": [...]} format
   - If single day: Return single workout object

2. MANDATORY FIELDS - NEVER OMIT:
   - "dayId": REQUIRED for every workout (DAY001, DAY002, etc.)
   - "workoutName": Descriptive name
   - "estimatedDuration": Time estimate
   - "exerciseTypes": Array of exercise categories

3. EXERCISE TYPES STRUCTURE:
   {
     "id": "warmup|power|cardio|stretching",
     "name": "English name",
     "nameSpanish": "Spanish name",
     "duration": "5-10 min",
     "exercises": [...]
   }

4. EXERCISE STRUCTURE:
   {
     "name": "Exercise name (NO codes)",
     "exerciseCode": "EX001",
     "sets": number,
     "reps": number (for reps-based),
     "duration": number (for time-based),
     "durationUnit": "seconds|minutes|meters|kilometers",
     "exerciseSubType": "reps|duration",
     "weight": number,
     "weightUnit": "kg"
   }

5. CATEGORY MAPPING:
   - 🔥/Calentamiento/Warm → "warmup"
   - 💪/Fuerza/Strength → "power"
   - ⚡/Cardio → "cardio"
   - ✅/Estiramiento/Stretch → "stretching"

6. PARSING PATTERNS:
   - "3 sets x 12 reps" → sets:3, reps:12, exerciseSubType:"reps"
   - "3 sets x 30 seconds" → sets:3, duration:30, durationUnit:"seconds", exerciseSubType:"duration"
   - "1 set x 20 minutes" → sets:1, duration:20, durationUnit:"minutes", exerciseSubType:"duration"

7. DAYID GENERATION:
   - Extract from "[DAY001]" patterns
   - If missing: Auto-generate DAY001, DAY002, etc.
   - NEVER omit dayId field

8. EXERCISE CODE EXTRACTION:
   - Extract from "[EX001]" patterns in exercise names
   - Remove code from exercise name after extraction

RESPONSE FORMAT:

Single day:
{
  "workoutName": "Name",
  "dayId": "DAY001",
  "estimatedDuration": "30-45 min",
  "exerciseTypes": [...]
}

Multiple days:
{
  "workouts": [
    {
      "workoutName": "Day 1 Name",
      "dayId": "DAY001",
      "estimatedDuration": "30-45 min",
      "exerciseTypes": [...]
    },
    {
      "workoutName": "Day 2 Name", 
      "dayId": "DAY002",
      "estimatedDuration": "30-45 min",
      "exerciseTypes": [...]
    }
  ]
}

RESPOND WITH CLEAN JSON ONLY - NO MARKDOWN, NO EXPLANATIONS, NO TEXT BEFORE/AFTER`
            },
            {
              role: 'user',
              content: `Parse this workout text to structured JSON:\n\n${textToProcess}`
            }
          ],
          max_tokens: 4000, // 🚀 INCREASED for multiple days
          temperature: 0.1 // Low for consistency
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

      // 🧹 ROBUST JSON CLEANING
      const cleanedJson = cleanAndParseJSON(jsonContent);
      console.log('✅ Cleaned and parsed JSON:', cleanedJson);

      return cleanedJson;

    } catch (error) {
      console.error('❌ Error in AI conversion:', error);
      throw error;
    }
  };

  // 🧹 ROBUST JSON CLEANING FUNCTION
  const cleanAndParseJSON = (jsonContent: string) => {
    let cleanContent = jsonContent.trim();

    // Remove markdown code blocks
    cleanContent = cleanContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
    cleanContent = cleanContent.replace(/```\s*/, '').replace(/\s*```$/, '');

    // Remove any text before first { or [
    const startIndex = Math.min(
      cleanContent.indexOf('{') === -1 ? Infinity : cleanContent.indexOf('{'),
      cleanContent.indexOf('[') === -1 ? Infinity : cleanContent.indexOf('[')
    );

    if (startIndex !== Infinity) {
      cleanContent = cleanContent.substring(startIndex);
    }

    // Find matching closing bracket
    let braceCount = 0;
    let bracketCount = 0;
    let endIndex = -1;

    for (let i = 0; i < cleanContent.length; i++) {
      const char = cleanContent[i];
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;

      if (braceCount === 0 && bracketCount === 0 && i > 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (endIndex !== -1) {
      cleanContent = cleanContent.substring(0, endIndex);
    }

    // Fix common JSON issues
    cleanContent = cleanContent
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/([}\]])\s*([{\[])/g, '$1,$2'); // Add missing commas

    console.log('🧹 Final cleaned JSON:', cleanContent);

    try {
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ JSON parse failed:', parseError);
      console.log('🔧 Attempting advanced fixes...');

      // Advanced fixes
      let fixedContent = cleanContent
        .replace(/:\s*([a-zA-Z][^",}]*)\s*([,}])/g, ': "$1"$2') // Quote unquoted strings
        .replace(/"\s*:\s*"([^"]*)"([^",}])/g, '": "$1$2"'); // Fix broken quotes

      return JSON.parse(fixedContent);
    }
  };

  // 🚀 OPTIMIZED IMPORT FUNCTION
  const handleImportWorkout = async (responseText?: string) => {
    setIsImporting(true);
    try {
      console.log('🚀 INICIANDO IMPORTACIÓN OPTIMIZADA...');

      let textToProcess = responseText;
      if (!textToProcess) {
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (!lastAssistantMessage?.content) {
          alert('❌ No hay mensaje del asistente para importar.');
          return;
        }
        textToProcess = lastAssistantMessage.content;
      }

      console.log('📝 Texto para procesar:', textToProcess.substring(0, 200) + '...');

      // Check API key
      if (!apiKey?.startsWith('sk-')) {
        console.log('⚠️ No API key, usando método de respaldo...');
        return handleImportWorkoutFallback(textToProcess);
      }

      // 🚀 RETRY LOGIC for AI conversion
      let workoutData;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Intento de conversión IA ${attempt}/${maxRetries}...`);
          workoutData = await convertTextToWorkoutJSON(textToProcess);
          console.log('✅ Conversión IA exitosa en intento', attempt);
          break;
        } catch (error) {
          console.log(`❌ Intento ${attempt} falló:`, error);
          if (attempt === maxRetries) {
            throw new Error(`Error después de ${maxRetries} intentos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Progressive delay
        }
      }

      console.log('📊 Datos de workout convertidos:', workoutData);

      // 🛡️ ROBUST DAYID VALIDATION AND GENERATION
      workoutData = ensureDayIds(workoutData);

      // 🏗️ PROCESS WORKOUTS
      const processedWorkouts = processWorkoutArray(workoutData);

      if (processedWorkouts.length === 0) {
        throw new Error('❌ No se pudieron procesar workouts válidos');
      }

      console.log(`✅ ${processedWorkouts.length} workout(s) procesado(s) exitosamente`);

      // 📤 SEND TO PARENT COMPONENT
      console.log('=== 📤 CHATBOT ENVIANDO WORKOUTS AL PARENT ===');
      console.log('📊 Enviando', processedWorkouts.length, 'workout(s)');
      console.log('📋 Workouts a enviar:', processedWorkouts.map(w => `"${w.name}" (ID: ${w.id}, DayId: ${w.dayId})`));
      
      if (processedWorkouts.length === 1) {
        console.log('📦 Enviando workout único...');
        onWorkoutGenerated(processedWorkouts[0]);
      } else {
        console.log('📦 Enviando array de workouts...');
        onWorkoutGenerated(processedWorkouts);
      }
      
      console.log('✅ WORKOUTS ENVIADOS AL PARENT COMPONENT');

      // 🎉 SUCCESS MESSAGE
      const totalExercises = processedWorkouts.reduce((sum, workout) => {
        return sum + (workout.exerciseTypes || []).reduce((typeSum, type) => 
          typeSum + (type?.exercises?.length || 0), 0);
      }, 0);

      const successMessage = `🎉 ¡IMPORTACIÓN EXITOSA!\n\n📊 Resumen:\n• ${processedWorkouts.length} rutina(s) creada(s)\n• ${totalExercises} ejercicios en total\n• Duración estimada promedio: 45-60 min\n\n📅 Rutinas:\n${processedWorkouts.map((w, i) => `${i + 1}. ${w.name} (${w.dayId})`).join('\n')}\n\n🔍 Revisa la consola para logs detallados.`;

      alert(successMessage);
      console.log('🎊 IMPORTACIÓN COMPLETADA EXITOSAMENTE');

    } catch (error) {
      console.error('❌ Error en importación:', error);
      alert(`❌ Error al importar: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n🔄 Intentando método de respaldo...`);

      // Fallback method
      try {
        const lastMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastMessage?.content) {
          handleImportWorkoutFallback(lastMessage.content);
        }
      } catch (fallbackError) {
        console.error('❌ Método de respaldo también falló:', fallbackError);
        alert('❌ Error crítico: No se pudo procesar la rutina con ningún método.');
      }
    } finally {
      setIsImporting(false);
    }
  };

  // 🛡️ DAYID VALIDATION AND GENERATION
  const ensureDayIds = (workoutData: any) => {
    console.log('🛡️ VALIDANDO Y GENERANDO DAY IDs...');

    if (workoutData.workouts && Array.isArray(workoutData.workouts)) {
      // Multiple workouts
      workoutData.workouts = workoutData.workouts.map((workout: any, index: number) => {
        if (!workout.dayId) {
          workout.dayId = `DAY${String(index + 1).padStart(3, '0')}`;
          console.log(`✅ DayId auto-generado: ${workout.dayId} para "${workout.workoutName}"`);
        }
        return workout;
      });
    } else {
      // Single workout
      if (!workoutData.dayId) {
        workoutData.dayId = 'DAY001';
        console.log('✅ DayId auto-generado: DAY001 para workout único');
      }
    }

    return workoutData;
  };

  // 🏗️ PROCESS WORKOUT ARRAY
  const processWorkoutArray = (workoutData: any): Workout[] => {
    console.log('🏗️ PROCESANDO ARRAY DE WORKOUTS...');

    const workoutsToProcess = workoutData.workouts && Array.isArray(workoutData.workouts) 
      ? workoutData.workouts 
      : [workoutData];

    console.log(`📊 Total workouts a procesar: ${workoutsToProcess.length}`);

    const processedWorkouts: Workout[] = [];

    workoutsToProcess.forEach((singleWorkout: any, index: number) => {
      console.log(`🔄 Procesando workout ${index + 1}: "${singleWorkout.workoutName}"`);

      try {
        const processed = processWorkoutData(singleWorkout, index + 1);
        if (processed) {
          processedWorkouts.push(processed);
          console.log(`✅ Workout ${index + 1} procesado exitosamente`);
        } else {
          console.warn(`⚠️ Workout ${index + 1} falló en procesamiento`);
        }
      } catch (error) {
        console.error(`❌ Error procesando workout ${index + 1}:`, error);
      }
    });

    console.log(`🏁 Procesamiento completado: ${processedWorkouts.length}/${workoutsToProcess.length} exitosos`);
    return processedWorkouts;
  };

  // 🔧 OPTIMIZED WORKOUT DATA PROCESSING
  const processWorkoutData = (workoutData: any, dayNumber: number): Workout | null => {
    try {
      console.log(`🔧 Procesando datos de workout día ${dayNumber}...`);

      // Validate basic structure
      if (!workoutData || typeof workoutData !== 'object') {
        throw new Error('Estructura de workout inválida');
      }

      // Process exercise types with robust validation
      const processedExerciseTypes = (workoutData.exerciseTypes || [])
        .map((exerciseType: any, typeIndex: number) => {
          console.log(`🏋️ Procesando tipo de ejercicio ${typeIndex + 1}: ${exerciseType?.id || 'unknown'}`);

          if (!exerciseType || !exerciseType.exercises || !Array.isArray(exerciseType.exercises)) {
            console.warn('Tipo de ejercicio inválido, saltando:', exerciseType);
            return null;
          }

          const processedExercises = exerciseType.exercises
            .map((exercise: any, exerciseIndex: number) => {
              if (!exercise?.name) {
                console.warn(`Ejercicio ${exerciseIndex + 1} inválido, saltando`);
                return null;
              }

              return createProcessedExercise(exercise, exerciseType, typeIndex, exerciseIndex);
            })
            .filter(Boolean);

          if (processedExercises.length === 0) {
            console.warn('No hay ejercicios válidos en este tipo, saltando');
            return null;
          }

          return {
            id: exerciseType.id || 'power',
            name: exerciseType.name || 'Power',
            nameSpanish: exerciseType.nameSpanish || 'Fuerza',
            duration: exerciseType.duration || '20-30 min',
            exercises: processedExercises
          };
        })
        .filter(Boolean);

      if (processedExerciseTypes.length === 0) {
        throw new Error('No se pudieron procesar tipos de ejercicio válidos');
      }

      // Create final workout
      const workoutName = String(workoutData.workoutName || `Rutina IA Día ${dayNumber}`).trim();
      const estimatedDuration = String(workoutData.estimatedDuration || '30-45 min').trim();
      const finalWorkoutName = `${workoutName} (${estimatedDuration})`;
      const dayId = workoutData.dayId || `DAY${String(dayNumber).padStart(3, '0')}`;

      const newWorkout: Workout = {
        id: `ai-workout-${Date.now()}-day${dayNumber}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        name: finalWorkoutName,
        dayId: dayId,
        exerciseTypes: processedExerciseTypes,
        completed: false
      };

      console.log(`✅ WORKOUT CREADO EXITOSAMENTE:`);
      console.log(`   🆔 ID: ${newWorkout.id}`);
      console.log(`   📝 Name: ${newWorkout.name}`);
      console.log(`   🏷️ DayId: ${newWorkout.dayId}`);
      console.log(`   📅 Date: ${newWorkout.date}`);
      console.log(`   📊 Exercise Types: ${newWorkout.exerciseTypes.length}`);
      console.log(`   ✅ Completed: ${newWorkout.completed}`);
      
      return newWorkout;

    } catch (error) {
      console.error(`❌ Error procesando workout día ${dayNumber}:`, error);
      return null;
    }
  };

  // 🏋️ CREATE PROCESSED EXERCISE
  const createProcessedExercise = (exercise: any, exerciseType: any, typeIndex: number, exerciseIndex: number) => {
    const exerciseId = `ex-${Date.now()}-${typeIndex}-${exerciseIndex}-${Math.random().toString(36).substr(2, 9)}`;
    const sets = Math.max(1, parseInt(exercise.sets || 1));
    const exerciseSubType = exercise.exerciseSubType === 'duration' ? 'duration' : 'reps';

    // Create set details
    const setDetails = Array(sets).fill(null).map((_, setIndex) => {
      const setId = `${exerciseId}-set-${setIndex + 1}`;
      const baseSet = {
        id: setId,
        weight: Math.max(0, parseInt(exercise.weight) || 0),
        completed: false,
        weightUnit: (exercise.weightUnit === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs'
      };

      if (exerciseSubType === 'duration') {
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

    const processedExercise: any = {
      id: exerciseId,
      name: String(exercise.name).trim(),
      exerciseCode: exercise.exerciseCode || null,
      sets: sets,
      exerciseSubType: exerciseSubType,
      weight: Math.max(0, parseInt(exercise.weight) || 0),
      weightUnit: (exercise.weightUnit === 'lbs' ? 'lbs' : 'kg') as 'kg' | 'lbs',
      completed: false,
      type: {
        id: exerciseType.id || 'power',
        name: exerciseType.name || 'Power',
        nameSpanish: exerciseType.nameSpanish || 'Fuerza',
        duration: exerciseType.duration || '20-30 min'
      },
      setDetails: setDetails,
      restTime: exerciseType.id === 'cardio' ? 0 : (sets > 1 ? 90 : 60)
    };

    // Add reps or duration based on type
    if (exerciseSubType === 'duration') {
      processedExercise.duration = Math.max(1, parseInt(exercise.duration) || 30);
      processedExercise.durationUnit = (['seconds', 'minutes', 'meters', 'kilometers'].includes(exercise.durationUnit) 
        ? exercise.durationUnit 
        : 'seconds') as 'seconds' | 'minutes' | 'meters' | 'kilometers';
    } else {
      processedExercise.reps = Math.max(1, parseInt(exercise.reps) || 10);
    }

    return processedExercise;
  };

  // 🔄 FALLBACK METHOD (keeping existing functionality)
  const handleImportWorkoutFallback = (textToProcess: string) => {
    try {
      console.log('🔄 Usando método de respaldo para parsing...');

      const cleanText = textToProcess
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .trim();

      const exercises = extractExercisesFromText(cleanText, 0);

      if (exercises.length === 0) {
        alert('❌ No se pudieron extraer ejercicios. Pide al asistente formato estructurado.');
        return;
      }

      // Group exercises by type
      const exerciseTypesMap: { [key: string]: any } = {};
      exercises.forEach(exercise => {
        if (!exercise?.type?.id) return;

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

      const newWorkout: Workout = {
        id: `ai-workout-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0],
        name: 'Rutina IA (Método Respaldo)',
        dayId: 'DAY001',
        exerciseTypes: exerciseTypes,
        completed: false
      };

      onWorkoutGenerated(newWorkout);
      alert(`✅ Rutina importada con método de respaldo!\n\n📊 ${exercises.length} ejercicios en ${exerciseTypes.length} categorías`);

    } catch (error) {
      console.error('❌ Error en método de respaldo:', error);
      alert('❌ Error crítico en todos los métodos de procesamiento.');
    } finally {
      setIsImporting(false);
    }
  };

  const extractExercisesFromText = (text: string, dayIndex: number): any[] => {
    const exercises: any[] = [];
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let currentCategory = 'power';

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (!trimmedLine || trimmedLine.length < 5) continue;

      // Detect categories
      const categoryLower = trimmedLine.toLowerCase().replace(/[*#:]/g, '');
      if (categoryLower.includes('🔥') || categoryLower.includes('calentamiento') || categoryLower.includes('warm')) {
        currentCategory = 'warmup';
        continue;
      } else if (categoryLower.includes('💪') || categoryLower.includes('fuerza') || categoryLower.includes('power')) {
        currentCategory = 'power';
        continue;
      } else if (categoryLower.includes('⚡') || categoryLower.includes('cardio')) {
        currentCategory = 'cardio';
        continue;
      } else if (categoryLower.includes('✅') || categoryLower.includes('estiramiento') || categoryLower.includes('stretch')) {
        currentCategory = 'stretching';
        continue;
      }

      // Exercise patterns
      const exercisePatterns = [
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s*sets?\s+(of|de)\s+(\d+)\s+(reps?|repeticiones|seconds?|segundos|minutes?|minutos|meters?|metros|kilometers?|kilómetros|km)(?:\s*@\s*(\d+)\s*kg)?/i,
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s+(minutes?|minutos|mins?|meters?|metros|kilometers?|kilómetros|km)/i,
        /^[-•*]?\s*([^:]+?):\s*(\d+)\s*[x×]\s*(\d+)/i
      ];

      for (const pattern of exercisePatterns) {
        const match = trimmedLine.match(pattern);
        if (match && match[1]?.trim()) {
          const exercise = createFallbackExercise(match, currentCategory);
          if (exercise) {
            exercises.push(exercise);
            break;
          }
        }
      }
    }

    return exercises;
  };

  const createFallbackExercise = (match: RegExpMatchArray, category: string) => {
    const EXERCISE_TYPES = {
      warmup: { id: 'warmup', name: 'Warm-up', nameSpanish: 'Calentamiento', duration: '5-10 min' },
      power: { id: 'power', name: 'Power', nameSpanish: 'Fuerza', duration: '20-30 min' },
      cardio: { id: 'cardio', name: 'Cardio', nameSpanish: 'Cardio', duration: '15-25 min' },
      stretching: { id: 'stretching', name: 'Stretching', nameSpanish: 'Estiramiento', duration: '5-10 min' }
    };

    const exerciseType = EXERCISE_TYPES[category as keyof typeof EXERCISE_TYPES] || EXERCISE_TYPES.power;
    const exerciseId = `ex-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Basic parsing from match
    const sets = Math.max(1, parseInt(match[2] || '1'));
    const amount = Math.max(1, parseInt(match[3] || match[4] || '10'));
    const isTimeBased = category === 'cardio' || (match[0] && (match[0].includes('second') || match[0].includes('minute')));

    return {
      id: exerciseId,
      name: match[1].trim(),
      sets: sets,
      ...(isTimeBased ? { 
        duration: amount, 
        durationUnit: 'seconds' 
      } : { 
        reps: amount 
      }),
      exerciseSubType: isTimeBased ? 'duration' : 'reps',
      weight: 0,
      weightUnit: 'kg' as const,
      completed: false,
      type: exerciseType,
      setDetails: Array(sets).fill(null).map((_, setIndex) => ({
        id: `${exerciseId}-set-${setIndex + 1}`,
        ...(isTimeBased ? { 
          duration: amount, 
          durationUnit: 'seconds' 
        } : { 
          reps: amount 
        }),
        weight: 0,
        completed: false,
        weightUnit: 'kg' as const
      })),
      restTime: category === 'cardio' ? 0 : 60
    };
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
              disabled={isImporting}
              className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isImporting ? (
                <>
                  <Loader className="w-4 h-4 mr-1 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1" />
                  Import Workout
                </>
              )}
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