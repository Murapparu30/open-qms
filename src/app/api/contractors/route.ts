import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/contractors - 供給者/委託先一覧
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const whereClause = {
        tenantId: session.user.tenantId,
        isActive: true as const,
        ...(type && { type: type as 'MANUFACTURER' | 'TESTING' | 'STORAGE' | 'SUPPLIER' }),
        ...(status && { evaluationStatus: status as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' }),
        ...(search && {
            OR: [
                { name: { contains: search } },
                { contactPerson: { contains: search } },
            ],
        }),
    };

    const contractors = await prisma.contractor.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { lots: true } },
        },
    });

    return NextResponse.json({ contractors });
}

// POST /api/contractors - 供給者/委託先作成
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 供給者管理は ADMIN, QA, PROCUREMENT のみ
    if (!['ADMIN', 'QA', 'PROCUREMENT'].includes(session.user.role)) {
        return NextResponse.json({ error: '供給者管理の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { name, type, address, contactPerson, contactEmail, contactPhone, qualityAgreement, qualityAgreementVersion } = data;

        if (!name || !type) {
            return NextResponse.json({ error: '名前と種別は必須です' }, { status: 400 });
        }

        const contractor = await prisma.contractor.create({
            data: {
                tenantId: session.user.tenantId,
                name,
                type,
                address,
                contactPerson,
                contactEmail,
                contactPhone,
                qualityAgreement,
                qualityAgreementVersion,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Contractor',
            recordId: contractor.id,
            action: 'CREATE',
            before: null,
            after: contractor as unknown as Record<string, unknown>,
            reason: '供給者/委託先登録',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, contractor }, { status: 201 });
    } catch (error) {
        console.error('Error creating contractor:', error);
        return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
    }
}
