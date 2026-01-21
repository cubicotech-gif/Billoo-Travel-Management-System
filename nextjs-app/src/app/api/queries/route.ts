import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Create Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all queries with creator info
    const { data: queries, error } = await supabase
      .from('queries')
      .select(`
        *,
        creator:users!created_by (
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching queries:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch queries' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: queries,
    });
  } catch (error) {
    console.error('GET /api/queries error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { passenger_name, phone, email, travel_type } = body;

    // Validate required fields
    if (!passenger_name || !phone || !travel_type) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate query number using the database function
    const { data: queryNumberData, error: queryNumberError } = await supabase
      .rpc('generate_query_number');

    if (queryNumberError) {
      console.error('Error generating query number:', queryNumberError);
      return NextResponse.json(
        { success: false, message: 'Failed to generate query number' },
        { status: 500 }
      );
    }

    const query_number = queryNumberData;

    // Create the query
    const { data: newQuery, error: insertError } = await supabase
      .from('queries')
      .insert({
        query_number,
        passenger_name,
        phone,
        email: email || null,
        travel_type,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating query:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to create query' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Query created successfully',
      data: newQuery,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/queries error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
