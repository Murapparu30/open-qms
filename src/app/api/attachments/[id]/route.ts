import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { createAuditLog } from '@/lib/db/auditLog';
import { unlink } from 'fs/promises';
import path from 'path';

// DELETE /api/attachments/[id] - ファイル削除
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const attachment = await prisma.attachment.findFirst({
        where: { id, tenantId: session.user.tenantId },
    });

    if (!attachment) {
        return NextResponse.json({ error: '添付ファイルが見つかりません' }, { status: 404 });
    }

    try {
        // ファイル削除
        const filePath = path.join(process.cwd(), 'public', attachment.filePath);
        await unlink(filePath).catch(() => {
            // ファイルが存在しない場合は無視
        });

        // DB削除
        await prisma.attachment.delete({ where: { id } });

        await createAuditLog({
            tenantId: session.user.tenantId,
            tableName: 'Attachment',
            recordId: id,
            action: 'DELETE',
            before: { fileName: attachment.originalName },
            after: null,
            reason: 'ファイル削除',
            userId: session.user.id,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting attachment:', error);
        return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
    }
}
