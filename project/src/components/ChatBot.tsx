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
        content: "Hi! I'm your AI fitness coach. I'll help you create a personalized workout plan. Tell me about your fitness goals, experience level, available equipment, and any preferences you have!",
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
      content: "Hi! I'm your AI fitness coach. I'll help you create a personalized workout plan. Tell me about your fitness goals, experience level, available equipment, and any preferences you have!",
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
              content: `You are a professional fitness coach and personal trainer. Help users create personalized workout plans based on their goals, experience level, available equipment, and preferences.

CRITICAL FORMATTING RULES - ALWAYS FOLLOW:
1. EVERY exercise MUST have a specific format with sets and reps/duration
2. Use emojis and **bold text** for engagement: 💪, 🏋️‍♂️, 🔥, ⚡, ✅, 🎯
3. NEVER suggest an exercise without specifying exact sets and reps/time

MANDATORY EXERCISE FORMAT:
- For rep-based: "Exercise Name: X sets of Y reps" 
- For time-based: "Exercise Name: X sets of Y seconds/minutes"
- Always include weight when applicable: "@ Z kg"

REQUIRED CATEGORIES (use these exact headers with emojis):

**🔥 Calentamiento (Warm-up):**
- Dynamic stretches and mobility
- Format: "X sets of Y reps" or "X sets of Y seconds"

**💪 Fuerza (Power/Strength):**
- Compound and isolation movements
- Format: "X sets of Y reps @ Z kg"

**⚡ Cardio:**
- Cardiovascular exercises
- Format: "X minutes" or "X sets of Y minutes"

**✅ Estiramiento (Stretching):**
- Static stretches and cool-down
- Format: "X sets of Y seconds"

MANDATORY EXAMPLE FORMAT (copy this structure exactly):

**🔥 Calentamiento:**
- Círculos de brazos: 2 sets of 10 reps
- Rotaciones de hombros: 2 sets of 10 reps
- Rodillas al pecho: 2 sets of 8 reps

**💪 Fuerza:**
- Bench Press: 3 sets of 10 reps @ 60 kg
- Squats: 3 sets of 12 reps @ 50 kg
- Deadlift: 3 sets of 8 reps @ 70 kg

**⚡ Cardio:**
- Caminata intensa: 20 minutes
- Bicicleta estática: 15 minutes

**✅ Estiramiento:**
- Estiramiento de pecho: 2 sets of 30 seconds
- Estiramiento de piernas: 2 sets of 30 seconds
- Estiramiento de espalda: 2 sets of 45 seconds

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
    try {
      if (!responseText) {
        if (!messages.length) {
          alert('No hay mensaje para importar.');
          return;
        }

        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
        if (!lastAssistantMessage) {
          alert('No se encontró respuesta del asistente para importar.');
          return;
        }

        responseText = lastAssistantMessage.content;
        if (!responseText) {
          alert('El contenido del mensaje está vacío.');
          return;
        }
      }

      console.log('Procesando texto:', responseText);

      // Limpiar el texto de HTML tags que puedan haber sido añadidos por el formateo
      const cleanText = responseText.replace(/<[^>]*>/g, '');
      
      // Single-day routine processing
      const exercises = extractExercisesFromText(cleanText, 0);
      console.log('Ejercicios extraídos:', exercises);

      if (exercises.length === 0) {
        console.log('No se encontraron ejercicios. Texto analizado:', cleanText);
        alert('No se pudieron extraer ejercicios del plan. Verifica que el formato incluya sets y repeticiones como "3 sets of 12 reps".');
        return;
      }

      const exerciseTypes = groupExercisesByType(exercises);
      console.log('Tipos de ejercicio agrupados:', exerciseTypes);

      if (exerciseTypes.length === 0) {
        alert('No se pudieron agrupar los ejercicios por tipo.');
        return;
      }

      // Extract workout name from the text
      let workoutName = 'AI Generated Workout';
      const lines = cleanText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('*') && !trimmed.startsWith('-') && 
            !trimmed.includes(':') && trimmed.length > 5 && trimmed.length < 50) {
          workoutName = trimmed;
          break;
        }
      }

      // Estimate duration based on exercise count
      const exerciseCount = exercises.length;
      let duration = '30-45 min';
      if (exerciseCount > 8) duration = '60-75 min';
      else if (exerciseCount > 5) duration = '45-60 min';

      const finalWorkoutName = `${workoutName} (${duration})`;

      const newWorkout: Workout = {
        id: `workout-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        name: finalWorkoutName,
        exerciseTypes,
        completed: false
      };

      console.log('Rutina creada:', newWorkout);
      onWorkoutGenerated(newWorkout);
      alert(`¡Rutina "${finalWorkoutName}" importada con ${exercises.length} ejercicios en ${exerciseTypes.length} categorías!`);
    } catch (error) {
      console.error('Error al importar rutina:', error);
      alert(`Error al importar la rutina: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const extractExercisesFromText = (text: string, dayIndex: number): any[] => {
    const exercises: any[] = [];
    console.log('Extracting exercises from text:', text);

    // Split by lines and process each line
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let currentCategory = 'power'; // default category

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and very short lines
      if (!trimmedLine || trimmedLine.length < 5) continue;

      // Detect category headers with emojis and markdown
      const categoryLower = trimmedLine.toLowerCase().replace(/\*\*/g, '');
      if (categoryLower.includes('🔥') || categoryLower.includes('calentamiento') || categoryLower.includes('warm')) {
        currentCategory = 'warmup';
        console.log('Category changed to warmup');
        continue;
      } else if (categoryLower.includes('💪') || categoryLower.includes('fuerza') || categoryLower.includes('power') || categoryLower.includes('strength')) {
        currentCategory = 'power';
        console.log('Category changed to power');
        continue;
      } else if (categoryLower.includes('⚡') || categoryLower.includes('cardio') || categoryLower.includes('cardiovascular')) {
        currentCategory = 'cardio';
        console.log('Category changed to cardio');
        continue;
      } else if (categoryLower.includes('✅') || categoryLower.includes('estiramiento') || categoryLower.includes('stretch') || categoryLower.includes('cool')) {
        currentCategory = 'stretching';
        console.log('Category changed to stretching');
        continue;
      }

      // Skip headers and other non-exercise lines
      if (trimmedLine.includes('**') && !trimmedLine.includes(':') ||
          trimmedLine.toLowerCase().includes('focus on') ||
          trimmedLine.toLowerCase().includes('enfócate en') ||
          trimmedLine.toLowerCase().includes('always end') ||
          trimmedLine.length < 10) {
        continue;
      }

      // Enhanced exercise extraction patterns - more flexible
      const exercisePatterns = [
        // "- Exercise name: 3 sets of 12 reps @ 60 kg"
        /^[-•*]?\s*(.+?):\s*(\d+)\s*sets?\s+of\s+(\d+)\s+(reps?|repeticiones|seconds?|segundos|minutes?|minutos)(?:\s*@\s*(\d+)\s*kg)?/i,
        // "Exercise name: 3 sets of 12 reps"
        /^[-•*]?\s*(.+?):\s*(\d+)\s*sets?\s+of\s+(\d+)\s+(reps?|repeticiones|seconds?|segundos|minutes?|minutos)/i,
        // "Exercise name: 20 minutes"
        /^[-•*]?\s*(.+?):\s*(\d+)\s+(minutes?|minutos|mins?)/i,
        // "Exercise name: 3 x 12"
        /^[-•*]?\s*(.+?):\s*(\d+)\s*[x×]\s*(\d+)/i,
        // Simple format "Exercise: X sets Y reps"
        /^[-•*]?\s*(.+?):\s*(\d+)\s+(\d+)/i
      ];

      let exerciseMatch = null;
      let patternIndex = -1;
      
      for (let p = 0; p < exercisePatterns.length; p++) {
        exerciseMatch = trimmedLine.match(exercisePatterns[p]);
        if (exerciseMatch) {
          patternIndex = p;
          console.log(`Pattern ${p} matched:`, exerciseMatch);
          break;
        }
      }

      if (exerciseMatch && exerciseMatch.length >= 3) {
        let exerciseName, sets, amount, unit = 'reps', weight = 0;

        if (patternIndex === 2) {
          // "Exercise: 20 minutes" format
          [, exerciseName, amount, unit] = exerciseMatch;
          sets = 1;
        } else if (patternIndex === 0 || patternIndex === 1) {
          // Full format with sets and reps/duration
          [, exerciseName, sets, amount, unit, weight] = exerciseMatch;
          weight = weight ? parseInt(weight) : 0;
        } else {
          // "Exercise: 3 x 12" or simple format
          [, exerciseName, sets, amount] = exerciseMatch;
          unit = 'reps';
        }

        if (exerciseName && exerciseName.trim()) {
          const cleanName = exerciseName.trim()
            .replace(/^\d+\.\s*/, '')
            .replace(/\*\*/g, '')
            .replace(/^[-•*]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();

          // Skip very short names or invalid names
          if (cleanName.length < 3) continue;

          const exerciseId = `ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const exerciseWeight = parseInt(weight?.toString() || '0') || 0;
          const exerciseSets = Math.max(1, parseInt(sets?.toString() || '1'));
          const exerciseAmount = Math.max(1, parseInt(amount?.toString() || '10'));

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
            default:
              exerciseType = { 
                id: 'power', 
                name: 'Power', 
                nameSpanish: 'Fuerza', 
                duration: '20-30 min' 
              };
              break;
          }

          // Determine if it's duration or reps based
          const unitLower = (unit || 'reps').toLowerCase();
          const isDuration = unitLower.includes('second') || 
                            unitLower.includes('minute') ||
                            unitLower.includes('segundo') ||
                            unitLower.includes('minuto') ||
                            currentCategory === 'cardio';

          const durationUnit = unitLower.includes('minute') || unitLower.includes('minuto') ? 'minutes' : 'seconds';

          const exercise: any = {
            id: exerciseId,
            name: cleanName,
            sets: exerciseSets,
            ...(isDuration ? { duration: exerciseAmount, durationUnit } : { reps: exerciseAmount }),
            exerciseSubType: isDuration ? 'duration' : 'reps',
            weight: exerciseWeight,
            weightUnit: 'kg',
            completed: false,
            type: exerciseType,
            setDetails: Array(exerciseSets).fill(null).map((_, setIndex) => ({
              id: `${exerciseId}-set-${setIndex + 1}`,
              ...(isDuration ? { duration: exerciseAmount, durationUnit } : { reps: exerciseAmount }),
              weight: exerciseWeight,
              completed: false,
              weightUnit: 'kg'
            })),
            restTime: isDuration ? 0 : (exerciseSets > 1 ? 60 : 30)
          };

          console.log('Exercise created:', exercise);
          exercises.push(exercise);
        }
      } else {
        console.log('No pattern matched for line:', trimmedLine);
      }
    }

    console.log('Total exercises extracted:', exercises.length);
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