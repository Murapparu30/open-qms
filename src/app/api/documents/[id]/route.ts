import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { DocumentCategory } from '@prisma/client';

interface Params {
    params: Promise<{ id: string }>;
}

// GET /api/documents/[id] - 文書詳細取得
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
            isActive: true,
        },
        include: {
            createdBy: { select: { id: true, name: true } },
            reviewer: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            versions: {
                orderBy: { version: 'desc' },
                include: {
                    createdBy: { select: { name: true } },
                },
            },
        },
    });

    if (!document) {
        return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ document });
}

// PATCH /api/documents/[id] - 文書更新（新版作成）
export async function PATCH(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '文書更新の権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { title, category, description, content, changeReason, effectiveDate, expiresAt, reviewDueDate } = data;

        const existing = await prisma.document.findFirst({
            where: { id, tenantId: session.user.tenantId, isActive: true },
        });

        if (!existing) {
            return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
        }

        // DRAFTまたはIN_REVIEW状態でのみ編集可能
        if (!['DRAFT', 'IN_REVIEW'].includes(existing.status)) {
            return NextResponse.json({ error: '発行済み文書は編集できません。新版を作成してください。' }, { status: 400 });
        }

        const before = { ...existing };

        // コンテンツが変更された場合、新版を作成
        const shouldCreateNewVersion = content !== undefined;
        const newVersion = shouldCreateNewVersion ? existing.currentVersion + 1 : existing.currentVersion;

        const document = await prisma.$transaction(async (tx) => {
            const doc = await tx.document.update({
                where: { id },
                data: {
                    ...(title && { title }),
                    ...(category && { category: category as DocumentCategory }),
                    ...(description !== undefined && { description }),
                    ...(shouldCreateNewVersion && { currentVersion: newVersion }),
                    ...(effectiveDate !== undefined && { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }),
                    ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
                    ...(reviewDueDate !== undefined && { reviewDueDate: reviewDueDate ? new Date(reviewDueDate) : null }),
                    // 編集したらDRAFTに戻す
                    status: 'DRAFT',
                },
                include: {
                    createdBy: { select: { name: true } },
                    versions: {
                        orderBy: { version: 'desc' },
                        take: 5,
                        include: { createdBy: { select: { name: true } } },
                    },
                },
            });

            if (shouldCreateNewVersion && content) {
                await tx.documentVersion.create({
                    data: {
                        documentId: id,
                        version: newVersion,
                        content,
                        changeReason: changeReason || '内容更新',
                        createdById: session.user.id,
                    },
                });
            }

            return doc;
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: id,
            action: 'UPDATE',
            before: before as unknown as Record<string, unknown>,
            after: document as unknown as Record<string, unknown>,
            reason: changeReason || '文書更新',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, document });
    } catch (error) {
        console.error('Error updating document:', error);
        return NextResponse.json({ error: '文書更新に失敗しました' }, { status: 500 });
    }
}

// DELETE /api/documents/[id] - 文書削除（論理削除）
export async function DELETE(req: NextRequest, { params }: Params) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: '文書削除の権限がありません' }, { status: 403 });
    }

    try {
        const existing = await prisma.document.findFirst({
            where: { id, tenantId: session.user.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ error: '文書が見つかりません' }, { status: 404 });
        }

        await prisma.document.update({
            where: { id },
            data: { isActive: false },
        });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Document',
            recordId: id,
            action: 'DELETE',
            before: existing as unknown as Record<string, unknown>,
            after: null,
            reason: '文書削除',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: '文書削除に失敗しました' }, { status: 500 });
    }
}
