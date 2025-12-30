import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { sendEmail, emailTemplates } from '@/lib/email';

// POST /api/notifications/send - 通知メール送信
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ADMIN/QA のみ
    if (!['ADMIN', 'QA'].includes(session.user.role)) {
        return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    try {
        const data = await req.json();
        const { type, recipientEmail, params } = data;

        if (!type || !recipientEmail) {
            return NextResponse.json({ error: 'type と recipientEmail は必須です' }, { status: 400 });
        }

        let emailContent;

        switch (type) {
            case 'dueDateWarning':
                emailContent = emailTemplates.dueDateWarning(params);
                break;
            case 'approvalRequest':
                emailContent = emailTemplates.approvalRequest(params);
                break;
            case 'statusChange':
                emailContent = emailTemplates.statusChange(params);
                break;
            default:
                return NextResponse.json({ error: '無効な通知タイプです' }, { status: 400 });
        }

        const info = await sendEmail({
            to: recipientEmail,
            subject: emailContent.subject,
            html: emailContent.html,
        });

        // 監査ログ
        await prisma.auditLog.create({
            data: {
                tenantId: session.user.tenantId,
                tableName: 'Notification',
                recordId: info.messageId || 'unknown',
                action: 'CREATE',
                before: null,
                after: JSON.stringify({ type, recipientEmail }),
                reason: 'メール通知送信',
                userId: session.user.id,
            },
        });

        return NextResponse.json({
            success: true,
            messageId: info.messageId,
            // 開発環境用: プレビューURL
            previewUrl: info.messageId && !process.env.SMTP_HOST
                ? `https://ethereal.email/message/${info.messageId}`
                : undefined,
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        return NextResponse.json({ error: 'メール送信に失敗しました' }, { status: 500 });
    }
}
