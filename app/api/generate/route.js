import { composeMuralPrompt } from "@/lib/mural-prompt";
import {
  consumeGeneration,
  quotaCookieName,
  readQuota,
  writeQuota,
} from "@/lib/quota";

export const runtime = "nodejs";
export const maxDuration = 60;

const GEMINI_MODEL = "gemini-2.5-flash-image";
// Client-side optimization keeps normal uploads ~1 MB; this cap is the safety
// net for undecodable formats sent as-is. 12 MB raw ≈ 16 MB base64, safely
// under Gemini's 20 MB inline request limit.
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function getCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function jsonWithQuota(body, status, nextState) {
  const headers = { "content-type": "application/json" };
  if (nextState) {
    headers["set-cookie"] = `${quotaCookieName()}=${encodeURIComponent(
      writeQuota(nextState),
    )}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax; Secure`;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonWithQuota({ ok: false, error: "Server is missing GEMINI_API_KEY." }, 500);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonWithQuota({ ok: false, error: "Expected a multipart form upload." }, 400);
  }

  const wall = form.get("wall");
  const description = String(form.get("description") || "");
  const style = String(form.get("style") || "painterly");
  const coverage = String(form.get("coverage") || "medium");
  const inviteCode = String(form.get("code") || "").trim();

  if (!(wall instanceof File) || wall.size === 0) {
    return jsonWithQuota({ ok: false, error: "Attach a wall photo first." }, 400);
  }
  if (wall.size > MAX_UPLOAD_BYTES) {
    return jsonWithQuota(
      { ok: false, error: "That photo format couldn't be optimized and is over 12 MB — save it as JPG or PNG and retry." },
      400,
    );
  }
  if (description.trim().length < 3) {
    return jsonWithQuota({ ok: false, error: "Describe the mural in a few words." }, 400);
  }

  const state = readQuota(getCookie(request, quotaCookieName()));
  const verdict = consumeGeneration(state, inviteCode || null);
  if (!verdict.allowed) {
    const messages = {
      free_exhausted:
        "Free mockups are used up on this device. Enter an invite code to keep generating.",
      code_exhausted: "That invite code has used all of its mockups.",
      code_invalid: "That invite code isn't valid.",
    };
    return jsonWithQuota({ ok: false, error: messages[verdict.reason] || "Not allowed." }, 429);
  }

  const bytes = Buffer.from(await wall.arrayBuffer());
  const prompt = composeMuralPrompt({ description, style, coverage });

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: wall.type || "image/jpeg",
                  data: bytes.toString("base64"),
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    },
  );

  if (!geminiResponse.ok) {
    const detail = await geminiResponse.text().catch(() => "");
    let friendly = "The image service rejected this request.";
    if (geminiResponse.status === 429) {
      // Google's free tier has zero quota for image models — that 429 means
      // "no billing", not "slow down".
      friendly = detail.includes("free_tier")
        ? "The server's Gemini key is on Google's free tier, which doesn't include image generation. Enable billing on the key's project at aistudio.google.com/apikey."
        : "The image service is rate-limited right now — try again in a minute.";
    }
    console.error("Gemini error", geminiResponse.status, detail.slice(0, 500));
    // Do not consume quota on upstream failure.
    return jsonWithQuota({ ok: false, error: friendly }, 502);
  }

  const payload = await geminiResponse.json();
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData?.data || part.inline_data?.data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;
  if (!inline?.data) {
    return jsonWithQuota(
      { ok: false, error: "No image came back — adjust the description and retry." },
      502,
    );
  }

  return jsonWithQuota(
    {
      ok: true,
      image: `data:${inline.mimeType || inline.mime_type || "image/png"};base64,${inline.data}`,
      remaining: verdict.remaining,
      tier: verdict.tier,
    },
    200,
    verdict.next,
  );
}
