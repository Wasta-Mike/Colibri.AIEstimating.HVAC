import Anthropic from "@anthropic-ai/sdk";

const VISION_MODEL = "claude-opus-4-8";
const TEXT_MODEL = "claude-haiku-4-5-20251001";

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set on the server (.env)");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// taskType: 'vision' | 'text'. Compute never touches the model — see lib/compute.js.
export async function callModel({ taskType, system, messages }) {
  const anthropic = getClient();
  const model = taskType === "vision" ? VISION_MODEL : TEXT_MODEL;
  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages,
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
  return { text, model, raw: response };
}

export function imageBlockFromDataUrl(dataUrl) {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Expected a base64 data URL for capture image");
  const [, mediaType, data] = match;
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType, data },
  };
}

// Pulls a fenced ```json ... ``` annotation block out of model prose, if present.
export function extractJsonBlock(text) {
  const match = /```json\s*([\s\S]*?)```/.exec(text);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}
