import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // In Next.js 15, params is a Promise and must be awaited
    const { id } = await params;

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, message: 'Status is required' },
        { status: 400 }
      );
    }

    // Update the query status
    const { data: updatedQuery, error } = await supabase
      .from('queries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating query status:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to update query status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Query status updated successfully',
      data: updatedQuery,
    });
  } catch (error) {
    console.error('PATCH /api/queries/[id]/status error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
