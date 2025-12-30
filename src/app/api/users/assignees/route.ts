import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';

// GET /api/users/assignees - 担当者一覧取得（全認証ユーザーアクセス可能）
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 同一テナントのアクティブユーザーを取得
    const users = await prisma.user.findMany({
        where: {
            tenantId: session.user.tenantId,
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            role: true,
        },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
}
