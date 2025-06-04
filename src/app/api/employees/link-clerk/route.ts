import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '~/server/db';
import { employees } from '~/server/db/schema';
import { NextResponse } from 'next/server';

interface RequestBody {
  employeeId: string;
}

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { employeeId } = (await request.json()) as RequestBody;

    if (!authResult.userId || !employeeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await db
      .update(employees)
      .set({ clerkId: authResult.userId })
      .where(eq(employees.id, employeeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error linking clerk user:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to link clerk user' },
      { status: 500 }
    );
  }
}
