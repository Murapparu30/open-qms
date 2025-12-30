'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            router.push('/');
        }
    }, [status, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError(result.error);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch {
            setError('ログインに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'loading' || status === 'authenticated') {
        return (
            <div className="login-page">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">🏭 QMS</div>
                    <p className="login-subtitle">品質管理システム</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email" className="form-label required">
                            メールアドレス
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@company.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label required">
                            パスワード
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 'var(--space-4)' }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner" style={{ width: 16, height: 16 }} />
                                ログイン中...
                            </>
                        ) : (
                            'ログイン'
                        )}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-neutral-200)' }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
                            自分専用の場所で試したいですか？
                        </p>
                        <a href="/register" className="btn btn-outline btn-sm" style={{ marginTop: 'var(--space-2)' }}>
                            プライベート環境を作成
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
