import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { compareItemsWithGemini } from '@/lib/gemini';
import { LostItem, FoundItem, InsertMatch } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, itemType, additionalContext } = body;

    if (!itemId || !itemType) {
      return NextResponse.json(
        { error: 'Missing required parameters: itemId and itemType' },
        { status: 400 }
      );
    }

    if (itemType === 'lost') {
      // 1. Fetch the primary lost item
      const { data: lostItem, error: lostError } = await supabase
        .from('lost_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (lostError || !lostItem) {
        return NextResponse.json({ error: 'Lost item not found' }, { status: 404 });
      }

      // 2. Query candidate found items (same category or related, status: 'found' or 'matched')
      let { data: candidates, error: candError } = await supabase
        .from('found_items')
        .select('*')
        .in('status', ['found', 'matched'])
        .eq('category', lostItem.category)
        .limit(10);

      // If no same-category candidates found, fetch recent unreturned items
      if (!candidates || candidates.length === 0) {
        const { data: allFound } = await supabase
          .from('found_items')
          .select('*')
          .in('status', ['found', 'matched'])
          .limit(5);
        candidates = allFound || [];
      }

      if (candidates.length === 0) {
        return NextResponse.json({
          message: 'No candidate found items currently available for matching.',
          matchesFound: 0,
          matches: [],
        });
      }

      const generatedMatches: any[] = [];

      // 3. Compare each candidate with Gemini
      for (const foundItem of candidates) {
        const geminiResult = await compareItemsWithGemini(
          lostItem as LostItem,
          foundItem as FoundItem,
          additionalContext
        );

        if (geminiResult.confidenceScore >= 35) {
          const reasoningPayload = JSON.stringify({
            summary: geminiResult.reasons.join(' • '),
            reasons: geminiResult.reasons,
            uncertainties: geminiResult.uncertainties,
            missingInformation: geminiResult.missingInformation,
            followUpQuestion: geminiResult.followUpQuestion,
            recommendedAction: geminiResult.recommendedAction,
            brandMatch: geminiResult.brandMatch,
            colorMatch: geminiResult.colorMatch,
            locationMatch: geminiResult.locationMatch,
          });

          // Save / upsert match in Supabase
          const { data: savedMatch, error: saveError } = await supabase
            .from('matches')
            .upsert(
              {
                lost_item_id: lostItem.id,
                found_item_id: foundItem.id,
                confidence_score: geminiResult.confidenceScore,
                reasoning: reasoningPayload,
                status: geminiResult.confidenceScore >= 80 ? 'pending' : 'pending',
              },
              { onConflict: 'lost_item_id,found_item_id' }
            )
            .select('*, lost_items(*), found_items(*)')
            .single();

          if (!saveError && savedMatch) {
            generatedMatches.push(savedMatch);
          }
        }
      }

      return NextResponse.json({
        success: true,
        matchesFound: generatedMatches.length,
        matches: generatedMatches,
      });
    } else if (itemType === 'found') {
      // 1. Fetch the primary found item
      const { data: foundItem, error: foundError } = await supabase
        .from('found_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (foundError || !foundItem) {
        return NextResponse.json({ error: 'Found item not found' }, { status: 404 });
      }

      // 2. Query candidate lost items (same category, status: 'lost' or 'matched')
      let { data: candidates } = await supabase
        .from('lost_items')
        .select('*')
        .in('status', ['lost', 'matched'])
        .eq('category', foundItem.category)
        .limit(10);

      if (!candidates || candidates.length === 0) {
        const { data: allLost } = await supabase
          .from('lost_items')
          .select('*')
          .in('status', ['lost', 'matched'])
          .limit(5);
        candidates = allLost || [];
      }

      if (candidates.length === 0) {
        return NextResponse.json({
          message: 'No candidate lost reports currently available for matching.',
          matchesFound: 0,
          matches: [],
        });
      }

      const generatedMatches: any[] = [];

      for (const lostItem of candidates) {
        const geminiResult = await compareItemsWithGemini(
          lostItem as LostItem,
          foundItem as FoundItem,
          additionalContext
        );

        if (geminiResult.confidenceScore >= 35) {
          const reasoningPayload = JSON.stringify({
            summary: geminiResult.reasons.join(' • '),
            reasons: geminiResult.reasons,
            uncertainties: geminiResult.uncertainties,
            missingInformation: geminiResult.missingInformation,
            followUpQuestion: geminiResult.followUpQuestion,
            recommendedAction: geminiResult.recommendedAction,
            brandMatch: geminiResult.brandMatch,
            colorMatch: geminiResult.colorMatch,
            locationMatch: geminiResult.locationMatch,
          });

          const { data: savedMatch, error: saveError } = await supabase
            .from('matches')
            .upsert(
              {
                lost_item_id: lostItem.id,
                found_item_id: foundItem.id,
                confidence_score: geminiResult.confidenceScore,
                reasoning: reasoningPayload,
                status: 'pending',
              },
              { onConflict: 'lost_item_id,found_item_id' }
            )
            .select('*, lost_items(*), found_items(*)')
            .single();

          if (!saveError && savedMatch) {
            generatedMatches.push(savedMatch);
          }
        }
      }

      return NextResponse.json({
        success: true,
        matchesFound: generatedMatches.length,
        matches: generatedMatches,
      });
    }

    return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/match handler error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during matching' },
      { status: 500 }
    );
  }
}
