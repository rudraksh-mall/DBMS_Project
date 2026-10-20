import OpenAI from "openai";
import { fallbackClassify } from "./fallbackClassifier.js";

const VALID_CATEGORIES = [
  "road", "garbage", "drainage", "lighting",
  "water", "traffic", "infrastructure", "obstruction", "other",
];

const VALID_SEVERITIES = ["low", "medium", "high"];

function parseAndValidate(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed.isRelevant !== "boolean") return null;

  if (parsed.isRelevant === false) {
    return {
      isRelevant: false,
      rejectionReason:
        parsed.rejectionReason ||
        "Image does not appear to show a civic infrastructure issue.",
    };
  }

  if (typeof parsed.descriptionMatches === "boolean" && parsed.descriptionMatches === false) {
    return {
      isRelevant: true,
      descriptionMatches: false,
      mismatchReason:
        parsed.mismatchReason ||
        "The uploaded image and description appear to describe different issues.",
    };
  }

  const category = parsed.category?.toLowerCase() || null;
  const severity = parsed.severity?.toLowerCase() || null;

  if (!category || !VALID_CATEGORIES.includes(category)) return null;
  if (!severity || !VALID_SEVERITIES.includes(severity)) return null;
  if (
    typeof parsed.confidence !== "number" ||
    parsed.confidence < 0 ||
    parsed.confidence > 1
  ) {
    return null;
  }
  if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) return null;

  return {
    isRelevant: true,
    descriptionMatches: true,
    category,
    severity,
    confidence: parsed.confidence,
    keywords: parsed.keywords,
    rejectionReason: null,
  };
}

// Keyword-based fallback used when the AI model is unavailable or returns an
// unparseable response, so reports are still categorized (marked "fallback").
function fallbackResult(description) {
  const fb = fallbackClassify(description);
  return {
    isRelevant: true,
    descriptionMatches: true,
    category: fb.category,
    severity: fb.severity,
    confidence: fb.confidence,
    keywords: fb.keywords,
    source: "fallback",
  };
}

export const analyzeComplaintWithAI = async ({ imageUrl, description }) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a civic infrastructure issue classifier for CivicFix.

You perform THREE checks:

STEP 1 — Is the image a real civic issue?
If the image does not show a real civic infrastructure problem, set isRelevant to false and provide a rejectionReason.

STEP 2 — What civic issue is visible?
Classify the issue visible in the image into one of the valid categories and assign a severity.

STEP 3 — Does the user's description match the image?
Compare the user's description with what is actually visible in the image.
If the description clearly refers to a different type of issue than what the image shows, set descriptionMatches to false and provide a mismatchReason.

Valid categories:
- road (potholes, damaged roads, asphalt cracks)
- garbage (garbage dumps, trash, waste, litter, overflowing bins)
- drainage (drainage issues, sewer problems, waterlogging, blocked drains)
- lighting (broken streetlights, lamp post issues, dark areas)
- water (water leakage, broken pipes, pipe bursts, flooding)
- traffic (traffic signal failures, signal light issues)
- infrastructure (damaged public infrastructure, footpath/sidewalk damage)
- obstruction (fallen trees, encroachment, road blockage, debris, barricades)
- other (any other civic issue not listed above)

Reject images that show:
- batman, superheroes, comic characters
- anime, cartoons, manga, game characters
- wallpapers, screenshots, user interfaces
- selfies, portraits, people posing
- pets (dogs, cats), food, restaurant meals
- landscapes, mountains, beaches, sunsets
- any scene not depicting a real civic infrastructure problem

Return ONLY valid JSON.

If the image is rejected:
{ "isRelevant": false, "rejectionReason": "reason for rejection" }

If the image is relevant but the description does NOT match:
{ "isRelevant": true, "descriptionMatches": false, "mismatchReason": "The image shows [X] but the description refers to [Y]." }

If both pass:
{ "isRelevant": true, "descriptionMatches": true, "category": "road", "severity": "high", "confidence": 0.94, "keywords": ["pothole","road-damage"] }`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `User complaint description: "${description}"\n\nAnalyze the uploaded image. First identify what civic issue is visible. Then compare it against the user's description. If they describe different issues, set descriptionMatches to false.`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const raw = response.choices[0]?.message?.content || "";
    console.log("OpenAI Model:", response.model);
    console.log("OpenAI Response JSON:", raw);

    const validated = parseAndValidate(raw);

    if (!validated) {
      console.error("OpenAI response validation failed for raw:", raw);
      return fallbackResult(description);
    }

    if (validated.isRelevant === false) {
      return {
        isRelevant: false,
        rejectionReason: validated.rejectionReason,
      };
    }

    if (validated.descriptionMatches === false) {
      return {
        isRelevant: true,
        descriptionMatches: false,
        mismatchReason: validated.mismatchReason,
      };
    }

    return {
      isRelevant: true,
      descriptionMatches: true,
      category: validated.category,
      severity: validated.severity,
      confidence: validated.confidence,
      keywords: validated.keywords,
    };
  } catch (error) {
    console.error("OpenAI API Failure:", error.message);
    if (error.status) console.error("OpenAI Status Code:", error.status);
    if (error.code) console.error("OpenAI Error Code:", error.code);

    return fallbackResult(description);
  }
};