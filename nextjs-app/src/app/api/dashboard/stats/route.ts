import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Get total queries count
    const { count: totalQueries } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true });

    // Get queries created today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: queriesToday } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get queries created this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const { count: queriesThisWeek } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString());

    // Get status distribution
    const { data: allQueries } = await supabase
      .from('queries')
      .select('status');

    type StatusStat = { status: string; count: number };
    type QueryWithStatus = { status: string };

    const statusStats = (allQueries || []).reduce((acc: StatusStat[], query: QueryWithStatus) => {
      const existing = acc.find((item: StatusStat) => item.status === query.status);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ status: query.status, count: 1 });
      }
      return acc;
    }, [] as StatusStat[]);

    // Get recent queries (last 5)
    const { data: recentQueries } = await supabase
      .from('queries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalQueries: totalQueries || 0,
        queriesToday: queriesToday || 0,
        queriesThisWeek: queriesThisWeek || 0,
        statusStats,
        recentQueries: recentQueries || [],
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
