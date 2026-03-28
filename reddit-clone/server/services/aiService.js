const https = require('https');
const logger = require('../utils/logger');

/**
 * AI Service — Comment Toxicity Detection
 *
 * Uses Claude (via Anthropic API) to analyse comment text for toxicity.
 * Returns a structured result so the caller can decide whether to block,
 * flag, or allow the comment.
 *
 * The integration is modular: swap the provider by changing this file only.
 */

const TOXICITY_SYSTEM_PROMPT = `You are a content moderation assistant for a social platform.
Analyse the provided text for toxicity. Respond ONLY with a JSON object — no markdown, no explanation.

JSON schema:
{
  "toxic": boolean,
  "score": number (0.0–1.0, where 1.0 is maximally toxic),
  "categories": string[] (subset of: ["hate_speech","harassment","threat","spam","misinformation","profanity","self_harm"]),
  "reason": string (one sentence explanation, or empty string if not toxic)
}`;

/**
 * Analyses text for toxicity using the Anthropic Messages API.
 * Falls back to a safe default if the API key is missing or the call fails.
 *
 * @param {string} text - The content to analyse
 * @returns {Promise<{toxic: boolean, score: number, categories: string[], reason: string}>}
 */
const analyseToxicity = async (text) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Graceful no-op when AI is not configured
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    logger.debug('AI toxicity check skipped — ANTHROPIC_API_KEY not set');
    return { toxic: false, score: 0, categories: [], reason: '' };
  }

  // Short-circuit trivially safe content to save API calls
  if (!text || text.trim().length < 3) {
    return { toxic: false, score: 0, categories: [], reason: '' };
  }

  try {
    const result = await callAnthropicAPI(text);
    return result;
  } catch (err) {
    // Never block content due to an AI service failure — log and allow
    logger.warn(`AI toxicity check failed: ${err.message}`);
    return { toxic: false, score: 0, categories: [], reason: '' };
  }
};

/**
 * Makes the actual HTTP request to the Anthropic API.
 * Uses native https to avoid extra dependencies.
 */
const callAnthropicAPI = (text) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',     // Fast + cheap for moderation
      max_tokens: 256,
      system: TOXICITY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analyse this text:\n\n${text.slice(0, 1000)}` }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));

          const content = parsed.content?.[0]?.text;
          if (!content) return reject(new Error('Empty AI response'));

          const result = JSON.parse(content);
          resolve(result);
        } catch (e) {
          reject(new Error(`AI response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('AI request timeout'));
    });
    req.write(body);
    req.end();
  });
};

module.exports = { analyseToxicity };
