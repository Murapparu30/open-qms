'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode;
}

interface NavItem {
    href: string;
    label: string;
    icon: string;
    badge?: number;
}

const mainNavItems: NavItem[] = [
    { href: '/', label: 'ダッシュボード', icon: '📊' },
];

const lotNavItems: NavItem[] = [
    { href: '/lots', label: 'ロット一覧', icon: '📦' },
    { href: '/lots/new', label: 'ロット登録', icon: '➕' },
];

const eventNavItems: NavItem[] = [
    { href: '/deviations', label: '逸脱一覧', icon: '⚠️' },
    { href: '/deviations/new', label: '逸脱起票', icon: '🔔' },
    { href: '/changes', label: '変更一覧', icon: '🔄' },
    { href: '/complaints', label: '苦情一覧', icon: '📢' },
    { href: '/capas', label: 'CAPA一覧', icon: '🛠️' },
];

const adminNavItems: NavItem[] = [
    { href: '/admin/audit-logs', label: '監査ログ', icon: '📋' },
    { href: '/admin/templates', label: '回答テンプレート', icon: '📝' },
    { href: '/settings', label: '設定', icon: '⚙️' },
];

export default function DashboardLayout({ children }: LayoutProps) {
    const { data: session } = useSession();
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="app-sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-logo">🏭 QMS</span>
                </div>

                <nav className="sidebar-nav">
                    {/* Main Navigation */}
                    <div className="nav-section">
                        <div className="nav-section-title">メイン</div>
                        {mainNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <span className="nav-item-icon">{item.icon}</span>
                                <span className="nav-item-text">{item.label}</span>
                                {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                            </Link>
                        ))}
                    </div>

                    {/* Lot Management */}
                    <div className="nav-section">
                        <div className="nav-section-title">ロット管理</div>
                        {lotNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <span className="nav-item-icon">{item.icon}</span>
                                <span className="nav-item-text">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Event Management */}
                    <div className="nav-section">
                        <div className="nav-section-title">イベント管理</div>
                        {eventNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                            >
                                <span className="nav-item-icon">{item.icon}</span>
                                <span className="nav-item-text">{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Admin */}
                    {['ADMIN', 'QA'].includes(session?.user?.role || '') && (
                        <div className="nav-section">
                            <div className="nav-section-title">管理</div>
                            {adminNavItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                                >
                                    <span className="nav-item-icon">{item.icon}</span>
                                    <span className="nav-item-text">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </nav>

                {/* User Info */}
                {session?.user && (
                    <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--color-neutral-700)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <div className="avatar avatar-sm" style={{ backgroundColor: 'var(--color-primary-500)', color: 'white' }}>
                                {getInitials(session.user.name || 'U')}
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'white' }}>
                                    {session.user.name}
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-400)' }}>
                                    {session.user.role}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            ログアウト
                        </button>
                    </div>
                )}
            </aside>

            {/* Main Content */}
            <main className="app-main">
                <header className="app-header">
                    <div className="header-left">
                        <h1 className="page-title">
                            {pathname === '/' && 'ダッシュボード'}
                            {pathname === '/lots' && 'ロット一覧'}
                            {pathname === '/lots/new' && 'ロット登録'}
                            {pathname.startsWith('/lots/') && !pathname.includes('/new') && 'ロット詳細'}
                            {pathname === '/deviations' && '逸脱一覧'}
                            {pathname === '/deviations/new' && '逸脱起票'}
                            {pathname.startsWith('/deviations/') && !pathname.includes('/new') && '逸脱詳細'}
                            {pathname === '/changes' && '変更一覧'}
                            {pathname === '/changes/new' && '変更起票'}
                            {pathname.startsWith('/changes/') && !pathname.includes('/new') && '変更詳細'}
                            {pathname === '/complaints' && '苦情一覧'}
                            {pathname === '/complaints/new' && '苦情登録'}
                            {pathname.startsWith('/complaints/') && !pathname.includes('/new') && '苦情詳細'}
                            {pathname === '/capas' && 'CAPA一覧'}
                            {pathname === '/capas/new' && 'CAPA作成'}
                            {pathname.startsWith('/capas/') && !pathname.includes('/new') && 'CAPA詳細'}
                            {pathname === '/admin/audit-logs' && '監査ログ'}
                            {pathname === '/settings' && '設定'}
                        </h1>
                    </div>
                    <div className="header-right">
                        {session?.user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
                                    {session.user.email}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                <div className="app-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
