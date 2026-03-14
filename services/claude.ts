import * as FileSystem from 'expo-file-system';
import { QuestionnaireData, DiagnosisResult } from '../types';
import { SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT, buildUserPrompt, buildFollowUpPrompt } from '../constants/prompts';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function analyzePlant(
  imageUri: string,
  questionnaire: QuestionnaireData,
  options?: {
    isFollowUp?: boolean;
    previousResult?: DiagnosisResult;
    previousDate?: string;
  }
): Promise<DiagnosisResult> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'API Key nicht konfiguriert. Bitte setze EXPO_PUBLIC_CLAUDE_API_KEY in der .env Datei.'
    );
  }

  // Read image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Determine media type
  const ext = imageUri.split('.').pop()?.toLowerCase();
  let mediaType = 'image/jpeg';
  if (ext === 'png') mediaType = 'image/png';
  else if (ext === 'webp') mediaType = 'image/webp';
  else if (ext === 'gif') mediaType = 'image/gif';

  let userPrompt: string;
  let systemPrompt: string;

  if (options?.isFollowUp && options.previousResult && options.previousDate) {
    const daysSince = Math.round(
      (Date.now() - new Date(options.previousDate).getTime()) / 86400000
    );
    userPrompt = buildFollowUpPrompt(questionnaire, options.previousResult, daysSince);
    systemPrompt = FOLLOWUP_SYSTEM_PROMPT;
  } else {
    userPrompt = buildUserPrompt(questionnaire);
    systemPrompt = SYSTEM_PROMPT;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Fehler (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('Keine Antwort von der API erhalten.');
  }

  // Parse JSON from response - handle possible markdown wrapping
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const result: DiagnosisResult = JSON.parse(jsonStr);
    return result;
  } catch {
    throw new Error('Diagnose konnte nicht verarbeitet werden. Bitte versuche es erneut.');
  }
}
