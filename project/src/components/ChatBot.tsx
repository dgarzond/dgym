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

When creating workout plans, structure them clearly with:
- Exercise name
- Sets and reps
- Weight recommendations (if applicable)
- Rest time between sets

Focus on proper form, safety, and progressive overload. Adapt recommendations based on the user's fitness level (beginner, intermediate, advanced).

If a user asks you to create a workout plan, end your response by telling them they can click the "Import Workout" button to add it to their fitness tracker.`
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

  const handleImportWorkout = () => {
    if (!messages.length) return;

    const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
    if (!lastAssistantMessage) return;

    const workoutText = lastAssistantMessage.content;

    // Check if this is a multi-day routine
    const dayMatches = workoutText.match(/\*\*Day\s+(\d+):\*\*/gi);

    if (dayMatches && dayMatches.length > 1) {
      // Handle multi-day routine
      const days = workoutText.split(/\*\*Day\s+\d+:\*\*/i);
      days.shift(); // Remove the first empty element

      const generatedWorkouts: Workout[] = [];

      dayMatches.forEach((dayMatch, dayIndex) => {
        const dayNumber = dayMatch.match(/\d+/)?.[0] || (dayIndex + 1).toString();
        const dayContent = days[dayIndex] || '';

        // Extract duration from the day content
        let duration = '45-60 minutes'; // default
        const durationMatch = dayContent.match(/(\d+[-–]\d+|\d+)\s*(?:minutes?|mins?|hours?)/i);
        if (durationMatch) {
          duration = durationMatch[0];
        } else {
          // Estimate duration based on content
          const exerciseCount = (dayContent.match(/\d+\s*sets?\s*(?:of|x)\s*\d+/gi) || []).length;
          if (exerciseCount > 8) duration = '60-75 minutes';
          else if (exerciseCount > 5) duration = '45-60 minutes';
          else duration = '30-45 minutes';
        }

        const exercises = extractExercisesFromText(dayContent, dayIndex);

        if (exercises.length > 0) {
          const workoutName = `Day ${dayNumber} - AI Routine (${duration})`;

          const newWorkout: Workout = {
            id: `workout-day${dayNumber}-${Date.now()}-${dayIndex}`,
            date: new Date(Date.now() + dayIndex * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Each day gets a different date
            name: workoutName,
            exercises,
            completed: false
          };

          generatedWorkouts.push(newWorkout);
        }
      });

      if (generatedWorkouts.length > 0) {
        generatedWorkouts.forEach(workout => onWorkoutGenerated(workout));
        alert(`¡${generatedWorkouts.length} rutinas importadas exitosamente!`);
      } else {
        alert('No se pudieron extraer ejercicios de la rutina multi-día.');
      }
    } else {
      // Handle single-day routine (existing logic)
      const exercises = extractExercisesFromText(workoutText, 0);

      if (exercises.length === 0) {
        alert('No se pudieron extraer ejercicios del plan. Asegúrate de que el formato incluya sets y repeticiones.');
        return;
      }

      // Extract workout name
      let workoutName = 'AI Generated Workout';
      const nameMatch = workoutText.match(/(?:Here's a|Here is a)\s+([^.!?\n]+)/i);
      if (nameMatch) {
        workoutName = nameMatch[1].trim();
      }

      // Estimate duration
      const exerciseCount = exercises.length;
      let duration = '30-45 minutes';
      if (exerciseCount > 8) duration = '60-75 minutes';
      else if (exerciseCount > 5) duration = '45-60 minutes';

      workoutName += ` (${duration})`;

      const newWorkout: Workout = {
        id: `workout-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        name: workoutName,
        exercises,
        completed: false
      };

      onWorkoutGenerated(newWorkout);
      alert(`¡Rutina "${workoutName}" importada con ${exercises.length} ejercicios!`);
    }
  };

  const extractExercisesFromText = (text: string, dayIndex: number): Exercise[] => {
    const exercises: Exercise[] = [];

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

  const extractExercisesFromSection = (sectionText: string, dayIndex: number): Exercise[] => {
    const exercises: Exercise[] = [];

    // Enhanced patterns to catch different exercise formats
    const exercisePatterns = [
      // "Exercise name: 3 sets of 12 reps" or "Exercise name: 3 sets x 12 reps"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*sets?\s*(?:of|x)\s*(\d+)\s*reps?(?:\s*@?\s*(\d+)\s*(?:lbs?|kg))?/gmi,
      // "Exercise name: 3 x 12"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*[x×]\s*(\d+)(?:\s*@?\s*(\d+)\s*(?:lbs?|kg))?/gmi,
      // Time-based: "Exercise name: 3 sets of 30 seconds"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*sets?\s*(?:of|x)\s*(\d+)\s*(?:seconds?|mins?|minutes?)/gmi,
      // Simple reps: "Exercise name: 10 reps each leg"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*reps?(?:\s+(?:each|per)\s+\w+)?/gmi,
      // Time only: "Exercise name: 30 seconds each side"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]+?)(?:\*\*)?\s*:\s*(\d+)\s*(?:seconds?|minutes?|mins?)(?:\s+(?:each|per)\s+\w+)?/gmi,
      // Cardio: "20 minutes of cardio"
      /(?:^\s*[-•*]\s*)?(\d+)\s*(?:minutes?|mins?)\s*(?:of\s+)?([^.\n,]+?)(?:(?:\(|\[)[^)\]]*(?:\)|\])|$)/gmi,
      // Machine exercises: "Exercise machine: 3 sets of 12 reps"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]*(?:machine|press|curl|raise|pulldown)[^:\n]*)(?:\*\*)?\s*:\s*(\d+)\s*sets?\s*(?:of|x)\s*(\d+)\s*reps?/gmi,
      // Variations: "Exercise variations: 3 sets of 30 seconds"
      /(?:^\s*[-•*]\s*)?(?:\*\*)?([^:\n]*(?:variation|plank)[^:\n]*)(?:\*\*)?\s*:\s*(\d+)\s*sets?\s*(?:of|x)\s*(\d+)\s*(?:seconds?|reps?)/gmi
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

            // Determine if this is a time-based exercise
            const isTimeBased = cleanName.toLowerCase().includes('plank') ||
                               cleanName.toLowerCase().includes('stretch') ||
                               cleanName.toLowerCase().includes('cardio') ||
                               cleanName.toLowerCase().includes('hold') ||
                               i === 2 || i === 4 || i === 5;

            exercises.push({
              id: exerciseId,
              name: cleanName,
              sets: exerciseSets,
              reps: exerciseReps,
              weight: exerciseWeight,
              weightUnit: 'lbs',
              completed: false,
              setDetails: Array(exerciseSets).fill(null).map((_, setIndex) => ({
                id: `${exerciseId}-set-${setIndex + 1}`,
                reps: exerciseReps,
                weight: exerciseWeight,
                completed: false,
                weightUnit: 'lbs' as const
              })),
              restTime: isTimeBased ? 30 : (exerciseReps <= 5 ? 120 : (exerciseReps <= 8 ? 90 : 60))
            });
          }
          break;
        }
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