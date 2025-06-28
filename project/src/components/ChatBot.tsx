import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageSquare, Download, Loader } from 'lucide-react';
import type { Workout } from '../types';

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
        content: "Hi! I'm your AI fitness coach. I'll help you create a personalized workout plan. Tell me about your fitness goals, experience level, available equipment, and any preferences you have!",
        timestamp: new Date(),
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('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');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
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
      content: "Hi! I'm your AI fitness coach. I'll help you create a personalized workout plan. Tell me about your fitness goals, experience level, available equipment, and any preferences you have!",
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
    localStorage.setItem('chatBotMessages', JSON.stringify([initialMessage]));
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      setShowApiKeyInput(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

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
              content: `You are a professional fitness coach and personal trainer. Help users create personalized workout plans based on their goals, experience level, available equipment, and preferences.

IMPORTANT: When creating workout plans, always structure them using these exact exercise categories:

**1. Calentamiento (Warm-up):**
- Dynamic stretches
- Light cardio movements
- Joint mobility exercises

**2. Fuerza (Power/Strength):**
- Compound movements
- Isolation exercises
- Weight training exercises

**3. Cardio:**
- Cardiovascular exercises
- Can be time-based (minutes) or rep-based

**4. Estiramiento (Stretching):**
- Static stretches
- Cool-down movements
- Flexibility exercises

For each exercise, specify:
- Exercise name (clear and descriptive)
- Sets and reps (e.g., "3 sets of 12 reps") OR duration (e.g., "3 sets of 30 seconds")
- Weight recommendations when applicable (in kg)
- Rest time between sets

Structure your response like this example:

**Calentamiento:**
- Círculos de brazos: 2 sets of 10 reps
- Rotaciones de hombros: 2 sets of 10 reps

**Fuerza:**
- Bench Press: 3 sets of 10 reps @ 60 kg
- Squats: 3 sets of 12 reps @ 50 kg

**Cardio:**
- Caminata intensa: 20 minutes

**Estiramiento:**
- Estiramiento de pecho: 2 sets of 30 seconds
- Estiramiento de piernas: 2 sets of 30 seconds

Focus on proper form, safety, and progressive overload. Adapt recommendations based on the user's fitness level (beginner, intermediate, advanced).

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

      // Extract workout and call onWorkoutGenerated
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        handleImportWorkout(data.choices[0].message.content);
      }
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

  const handleImportWorkout = (responseText?: string) => {
    if (!responseText) {
        if (!messages.length) return;

        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (!lastAssistantMessage) return;

        responseText = lastAssistantMessage.content;
        if (!responseText) return;
    }

    const response = responseText;

    // Check if it's a multi-day routine - improved detection
    const dayMatches = response.match(/(?:day\s*\d+|día\s*\d+|d[ií]a\s*\d+)/gi);
    const dayHeaders = response.match(/(?:^|\n)\s*(?:\*\*)?(?:day\s*\d+|día\s*\d+|d[ií]a\s*\d+)(?:\*\*)?\s*[:-]?\s*/gmi);

    if ((dayMatches && dayMatches.length > 1) || (dayHeaders && dayHeaders.length > 1)) {
      console.log('Multi-day routine detected:', dayMatches?.length || dayHeaders?.length, 'days');

      // Split by day headers more accurately
      const daySections = response.split(/(?=(?:^|\n)\s*(?:\*\*)?(?:day\s*\d+|día\s*\d+|d[ií]a\s*\d+)(?:\*\*)?\s*[:-]?\s*)/gmi);
      const workouts: Workout[] = [];

      daySections.forEach((dayContent, index) => {
        if (dayContent.trim().length > 30 && index > 0) { // Skip first empty section and very short sections
          console.log(`Processing day ${index}:`, dayContent.substring(0, 100));
          const exercises = parseExercises(dayContent, index);
          console.log(`Found ${exercises.length} exercises for day ${index}`);

          if (exercises.length > 0) {
            const exerciseTypes = groupExercisesByType(exercises);
            console.log(`Grouped into ${exerciseTypes.length} exercise types`);

            if (exerciseTypes.length > 0) {
              const totalExercises = exercises.length;
              let duration = "30-45 minutes";
              if (totalExercises > 8) {
                duration = "60-75 minutes";
              } else if (totalExercises > 5) {
                duration = "45-60 minutes";
              }

              // Extract day name from content if available
              const dayNameMatch = dayContent.match(/(?:day\s*\d+|día\s*\d+|d[ií]a\s*\d+)[:-]?\s*([^\n\r]*)/i);
              const dayName = dayNameMatch && dayNameMatch[1].trim() ? 
                dayNameMatch[1].trim().replace(/^\*\*|\*\*$/g, '') : 
                `AI Routine`;

              const workoutName = `Día ${index} - ${dayName} (${duration})`;
              const workout: Workout = {
                id: `workout-day${index}-${Date.now()}-${index}`,
                date: new Date(Date.now() + (index - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                name: workoutName,
                exerciseTypes: exerciseTypes,
                completed: false
              };
              workouts.push(workout);
            }
          }
        }
      });

      if (workouts.length > 0) {
        console.log(`Successfully created ${workouts.length} workouts`);
        workouts.forEach(workout => onWorkoutGenerated(workout));
        alert(`¡${workouts.length} rutinas importadas exitosamente!`);
        return;
      } else {
        console.warn('No workouts created from multi-day routine');
        alert('No se pudieron extraer ejercicios de la rutina multi-día.');
        return;
      }
    }

    // Single-day routine (existing logic)
    const exercises = extractExercisesFromText(response, 0);
    console.log('Extracted exercises:', exercises); // Debug log

    if (exercises.length === 0) {
      alert('No se pudieron extraer ejercicios del plan. Asegúrate de que el formato incluya sets y repeticiones.');
      return;
    }

    const exerciseTypes = groupExercisesByType(exercises);
    console.log('Grouped exercise types:', exerciseTypes); // Debug log

    if (exerciseTypes.length === 0) {
      alert('No se pudieron agrupar los ejercicios por tipo.');
      return;
    }

    // Extract workout name
    let workoutName = 'AI Generated Workout';
    const nameMatch = response.match(/(?:Here's a|Here is a|Aquí tienes|Rutina de)\s+([^.!?\n]+)/i);
    if (nameMatch) {
      workoutName = nameMatch[1].trim();
    }

    // Estimate duration
    const exerciseCount = exercises.length;
    let duration = '30-45 min';
    if (exerciseCount > 8) duration = '60-75 min';
    else if (exerciseCount > 5) duration = '45-60 min';

    workoutName += ` (${duration})`;

    const newWorkout: Workout = {
      id: `workout-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      name: workoutName,
      exerciseTypes,
      completed: false
    };

    console.log('Generated workout:', newWorkout); // Debug log
    onWorkoutGenerated(newWorkout);
    alert(`¡Rutina "${workoutName}" importada con ${exercises.length} ejercicios en ${exerciseTypes.length} categorías!`);
  };

  const extractExercisesFromText = (text: string, dayIndex: number): any[] => {
    const exercises: any[] = [];

    // Split text into sections based on common workout section headers (English and Spanish)
    const sections = text.split(/(?:\*\*\d+\.\s*|\d+\.\s*)(warm[- ]?up|calentamiento|power|fuerza|cardio|cardiovascular|stretch|estiramiento|cool[- ]?down|enfriamiento).*?(?:\*\*)?:?/gi);

    // If no sections found, treat entire text as one section
    const sectionsToProcess = sections.length > 1 ? sections.slice(1) : [text];

    for (const section of sectionsToProcess) {
      const sectionExercises = extractExercisesFromSection(section, dayIndex);
      exercises.push(...sectionExercises);
    }

    return exercises;
  };

  const extractExercisesFromSection = (sectionText: string, dayIndex: number): any[] => {
    const exercises: any[] = [];

    // Enhanced patterns to catch different exercise formats (English and Spanish)
    const exercisePatterns = [
      // "Exercise name: 3 sets of 12 reps" or "Exercise name: 3 sets x 12 reps"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:sets?|series?)\s*(?:of|x|de)\s*(\d+)\s*(?:reps?|repeticiones?)(?:\s*@?\s*(\d+)\s*(?:lbs?|kg))?/gmi,
      // "Exercise name: 3 x 12"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*[x×]\s*(\d+)(?:\s*@?\s*(\d+)\s*(?:lbs?|kg))?/gmi,
      // Time-based: "Exercise name: 3 sets of 30 seconds"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:sets?|series?)\s*(?:of|x|de)\s*(\d+)\s*(?:seconds?|segundos?|mins?|minutes?|minutos?)/gmi,
      // Simple reps: "Exercise name: 10 reps each leg"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:reps?|repeticiones?)(?:\s+(?:each|per|cada)\s+\w+)?/gmi,
      // Time only: "Exercise name: 30 seconds each side"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:seconds?|segundos?|minutes?|minutos?|mins?)(?:\s+(?:each|per|cada)\s+\w+)?/gmi,
      // Cardio: "20 minutes of cardio" or "20 minutos de cardio"
      /(?:^\s*[-•*]\s*)?(\d+)\s*(?:minutes?|minutos?|mins?)\s*(?:of|de)?\s*([^.\n,]+?)(?:(?:\(|\[)[^)\]]*(?:\)|\])|$)/gmi,
      // Duration only format: "Exercise name: 20 minutes"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:minutes?|minutos?|mins?)/gmi,
      // Machine exercises: "Exercise machine: 3 sets of 12 reps"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]*(?:machine|press|curl|raise|pulldown|máquina|prensa)[^:\n]*)(?:\*\*)?\s*:\s*(\d+)\s*(?:sets?|series?)\s*(?:of|x|de)\s*(\d+)\s*(?:reps?|repeticiones?)/gmi
    ];

    const lines = sectionText.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and section headers (English and Spanish)
      if (!trimmed || 
          trimmed.length < 5 ||
          trimmed.match(/^(?:\*\*)?(?:warm[- ]?up|calentamiento|power|fuerza|cardio|cardiovascular|stretch|estiramiento|cool[- ]?down|enfriamiento)(?:\*\*)?:?\s*$/i) ||
          trimmed.toLowerCase().includes('focus on') ||
          trimmed.toLowerCase().includes('enfócate en') ||
          trimmed.toLowerCase().includes('cool down with') ||
          trimmed.toLowerCase().includes('enfriamiento con') ||
          trimmed.toLowerCase().includes('foam rolling') ||
          trimmed.toLowerCase().includes('rodillo de espuma')) {
        continue;
      }

      let foundMatch = false;

      for (let i = 0; i < exercisePatterns.length; i++) {
        const pattern = exercisePatterns[i];
        pattern.lastIndex = 0;
        const match = pattern.exec(trimmed);

        if (match) {
          foundMatch = true;
          let name, sets, reps, weight;

          if (i === 0 || i === 1 || i === 6 || i === 7) {
            // Standard set/rep patterns
            [, name, sets, reps, weight] = match;
            sets = parseInt(sets) || 1;
            reps = parseInt(reps) || 10;
          } else if (i === 2) {
            // Time-based with sets
            [, name, sets, reps] = match;
            sets = parseInt(sets) || 1;
            reps = parseInt(reps) || 30;
          } else if (i === 3 || i === 4) {
            // Simple rep or time pattern
            [, name, reps] = match;
            sets = 1;
            reps = parseInt(reps) || 10;
          } else if (i === 5) {
            // Cardio pattern
            [, reps, name] = match;
            sets = 1;
            reps = parseInt(reps) || 20;
          }

          if (name && name.trim()) {
            const cleanName = name.trim()
              .replace(/^\d+\.\s*/, '')
              .replace(/\*\*/g, '')
              .replace(/^[-•*]\s*/, '')
              .replace(/\s+/g, ' ')
              .trim();

            // Skip very short names or generic terms
            if (cleanName.length < 3 || 
                cleanName.toLowerCase().match(/^(and|or|with|for|the|of|in)$/)) {
              continue;
            }

            // Skip if exercise already exists
            const nameWords = cleanName.toLowerCase().split(' ');
            const isDuplicate = exercises.some(ex => {
              const existingWords = ex.name.toLowerCase().split(' ');
              return nameWords.some(word => 
                word.length > 3 && existingWords.some(existing => 
                  existing.includes(word) || word.includes(existing)
                )
              );
            });

            if (isDuplicate) {
              continue;
            }

            const exerciseId = `ex-day${dayIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const exerciseWeight = weight ? parseInt(weight) : 0;
            const exerciseSets = Math.max(1, sets || 1);
            const exerciseReps = Math.max(1, reps || 10);

            // Determine exercise type based on name
            const lowerName = cleanName.toLowerCase();
            let exerciseType;
            if (lowerName.includes('calentamiento') || lowerName.includes('warm') || lowerName.includes('rollo') || lowerName.includes('círculo') || lowerName.includes('rotacion')) {
              exerciseType = { id: 'warmup', name: 'Warm-up', nameSpanish: 'Calentamiento', duration: '5-10 min' };
            } else if (lowerName.includes('cardio') || lowerName.includes('caminata') || lowerName.includes('bicicleta') || lowerName.includes('correr')) {
              exerciseType = { id: 'cardio', name: 'Cardio', nameSpanish: 'Cardio', duration: '15-25 min' };
            } else if (lowerName.includes('estiramiento') || lowerName.includes('stretch') || lowerName.includes('flexibilidad')) {
              exerciseType = { id: 'stretching', name: 'Stretching', nameSpanish: 'Estiramiento', duration: '5-10 min' };
            } else {
              exerciseType = { id: 'power', name: 'Power', nameSpanish: 'Fuerza', duration: '20-30 min' };
            }

            // Determine if this is a time-based exercise
            const isTimeBased = cleanName.toLowerCase().includes('plank') ||
                               cleanName.toLowerCase().includes('stretch') ||
                               cleanName.toLowerCase().includes('cardio') ||
                               cleanName.toLowerCase().includes('hold') ||
                               cleanName.toLowerCase().includes('minutos') ||
                               cleanName.toLowerCase().includes('segundos');

            // Determine duration unit based on exercise name or default values
            const isMinutesBased = cleanName.toLowerCase().includes('minutos') ||
                                  cleanName.toLowerCase().includes('cardio') ||
                                  cleanName.toLowerCase().includes('caminata') ||
                                  cleanName.toLowerCase().includes('bicicleta');

            const durationUnit: 'seconds' | 'minutes' = isMinutesBased ? 'minutes' : 'seconds';

            const exercise: any = {
              id: exerciseId,
              name: cleanName,
              sets: exerciseSets,
              ...(isTimeBased ? { duration: exerciseReps, durationUnit } : { reps: exerciseReps }),
              exerciseSubType: isTimeBased ? 'duration' : 'reps',
              weight: exerciseWeight,
              weightUnit: 'kg',
              completed: false,
              type: exerciseType,
              setDetails: Array(exerciseSets).fill(null).map((_, setIndex) => ({
                id: `${exerciseId}-set-${setIndex + 1}`,
                ...(isTimeBased ? { duration: exerciseReps, durationUnit } : { reps: exerciseReps }),
                weight: exerciseWeight,
                completed: false,
                weightUnit: 'kg' as const
              })),
              restTime: isTimeBased ? 0 : (exerciseSets > 1 ? 60 : 30)
            };

            exercises.push(exercise);
          }
          break;
        }
      }
    }

    return exercises;
  };

  const parseExercises = (text: string, dayIndex: number) => {
    const exercises: Exercise[] = [];

    // Split by lines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let currentCategory = 'power'; // default category

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect category headers
      const categoryLower = line.toLowerCase();
      if (categoryLower.includes('calentamiento') || categoryLower.includes('warm')) {
        currentCategory = 'warmup';
        continue;
      } else if (categoryLower.includes('fuerza') || categoryLower.includes('power') || categoryLower.includes('strength')) {
        currentCategory = 'power';
        continue;
      } else if (categoryLower.includes('cardio') || categoryLower.includes('cardiovascular')) {
        currentCategory = 'cardio';
        continue;
      } else if (categoryLower.includes('estiramiento') || categoryLower.includes('stretch') || categoryLower.includes('cool')) {
        currentCategory = 'stretching';
        continue;
      }

      // Skip headers, days, and other non-exercise lines
      if (line.includes('**') || 
          line.toLowerCase().includes('day') || 
          line.toLowerCase().includes('día') ||
          line.length < 8) {
        continue;
      }

      // Look for exercise patterns - more flexible matching
      const exercisePatterns = [
        /^[-•*]\s*(.+?):\s*(\d+)\s*(?:sets?\s*(?:of|x|de)\s*)?(\d+)\s*(reps?|repeticiones|seconds?|segundos|minutes?|minutos)/i,
        /^[-•*]\s*(.+?):\s*(\d+)\s*sets?\s*x\s*(\d+)\s*(reps?|repeticiones|seconds?|segundos|minutes?|minutos)/i,
        /^[-•*]\s*(.+?):\s*(\d+)\s*x\s*(\d+)\s*(reps?|repeticiones|seconds?|segundos|minutes?|minutos)/i,
        /^[-•*]?\s*(.+?):\s*(\d+)\s*(?:sets?\s*(?:of|x|de)\s*)?(\d+)\s*(reps?|repeticiones|seconds?|segundos|minutes?|minutos)/i
      ];

      let exerciseMatch = null;
      for (const pattern of exercisePatterns) {
        exerciseMatch = line.match(pattern);
        if (exerciseMatch) break;
      }

      if (exerciseMatch) {
        const [, exerciseName, sets, amount, unit] = exerciseMatch;
        const exerciseId = `ex-${dayIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Extract weight if mentioned
        const weightMatch = line.match(/(?:@|at|con|with)\s*(\d+)\s*(kg|lbs)/i);
        const weight = weightMatch ? parseInt(weightMatch[1]) : 0;
        const weightUnit = weightMatch ? weightMatch[2].toLowerCase() as 'kg' | 'lbs' : 'kg';

        const numSets = Math.max(1, parseInt(sets) || 1);
        const numAmount = Math.max(1, parseInt(amount) || 10);

        // Get exercise type based on current category
        let exerciseType;
        switch (currentCategory) {
          case 'warmup':
            exerciseType = { 
              id: 'warmup', 
              name: 'Warm-up', 
              nameSpanish: 'Calentamiento', 
              duration: '5-10 min' 
            };
            break;
          case 'cardio':
            exerciseType = { 
              id: 'cardio', 
              name: 'Cardio', 
              nameSpanish: 'Cardio', 
              duration: '15-25 min' 
            };
            break;
          case 'stretching':
            exerciseType = { 
              id: 'stretching', 
              name: 'Stretching', 
              nameSpanish: 'Estiramiento', 
              duration: '5-10 min' 
            };
            break;
          default: // power
            exerciseType = { 
              id: 'power', 
              name: 'Power', 
              nameSpanish: 'Fuerza', 
              duration: '20-30 min' 
            };
            break;
        }

        // Determine if it's duration or reps based
        const unitLower = unit.toLowerCase();
        const exerciseNameLower = exerciseName.toLowerCase();
        const isDuration = unitLower.includes('second') || 
                          unitLower.includes('minute') ||
                          unitLower.includes('segundo') ||
                          unitLower.includes('minuto') ||
                          exerciseNameLower.includes('plank') || 
                          exerciseNameLower.includes('hold') ||
                          currentCategory === 'cardio';

        const durationUnit = unitLower.includes('minute') || unitLower.includes('minuto') ? 'minutes' : 'seconds';

        const exercise: Exercise = {
          id: exerciseId,
          name: exerciseName,
          sets: numSets,
          ...(isDuration ? { duration: numAmount, durationUnit } : { reps: numAmount }),
          exerciseSubType: isDuration ? 'duration' : 'reps',
          weight: weight,
          weightUnit: 'kg',
          completed: false,
          type: exerciseType,
          setDetails: Array(numSets).fill(null).map((_, setIndex) => ({
            id: `${exerciseId}-set-${setIndex + 1}`,
            ...(isDuration ? { duration: numAmount, durationUnit } : { reps: numAmount }),
            weight: weight,
            completed: false,
            weightUnit: 'kg'
          })),
          restTime: isDuration ? 0 : (numSets > 1 ? 60 : 30)
        };

        exercises.push(exercise);
      }
    }

    return exercises;
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
                  <div className="whitespace-pre-wrap">{message.content}</div>
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
              onClick={handleImportWorkout}
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