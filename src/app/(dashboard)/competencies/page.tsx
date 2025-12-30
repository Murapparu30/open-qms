'use client';

import { useState, useEffect, FormEvent } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Competency {
    id: string;
    name: string;
    category: string;
    userCompetencies: {
        userId: string;
        level: string;
        user: { id: string; name: string };
    }[];
}

interface User {
    id: string;
    name: string;
    email: string;
}

const levelLabels: Record<string, { label: string; color: string }> = {
    NONE: { label: '-', color: 'var(--color-neutral-200)' },
    LEARNING: { label: '習得中', color: 'var(--color-warning-200)' },
    QUALIFIED: { label: '資格あり', color: 'var(--color-success-300)' },
    EXPERT: { label: '熟練者', color: 'var(--color-primary-300)' },
};

export default function CompetenciesPage() {
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', category: '', description: '' });
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            const res = await fetch('/api/competencies?matrix=true');
            const data = await res.json();
            setCompetencies(data.competencies || []);
            setUsers(data.users || []);
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
            const res = await fetch('/api/competencies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '登録に失敗しました');
            }

            setShowForm(false);
            setFormData({ name: '', category: '', description: '' });
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const getLevel = (competency: Competency, userId: string): string => {
        const uc = competency.userCompetencies.find((c) => c.userId === userId);
        return uc?.level || 'NONE';
    };

    // Group by category
    const categories = [...new Set(competencies.map((c) => c.category))];

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">💪 力量マトリクス</h3>
                    <button onClick={() => setShowForm(true)} className="btn btn-primary">
                        ➕ 力量定義追加
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
                        <div className="card" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
                            <div className="card-header">
                                <h3 className="card-title">力量定義追加</h3>
                            </div>
                            <form onSubmit={handleSubmit} className="card-body">
                                <div className="form-group">
                                    <label className="form-label required">力量名</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="例: 製造ライン操作"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">カテゴリ</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="例: 製造"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">説明</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                        キャンセル
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        追加
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    {Object.entries(levelLabels).map(([key, { label, color }]) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div style={{ width: 16, height: 16, backgroundColor: color, borderRadius: 4 }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>{label}</span>
                        </div>
                    ))}
                </div>

                {/* Matrix */}
                <div className="table-container">
                    {isLoading ? (
                        <div className="empty-state">読み込み中...</div>
                    ) : competencies.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">💪</div>
                            <div className="empty-state-title">力量定義がありません</div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👤</div>
                            <div className="empty-state-title">ユーザーがいません</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ minWidth: 600 }}>
                                <thead>
                                    <tr>
                                        <th style={{ position: 'sticky', left: 0, backgroundColor: 'var(--color-neutral-50)' }}>力量</th>
                                        {users.map((u) => (
                                            <th key={u.id} style={{ textAlign: 'center', minWidth: 80 }}>{u.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((category) => (
                                        <>
                                            <tr key={`cat-${category}`}>
                                                <td colSpan={users.length + 1} style={{ backgroundColor: 'var(--color-neutral-100)', fontWeight: 'var(--font-weight-medium)' }}>
                                                    📁 {category}
                                                </td>
                                            </tr>
                                            {competencies
                                                .filter((c) => c.category === category)
                                                .map((competency) => (
                                                    <tr key={competency.id}>
                                                        <td style={{ position: 'sticky', left: 0, backgroundColor: 'white' }}>
                                                            {competency.name}
                                                        </td>
                                                        {users.map((u) => {
                                                            const level = getLevel(competency, u.id);
                                                            const { label, color } = levelLabels[level];
                                                            return (
                                                                <td
                                                                    key={u.id}
                                                                    style={{
                                                                        textAlign: 'center',
                                                                        backgroundColor: color,
                                                                        fontSize: 'var(--font-size-xs)',
                                                                    }}
                                                                >
                                                                    {label}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
