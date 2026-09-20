import { GoogleGenAI } from '@google/genai';
import { LostItem, FoundItem } from './database.types';

export interface GeminiMatchResult {
  confidenceScore: number; // 0 to 100
  isLikelyMatch: boolean;
  reasons: string[];
  uncertainties: string[];
  missingInformation: string[];
  followUpQuestion?: string;
  recommendedAction: string;
  brandMatch?: 'exact' | 'probable' | 'different' | 'unknown';
  colorMatch?: 'exact' | 'similar' | 'different' | 'unknown';
  locationMatch?: 'same_building' | 'nearby' | 'different' | 'unknown';
}

const apiKey =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY;

function getGeminiClient(): GoogleGenAI | null {
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Compare a Lost Item and a Found Item using Gemini 2.5/1.5 Multimodal reasoning.
 * Accepts optional user-provided clarification answers for agentic re-evaluation.
 */
export async function compareItemsWithGemini(
  lostItem: LostItem,
  foundItem: FoundItem,
  userClarification?: string
): Promise<GeminiMatchResult> {
  const client = getGeminiClient();

  if (!client) {
    console.warn(
      'Gemini API key not found in environment (GEMINI_API_KEY/GOOGLE_API_KEY). Using intelligent heuristic evaluation.'
    );
    return heuristicMatch(lostItem, foundItem, userClarification);
  }

  try {
    const prompt = `You are the AI Match Intelligence Engine for a Campus Lost & Found System.
Your job is to RIGOROUSLY and CONSERVATIVELY compare a LOST ITEM report with a FOUND ITEM custody log.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
- You MUST look extremely closely at photos. Two very similar IDs/cards that differ by a single digit, letter, photo, or hologram are NOT the same - they are DIFFERENT items. NEVER merge similar IDs.
- For IDs, cards, wallets, documents: extract visible text/numbers from images with OCR-level attention. If IDs show different names, numbers, photos, or expiry dates, confidence MUST be < 30.
- Pay forensic attention to: serial numbers, roll numbers, student IDs, Aadhaar/PAN-like numbers, barcodes, brand logos, stitching, scratches, stickers, case color, key teeth patterns.
- Location and date proximity ALONE should never produce high confidence. A high score requires strong visual + descriptive alignment.
- Reward amount (if any) is in Indian Rupees (₹), not dollars.
- Be skeptical. If uncertain, lower the score and ask a targeted follow-up question. False positives are worse than false negatives.
- If images are provided, describe what you see in each before scoring.

Compare the following attributes with weights:
1. Category & item type (must match for high score)
2. Brand, model, and physical description (exact tokens)
3. Color & visual characteristics (exact vs similar)
4. Distinctive features - HIGHEST WEIGHT: scratches, stickers, serial numbers, engravings, private marks, ID numbers
5. Forensic photo comparison - scan every pixel for differences in IDs, faces, numbers, wear
6. Location (Campus buildings, rooms, adjacent areas) - secondary signal only
7. Dates & time delta - sanity check only
${userClarification ? `\nADDITIONAL USER CLARIFICATION PROVIDED (incorporate deeply, re-evaluate prior uncertainties):\n"${userClarification}"\n` : ''}

=== LOST ITEM REPORT ===
Title: ${lostItem.title}
Category: ${lostItem.category}
Description: ${lostItem.description}
Distinctive Features: ${lostItem.distinctive_features || 'None provided'}
Location Lost: ${lostItem.location_lost}
Building: ${lostItem.building || 'Not specified'}
Room/Area: ${lostItem.room_or_area || 'Not specified'}
Date Lost: ${lostItem.date_lost}
Time Window: ${lostItem.time_lost_range || 'Not specified'}
Reward (₹): ${lostItem.reward_amount || 0}

=== FOUND ITEM LOG ===
Title: ${foundItem.title}
Category: ${foundItem.category}
Description: ${foundItem.description}
Location Found: ${foundItem.location_found}
Building: ${foundItem.building || 'Not specified'}
Room/Area: ${foundItem.room_or_area || 'Not specified'}
Date Found: ${foundItem.date_found}
Current Custody Storage: ${foundItem.current_storage_location}

Analyze with extreme strictness for IDs/documents. If there are uncertainties (e.g. lost item mentions a sticker/serial/ID not visible in found report, or color is ambiguous, or two IDs look similar but numbers differ), formulate a specific, actionable follow-up question to ask the user.

Return ONLY a JSON object with this exact structure:
{
  "confidenceScore": <integer between 0 and 100>,
  "isLikelyMatch": <boolean, true if confidence >= 65>,
  "reasons": ["<bullet point evidence 1>", "<bullet point evidence 2>"],
  "uncertainties": ["<uncertainty 1>", "<uncertainty 2>"],
  "missingInformation": ["<missing detail 1>"],
  "followUpQuestion": "<Single targeted question to ask user if confidence < 80 or empty string>",
  "recommendedAction": "<e.g. 'Submit claim for verification', 'Ask owner to confirm lock screen', 'Dismiss candidate - ID numbers do not match'>",
  "brandMatch": "<'exact' | 'probable' | 'different' | 'unknown'>",
  "colorMatch": "<'exact' | 'similar' | 'different' | 'unknown'>",
  "locationMatch": "<'same_building' | 'nearby' | 'different' | 'unknown'>"
}`;

    const contents: any[] = [{ text: prompt }];

    // Helper to push multiple data URL images (up to 3 per item for thorough forensic comparison)
    const pushImages = (urls: string[], label: string) => {
      if (!urls || urls.length === 0) return;
      const limit = Math.min(urls.length, 3);
      for (let i = 0; i < limit; i++) {
        const img = urls[i];
        if (img.startsWith('data:image/')) {
          const [meta, base64Data] = img.split(',');
          const mimeMatch = meta.match(/data:(image\/[a-zA-Z0-9.+]+);base64/);
          if (mimeMatch && base64Data) {
            // Add a text marker before each image so Gemini knows which item it belongs to
            contents.push({ text: `[${label} PHOTO ${i + 1}/${limit}]` });
            contents.push({
              inlineData: {
                mimeType: mimeMatch[1],
                data: base64Data,
              },
            });
          }
        } else if (img.startsWith('http')) {
          // For hosted URLs, instruct Gemini to note that it cannot fetch but should rely on descriptions
          contents.push({ text: `[${label} PHOTO ${i + 1} is a hosted URL: ${img.slice(0, 80)} - rely on textual description if image not inline]` });
        }
      }
    };

    pushImages(lostItem.image_urls, 'LOST ITEM');
    pushImages(foundItem.image_urls, 'FOUND ITEM');

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return {
      confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 0)),
      isLikelyMatch: Boolean(parsed.isLikelyMatch),
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      uncertainties: Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [],
      missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
      followUpQuestion: parsed.followUpQuestion || undefined,
      recommendedAction: parsed.recommendedAction || 'Review details',
      brandMatch: parsed.brandMatch || 'unknown',
      colorMatch: parsed.colorMatch || 'unknown',
      locationMatch: parsed.locationMatch || 'unknown',
    };
  } catch (err: any) {
    console.error('Gemini API comparison error, falling back to heuristic engine:', err);
    return heuristicMatch(lostItem, foundItem, userClarification);
  }
}

