'use client';

import { useState, useEffect, FormEvent } from 'react';
import DashboardLayout from '@/components/common/DashboardLayout';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
}

const roleLabels: Record<string, string> = {
    ADMIN: '管理者',
    QA: '品質保証',
    QC: '品質管理',
    MANUFACTURING: '製造',
    PROCUREMENT: '購買',
    VIEWER: '閲覧者',
};

const roleOptions = Object.entries(roleLabels).map(([value, label]) => ({ value, label }));

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [includeInactive, setIncludeInactive] = useState(false);

    // Create form
    const [createForm, setCreateForm] = useState({
        email: '',
        name: '',
        password: '',
        role: 'VIEWER',
    });

    // Edit form
    const [editForm, setEditForm] = useState({
        name: '',
        role: '',
        newPassword: '',
    });

    const fetchUsers = async () => {
        try {
            const url = includeInactive ? '/api/users?includeInactive=true' : '/api/users';
            const res = await fetch(url);
            if (!res.ok) throw new Error('取得に失敗しました');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [includeInactive]);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '作成に失敗しました');
            }

            setShowCreateModal(false);
            setCreateForm({ email: '', name: '', password: '', role: 'VIEWER' });
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const handleEdit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setError('');

        try {
            const res = await fetch(`/api/users/${selectedUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '更新に失敗しました');
            }

            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const handleDeactivate = async (user: User) => {
        if (!confirm(`${user.name} を無効化しますか？`)) return;

        try {
            const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '無効化に失敗しました');
            }
            fetchUsers();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setEditForm({ name: user.name, role: user.role, newPassword: '' });
        setShowEditModal(true);
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">👥 ユーザー管理</h3>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                        ➕ ユーザー追加
                    </button>
                </div>

                {error && <div className="alert alert-error" style={{ margin: 'var(--space-4)' }}>{error}</div>}

                {/* Filters */}
                <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-neutral-100)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={includeInactive}
                            onChange={(e) => setIncludeInactive(e.target.checked)}
                        />
                        無効化されたユーザーも表示
                    </label>
                </div>

                {/* User Table */}
                <div className="table-container">
                    {isLoading ? (
                        <div className="empty-state">読み込み中...</div>
                    ) : users.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">ユーザーがいません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>名前</th>
                                    <th>メール</th>
                                    <th>役割</th>
                                    <th>状態</th>
                                    <th>作成日</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.5 }}>
                                        <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td><span className="badge badge-neutral">{roleLabels[user.role]}</span></td>
                                        <td>
                                            <span className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                                                {user.isActive ? '有効' : '無効'}
                                            </span>
                                        </td>
                                        <td>{new Date(user.createdAt).toLocaleDateString('ja-JP')}</td>
                                        <td>
                                            {user.isActive && (
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    <button onClick={() => openEditModal(user)} className="btn btn-sm btn-outline">
                                                        編集
                                                    </button>
                                                    <button onClick={() => handleDeactivate(user)} className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error-600)' }}>
                                                        無効化
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        }}
                        onClick={() => setShowCreateModal(false)}
                    >
                        <div className="card" style={{ width: 450 }} onClick={(e) => e.stopPropagation()}>
                            <div className="card-header">
                                <h3 className="card-title">ユーザー追加</h3>
                            </div>
                            <form onSubmit={handleCreate} className="card-body">
                                <div className="form-group">
                                    <label className="form-label required">メールアドレス</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={createForm.email}
                                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">名前</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">パスワード（8文字以上）</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={createForm.password}
                                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                        minLength={8}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label required">役割</label>
                                    <select
                                        className="form-select"
                                        value={createForm.role}
                                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                    >
                                        {roleOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                        キャンセル
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        作成
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && selectedUser && (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                        }}
                        onClick={() => setShowEditModal(false)}
                    >
                        <div className="card" style={{ width: 450 }} onClick={(e) => e.stopPropagation()}>
                            <div className="card-header">
                                <h3 className="card-title">ユーザー編集: {selectedUser.email}</h3>
                            </div>
                            <form onSubmit={handleEdit} className="card-body">
                                <div className="form-group">
                                    <label className="form-label">名前</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">役割</label>
                                    <select
                                        className="form-select"
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    >
                                        {roleOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">新しいパスワード（変更する場合のみ）</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="空欄の場合は変更しません"
                                        value={editForm.newPassword}
                                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                        キャンセル
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        保存
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
