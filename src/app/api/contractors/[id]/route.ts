import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';

// GET /api/contractors/[id] - 詳細取得
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const contractor = await prisma.contractor.findFirst({
        where: { id, tenantId: session.user.tenantId },
        include: {
            lots: {
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: { id: true, lotNumber: true, productName: true, status: true, createdAt: true },
            },
        },
    });

    if (!contractor) {
        return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ contractor });
}

// PATCH /api/contractors/[id] - 更新
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA', 'PROCUREMENT'].includes(session.user.role)) {
        return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.contractor.findFirst({
        where: { id, tenantId: session.user.tenantId },
    });

    if (!existing) {
        return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    try {
        const data = await req.json();
        const updatedContractor = await prisma.contractor.update({
            where: { id },
            data: {
                name: data.name,
                type: data.type,
                address: data.address,
                contactPerson: data.contactPerson,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                qualityAgreement: data.qualityAgreement,
                qualityAgreementVersion: data.qualityAgreementVersion,
                evaluationStatus: data.evaluationStatus,
                lastAuditDate: data.lastAuditDate ? new Date(data.lastAuditDate) : null,
                nextAuditDate: data.nextAuditDate ? new Date(data.nextAuditDate) : null,
            },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Contractor',
            recordId: id,
            action: 'UPDATE',
            before: existing as unknown as Record<string, unknown>,
            after: updatedContractor as unknown as Record<string, unknown>,
            reason: data.reason || '供給者/委託先更新',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, contractor: updatedContractor });
    } catch (error) {
        console.error('Error updating contractor:', error);
        return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/contractors/[id] - 論理削除
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.contractor.findFirst({
        where: { id, tenantId: session.user.tenantId },
    });

    if (!existing) {
        return NextResponse.json({ error: '見つかりません' }, { status: 404 });
    }

    await prisma.contractor.update({
        where: { id },
        data: { isActive: false },
    });

    await createAuditLog({
        tenantId: session.user.tenantId,
        tableName: 'Contractor',
        recordId: id,
        action: 'CANCEL',
        before: existing as unknown as Record<string, unknown>,
        after: null,
        reason: '供給者/委託先無効化',
        userId: session.user.id,
    });

    return NextResponse.json({ success: true });
}
