import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';
import {
    Home, Users, ClipboardList, Building, Truck, TrendingUp, ShoppingBag,
    DollarSign, CreditCard, UserCheck, MessageCircle, LogOut, Menu, X
} from 'lucide-react';

function Sidebar({ onLogout }) {
    // Mobil menünün açık/kapalı durumunu tutacak state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Menüyü açıp kapatacak fonksiyon
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Mobil menüde bir linke tıklandığında menünün otomatik kapanmasını sağlar
    const handleLinkClick = () => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <>
            {/* --- HAMBURGER MENÜ BUTONU (Sadece mobilde görünür) --- */}
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* --- MENÜ AÇIKKEN ARKA PLANI KARARTACAK OVERLAY --- */}
            {isMobileMenuOpen && <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>}

            {/* --- SIDEBAR --- */}
            <div className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="logo-section">
                    <h1 className="logo-text">BOZKURTSAN</h1>
                </div>
                <nav className="nav-section">
                    <ul>
                        <li><NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><Home /> Ana Sayfa</NavLink></li>
                        <li><NavLink to="/calisanlar" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><Users /> Çalışanlar</NavLink></li>
                        <li><NavLink to="/order" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><ClipboardList /> Order</NavLink></li>
                        <li><NavLink to="/sirketler" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><Building /> Şirketler</NavLink></li>
                        <li><NavLink to="/absences" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><UserCheck /> Yoklama</NavLink></li>
                        <li><NavLink to="/sevkiyat" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><Truck /> Sevkiyat</NavLink></li>
                        <li><NavLink to="/urun-satis" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><TrendingUp /> Ürün Satış</NavLink></li>
                        <li><NavLink to="/urun-alis" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><ShoppingBag /> Ürün Alış</NavLink></li>
                        <li><NavLink to="/ceksenetler" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><DollarSign /> Çek Senet</NavLink></li>
                        <li><NavLink to="/odemeler" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><CreditCard /> Ödemeler</NavLink></li>
                        <li><NavLink to="/hakedis" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><CreditCard /> Hakediş</NavLink></li>
                        <li><NavLink to="/iscilikler" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><UserCheck /> İşçilik Takip</NavLink></li>
                        <li><NavLink to="/users" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><UserCheck /> Kullanıcılar</NavLink></li>
                        <li><NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')} onClick={handleLinkClick}><MessageCircle /> Chat</NavLink></li>
                    </ul>
                </nav>
                <div className="logout-section">
                    <button onClick={() => { handleLinkClick(); onLogout(); }} className="logout-button">
                        <LogOut /> Çıkış Yap
                    </button>
                </div>
            </div>
        </>
    );
}

export default Sidebar;