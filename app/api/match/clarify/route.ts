import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { compareItemsWithGemini } from '@/lib/gemini';
import { LostItem, FoundItem } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, lostItemId, foundItemId, clarificationAnswer } = body;

    if (!lostItemId || !foundItemId || !clarificationAnswer) {
      return NextResponse.json(
        { error: 'Missing required parameters: lostItemId, foundItemId, and clarificationAnswer' },
        { status: 400 }
      );
    }

    // 1. Fetch both items
    const [lostRes, foundRes] = await Promise.all([
      supabase.from('lost_items').select('*').eq('id', lostItemId).single(),
      supabase.from('found_items').select('*').eq('id', foundItemId).single(),
    ]);

    if (lostRes.error || !lostRes.data || foundRes.error || !foundRes.data) {
      return NextResponse.json(
        { error: 'One or both item records could not be found' },
        { status: 404 }
      );
    }

    // 2. Re-evaluate with Gemini incorporating the user clarification
    const geminiResult = await compareItemsWithGemini(
      lostRes.data as LostItem,
      foundRes.data as FoundItem,
      clarificationAnswer
    );

    const reasoningPayload = JSON.stringify({
      summary: geminiResult.reasons.join(' • '),
      reasons: geminiResult.reasons,
      uncertainties: geminiResult.uncertainties,
      missingInformation: geminiResult.missingInformation,
      followUpQuestion: geminiResult.followUpQuestion,
      recommendedAction: geminiResult.recommendedAction,
      clarificationIncorporated: clarificationAnswer,
      brandMatch: geminiResult.brandMatch,
      colorMatch: geminiResult.colorMatch,
      locationMatch: geminiResult.locationMatch,
    });

    // 3. Update the match in Supabase
    let query = supabase.from('matches').upsert(
      {
        ...(matchId ? { id: matchId } : {}),
        lost_item_id: lostItemId,
        found_item_id: foundItemId,
        confidence_score: geminiResult.confidenceScore,
        reasoning: reasoningPayload,
        status: geminiResult.confidenceScore >= 75 ? 'verified' : 'pending',
      },
      { onConflict: 'lost_item_id,found_item_id' }
    );

    const { data: updatedMatch, error: updateError } = await query
      .select('*, lost_items(*), found_items(*)')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      match: updatedMatch,
      geminiResult,
    });
  } catch (err: any) {
    console.error('API /api/match/clarify handler error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during clarification' },
      { status: 500 }
    );
  }
}
