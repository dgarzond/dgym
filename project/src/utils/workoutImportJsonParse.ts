/**
 * Parses JSON produced by the AI for workout import. The model sometimes wraps output in
 * markdown fences, emits trailing commas, or includes `{` / `}` inside string values. Naive
 * brace-counting truncates the payload early and yields errors like
 * "Expected double-quoted property name".
 */

/** Removes common ```json ... ``` wrappers while keeping inner content. */
export function stripMarkdownCodeFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '');
  s = s.replace(/\s*```$/i, '');
  return s.trim();
}

/**
 * Returns the first balanced JSON object or array substring starting at `{` or `[`.
 * Tracks double-quoted strings and backslash escapes so braces inside strings are ignored.
 */
export function extractFirstBalancedJsonValue(source: string): string {
  const trimmed = source.trim();
  const startObj = trimmed.indexOf('{');
  const startArr = trimmed.indexOf('[');
  let start: number;
  if (startObj === -1 && startArr === -1) {
    throw new ParseWorkoutImportJsonError(
      'No se encontró un objeto o arreglo JSON (no hay `{` ni `[` en el texto).'
    );
  }
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);

  let depthBrace = 0;
  let depthBracket = 0;
  const open = trimmed[start];
  if (open === '{') depthBrace = 1;
  else depthBracket = 1;

  let inString = false;
  let escape = false;

  for (let i = start + 1; i < trimmed.length; i++) {
    const c = trimmed[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === '{') depthBrace++;
    else if (c === '}') depthBrace--;
    else if (c === '[') depthBracket++;
    else if (c === ']') depthBracket--;

    if (depthBrace < 0 || depthBracket < 0) {
      throw new ParseWorkoutImportJsonError('JSON desbalanceado (demasiados `}` o `]`).');
    }

    if (depthBrace === 0 && depthBracket === 0) {
      return trimmed.slice(start, i + 1);
    }
  }

  throw new ParseWorkoutImportJsonError(
    'JSON incompleto o desbalanceado (faltan cierres antes del final del texto).'
  );
}

/**
 * Removes trailing commas before `}` or `]` outside of quoted strings (invalid in JSON but common in model output).
 */
export function removeTrailingCommasOutsideStrings(text: string): string {
  let out = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      out += c;
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }

    if (c === ',') {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j++;
      if (j < text.length && (text[j] === '}' || text[j] === ']')) {
        continue;
      }
    }

    out += c;
  }

  return out;
}

export class ParseWorkoutImportJsonError extends Error {
  readonly causeError?: unknown;

  constructor(message: string, causeError?: unknown) {
    super(message);
    this.name = 'ParseWorkoutImportJsonError';
    this.causeError = causeError;
  }
}

function tryNativeJsonParse(json: string): unknown {
  return JSON.parse(json);
}

/**
 * Strips BOM, markdown fences, extracts balanced JSON, removes trailing commas, then JSON.parse.
 * Throws ParseWorkoutImportJsonError with a short, user-facing message when parsing fails.
 */
export function parseWorkoutImportJsonString(raw: string): unknown {
  if (raw == null || typeof raw !== 'string') {
    throw new ParseWorkoutImportJsonError('La respuesta del modelo está vacía o no es texto.');
  }

  let cleaned = raw.replace(/^\uFEFF/, '').trim();
  cleaned = stripMarkdownCodeFences(cleaned);
  cleaned = extractFirstBalancedJsonValue(cleaned);
  cleaned = removeTrailingCommasOutsideStrings(cleaned);

  try {
    return tryNativeJsonParse(cleaned);
  } catch (firstError) {
    const hint =
      firstError instanceof SyntaxError && firstError.message
        ? ` Detalle: ${firstError.message}`
        : '';
    throw new ParseWorkoutImportJsonError(
      `No se pudo interpretar el JSON generado.${hint} Si el error continúa, pide a la IA que devuelva solo JSON sin comentarios ni texto adicional.`,
      firstError
    );
  }
}
