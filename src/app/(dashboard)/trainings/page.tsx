'use client';

import { useState, useEffect, FormEvent } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Training {
    id: string;
    title: string;
    type: string;
    trainedAt: string;
    expiresAt: string | null;
    instructor: string | null;
    result: string;
    user: { id: string; name: string; email: string };
}

interface User {
    id: string;
    name: string;
    email: string;
}

const typeLabels: Record<string, string> = {
    INTERNAL: '社内教育',
    EXTERNAL: '外部研修',
    OJT: 'OJT',
    E_LEARNING: 'Eラーニング',
};

const resultLabels: Record<string, { label: string; className: string }> = {
    COMPLETED: { label: '修了', className: 'badge badge-success' },
    FAILED: { label: '不合格', className: 'badge badge-error' },
    IN_PROGRESS: { label: '受講中', className: 'badge badge-warning' },
};

export default function TrainingsPage() {
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        userId: '',
        title: '',
        type: 'INTERNAL',
        trainedAt: new Date().toISOString().split('T')[0],
        expiresAt: '',
        instructor: '',
        result: 'COMPLETED',
    });
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            const [trainingsRes, usersRes] = await Promise.all([
                fetch('/api/trainings'),
                fetch('/api/competencies?matrix=true'),
            ]);
            const trainingsData = await trainingsRes.json();
            const competencyData = await usersRes.json();
            setTrainings(trainingsData.trainings || []);
            setUsers(competencyData.users || []);
        } catch {
            setError('データの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/trainings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '登録に失敗しました');
            }

            setShowForm(false);
            setFormData({
                userId: '',
                title: '',
                type: 'INTERNAL',
                trainedAt: new Date().toISOString().split('T')[0],
                expiresAt: '',
                instructor: '',
                result: 'COMPLETED',
            });
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📚 教育記録</h3>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        ➕ 記録追加
                    </button>
                </div>

                {error && <div className="alert alert-error" style={{ margin: 'var(--space-4)' }}>{error}</div>}

                {/* Form Modal */}
                {showForm && (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        }}
                        onClick={() => setShowForm(false)}
                    >
                        <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <div className="card-header">
                                <h3 className="card-title">教育記録追加</h3>
                            </div>
                            <form onSubmit={handleSubmit} className="card-body">
                                <div className="form-group">
                                    <label className="form-label required">対象者</label>
                                    <select
                                        className="form-select"
                                        value={formData.userId}
                                        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                        required
                                    >
                                        <option value="">選択してください</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">教育名</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label required">種別</label>
                                        <select
                                            className="form-select"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            {Object.entries(typeLabels).map(([v, l]) => (
                                                <option key={v} value={v}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">実施日</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.trainedAt}
                                            onChange={(e) => setFormData({ ...formData, trainedAt: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label">有効期限</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.expiresAt}
                                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">講師</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.instructor}
                                            onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">結果</label>
                                    <select
                                        className="form-select"
                                        value={formData.result}
                                        onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                                    >
                                        {Object.entries(resultLabels).map(([v, { label }]) => (
                                            <option key={v} value={v}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                        キャンセル
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        登録
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="table-container">
                    {isLoading ? (
                        <div className="empty-state">読み込み中...</div>
                    ) : trainings.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📚</div>
                            <div className="empty-state-title">教育記録がありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>対象者</th>
                                    <th>教育名</th>
                                    <th>種別</th>
                                    <th>実施日</th>
                                    <th>有効期限</th>
                                    <th>結果</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trainings.map((t) => {
                                    const result = resultLabels[t.result];
                                    const isExpired = t.expiresAt && new Date(t.expiresAt) < new Date();
                                    return (
                                        <tr key={t.id}>
                                            <td>{t.user.name}</td>
                                            <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{t.title}</td>
                                            <td><span className="badge badge-neutral">{typeLabels[t.type]}</span></td>
                                            <td>{new Date(t.trainedAt).toLocaleDateString('ja-JP')}</td>
                                            <td style={{ color: isExpired ? 'var(--color-error-600)' : undefined }}>
                                                {t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('ja-JP') : '-'}
                                                {isExpired && <span style={{ marginLeft: 'var(--space-1)' }}>⚠️</span>}
                                            </td>
                                            <td><span className={result.className}>{result.label}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
