import React, { useState, useEffect } from 'react';
import { Palette, TrendingUp, Search, X } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://31.57.33.249:3001/api/order';

const RenkAnalizi = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [selectedCins, setSelectedCins] = useState('');
    const [year, setYear] = useState(2026);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [year]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get(API_BASE_URL, { params: { year } });
            console.log('📦 Siparişler:', res.data);
            setOrders(res.data);
        } catch (err) {
            console.error('Siparişler yüklenirken hata:', err);
        } finally {
            setLoading(false);
        }
    };


    // Seçili siparişi bul
    const selectedOrder = orders.find(o => o._id === selectedOrderId);

const availableCinsler = React.useMemo(() => {
    if (!selectedOrder?.items || !Array.isArray(selectedOrder.items)) {
        return [];
    }
    
    const cinsValues = selectedOrder.items
        .map(item => {
            if (!item.cins) return null;
            return item.cins.replace(/[\r\n\t]/g, '').trim();
        })
        .filter(val => val && val.length > 0);
    
    return [...new Set(cinsValues)].sort();
}, [selectedOrder]);


    // Debug
    useEffect(() => {
        if (selectedOrder) {
            console.log('🎯 Seçili Sipariş:', selectedOrder);
            console.log('📋 Items:', selectedOrder.items);
            console.log('🏷️ Cinsler:', availableCinsler);
        }
    }, [selectedOrder, availableCinsler]);

    // Seçili cins için renk ve adet analizini yap
    const getRenkAnalizi = () => {
        if (!selectedOrder || !selectedCins || !selectedOrder.items) return [];

        const renkMap = {};
        
        selectedOrder.items
            .filter(item => item.cins === selectedCins)
            .forEach(item => {
                const renk = item.renk || 'Belirtilmemiş';
                const toplamAdet = Object.values(item.bedenler || {}).reduce((sum, adet) => sum + (parseInt(adet) || 0), 0);
                
                if (!renkMap[renk]) {
                    renkMap[renk] = 0;
                }
                renkMap[renk] += toplamAdet;
            });

        return Object.entries(renkMap)
            .map(([renk, adet]) => ({ renk, adet }))
            .sort((a, b) => b.adet - a.adet);
    };

    const renkAnalizi = getRenkAnalizi();
    const toplamAdet = renkAnalizi.reduce((sum, item) => sum + item.adet, 0);

    // Arama filtresi
    const filteredOrders = orders.filter(order => {
        if (!searchTerm) return true;
        const lowerSearch = searchTerm.toLowerCase();
        return (
            order.siparisId?.toLowerCase().includes(lowerSearch) ||
            order.firmaAdi?.toLowerCase().includes(lowerSearch)
        );
    });

    // Renk paletleri
    const renkPaleti = {
        'Siyah': '#1a1a1a',
        'Beyaz': '#ffffff',
        'Kırmızı': '#ef4444',
        'Mavi': '#3b82f6',
        'Yeşil': '#22c55e',
        'Sarı': '#eab308',
        'Turuncu': '#f97316',
        'Mor': '#a855f7',
        'Pembe': '#ec4899',
        'Kahverengi': '#92400e',
        'Gri': '#6b7280',
        'Lacivert': '#1e40af',
        'Turkuaz': '#06b6d4',
        'Lila': '#c084fc',
        'Bordo': '#991b1b',
        'Belirtilmemiş': '#94a3b8'
    };

    const getRenkKodu = (renkAdi) => {
        const normalizedRenk = Object.keys(renkPaleti).find(
            key => key.toLowerCase() === renkAdi.toLowerCase()
        );
        return renkPaleti[normalizedRenk] || '#6366f1';
    };

    const isDark = (renkAdi) => {
        return ['Siyah', 'Lacivert', 'Mor', 'Kahverengi', 'Bordo', 'Mavi'].includes(renkAdi);
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <Palette size={28} strokeWidth={2.5} color="#6366f1" />
                    <div>
                        <h1 style={styles.title}>Renk Analizi</h1>
                        <p style={styles.subtitle}>Sipariş bazlı renk dağılımı</p>
                    </div>
                </div>
                <div style={styles.yearBadge}>{year}</div>
            </div>

            {loading ? (
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Yükleniyor...</p>
                </div>
            ) : (
                <div style={styles.content}>
                    {/* Filtre Kartı */}
                    <div style={styles.filterCard}>
                        {/* Arama */}
                        <div style={styles.searchBox}>
                            <Search size={18} color="#94a3b8" />
                            <input
                                type="text"
                                placeholder="Sipariş veya firma ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={styles.searchInput}
                            />
                            {searchTerm && (
                                <X 
                                    size={18} 
                                    color="#94a3b8" 
                                    style={{cursor: 'pointer'}}
                                    onClick={() => setSearchTerm('')}
                                />
                            )}
                        </div>

                        {/* Sipariş Seçimi */}
                        <div style={styles.selectWrapper}>
                            <label style={styles.label}>Sipariş</label>
                            <select
                                value={selectedOrderId}
                                onChange={(e) => {
                                    setSelectedOrderId(e.target.value);
                                    setSelectedCins('');
                                }}
                                style={styles.select}
                            >
                                <option value="">Sipariş seçin...</option>
                                {filteredOrders.map(order => (
                                    <option key={order._id} value={order._id}>
                                        {order.siparisId} - {order.firmaAdi}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cins Seçimi */}
                        {selectedOrderId && availableCinsler.length > 0 && (
                            <div style={styles.selectWrapper}>
                                <label style={styles.label}>Cins</label>
                                <select
                                    value={selectedCins}
                                    onChange={(e) => setSelectedCins(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="">Cins seçin...</option>
                                    {availableCinsler.map(cins => (
                                        <option key={cins} value={cins}>
                                            {cins}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Cins Bulunamadı Mesajı */}
                        {selectedOrderId && availableCinsler.length === 0 && (
                            <div style={styles.warningBox}>
                                ⚠️ Bu siparişte cins bilgisi bulunmuyor
                            </div>
                        )}

                        {/* Özet */}
                        {selectedOrder && selectedCins && renkAnalizi.length > 0 && (
                            <div style={styles.summary}>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>Renk Çeşidi</span>
                                    <span style={styles.summaryValue}>{renkAnalizi.length}</span>
                                </div>
                                <div style={styles.summaryDivider}></div>
                                <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>Toplam Adet</span>
                                    <span style={styles.summaryValue}>{toplamAdet}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sonuç Alanı */}
                    <div style={styles.resultsArea}>
                        {!selectedOrderId ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📊</div>
                                <h3 style={styles.emptyTitle}>Sipariş Seçin</h3>
                                <p style={styles.emptyText}>Renk analizini görüntülemek için bir sipariş seçin</p>
                            </div>
                        ) : !selectedCins ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>🎨</div>
                                <h3 style={styles.emptyTitle}>Cins Seçin</h3>
                                <p style={styles.emptyText}>
                                    {availableCinsler.length > 0 
                                        ? `${availableCinsler.length} farklı cins mevcut`
                                        : 'Bu siparişte cins bilgisi bulunamadı'
                                    }
                                </p>
                            </div>
                        ) : renkAnalizi.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>🔍</div>
                                <h3 style={styles.emptyTitle}>Sonuç Yok</h3>
                                <p style={styles.emptyText}>Bu cins için renk bilgisi bulunamadı</p>
                            </div>
                        ) : (
                            <div style={styles.results}>
                                {/* Başlık */}
                                <div style={styles.resultsHeader}>
                                    <TrendingUp size={20} color="#6366f1" />
                                    <h2 style={styles.resultsTitle}>{selectedCins}</h2>
                                </div>

                                {/* Renk Kartları */}
                                <div style={styles.colorGrid}>
                                    {renkAnalizi.map((item, index) => {
                                        const renkKodu = getRenkKodu(item.renk);
                                        const percentage = ((item.adet / toplamAdet) * 100).toFixed(1);
                                        const isRenkDark = isDark(item.renk);

                                        return (
                                            <div 
                                                key={item.renk}
                                                style={{
                                                    ...styles.colorCard,
                                                    backgroundColor: renkKodu,
                                                    animationDelay: `${index * 0.05}s`
                                                }}
                                            >
                                                <div style={{
                                                    ...styles.colorCardContent,
                                                    color: isRenkDark ? '#ffffff' : '#1a1a1a'
                                                }}>
                                                    <div style={styles.colorName}>{item.renk}</div>
                                                    <div style={styles.colorAmount}>{item.adet}</div>
                                                    <div style={styles.colorPercent}>{percentage}%</div>
                                                </div>
                                                
                                                <div style={{
                                                    ...styles.colorShine,
                                                    background: isRenkDark 
                                                        ? 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)'
                                                        : 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 100%)'
                                                }}></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #f8fafc 0%, #e2e8f0 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: '40px 24px',
    },
    header: {
        maxWidth: '1200px',
        margin: '0 auto 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    title: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: '-0.5px',
    },
    subtitle: {
        margin: '2px 0 0 0',
        fontSize: '14px',
        color: '#64748b',
        fontWeight: '500',
    },
    yearBadge: {
        padding: '8px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        borderRadius: '8px',
        fontWeight: '700',
        fontSize: '14px',
    },
    loadingContainer: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '120px 20px',
        textAlign: 'center',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px',
    },
    loadingText: {
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '500',
    },
    content: {
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'start',
    },
    filterCard: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        position: 'sticky',
        top: '24px',
    },
    searchBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        marginBottom: '20px',
    },
    searchInput: {
        flex: 1,
        border: 'none',
        outline: 'none',
        fontSize: '14px',
        backgroundColor: 'transparent',
        color: '#0f172a',
        fontFamily: 'inherit',
    },
    selectWrapper: {
        marginBottom: '20px',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#64748b',
        marginBottom: '8px',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
    },
    select: {
        width: '100%',
        padding: '12px 14px',
        fontSize: '14px',
        fontWeight: '500',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        backgroundColor: 'white',
        color: '#0f172a',
        cursor: 'pointer',
        outline: 'none',
        fontFamily: 'inherit',
        transition: 'all 0.2s',
    },
    warningBox: {
        padding: '12px 16px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '10px',
        color: '#856404',
        fontSize: '13px',
        fontWeight: '500',
        marginBottom: '20px',
    },
    summary: {
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    summaryItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
    },
    summaryLabel: {
        fontSize: '13px',
        color: '#64748b',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    summaryDivider: {
        height: '1px',
        backgroundColor: '#e2e8f0',
        margin: '8px 0',
    },
    resultsArea: {
        minHeight: '400px',
    },
    emptyState: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '80px 40px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
    },
    emptyIcon: {
        fontSize: '64px',
        marginBottom: '16px',
        opacity: 0.6,
    },
    emptyTitle: {
        margin: '0 0 8px 0',
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    emptyText: {
        margin: 0,
        fontSize: '14px',
        color: '#64748b',
    },
    results: {
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
    },
    resultsHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '2px solid #f1f5f9',
    },
    resultsTitle: {
        margin: 0,
        fontSize: '20px',
        fontWeight: '700',
        color: '#0f172a',
    },
    colorGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '16px',
    },
    colorCard: {
        position: 'relative',
        borderRadius: '12px',
        padding: '24px 20px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        animation: 'fadeIn 0.4s ease-out backwards',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
        border: '1px solid rgba(0, 0, 0, 0.05)',
    },
    colorCardContent: {
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
    },
    colorName: {
        fontSize: '13px',
        fontWeight: '600',
        marginBottom: '12px',
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    colorAmount: {
        fontSize: '36px',
        fontWeight: '800',
        lineHeight: '1',
        marginBottom: '4px',
    },
    colorPercent: {
        fontSize: '12px',
        fontWeight: '600',
        opacity: 0.75,
    },
    colorShine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
};

export default RenkAnalizi;