// Reads a fuel receipt photo with Claude, using the API key saved in Settings.
import Anthropic from '@anthropic-ai/sdk';
import { FUEL_STATIONS } from '../src/data/vehicles.ts';
import { RECEIPT_SCHEMA, receiptPrompt } from '../src/receipt.ts';

/** Returns the receipt fields as Claude read them (the app checks them), or throws an Error to show the user. */
export async function readReceipt(apiKey, photo, mediaType) {
  const client = new Anthropic({ apiKey });
  let response;
  try {
    response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      // Rerouted to another model if this one declines, instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: RECEIPT_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: photo.toString('base64') } },
            { type: 'text', text: receiptPrompt(FUEL_STATIONS) },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('The Claude API key was refused. Check it in Settings → Reading receipts.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('This Claude API key is not allowed to read images. Check your account at console.anthropic.com.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Too many receipts at once, or the API credit is used up. Try again in a minute.');
    if (e instanceof Anthropic.APIConnectionError) throw new Error('The PC could not reach Claude. Check its internet connection.');
    if (e instanceof Anthropic.APIError) throw new Error(`Claude could not read the receipt (error ${e.status}).`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this image.');
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Claude returned no answer for this receipt.');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Claude returned an unreadable answer for this receipt.');
  }
}
