'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/common/DashboardLayout';

export default function NewLotPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        lotNumber: '',
        productName: '',
        productCode: '',
        manufacturingDate: '',
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/lots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '作成に失敗しました');
            }

            router.push(`/lots/${data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '作成に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">ロット登録</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="lotNumber" className="form-label required">
                                ロット番号
                            </label>
                            <input
                                id="lotNumber"
                                type="text"
                                className="form-input"
                                value={formData.lotNumber}
                                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                                placeholder="LOT-2024-001"
                                required
                            />
                            <div className="form-hint">
                                一意の識別子を入力してください
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="productName" className="form-label required">
                                品目名
                            </label>
                            <input
                                id="productName"
                                type="text"
                                className="form-input"
                                value={formData.productName}
                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                placeholder="製品名を入力"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="productCode" className="form-label">
                                型式
                            </label>
                            <input
                                id="productCode"
                                type="text"
                                className="form-input"
                                value={formData.productCode}
                                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                                placeholder="PROD-A"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="manufacturingDate" className="form-label">
                                製造日
                            </label>
                            <input
                                id="manufacturingDate"
                                type="date"
                                className="form-input"
                                value={formData.manufacturingDate}
                                onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                キャンセル
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isLoading}
                                style={{ flex: 1 }}
                            >
                                {isLoading ? '登録中...' : '✓ 登録'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
