import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import {
    Home, Users, ClipboardList, Building, Truck, TrendingUp, ShoppingBag,
    DollarSign, CreditCard, UserCheck, MessageCircle, LogOut, Menu, X, ChevronDown,
    BarChart3, Briefcase, Package, Wallet, HelpCircle, Sparkles, Zap
} from 'lucide-react';

function Sidebar({ onLogout, unreadCount: appUnreadCount }) {
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({
        yonetim: true,
        ticaret: true,
        lojistik: true,
        finans: true,
        araclar: true
    });
    const [chatUnread, setChatUnread] = useState(appUnreadCount || 0);

    React.useEffect(() => {
        setChatUnread(appUnreadCount || 0);
    }, [appUnreadCount]);

    React.useEffect(() => {
        const handler = (e) => setChatUnread(e.detail || 0);
        window.addEventListener('chat:unread', handler);
        return () => window.removeEventListener('chat:unread', handler);
    }, []);

    const menuGroups = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            collapsible: true,
            items: [
                { to: '/', label: 'Ana Sayfa', icon: Home, end: true }
            ]
        },
        {
            id: 'yonetim',
            label: 'Yönetim',
            icon: Users,
            collapsible: true,
            items: [
                { to: '/calisanlar', label: 'Çalışanlar', icon: Users },
                { to: '/employee-manager', label: 'Çalışan Yönetimi', icon: Briefcase },
                { to: '/users', label: 'Kullanıcılar', icon: UserCheck }
            ]
        },
        {
            id: 'ticaret',
            label: 'Ticaret',
            icon: Building,
            collapsible: true,
            items: [
                { to: '/order', label: 'Order', icon: ClipboardList },
                { to: '/sirketler', label: 'Şirketler', icon: Building },
                { to: '/urun-satis', label: 'Ürün Satış', icon: TrendingUp },
                { to: '/urun-alis', label: 'Ürün Alış', icon: ShoppingBag }
            ]
        },
        {
            id: 'lojistik',
            label: 'Lojistik',
            icon: Package,
            collapsible: true,
            items: [
                { to: '/sevkiyat', label: 'Sevkiyat', icon: Truck }
            ]
        },
        {
            id: 'finans',
            label: 'Finans',
            icon: Wallet,
            collapsible: true,
            items: [
                { to: '/ceksenetler', label: 'Çek Senet', icon: DollarSign },
                { to: '/odemeler', label: 'Ödemeler', icon: CreditCard },
                { to: '/hakedis', label: 'Hakediş', icon: CreditCard },
                { to: '/iscilikler', label: 'İşçilik Takip', icon: UserCheck }
            ]
        },
        {
            id: 'araclar',
            label: 'Araçlar',
            icon: MessageCircle,
            collapsible: true,
            items: [
                { to: '/absences', label: 'Yoklama', icon: UserCheck },
                { to: '/chat', label: 'Chat', icon: MessageCircle }
            ]
        }
    ];

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const toggleSidebarCollapse = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const handleLinkClick = () => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <>
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                <div className="menu-icon-wrapper">
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </div>
            </button>

            {isMobileMenuOpen && <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>}

            <div className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-glow"></div>
                
                <div className="logo-section">
                    <div className="logo-content">
                        <h1 className="logo-text">BOZKURTSAN</h1>
                    </div>
                    <button 
                        className="collapse-toggle"
                        onClick={toggleSidebarCollapse}
                        title={isSidebarCollapsed ? 'Genişlet' : 'Daralt'}
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>

                <nav className="nav-section">
                    {menuGroups.map(group => {
                        const GroupIcon = group.icon;
                        return (
                            <div key={group.id} className={`menu-group ${expandedGroups[group.id] ? 'expanded' : 'collapsed'}`}>
                                <div 
                                    className="menu-group-header"
                                    onClick={() => group.collapsible && toggleGroup(group.id)}
                                >
                                    <GroupIcon size={18} className="group-icon" />
                                    <span className="group-label">{group.label}</span>
                                    {group.collapsible && (
                                        <ChevronDown 
                                            size={16} 
                                            className={`group-chevron ${expandedGroups[group.id] ? 'rotated' : ''}`}
                                        />
                                    )}
                                </div>
                                
                                {expandedGroups[group.id] && (
                                    <ul className="menu-group-items">
                                        {group.items.map(item => {
                                            const Icon = item.icon;
                                            return (
                                                <li key={item.to}>
                                                    <NavLink 
                                                        to={item.to} 
                                                        end={item.end}
                                                        className={({ isActive }) => isActive ? 'active' : ''}
                                                        onClick={handleLinkClick}
                                                    >
                                                        <div className="nav-link-content">
                                                            <div className="nav-icon-wrapper">
                                                                <Icon size={18} />
                                                            </div>
                                                            <span className="menu-label">{item.label}</span>
                                                            {item.to === '/chat' && chatUnread > 0 && (
                                                                <span className="chat-unread-badge">
                                                                    {chatUnread}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </NavLink>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="logout-section">
                    <button onClick={() => { handleLinkClick(); onLogout(); }} className="logout-button">
                        <div className="logout-icon">
                            <LogOut size={20} />
                        </div>
                        <span className="menu-label">Çıkış Yap</span>
                        <div className="logout-ripple"></div>
                    </button>
                </div>

                <div className="sidebar-footer">
                    <a 
                        href="https://www.reawen.xyz" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="footer-link"
                    >
                        <span className="footer-text">Reawen Development</span>
                    </a>
                </div>
            </div>
        </>
    );
}

export default Sidebar;