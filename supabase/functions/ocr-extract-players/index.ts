// OCR Extract Players — Supabase Edge Function
// Uses Claude Sonnet vision API to extract player names or match results
// from padel booking app screenshots.
//
// Supported platforms: Playtomic, Padel Mates, Nettla, Matchii
//
// Request body:
//   { image_base64: string, context: 'player_import' | 'match_import',
//     media_type?: string, user_display_name?: string, platform_hint?: string }
//
// Response (player_import):
//   { players: string[], platform: string, confidence: number, ratings?: Record<string, number> }
//
// Response (match_import):
//   { platform: string, confidence: number, matches: OCRMatch[] }
//
// Environment variables needed:
//   ANTHROPIC_API_KEY — Claude API key (set in Supabase Dashboard → Edge Functions → Secrets)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Player import prompt (unchanged) ──────────────────────────────────────────

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
  "ratings": {"Player Name 1": 4.5, ...}
}

Rules:
- Extract ONLY player/participant names, not venue names, organizer labels, or UI text
- Normalize names: capitalize first letter of each word, trim whitespace
- If a name appears to be a username (e.g., @handle), include it as-is
- If you see "Waiting list" or similar, still include those players but note lower confidence
- confidence should reflect how certain you are about the name extraction accuracy
- Return ONLY valid JSON, no markdown, no explanation`;

// ── Match import prompt builder ───────────────────────────────────────────────

function buildMatchImportPrompt(
  userName: string | null,
  platformHint: string | null,
): string {
  const userIdentityBlock = userName
    ? `
CRITICAL — USER IDENTITY:
The person importing this screenshot is "${userName}". For EACH match, identify which team they are on by matching their name (first name, full name, abbreviated name, or username that resembles "${userName}"). This determines user_team ("a" or "b") and won (true/false from their perspective).
- On Nettla, names are first-name only. "${userName}" might appear as just "${userName.split(' ')[0]}".
- On Playtomic, names are usually first name + last initial (e.g. "Mikey H").
- Match case-insensitively and account for partial matches.
- If you cannot confidently identify which team the user is on, set user_team to null and won to null.
`
    : "";

  const platformHintBlock = platformHint
    ? `The user indicated this screenshot is from ${platformHint}.\n`
    : "";

  return `You are analyzing a screenshot from a padel app showing match history or match results. Extract ALL visible matches from the screenshot — there may be multiple matches shown.

${userIdentityBlock}
${platformHintBlock}

PLATFORM-SPECIFIC PARSING GUIDE:

**Nettla** (blue/purple accent UI):
- "Latest matches" heading, matches in card-style list
- Each card: date + time (e.g. "Sat 07 Mar, 08:30 - 10:00"), venue below
- Teams shown as "Player1 & Player2" (first names only, joined by "&")
- Trophy icon 🏆 next to the WINNING team's names
- Per-set scores in columns (2 or 3 sets)
- Rating badge in top-right of card showing "X.XX → Y.YY" with delta (+0.20 or -0.04)
- The rating shown is the USER's rating change for that match
- "Date" and "Result" filter tabs at the top

**Playtomic** (blue accent, "Your matches" heading):
- Matches in card list with circular avatar photos
- Each card: date + time (e.g. "13 Dec 2025 | 07:30 - 08:30")
- Player names below avatars: first name + last initial (e.g. "Mikey H")
- Yellow/green ratings badges on avatars (e.g. 1.2, 1.0)
- Trophy icon 🏆 next to winning team's scores
- "Tie" label highlighted in yellow for drawn matches
- Per-set scores in bold columns
- "Upload a score" button at bottom
- "TODAY" button and "Show cancelled matches" toggle

**Padel Mates** (dark navy/teal UI):
- "Private Match" or "Competitive match" tags visible — use these for match_type_hint
- Full names or business names shown
- Circular avatars with rating badges (e.g. 2.13, 1.00)
- Venue name + court name visible (e.g. "Net. Padel Club", "Court: NET. TWO")
- "Share match" and "Chat with admin" buttons
- Tags: "Padel", "Competitive match", "1-7", "£30/P"

**Matchii** (pink/magenta accents):
- Avatar circles with initials
- May show abbreviated names
- Tournament bracket or list views

Return a JSON object with this exact structure:
{
  "platform": "playtomic" | "padelmates" | "nettla" | "matchii" | "unknown",
  "confidence": 0.0 to 1.0,
  "matches": [
    {
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
      "user_team": "a" or "b" or null,
      "won": true or false or null,
      "ratings": {"Player 1": 2.49, "Player 2": 1.5},
      "match_type_hint": "competitive" or "friendly" or null
    }
  ]
}

Rules:
- Extract ALL visible matches from the screenshot, not just one. A match history view typically shows 3-5+ matches.
- If only a single match result is shown, return an array with one element.
- team_a is always the FIRST team shown (top row). team_b is the second team (bottom row).
- Normalize player names: capitalize first letter of each word, trim whitespace.
- For Nettla names joined by "&" (e.g. "Mikey & Frazer"), split into separate names in the array.
- If scores show sets, report per-set scores. If only a single total score, put it as one "set".
- For the "sets" array, team_a scores are the first team's scores and team_b are the second team's.
- "user_team" should be "a" or "b" based on which team contains the identified user. If unsure, use null.
- "won" reflects the user's perspective: true if their team scored more total points across sets. null if user_team is null.
- For drawn matches (equal total points), won should be false.
- "match_type_hint": "competitive" if rankings/ratings are shown, explicit "Competitive match" tags exist, or it appears to be a ranked match. "friendly" if tagged as "Private Match" without competitive tag, or casual context. null if unsure.
- Extract ALL visible ratings per player as decimal numbers.
- For Nettla rating badges (e.g. "2.49 → 2.69"), extract the AFTER value (2.69) as the user's rating for that match.
- Return ONLY valid JSON, no markdown, no explanation.`;
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Validate JWT — ensure the caller is an authenticated user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

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
        },
      );
    }

    const {
      image_base64,
      context,
      media_type: clientMediaType,
      user_display_name,
      platform_hint,
    } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    // Select prompt based on context
    const prompt =
      context === "match_import"
        ? buildMatchImportPrompt(user_display_name ?? null, platform_hint ?? null)
        : PLAYER_IMPORT_PROMPT;

    // Call Claude Sonnet vision (30s timeout to prevent hanging)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      signal: controller.signal,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: context === "match_import" ? 4096 : 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: clientMediaType || "image/jpeg",
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

    clearTimeout(timeout);

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
        },
      );
    }

    const claudeResult = await response.json();
    const rawText = claudeResult.content?.[0]?.text ?? "";

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
        },
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
      },
    );
  }
});