/**
 * Intelligent deterministic heuristic evaluator (used when offline/fallback).
 * Improved: stricter ID/document handling, forensic token checks, ₹ currency awareness.
 */
function heuristicMatch(
  lostItem: LostItem,
  foundItem: FoundItem,
  userClarification?: string
): GeminiMatchResult {
  let score = 20;
  const reasons: string[] = [];
  const uncertainties: string[] = [];
  const missingInfo: string[] = [];

  const normalize = (s: string) => s.toLowerCase().trim();

  // Category Check - essential
  if (normalize(lostItem.category) === normalize(foundItem.category)) {
    score += 28;
    reasons.push(`Matching category: ${lostItem.category}`);
  } else {
    // Heavy penalty for category mismatch unless one is 'Other'
    if (normalize(lostItem.category) === 'other' || normalize(foundItem.category) === 'other') {
      score += 5;
      uncertainties.push(`Category mismatch but one is generic 'Other' (${lostItem.category} vs ${foundItem.category})`);
    } else {
      score -= 15;
      uncertainties.push(`Different categories logged (${lostItem.category} vs ${foundItem.category}) - likely different items`);
    }
  }

  // ID / Document strictness: extract potential ID tokens (alphanumeric sequences >= 4 chars with digits)
  const idPattern = /[A-Z0-9]{4,}[-_\/]?[0-9]{2,}/gi;
  const extractIds = (text: string) => {
    const m = text.match(idPattern);
    return m ? m.map((x) => x.toUpperCase()) : [];
  };
  const lostText = `${lostItem.title} ${lostItem.description} ${lostItem.distinctive_features || ''}`;
  const foundText = `${foundItem.title} ${foundItem.description}`;
  const lostIds = extractIds(lostText);
  const foundIds = extractIds(foundText);
  let idMismatch = false;
  if (lostIds.length > 0 && foundIds.length > 0) {
    const overlap = lostIds.filter((id) => foundIds.includes(id));
    if (overlap.length > 0) {
      score += 25;
      reasons.push(`Exact ID/serial overlap detected: ${overlap.join(', ')}`);
    } else {
      // Different IDs explicitly mentioned -> strong negative signal, especially for Wallets & IDs
      const isIdCategory = normalize(lostItem.category).includes('wallet') || normalize(lostItem.category).includes('id') || normalize(foundItem.category).includes('wallet');
      if (isIdCategory) {
        score -= 35;
        uncertainties.push(`ID/serial numbers differ (${lostIds.slice(0,2).join(', ')} vs ${foundIds.slice(0,2).join(', ')}) - forensic mismatch, likely NOT same item`);
        idMismatch = true;
      } else {
        score -= 10;
        uncertainties.push(`Serial/ID tokens differ - verify closely`);
      }
    }
  }

  // Title / Keyword Match - but with strictness: require > 1 shared meaningful token for high score
  const lostWords = normalize(lostItem.title).split(/\s+/).filter((w) => w.length > 2);
  const foundWords = normalize(foundItem.title).split(/\s+/).filter((w) => w.length > 2);
  const commonWords = lostWords.filter((w) => foundWords.includes(w));
  const uniqueLost = lostWords.filter((w) => !foundWords.includes(w));
  const uniqueFound = foundWords.filter((w) => !lostWords.includes(w));

  if (commonWords.length >= 2) {
    score += Math.min(20, commonWords.length * 8);
    reasons.push(`Key terms shared: ${commonWords.join(', ')}`);
  } else if (commonWords.length === 1) {
    score += 6;
    reasons.push(`Single shared term: ${commonWords[0]} - weak signal, verify other attributes`);
    uncertainties.push(`Titles only share one word; differing terms: ${[...uniqueLost, ...uniqueFound].slice(0,4).join(', ')}`);
  } else {
    score -= 5;
    uncertainties.push(`Titles use different wording (${lostWords.slice(0,3).join(' ')} vs ${foundWords.slice(0,3).join(' ')})`);
  }

  // Brand/Color textual check inside description
  const colorTokens = ['black','white','blue','red','green','grey','gray','silver','gold','rose','pink','brown','yellow','navy','midnight'];
  const lostColors = colorTokens.filter((c) => normalize(lostText).includes(c));
  const foundColors = colorTokens.filter((c) => normalize(foundText).includes(c));
  if (lostColors.length && foundColors.length) {
    const colorOverlap = lostColors.filter((c) => foundColors.includes(c));
    if (colorOverlap.length) {
      score += 8;
      reasons.push(`Color alignment: ${colorOverlap.join(', ')}`);
    } else {
      score -= 12;
      uncertainties.push(`Color mismatch (${lostColors.join(', ')} vs ${foundColors.join(', ')}) - inspect photos forensically`);
    }
  }

  // Building / Location Proximity - low weight
  if (lostItem.building && foundItem.building && normalize(lostItem.building) === normalize(foundItem.building)) {
    score += 10;
    reasons.push(`Same campus building: ${lostItem.building}`);
  } else if (lostItem.location_lost && foundItem.location_found) {
    const loc1 = normalize(lostItem.location_lost);
    const loc2 = normalize(foundItem.location_found);
    if (loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 6;
      reasons.push('Locations have overlapping area descriptions');
    } else {
      // No penalty, but note nearby vs different
      uncertainties.push(`Different buildings/locations (${lostItem.building || lostItem.location_lost} vs ${foundItem.building || foundItem.location_found})`);
    }
  }

  // Date Check (Found date should be on or after Lost date) - moderate weight
  const dLost = new Date(lostItem.date_lost).getTime();
  const dFound = new Date(foundItem.date_found).getTime();
  const diffDays = Math.round((dFound - dLost) / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays <= 3) {
    score += 12;
    reasons.push(`Found within ${diffDays} day(s) of reported loss - timeline coherent`);
  } else if (diffDays >= 4 && diffDays <= 7) {
    score += 6;
    reasons.push(`Found within ${diffDays} days - plausible`);
  } else if (diffDays < 0) {
    score -= 18;
    uncertainties.push(`Item was logged as found BEFORE reported loss date (${diffDays} days) - timeline impossible unless dates misreported`);
  } else if (diffDays > 14) {
    score -= 8;
    uncertainties.push(`Large time gap (${diffDays} days) - verify if item could remain unfound that long`);
  }

  // Distinctive Features - must be verified, not assumed matching
  if (lostItem.distinctive_features) {
    const feat = lostItem.distinctive_features.toLowerCase();
    const foundDesc = foundText.toLowerCase();
    // Check if distinctive tokens appear in found description
    const featTokens = feat.split(/[\s,]+/).filter((w) => w.length > 3);
    const matchedTokens = featTokens.filter((t) => foundDesc.includes(t));
    if (matchedTokens.length >= 2) {
      score += 10;
      reasons.push(`Distinctive features partially corroborated: ${matchedTokens.slice(0,3).join(', ')}`);
    } else {
      missingInfo.push(`Verify distinctive marks forensically: "${lostItem.distinctive_features}" - inspect photo pixel by pixel`);
      if (!idMismatch) uncertainties.push(`Distinctive features not yet verified in found log`);
    }
  }

  // Image presence check: if either has images, require forensic photo review
  const hasLostImage = lostItem.image_urls && lostItem.image_urls.length > 0;
  const hasFoundImage = foundItem.image_urls && foundItem.image_urls.length > 0;
  if (hasLostImage && hasFoundImage) {
    missingInfo.push('Forensic photo comparison required: examine both images at high zoom for scratches, stickers, ID numbers, face photo, holograms - similar is NOT same');
  } else if (hasLostImage || hasFoundImage) {
    missingInfo.push('Only one side provided photos - request additional images for forensic comparison');
  }

  // Reward note: currency is rupees
  if (lostItem.reward_amount && lostItem.reward_amount > 0) {
    reasons.push(`Reward offered: ₹${lostItem.reward_amount} (Indian Rupees)`);
  }

  // Clarification bonus - but only if user provides specific distinguishing details, not generic
  if (userClarification && userClarification.trim().length > 0) {
    const clar = userClarification.trim();
    const isSpecific = clar.length > 15 && /[0-9a-z]/i.test(clar);
    if (isSpecific) {
      score += 10;
      reasons.push(`User clarification incorporated: "${clar.slice(0, 70)}..."`);
      // If clarification mentions ID numbers, re-evaluate strictness
      const clarIds = extractIds(clar);
      if (clarIds.length && foundIds.length) {
        const cOverlap = clarIds.filter((id) => foundIds.includes(id));
        if (cOverlap.length === 0 && clarIds.length > 0) {
          score -= 15;
          uncertainties.push(`Clarification provides IDs that still do not match found item - likely different item`);
        }
      }
    }
  }

  // Final clamp and forensic cap: if ID mismatch detected, cap at 45 max
  if (idMismatch) score = Math.min(score, 45);

  score = Math.min(96, Math.max(8, score));

  let followUpQuestion: string | undefined = undefined;
  if (score < 80 || idMismatch || missingInfo.length > 0) {
    if (idMismatch) {
      followUpQuestion = `Forensic check: The ID/serial numbers in your report (${lostIds.slice(0,2).join(', ') || 'provided'}) do not visibly match the found item. Can you confirm the exact ID number, photo on ID, and hologram details from the found photo at high zoom?`;
    } else if (lostItem.distinctive_features) {
      followUpQuestion = `Can you confirm if the found item (see photo at 200% zoom) exhibits: "${lostItem.distinctive_features}"? Point to exact location (e.g. top-right sticker, back scratch pattern).`;
    } else if (hasLostImage && hasFoundImage) {
      followUpQuestion = `Please compare both photos side-by-side at high zoom. Do the brand logo, color shade, wear marks, and any ID numbers match EXACTLY? Describe any difference, even 1 digit.`;
    } else {
      followUpQuestion = `Can you provide additional forensic details: exact brand/model, color shade, distinctive scratches/stickers, serial/ID numbers, and a clear photo for pixel-level comparison?`;
    }
  }

  // Determine brand/color/location match enums more accurately
  const brandMatch = commonWords.length >= 2 ? 'probable' as const : commonWords.length === 1 ? 'probable' as const : 'unknown' as const;
  const colorMatch = lostColors.length && foundColors.length && lostColors.some((c) => foundColors.includes(c)) ? 'exact' as const : lostColors.length ? 'different' as const : 'unknown' as const;

  return {
    confidenceScore: score,
    isLikelyMatch: score >= 65 && !idMismatch,
    reasons,
    uncertainties,
    missingInformation: missingInfo,
    followUpQuestion,
    recommendedAction:
      idMismatch
        ? 'Dismiss candidate - ID/serial forensic mismatch, likely different item. Request additional photo verification.'
        : score >= 78
        ? 'High confidence correlation — proceed to claim verification with forensic photo proof (₹ reward if any)'
        : score >= 60
        ? 'Moderate confidence - provide clarification and forensic photo comparison before claiming'
        : 'Low confidence - compare physical item at custody desk with ID proof',
    brandMatch,
    colorMatch,
    locationMatch:
      normalize(lostItem.building || '') === normalize(foundItem.building || '') ? 'same_building' as const : 'nearby' as const,
  };
}
