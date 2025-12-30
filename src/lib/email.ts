import nodemailer from 'nodemailer';

// 開発環境ではEtherealを使用、本番はSMTP設定
const createTransporter = async () => {
    // 環境変数が設定されていれば本番SMTP
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // 開発環境: Ethereal テストアカウント
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
};

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail(options: EmailOptions) {
    const transporter = await createTransporter();

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"QMS System" <noreply@qms.local>',
        to: options.to,
        subject: options.subject,
        html: options.html,
    });

    // 開発環境ではプレビューURLを出力
    if (info.messageId && !process.env.SMTP_HOST) {
        console.log('Email Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return info;
}

// 通知タイプ別のメールテンプレート
export const emailTemplates = {
    dueDateWarning: (params: { entityType: string; entityId: string; title: string; dueDate: string }) => ({
        subject: `【期限警告】${params.entityType}: ${params.title}`,
        html: `
            <h2>期限が近づいています</h2>
            <p><strong>${params.entityType}</strong>: ${params.title}</p>
            <p>期限日: <strong style="color: red;">${params.dueDate}</strong></p>
            <p>速やかに対応をお願いします。</p>
            <hr>
            <p style="color: #666; font-size: 12px;">このメールは QMS システムから自動送信されています。</p>
        `,
    }),

    approvalRequest: (params: { entityType: string; title: string; requestedBy: string }) => ({
        subject: `【承認依頼】${params.entityType}: ${params.title}`,
        html: `
            <h2>承認が必要です</h2>
            <p><strong>${params.entityType}</strong>: ${params.title}</p>
            <p>申請者: ${params.requestedBy}</p>
            <p>システムにログインして確認してください。</p>
            <hr>
            <p style="color: #666; font-size: 12px;">このメールは QMS システムから自動送信されています。</p>
        `,
    }),

    statusChange: (params: { entityType: string; title: string; newStatus: string }) => ({
        subject: `【ステータス変更】${params.entityType}: ${params.title}`,
        html: `
            <h2>ステータスが更新されました</h2>
            <p><strong>${params.entityType}</strong>: ${params.title}</p>
            <p>新しいステータス: <strong>${params.newStatus}</strong></p>
            <hr>
            <p style="color: #666; font-size: 12px;">このメールは QMS システムから自動送信されています。</p>
        `,
    }),
};
