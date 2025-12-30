'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/common/DashboardLayout';

const typeOptions = [
    { value: 'MANUFACTURER', label: '製造委託先' },
    { value: 'TESTING', label: '試験委託先' },
    { value: 'STORAGE', label: '保管委託先' },
    { value: 'SUPPLIER', label: '原材料供給者' },
];

export default function NewContractorPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        type: 'SUPPLIER',
        address: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        qualityAgreement: '',
        qualityAgreementVersion: '',
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/contractors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '登録に失敗しました');
            }

            const { contractor } = await res.json();
            router.push(`/contractors/${contractor.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 700, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">🏭 供給者/委託先登録</h3>
                </div>
                <form onSubmit={handleSubmit} className="card-body">
                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="name" className="form-label required">名前</label>
                            <input
                                type="text"
                                id="name"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="type" className="form-label required">種別</label>
                            <select
                                id="type"
                                className="form-select"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                required
                            >
                                {typeOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactPerson" className="form-label">担当者</label>
                            <input
                                type="text"
                                id="contactPerson"
                                className="form-input"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactEmail" className="form-label">メール</label>
                            <input
                                type="email"
                                id="contactEmail"
                                className="form-input"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="contactPhone" className="form-label">電話番号</label>
                            <input
                                type="tel"
                                id="contactPhone"
                                className="form-input"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="address" className="form-label">住所</label>
                            <input
                                type="text"
                                id="address"
                                className="form-input"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="qualityAgreement" className="form-label">品質協定</label>
                            <input
                                type="text"
                                id="qualityAgreement"
                                className="form-input"
                                placeholder="品質協定書番号など"
                                value={formData.qualityAgreement}
                                onChange={(e) => setFormData({ ...formData, qualityAgreement: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="qualityAgreementVersion" className="form-label">協定バージョン</label>
                            <input
                                type="text"
                                id="qualityAgreementVersion"
                                className="form-input"
                                placeholder="v1.0"
                                value={formData.qualityAgreementVersion}
                                onChange={(e) => setFormData({ ...formData, qualityAgreementVersion: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                        <button type="button" onClick={() => router.back()} className="btn btn-outline" style={{ flex: 1 }}>
                            キャンセル
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isLoading}>
                            {isLoading ? '登録中...' : '登録'}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
