import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
const modelId = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';

export function isGeminiConfigured() {
  return typeof apiKey === 'string' && apiKey.trim().length > 0;
}

function getModel() {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to .env');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelId,
    generationConfig: { responseMimeType: 'application/json' },
  });
}

function stripJsonFence(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/u, '');
  }
  return t.trim();
}

/**
 * Turns a messy description into a short title + notes suitable for your list.
 */
export async function suggestItemFromDescription(description) {
  const trimmed = typeof description === 'string' ? description.trim() : '';
  if (!trimmed) throw new Error('Enter a description for the suggestion.');

  const model = getModel();
  const prompt = `You organize simple todo/reminder rows for an app user.
Respond with ONLY valid JSON, no markdown. Shape: {"title":"string","notes":"string"}
Rules:
- title: concise task name, max ~80 characters, no newline.
- notes: optional extra detail, max ~300 characters (empty string ok).
- Prefer clear, actionable wording.

User's rough idea:\n${trimmed}`;

  const { response } = await model.generateContent(prompt);
  let raw = response.text();

  /** @type {{ title?: string; notes?: string }} */
  let data;
  try {
    raw = stripJsonFence(raw || '');
    data = JSON.parse(raw);
  } catch {
    throw new Error('AI returned unreadable JSON. Try a shorter prompt or retry.');
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const notes = typeof data.notes === 'string' ? data.notes.trim() : '';
  if (!title) {
    throw new Error('AI produced an empty title. Try rephrasing your idea.');
  }
  return { title, notes };
}

/**
 * Brief natural-language recap of listed items for the dashboard.
 */
export async function summarizeItemList(entries) {
  if (!isGeminiConfigured()) {
    throw new Error('Gemini API key is missing. Add REACT_APP_GEMINI_API_KEY to .env');
  }

  let body;
  if (!entries.length) {
    body = '(no items yet)';
  } else {
    body = entries
      .map(
        (entry, idx) =>
          `${idx + 1}. ${entry.title}${entry.notes ? ` — ${entry.notes}` : ''}`
      )
      .join('\n');
  }

  const prompt = `You summarize a person's short task list clearly and helpfully (2–4 sentences).
Avoid bullet JSON; plain paragraphs only.
If empty, acknowledge they have nothing listed yet.

Their items:\n${body}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const noJsonModel = genAI.getGenerativeModel({ model: modelId });
  const { response } = await noJsonModel.generateContent(prompt);
  const text = (response.text() || '').trim();
  if (!text) throw new Error('Empty AI response.');
  return text;
}
