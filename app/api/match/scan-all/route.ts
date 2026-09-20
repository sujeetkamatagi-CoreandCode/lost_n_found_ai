import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { compareItemsWithGemini } from '@/lib/gemini';
import { LostItem, FoundItem } from '@/lib/database.types';

export async function POST(req: NextRequest) {
  try {
    // 1. Fetch active lost items & found items
    const [lostRes, foundRes] = await Promise.all([
      supabase.from('lost_items').select('*').in('status', ['lost', 'matched']).limit(20),
      supabase.from('found_items').select('*').in('status', ['found', 'matched']).limit(20),
    ]);

    const lostItems = (lostRes.data as LostItem[]) || [];
    const foundItems = (foundRes.data as FoundItem[]) || [];

    if (lostItems.length === 0 || foundItems.length === 0) {
      return NextResponse.json({
        message: 'Insufficient lost or found records for campus-wide correlation.',
        scannedCount: 0,
        matchesGenerated: 0,
      });
    }

    let matchesGenerated = 0;
    const results: any[] = [];

    // 2. Correlate pairs (prioritizing category or location matches)
    for (const lost of lostItems) {
      // Find candidate found items in same category or location
      const candidates = foundItems.filter(
        (f) =>
          f.category === lost.category ||
          f.building === lost.building ||
          f.title.toLowerCase().includes(lost.category.toLowerCase())
      );

      for (const found of candidates.slice(0, 3)) {
        const geminiResult = await compareItemsWithGemini(lost, found);

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

          const { data: savedMatch } = await supabase
            .from('matches')
            .upsert(
              {
                lost_item_id: lost.id,
                found_item_id: found.id,
                confidence_score: geminiResult.confidenceScore,
                reasoning: reasoningPayload,
                status: 'pending',
              },
              { onConflict: 'lost_item_id,found_item_id' }
            )
            .select()
            .single();

          if (savedMatch) {
            matchesGenerated++;
            results.push(savedMatch);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      scannedLostCount: lostItems.length,
      scannedFoundCount: foundItems.length,
      matchesGenerated,
      matches: results,
    });
  } catch (err: any) {
    console.error('API /api/match/scan-all handler error:', err);
    return NextResponse.json(
      { error: err.message || 'Error executing campus scan' },
      { status: 500 }
    );
  }
}
