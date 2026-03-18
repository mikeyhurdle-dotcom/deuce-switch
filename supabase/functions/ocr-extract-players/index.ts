// OCR Extract Players — Supabase Edge Function
// Uses Claude Haiku 4.5 vision API to extract player names from booking app screenshots.
//
// Supported platforms: Playtomic, Padel Mates, Nettla, Matchii
//
// Request body:
//   { image_base64: string, context: 'player_import' | 'match_import' }
//
// Response:
//   { players: string[], platform: string, confidence: number, raw_text?: string }
//
// Environment variables needed:
//   ANTHROPIC_API_KEY — Claude API key (set in Supabase Dashboard → Edge Functions → Secrets)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Platform detection prompts ─────────────────────────────────────────────

const PLAYER_IMPORT_PROMPT = `You are analyzing a screenshot from a padel booking platform. Your task is to extract player names from the image.

Look for:
1. A list of participants/players — these are usually displayed as a vertical list with names
2. The platform used — identify if this is Playtomic, Padel Mates, Nettla, Matchii, or unknown
3. Player skill ratings if visible (decimal numbers like 1.18, 4.5, etc.)

Platform identification hints:
- Playtomic: Green/teal accent colors, "Level" ratings, profile pages with stats
- Padel Mates: Orange accents, "Waiting list" sections, decimal skill ratings
- Nettla: Blue/navy UI, "Players (X/Y)" format, activity pages with event details
- Matchii: Pink/magenta accents, avatar circles with initials, "Participants (X/X)" format

Return a JSON object with this exact structure:
{
  "players": ["Player Name 1", "Player Name 2", ...],
  "platform": "playtomic" | "padelmates" | "nettla" | "matchii" | "unknown",
  "confidence": 0.0 to 1.0,
  "ratings": {"Player Name 1": 4.5, ...} // optional, only if skill ratings are visible
}

Rules:
- Extract ONLY player/participant names, not venue names, organizer labels, or UI text
- Normalize names: capitalize first letter of each word, trim whitespace
- If a name appears to be a username (e.g., @handle), include it as-is
- If you see "Waiting list" or similar, still include those players but note lower confidence
- confidence should reflect how certain you are about the name extraction accuracy
- Return ONLY valid JSON, no markdown, no explanation`;

const MATCH_IMPORT_PROMPT = `You are analyzing a screenshot from a padel booking platform or match result screen. Your task is to extract match data including scores, players, venue, and date.

Return a JSON object with this exact structure:
{
  "platform": "playtomic" | "padelmates" | "nettla" | "matchii" | "unknown",
  "confidence": 0.0 to 1.0,
  "match": {
    "date": "YYYY-MM-DD" or null,
    "time": "HH:MM" or null,
    "venue": "Venue Name" or null,
    "court": "Court name/number" or null,
    "sets": [
      { "team_a": 6, "team_b": 4 },
      { "team_a": 3, "team_b": 6 }
    ],
    "team_a": ["Player 1", "Player 2"],
    "team_b": ["Player 3", "Player 4"],
    "ratings": {"Player 1": 4.5, ...}
  }
}

Rules:
- Extract ALL visible scores per set
- If only a final score is visible (not per-set), put it as a single set
- Normalize player names: capitalize first letter of each word
- Venue should be the club/facility name, not the address
- confidence reflects overall extraction accuracy
- Return ONLY valid JSON, no markdown, no explanation`;

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Validate API key is configured
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured",
          hint: "Set ANTHROPIC_API_KEY in Supabase Dashboard → Edge Functions → Secrets",
        }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const { image_base64, context } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Select prompt based on context
    const prompt =
      context === "match_import"
        ? MATCH_IMPORT_PROMPT
        : PLAYER_IMPORT_PROMPT;

    // Call Claude Haiku 4.5 vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Claude API error:", response.status, errBody);
      return new Response(
        JSON.stringify({
          error: "Claude API call failed",
          status: response.status,
          detail: errBody,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const claudeResult = await response.json();
    const rawText =
      claudeResult.content?.[0]?.text ?? "";

    // Parse the JSON response from Claude
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", rawText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse OCR result",
          raw_text: rawText,
        }),
        {
          status: 422,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // Return structured result
    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
