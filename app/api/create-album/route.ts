import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { albumData, access_token } = await req.json();

  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-album`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(albumData),
  });

  const data = await response.json();
  return new NextResponse(JSON.stringify(data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
} 