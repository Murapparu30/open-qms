import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/documents/[id]/versions - 版履歴取得
export async function GET(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.document.findFirst({
        where: {
            id,
            tenantId: session.user.tenantId,
        },
        select: { id: true },
    });

    if (!document) {
        return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
    }

    const versions = await prisma.documentVersion.findMany({
        where: { documentId: id },
        orderBy: { version: 'desc' },
        include: {
            createdBy: { select: { name: true } },
        },
    });

    return NextResponse.json({ versions });
}
