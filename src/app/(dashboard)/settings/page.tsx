'use client';

import { useSession } from 'next-auth/react';
import { useState, FormEvent } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';

const roleLabels: Record<string, string> = {
    ADMIN: '管理者',
    QA: '品質保証',
    QC: '品質管理',
    MANUFACTURING: '製造',
    PROCUREMENT: '購買/外注管理',
    VIEWER: '閲覧のみ',
};

export default function SettingsPage() {
    const { data: session, update } = useSession();
    const [activeTab, setActiveTab] = useState<'account' | 'password' | 'notifications'>('account');
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordError('新しいパスワードが一致しません');
            return;
        }

        if (passwordForm.new.length < 8) {
            setPasswordError('パスワードは8文字以上にしてください');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.current,
                    newPassword: passwordForm.new,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'パスワード変更に失敗しました');
            }

            setPasswordSuccess('パスワードを変更しました');
            setPasswordForm({ current: '', new: '', confirm: '' });
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (!session) {
        return (
            <DashboardLayout>
                <div className="card">
                    <div className="card-body">
                        <div className="empty-state">読み込み中...</div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">⚙️ 設定</h3>
                </div>

                {/* Tabs */}
                <div style={{ borderBottom: '1px solid var(--color-neutral-200)', padding: '0 var(--space-5)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                        <button
                            onClick={() => setActiveTab('account')}
                            style={{
                                padding: 'var(--space-3) var(--space-4)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'account' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
                                color: activeTab === 'account' ? 'var(--color-primary-600)' : 'var(--color-neutral-600)',
                                fontWeight: activeTab === 'account' ? 'var(--font-weight-medium)' : 'normal',
                            }}
                        >
                            アカウント情報
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            style={{
                                padding: 'var(--space-3) var(--space-4)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'password' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
                                color: activeTab === 'password' ? 'var(--color-primary-600)' : 'var(--color-neutral-600)',
                                fontWeight: activeTab === 'password' ? 'var(--font-weight-medium)' : 'normal',
                            }}
                        >
                            パスワード変更
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            style={{
                                padding: 'var(--space-3) var(--space-4)',
                                border: 'none',
                                background: 'none',
                                cursor: 'pointer',
                                borderBottom: activeTab === 'notifications' ? '2px solid var(--color-primary-500)' : '2px solid transparent',
                                color: activeTab === 'notifications' ? 'var(--color-primary-600)' : 'var(--color-neutral-600)',
                                fontWeight: activeTab === 'notifications' ? 'var(--font-weight-medium)' : 'normal',
                            }}
                        >
                            通知設定
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div style={{ maxWidth: 500 }}>
                            <div className="form-group">
                                <label className="form-label">名前</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={session.user.name || ''}
                                    disabled
                                    style={{ backgroundColor: 'var(--color-neutral-50)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">メールアドレス</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={session.user.email || ''}
                                    disabled
                                    style={{ backgroundColor: 'var(--color-neutral-50)' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">役割</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={roleLabels[session.user.role] || session.user.role}
                                    disabled
                                    style={{ backgroundColor: 'var(--color-neutral-50)' }}
                                />
                            </div>
                            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
                                ℹ️ アカウント情報の変更は管理者にお問い合わせください
                            </div>
                        </div>
                    )}

                    {/* Password Tab */}
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} style={{ maxWidth: 400 }}>
                            {passwordError && (
                                <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                    {passwordError}
                                </div>
                            )}
                            {passwordSuccess && (
                                <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}>
                                    {passwordSuccess}
                                </div>
                            )}
                            <div className="form-group">
                                <label htmlFor="current" className="form-label required">現在のパスワード</label>
                                <input
                                    type="password"
                                    id="current"
                                    className="form-input"
                                    value={passwordForm.current}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new" className="form-label required">新しいパスワード</label>
                                <input
                                    type="password"
                                    id="new"
                                    className="form-input"
                                    value={passwordForm.new}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                    required
                                    minLength={8}
                                />
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-1)' }}>
                                    8文字以上で入力してください
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirm" className="form-label required">新しいパスワード（確認）</label>
                                <input
                                    type="password"
                                    id="confirm"
                                    className="form-input"
                                    value={passwordForm.confirm}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? '変更中...' : 'パスワードを変更'}
                            </button>
                        </form>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div style={{ maxWidth: 500 }}>
                            <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-neutral-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: 'var(--font-size-3xl)', marginBottom: 'var(--space-2)' }}>🔔</div>
                                <div style={{ color: 'var(--color-neutral-600)' }}>
                                    通知設定機能は今後実装予定です
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
