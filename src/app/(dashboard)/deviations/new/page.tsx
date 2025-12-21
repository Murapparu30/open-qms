'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/common/DashboardLayout';

interface Lot {
    id: string;
    lotNumber: string;
    productName: string;
}

function NewDeviationForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedLotId = searchParams.get('lotId');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [lots, setLots] = useState<Lot[]>([]);

    const [formData, setFormData] = useState({
        lotId: preselectedLotId || '',
        occurredAt: new Date().toISOString().split('T')[0],
        discoveryProcess: '',
        description: '',
        severity: 'MEDIUM',
        shipmentImpact: 'UNKNOWN',
        containment: '',
    });

    useEffect(() => {
        fetch('/api/lots?limit=100')
            .then((res) => res.json())
            .then((data) => setLots(data.lots || []))
            .catch(console.error);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/deviations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '起票に失敗しました');
            }

            router.push(`/deviations/${data.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '起票に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const discoveryProcessOptions = [
        { value: '', label: '選択してください' },
        { value: '製造工程', label: '製造工程' },
        { value: '検査工程', label: '検査工程' },
        { value: '出荷前確認', label: '出荷前確認' },
        { value: '受入検査', label: '受入検査' },
        { value: '顧客報告', label: '顧客報告' },
        { value: 'その他', label: 'その他' },
    ];

    return (
        <DashboardLayout>
            <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="card-header">
                    <h3 className="card-title">🔔 逸脱起票</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="lotId" className="form-label required">対象ロット</label>
                            <select
                                id="lotId"
                                className="form-select"
                                value={formData.lotId}
                                onChange={(e) => setFormData({ ...formData, lotId: e.target.value })}
                                required
                            >
                                <option value="">ロットを選択</option>
                                {lots.map((lot) => (
                                    <option key={lot.id} value={lot.id}>
                                        {lot.lotNumber} - {lot.productName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="occurredAt" className="form-label required">発生日</label>
                            <input
                                id="occurredAt"
                                type="date"
                                className="form-input"
                                value={formData.occurredAt}
                                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="discoveryProcess" className="form-label required">発見工程</label>
                            <select
                                id="discoveryProcess"
                                className="form-select"
                                value={formData.discoveryProcess}
                                onChange={(e) => setFormData({ ...formData, discoveryProcess: e.target.value })}
                                required
                            >
                                {discoveryProcessOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description" className="form-label required">内容</label>
                            <textarea
                                id="description"
                                className="form-textarea"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="逸脱の内容を具体的に記載してください"
                                required
                                style={{ width: '100%' }}
                            />
                            <div className="form-hint">何が、どこで、どのように逸脱したかを記載</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label htmlFor="severity" className="form-label required">重大度</label>
                                <select
                                    id="severity"
                                    className="form-select"
                                    value={formData.severity}
                                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                                    required
                                >
                                    <option value="LOW">軽微</option>
                                    <option value="MEDIUM">中程度</option>
                                    <option value="HIGH">重大</option>
                                    <option value="CRITICAL">致命的</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="shipmentImpact" className="form-label required">出荷影響</label>
                                <select
                                    id="shipmentImpact"
                                    className="form-select"
                                    value={formData.shipmentImpact}
                                    onChange={(e) => setFormData({ ...formData, shipmentImpact: e.target.value })}
                                    required
                                >
                                    <option value="YES">あり</option>
                                    <option value="NO">なし</option>
                                    <option value="UNKNOWN">不明</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="containment" className="form-label">暫定処置</label>
                            <textarea
                                id="containment"
                                className="form-textarea"
                                rows={2}
                                value={formData.containment}
                                onChange={(e) => setFormData({ ...formData, containment: e.target.value })}
                                placeholder="隔離、停止などの処置内容（任意）"
                                style={{ width: '100%' }}
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
                                {isLoading ? '起票中...' : '✓ 起票'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function NewDeviationPage() {
    return (
        <Suspense fallback={<DashboardLayout><div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-8)', textAlign: 'center' }}>読み込み中...</div></DashboardLayout>}>
            <NewDeviationForm />
        </Suspense>
    );
}
