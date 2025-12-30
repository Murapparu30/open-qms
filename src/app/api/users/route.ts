import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/users - ユーザー一覧
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ADMINのみ
    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause = {
        tenantId: session.user.tenantId,
        ...(role && { role: role as 'ADMIN' | 'QA' | 'QC' | 'MANUFACTURING' | 'PROCUREMENT' | 'VIEWER' }),
        ...(!includeInactive && { isActive: true }),
    };

    const users = await prisma.user.findMany({
        where: whereClause,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
}

// POST /api/users - ユーザー作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { email, name, password, role } = data;

        if (!email || !name || !password) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
        }

        // メール重複チェック
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                tenantId: session.user.tenantId,
                email,
                name,
                passwordHash,
                role: role || 'VIEWER',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'User',
            recordId: user.id,
            action: 'CREATE',
            before: null,
            after: { email: user.email, name: user.name, role: user.role },
            reason: 'ユーザー作成',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, user }, { status: 201 });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'ユーザー作成に失敗しました' }, { status: 500 });
    }
}
