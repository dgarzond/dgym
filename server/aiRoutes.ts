import type { Express, Request, Response } from 'express';
import OpenAI from 'openai';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function isChatMessage(x: unknown): x is ChatMessage {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  return (
    (m.role === 'system' || m.role === 'user' || m.role === 'assistant') &&
    typeof m.content === 'string'
  );
}

export function registerAiRoutes(app: Express) {
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'OPENAI_API_KEY is not configured on the server',
        });
      }

      const {
        messages,
        model,
        max_tokens,
        temperature,
        response_format,
      } = (req.body ?? {}) as Record<string, unknown>;

      if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatMessage)) {
        return res.status(400).json({ error: 'Invalid messages payload' });
      }

      const chosenModel = typeof model === 'string' && model.trim() ? model.trim() : 'gpt-4o-mini';

      // Narrow response_format to the shapes the OpenAI SDK expects.
      // Supported: { type: 'text' | 'json_object' | 'json_schema', ... }
      let safeResponseFormat: unknown | undefined = undefined;
      if (response_format && typeof response_format === 'object') {
        const t = (response_format as any).type;
        if (t === 'text' || t === 'json_object' || t === 'json_schema') {
          safeResponseFormat = response_format;
        }
      }

      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: chosenModel,
        messages,
        ...(typeof max_tokens === 'number' ? { max_tokens } : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(safeResponseFormat ? { response_format: safeResponseFormat as any } : {}),
      });

      const content = completion.choices?.[0]?.message?.content ?? '';
      res.json({
        content,
        usage: completion.usage ?? null,
        model: completion.model ?? chosenModel,
      });
    } catch (error: any) {
      const message = error?.message ?? 'Unknown error';
      const status = typeof error?.status === 'number' ? error.status : 500;
      res.status(status).json({ error: 'AI request failed', details: message });
    }
  });
}

