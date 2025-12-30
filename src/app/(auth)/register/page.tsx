'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        organizationName: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '登録に失敗しました');
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🏭 QMS</div>
                    <p className="login-subtitle">専用ワークスペースの作成</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-2)' }}>
                        自分専用の場所を作成して、プライベートに試用できます。
                    </p>
                </div>

                {isSuccess ? (
                    <div className="alert alert-success" style={{ textAlign: 'center' }}>
                        <p>登録が完了しました！</p>
                        <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>
                            ログイン画面に移動します...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label required">組織・会社名</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                placeholder="例: 株式会社サンプル"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">お名前</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="例: 山田 太郎"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">メールアドレス</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="example@company.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label required">パスワード（8文字以上）</label>
                            <input
                                type="password"
                                className="form-input"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                minLength={8}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 'var(--space-4)' }}
                            disabled={isLoading}
                        >
                            {isLoading ? '作成中...' : 'ワークスペースを作成'}
                        </button>

                        <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                            <Link href="/login" className="btn btn-ghost btn-sm">
                                すでにアカウントをお持ちの方
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
