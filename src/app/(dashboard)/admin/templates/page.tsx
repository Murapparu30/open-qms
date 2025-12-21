'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Template {
    id: string;
    name: string;
    category: string;
    content: string;
    createdAt: string;
}

const categoryOptions = [
    { value: 'APOLOGY', label: '謝罪文' },
    { value: 'INVESTIGATION', label: '調査報告' },
    { value: 'RESOLUTION', label: '対処完了' },
    { value: 'OTHER', label: 'その他' },
];

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [formData, setFormData] = useState({ name: '', category: 'APOLOGY', content: '' });
    const [error, setError] = useState('');

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/response-templates');
            const data = await res.json();
            setTemplates(data.templates || []);
        } catch {
            setError('テンプレート取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        const url = editingTemplate
            ? `/api/response-templates/${editingTemplate.id}`
            : '/api/response-templates';
        const method = editingTemplate ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '操作に失敗しました');
            }

            setShowForm(false);
            setEditingTemplate(null);
            setFormData({ name: '', category: 'APOLOGY', content: '' });
            fetchTemplates();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setFormData({ name: template.name, category: template.category, content: template.content });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('このテンプレートを削除しますか？')) return;

        try {
            const res = await fetch(`/api/response-templates/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('削除に失敗しました');
            fetchTemplates();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        }
    };

    const getCategoryLabel = (value: string) => {
        const opt = categoryOptions.find((o) => o.value === value);
        return opt ? opt.label : value;
    };

    return (
        <DashboardLayout>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📝 回答テンプレート</h3>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            setEditingTemplate(null);
                            setFormData({ name: '', category: 'APOLOGY', content: '' });
                        }}
                        className="btn btn-primary"
                    >
                        ➕ 新規作成
                    </button>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ margin: 'var(--space-4)' }}>
                        {error}
                    </div>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                        }}
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="card"
                            style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="card-header">
                                <h3 className="card-title">{editingTemplate ? 'テンプレート編集' : 'テンプレート作成'}</h3>
                            </div>
                            <form onSubmit={handleSubmit} className="card-body">
                                <div className="form-group">
                                    <label htmlFor="name" className="form-label required">テンプレート名</label>
                                    <input
                                        type="text"
                                        id="name"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="category" className="form-label required">カテゴリ</label>
                                    <select
                                        id="category"
                                        className="form-select"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                        style={{ width: '100%' }}
                                    >
                                        {categoryOptions.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="content" className="form-label required">テンプレート内容</label>
                                    <textarea
                                        id="content"
                                        className="form-textarea"
                                        rows={8}
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        required
                                        placeholder="{{顧客名}} 様&#10;&#10;この度は..."
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)', marginTop: 'var(--space-1)' }}>
                                        ※ {"{{変数名}}"} を使用して動的な値を埋め込めます
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                    <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline" style={{ flex: 1 }}>
                                        キャンセル
                                    </button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                        {editingTemplate ? '更新' : '作成'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Templates List */}
                <div className="table-container">
                    {isLoading ? (
                        <div className="empty-state">読み込み中...</div>
                    ) : templates.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <div className="empty-state-title">テンプレートがありません</div>
                        </div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>テンプレート名</th>
                                    <th>カテゴリ</th>
                                    <th>内容プレビュー</th>
                                    <th style={{ width: 120 }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((template) => (
                                    <tr key={template.id}>
                                        <td style={{ fontWeight: 'var(--font-weight-medium)' }}>{template.name}</td>
                                        <td><span className="badge badge-neutral">{getCategoryLabel(template.category)}</span></td>
                                        <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {template.content.substring(0, 50)}...
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                <button onClick={() => handleEdit(template)} className="btn btn-outline btn-sm">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(template.id)} className="btn btn-outline btn-sm">
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
