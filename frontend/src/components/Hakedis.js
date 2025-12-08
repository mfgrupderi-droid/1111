import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Trash2, User, Scissors, Zap, Save, Loader, Calendar, Edit, CheckCircle, ArrowLeft, TrendingUp, Search, X, FileSpreadsheet } from 'lucide-react';
import './Hakedis.css';

const API_BASE_URL_HAKEDIS = 'http://31.57.33.249:3001/api/hakedis';
const API_BASE_URL_FIYAT = 'http://31.57.33.249:3001/api/fiyatlar';

const PERSONEL_ISIMLERI = ['Ali - Emine', 'Şaban - Ruhi', 'Nedim - Erol', 'Ahmet - Cabir'];
const HESAP_TURLERI = ['Dikim', 'Strober'];
const TEK_IS_FIYATI_DIKIM = 450.00;

const toast = {
    success: (msg) => { console.log('✓', msg); alert(msg); },
    error: (msg) => { console.error('✗', msg); alert(msg); }
};

function Hakedis() {
    const [gorunum, setGorunum] = useState('haftalar');
    const [seciliHafta, setSeciliHafta] = useState(null);
    const [seciliKayit, setSeciliKayit] = useState(null);
    const [aktifPersonel, setAktifPersonel] = useState(PERSONEL_ISIMLERI[0]);
    const [aktifHesapTuru, setAktifHesapTuru] = useState(HESAP_TURLERI[0]);
    const [hakedisVerileri, setHakedisVerileri] = useState({});
    const [fiyatListesi, setFiyatListesi] = useState([]);
    const [arsivListesi, setArsivListesi] = useState([]);
    const [kaydedilmemisDegisiklikler, setKaydedilmemisDegisiklikler] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [modelOnerileri, setModelOnerileri] = useState({});
    const [aktifOneriSatir, setAktifOneriSatir] = useState(null);
    const [fiyatEklemeMenuAcik, setFiyatEklemeMenuAcik] = useState(false);
    const [yeniFiyat, setYeniFiyat] = useState({ fiyat: '', modeller: '', hesapTuru: 'Dikim' });
    const [filtreMetni, setFiltreMetni] = useState('');
    const [excelModalAcik, setExcelModalAcik] = useState(false);
    const [excelModalVeri, setExcelModalVeri] = useState(null);

    useEffect(() => {
        const verileriYukle = async () => {
            setIsLoading(true);
            try {
                const [fiyatResponse, arsivResponse] = await Promise.all([
                    fetch(API_BASE_URL_FIYAT),
                    fetch(API_BASE_URL_HAKEDIS)
                ]);
                
                if (fiyatResponse.ok) {
                    const fiyatData = await fiyatResponse.json();
                    setFiyatListesi(fiyatData);
                }
                
                if (arsivResponse.ok) {
                    const arsivData = await arsivResponse.json();
                    setArsivListesi(arsivData);
                }
            } catch (error) {
                console.error('Veri yükleme hatası:', error);
                toast.error('Veriler yüklenirken hata oluştu');
            } finally {
                setIsLoading(false);
            }
        };
        verileriYukle();
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (kaydedilmemisDegisiklikler) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [kaydedilmemisDegisiklikler]);

    const haftaBazliArsiv = useMemo(() => {
        const haftalar = {};
        arsivListesi.forEach(kayit => {
            const anahtar = `${kayit.yil}-${kayit.hafta}`;
            if (!haftalar[anahtar]) {
                haftalar[anahtar] = {
                    yil: kayit.yil,
                    hafta: kayit.hafta,
                    kayitlar: [],
                    toplamHakedis: 0,
                    toplamIs: 0
                };
            }
            haftalar[anahtar].kayitlar.push(kayit);
            haftalar[anahtar].toplamHakedis += kayit.toplamHakedis || 0;
            haftalar[anahtar].toplamIs += kayit.toplamAdet || 0;
        });
        
        return Object.values(haftalar).sort((a, b) => {
            if (a.yil !== b.yil) return b.yil - a.yil;
            return b.hafta - a.hafta;
        });
    }, [arsivListesi]);

    const filtrelenmisHaftalar = useMemo(() => {
        if (!filtreMetni.trim()) return haftaBazliArsiv;
        const aranan = filtreMetni.toLowerCase();
        return haftaBazliArsiv.filter(hafta => 
            hafta.yil.toString().includes(aranan) ||
            hafta.hafta.toString().includes(aranan)
        );
    }, [haftaBazliArsiv, filtreMetni]);

    const aktifVeri = useMemo(() => {
        if (!hakedisVerileri[aktifPersonel]?.[aktifHesapTuru]) return [];
        return hakedisVerileri[aktifPersonel][aktifHesapTuru];
    }, [hakedisVerileri, aktifPersonel, aktifHesapTuru]);

    const { toplamHakedis, toplamIs } = useMemo(() => {
        const toplamIs = aktifVeri.reduce((acc, satir) => acc + (parseInt(satir.adet) || 0), 0);
        const toplamHakedis = aktifVeri.reduce((acc, satir) => acc + (satir.toplam || 0), 0);
        return { toplamHakedis, toplamIs };
    }, [aktifVeri]);

    const handleExcelModalAc = (kayit) => {
        setExcelModalVeri(kayit);
        setExcelModalAcik(true);
    };

    const handleHaftaSecimi = (hafta) => {
        setSeciliHafta(hafta);
        setGorunum('kayitlar');
    };

    const handleKayitSecimi = (kayit) => {
        const yeniVeri = {};
        PERSONEL_ISIMLERI.forEach(personel => {
            yeniVeri[personel] = {};
            HESAP_TURLERI.forEach(tur => {
                yeniVeri[personel][tur] = [
                    { id: Date.now() + Math.random(), model: '', adet: '', fiyat: '', toplam: 0 }
                ];
            });
        });

        const yuklenecekIslemler = kayit.islemler.map(islem => ({
            id: Date.now() + Math.random(),
            model: islem.model || '',
            adet: islem.adet || '',
            fiyat: islem.fiyat || '',
            toplam: (islem.adet || 0) * (islem.fiyat || 0)
        }));

        if (yeniVeri[kayit.personelAdi]) {
            yeniVeri[kayit.personelAdi][kayit.hesapTuru] = 
                yuklenecekIslemler.length > 0 ? yuklenecekIslemler : [
                    { id: Date.now() + Math.random(), model: '', adet: '', fiyat: '', toplam: 0 }
                ];
        }

        setHakedisVerileri(yeniVeri);
        setAktifPersonel(kayit.personelAdi);
        setAktifHesapTuru(kayit.hesapTuru);
        setSeciliKayit(kayit);
        setGorunum('detay');
        setKaydedilmemisDegisiklikler(false);
    };

    const handleYeniHakedis = () => {
        const yeniVeri = {};
        PERSONEL_ISIMLERI.forEach(personel => {
            yeniVeri[personel] = {};
            HESAP_TURLERI.forEach(tur => {
                yeniVeri[personel][tur] = [
                    { id: Date.now() + Math.random(), model: '', adet: '', fiyat: '', toplam: 0 }
                ];
            });
        });
        setHakedisVerileri(yeniVeri);
        setSeciliHafta(null);
        setSeciliKayit(null);
        setGorunum('detay');
        setKaydedilmemisDegisiklikler(false);
    };

    const handleGeriDon = () => {
        if (kaydedilmemisDegisiklikler) {
            if (!window.confirm('Kaydedilmemiş değişiklikler var. Geri dönmek istediğinize emin misiniz?')) {
                return;
            }
        }
        
        if (gorunum === 'detay') {
            setGorunum('kayitlar');
            setKaydedilmemisDegisiklikler(false);
        } else if (gorunum === 'kayitlar') {
            setGorunum('haftalar');
            setSeciliHafta(null);
        }
    };

    const handleInputChange = (id, field, value) => {
        const yeniVeri = [...aktifVeri];
        const satirIndex = yeniVeri.findIndex(satir => satir.id === id);
        if (satirIndex === -1) return;

        const guncellenecekSatir = { ...yeniVeri[satirIndex], [field]: value };
        
        if (field === 'model') {
            const arananMetin = value.toLowerCase().trim();
            if (arananMetin.length > 0) {
                const tumModeller = [];
                fiyatListesi.forEach(fiyat => {
                    if (fiyat.hesapTuru === aktifHesapTuru) {
                        fiyat.modeller.forEach(model => {
                            if (model !== '__default__' && model.toLowerCase().includes(arananMetin)) {
                                tumModeller.push(model);
                            }
                        });
                    }
                });
                const benzersizModeller = [...new Set(tumModeller)].sort();
                
                if (benzersizModeller.length <= 5 && benzersizModeller.length > 0) {
                    setModelOnerileri({ [id]: benzersizModeller });
                    setAktifOneriSatir(id);
                } else {
                    setModelOnerileri({});
                    setAktifOneriSatir(null);
                }
            } else {
                setModelOnerileri({});
                setAktifOneriSatir(null);
            }
        }
        
        if (field === 'adet' || field === 'model') {
            const adet = parseInt(guncellenecekSatir.adet);
            const model = guncellenecekSatir.model.toLowerCase().trim();
            const tekIsKuraliAktif = adet === 1 && aktifHesapTuru === 'Dikim';

            if (tekIsKuraliAktif) {
                guncellenecekSatir.fiyat = TEK_IS_FIYATI_DIKIM;
            } else if (model) {
                let bulunanFiyat = fiyatListesi.find(f => 
                    f.hesapTuru === aktifHesapTuru && 
                    f.modeller.some(m => m.toLowerCase() === model)
                );

                if (!bulunanFiyat && aktifHesapTuru === 'Strober') {
                    bulunanFiyat = fiyatListesi.find(f => 
                        f.hesapTuru === 'Strober' && f.modeller.includes('__default__')
                    );
                }

                guncellenecekSatir.fiyat = bulunanFiyat ? bulunanFiyat.fiyat : guncellenecekSatir.fiyat;
            }
        }

        const guncelAdet = parseInt(guncellenecekSatir.adet) || 0;
        const guncelFiyat = parseFloat(guncellenecekSatir.fiyat) || 0;
        guncellenecekSatir.toplam = guncelAdet * guncelFiyat;

        yeniVeri[satirIndex] = guncellenecekSatir;
        setHakedisVerileri(prev => ({ 
            ...prev, 
            [aktifPersonel]: { ...prev[aktifPersonel], [aktifHesapTuru]: yeniVeri } 
        }));
        setKaydedilmemisDegisiklikler(true);
    };

    const handleOneriSec = (satirId, model) => {
        handleInputChange(satirId, 'model', model);
        setModelOnerileri({});
        setAktifOneriSatir(null);
    };

    const handleSatirEkle = () => {
        const yeniSatir = { 
            id: Date.now() + Math.random(), 
            model: '', 
            adet: '', 
            fiyat: '', 
            toplam: 0 
        };
        setHakedisVerileri(prev => ({ 
            ...prev, 
            [aktifPersonel]: { 
                ...prev[aktifPersonel], 
                [aktifHesapTuru]: [...aktifVeri, yeniSatir] 
            } 
        }));
    };

    const handleSatirSil = (id) => {
        let guncelVeri = aktifVeri.filter(satir => satir.id !== id);
        if (guncelVeri.length === 0) {
            guncelVeri = [{ 
                id: Date.now() + Math.random(), 
                model: '', 
                adet: '', 
                fiyat: '', 
                toplam: 0 
            }];
        }
        setHakedisVerileri(prev => ({ 
            ...prev, 
            [aktifPersonel]: { 
                ...prev[aktifPersonel], 
                [aktifHesapTuru]: guncelVeri 
            } 
        }));
        setKaydedilmemisDegisiklikler(true);
    };

    const handleKaydet = async () => {
        setIsSaving(true);
        
        try {
            const islemler = aktifVeri
                .filter(satir => satir.model && satir.adet && satir.fiyat)
                .map(satir => ({
                    model: satir.model,
                    adet: parseInt(satir.adet),
                    fiyat: parseFloat(satir.fiyat),
                    toplam: parseInt(satir.adet) * parseFloat(satir.fiyat)
                }));

            if (islemler.length === 0) {
                toast.error('En az bir geçerli işlem girmelisiniz');
                setIsSaving(false);
                return;
            }

            const simdi = new Date();
            const yilBasi = new Date(simdi.getFullYear(), 0, 1);
            const gunFarki = Math.floor((simdi - yilBasi) / (24 * 60 * 60 * 1000));
            const hafta = Math.ceil((gunFarki + yilBasi.getDay() + 1) / 7);
            
            const veri = {
                personelAdi: aktifPersonel,
                hesapTuru: aktifHesapTuru,
                yil: simdi.getFullYear(),
                hafta: hafta,
                islemler: islemler
            };

            let response;
            
            if (seciliKayit) {
                response = await fetch(`${API_BASE_URL_HAKEDIS}/${seciliKayit._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(veri)
                });
            } else {
                response = await fetch(API_BASE_URL_HAKEDIS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(veri)
                });
            }

            if (!response.ok) throw new Error('Kaydetme başarısız');

            toast.success(`Hakediş başarıyla ${seciliKayit ? 'güncellendi' : 'kaydedildi'}!`);
            
            const arsivResponse = await fetch(API_BASE_URL_HAKEDIS);
            if (arsivResponse.ok) {
                const arsivData = await arsivResponse.json();
                setArsivListesi(arsivData);
            }
            
            setKaydedilmemisDegisiklikler(false);
            setGorunum('haftalar');
        } catch (error) {
            console.error('Kaydetme hatası:', error);
            toast.error('Kaydetme başarısız');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKayitSil = async (kayitId) => {
        if (!window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return;
        
        try {
            setIsSaving(true);
            const response = await fetch(`${API_BASE_URL_HAKEDIS}/${kayitId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Kayıt silinemedi');
            
            toast.success('Kayıt başarıyla silindi');
            
            const arsivResponse = await fetch(API_BASE_URL_HAKEDIS);
            if (arsivResponse.ok) {
                const arsivData = await arsivResponse.json();
                setArsivListesi(arsivData);
            }
        } catch (error) {
            console.error('Silme hatası:', error);
            toast.error('Kayıt silinirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFiyatEkle = async () => {
        if (!yeniFiyat.fiyat || !yeniFiyat.modeller) {
            toast.error('Lütfen tüm alanları doldurun');
            return;
        }

        try {
            setIsSaving(true);
            
            const modellerArray = yeniFiyat.modeller.split(',').map(m => m.trim()).filter(m => m);
            
            const veri = {
                fiyat: parseFloat(yeniFiyat.fiyat),
                modeller: modellerArray,
                hesapTuru: yeniFiyat.hesapTuru
            };

            const response = await fetch(API_BASE_URL_FIYAT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(veri)
            });

            if (!response.ok) throw new Error('Fiyat ekleme başarısız');

            toast.success('Fiyat başarıyla eklendi!');
            
            const fiyatResponse = await fetch(API_BASE_URL_FIYAT);
            if (fiyatResponse.ok) {
                const fiyatData = await fiyatResponse.json();
                setFiyatListesi(fiyatData);
            }
            
            setYeniFiyat({ fiyat: '', modeller: '', hesapTuru: 'Dikim' });
            setFiyatEklemeMenuAcik(false);
        } catch (error) {
            console.error('Fiyat ekleme hatası:', error);
            toast.error('Fiyat ekleme başarısız');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Loader size={48} className="text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Header */}
            <div 
                className="sticky top-0 z-50 shadow-2xl"
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '2rem 1.5rem',
                    background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 50%, #1d4ed8 100%)',
                }}
            >
                {/* SVG Grain Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundImage: "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'><circle cx='25' cy='25' r='1' fill='white' opacity='0.1'/><circle cx='75' cy='75' r='1' fill='white' opacity='0.1'/><circle cx='50' cy='10' r='0.5' fill='white' opacity='0.15'/><circle cx='20' cy='80' r='0.8' fill='white' opacity='0.12'/></pattern></defs><rect width='100' height='100' fill='url(%23grain)'/></svg>\")",
                        pointerEvents: 'none',
                    }}
                />
                
                <div className="max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            {gorunum !== 'haftalar' && (
                                <button
                                    onClick={handleGeriDon}
                                    className="p-2 hover:bg-white/20 rounded-full transition-all"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                            )}
                            <div>
                                <h1 
                                    className="text-2xl font-bold text-white flex items-center gap-3"
                                    style={{
                                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    <TrendingUp size={28} />
                                    Hakediş Takip Sistemi
                                </h1>
                                <p className="text-blue-100 text-sm mt-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
                                    {gorunum === 'haftalar' && 'Haftalık Özet'}
                                    {gorunum === 'kayitlar' && `${seciliHafta?.yil} - Hafta ${seciliHafta?.hafta}`}
                                    {gorunum === 'detay' && (seciliKayit ? 'Hakediş Düzenle' : 'Yeni Hakediş')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => setFiyatEklemeMenuAcik(true)}
                                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-5 py-2.5 rounded-full hover:bg-white/30 transition-all flex items-center gap-2 font-medium text-sm"
                            >
                                <PlusCircle size={18} />
                                Fiyat Ekle
                            </button>
                            
                            {gorunum === 'haftalar' && (
                                <button
                                    onClick={handleYeniHakedis}
                                    className="bg-white text-blue-700 px-6 py-2.5 rounded-full hover:bg-blue-50 transition-all flex items-center gap-2 font-semibold text-sm shadow-lg"
                                >
                                    <PlusCircle size={18} />
                                    Yeni Hakediş
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* HAFTALAR GÖRÜNÜMÜ */}
                {gorunum === 'haftalar' && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="relative max-w-md">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Yıl veya hafta ara..."
                                    value={filtreMetni}
                                    onChange={(e) => setFiltreMetni(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="p-4">
                            {filtrelenmisHaftalar.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    {filtreMetni ? 'Sonuç bulunamadı' : 'Henüz kayıt bulunmuyor'}
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {filtrelenmisHaftalar.map(hafta => (
                                        <div
                                            key={`${hafta.yil}-${hafta.hafta}`}
                                            onClick={() => handleHaftaSecimi(hafta)}
                                            className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer bg-gradient-to-r from-gray-50 to-white"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-md">
                                                        <Calendar size={32} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-gray-900">{hafta.yil}</h3>
                                                        <p className="text-gray-600 font-medium">Hafta {hafta.hafta}</p>
                                                        <p className="text-sm text-gray-500 mt-1">{hafta.kayitlar.length} hakediş kaydı</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-600 mb-1">Toplam İş</div>
                                                    <div className="text-2xl font-bold text-blue-600">{hafta.toplamIs.toLocaleString('tr-TR')}</div>
                                                    <div className="text-sm text-gray-600 mt-3 mb-1">Toplam Hakediş</div>
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {hafta.toplamHakedis.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* KAYITLAR GÖRÜNÜMÜ */}
                {gorunum === 'kayitlar' && seciliHafta && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Hakediş Kayıtları</h2>
                            <p className="text-gray-600 mt-1">Bu haftaya ait tüm hakediş kayıtları</p>
                        </div>
                        
                        <div className="p-4">
                            <div className="grid gap-4">
                                {seciliHafta.kayitlar.map(kayit => (
                                    <div
                                        key={kayit._id}
                                        className="border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all bg-white"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <User size={20} className="text-blue-600" />
                                                    <h3 className="text-lg font-bold text-gray-900">{kayit.personelAdi}</h3>
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                                        kayit.hesapTuru === 'Dikim' 
                                                            ? 'bg-blue-100 text-blue-700' 
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {kayit.hesapTuru === 'Dikim' ? <Scissors size={14} /> : <Zap size={14} />}
                                                        {kayit.hesapTuru}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-gray-600">İş Adedi</p>
                                                        <p className="text-xl font-bold text-gray-900">{kayit.toplamAdet?.toLocaleString('tr-TR')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600">Toplam Hakediş</p>
                                                        <p className="text-xl font-bold text-green-600">
                                                            {kayit.toplamHakedis?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button
                                                    onClick={() => handleExcelModalAc(kayit)}
                                                    className="p-3 rounded-full hover:bg-green-50 text-green-600 hover:text-green-700 transition-all border border-green-200"
                                                    title="İşlemleri Görüntüle"
                                                >
                                                    <FileSpreadsheet size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleKayitSecimi(kayit)}
                                                    className="p-3 rounded-full hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-all border border-blue-200"
                                                    title="Düzenle"
                                                >
                                                    <Edit size={20} />
                                                </button>
                                                <button
                                                    onClick={() => handleKayitSil(kayit._id)}
                                                    className="p-3 rounded-full hover:bg-red-50 text-red-600 hover:text-red-700 transition-all border border-red-200"
                                                    title="Sil"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                                    <div className="text-xs font-medium mb-2 opacity-90 uppercase tracking-wide">
                                        Haftalık Toplam İş
                                    </div>
                                    <div className="text-4xl font-bold">
                                        {seciliHafta.toplamIs.toLocaleString('tr-TR')}
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-green-500 to-teal-600 p-6 rounded-xl text-white shadow-lg">
                                    <div className="text-xs font-medium mb-2 opacity-90 uppercase tracking-wide flex items-center gap-2">
                                        <TrendingUp size={14} />
                                        Haftalık Toplam Hakediş
                                    </div>
                                    <div className="text-4xl font-bold">
                                        {seciliHafta.toplamHakedis.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DETAY GÖRÜNÜMÜ */}
                {gorunum === 'detay' && (
                    <>
                        <div className="flex gap-3 mb-6 flex-wrap">
                            {PERSONEL_ISIMLERI.map(personel => (
                                <button
                                    key={personel}
                                    onClick={() => setAktifPersonel(personel)}
                                    className={`px-5 py-3 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                                        aktifPersonel === personel
                                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300 hover:shadow-md'
                                    }`}
                                >
                                    <User size={16} />
                                    {personel}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                                <div className="flex gap-3">
                                    {HESAP_TURLERI.map(tur => (
                                        <button
                                            key={tur}
                                            onClick={() => setAktifHesapTuru(tur)}
                                            className={`px-6 py-3 rounded-full font-medium text-sm transition-all flex items-center gap-2 ${
                                                aktifHesapTuru === tur
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {tur === 'Dikim' ? <Scissors size={16} /> : <Zap size={16} />}
                                            {tur}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={handleKaydet}
                                    disabled={!kaydedilmemisDegisiklikler || isSaving}
                                    className={`px-8 py-3 rounded-full font-semibold text-sm transition-all flex items-center gap-2 shadow-lg ${
                                        !kaydedilmemisDegisiklikler 
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                            : seciliKayit
                                                ? 'bg-orange-500 text-white hover:bg-orange-600'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {isSaving ? (
                                        <Loader className="animate-spin" size={18} />
                                    ) : seciliKayit ? (
                                        <Edit size={18} />
                                    ) : !kaydedilmemisDegisiklikler ? (
                                        <CheckCircle size={18} />
                                    ) : (
                                        <Save size={18} />
                                    )}
                                    {isSaving ? 'Kaydediliyor...' : !kaydedilmemisDegisiklikler ? 'Kaydedildi' : seciliKayit ? 'Güncelle' : 'Kaydet'}
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-separate" style={{ borderSpacing: '0 8px' }}>
                                    <thead>
                                        <tr>
                                            <th className="text-left px-4 pb-3 text-gray-700 font-semibold text-sm uppercase tracking-wide">Model</th>
                                            <th className="text-left px-4 pb-3 text-gray-700 font-semibold text-sm uppercase tracking-wide w-32">Adet</th>
                                            <th className="text-left px-4 pb-3 text-gray-700 font-semibold text-sm uppercase tracking-wide w-40">Birim Fiyat</th>
                                            <th className="text-right px-4 pb-3 text-gray-700 font-semibold text-sm uppercase tracking-wide w-40">Toplam</th>
                                            <th className="w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aktifVeri.map(satir => (
                                            <tr key={satir.id} className="bg-gray-50 hover:shadow-md transition-shadow rounded-lg">
                                                <td className="px-4 py-3 relative">
                                                    <input
                                                        type="text"
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="Örn: 2072, 2546"
                                                        value={satir.model}
                                                        onChange={(e) => handleInputChange(satir.id, 'model', e.target.value)}
                                                        onBlur={() => setTimeout(() => {
                                                            setModelOnerileri({});
                                                            setAktifOneriSatir(null);
                                                        }, 200)}
                                                        autoComplete="off"
                                                    />
                                                    {modelOnerileri[satir.id] && modelOnerileri[satir.id].length > 0 && aktifOneriSatir === satir.id && (
                                                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                                            {modelOnerileri[satir.id].map((oneri, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-900"
                                                                    onClick={() => handleOneriSec(satir.id, oneri)}
                                                                >
                                                                    {oneri}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="0"
                                                        value={satir.adet}
                                                        onChange={(e) => handleInputChange(satir.id, 'adet', e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        placeholder="0.00"
                                                        value={satir.fiyat}
                                                        onChange={(e) => handleInputChange(satir.id, 'fiyat', e.target.value)}
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-lg text-blue-600">
                                                    {satir.toplam.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleSatirSil(satir.id)}
                                                        className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={handleSatirEkle}
                                className="mt-6 w-full px-4 py-4 border-2 border-dashed border-gray-400 bg-white text-gray-700 rounded-lg hover:bg-gray-50 hover:border-blue-400 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                            >
                                <PlusCircle size={20} />
                                Yeni Satır Ekle
                            </button>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white shadow-lg">
                                    <div className="text-xs font-medium mb-2 opacity-90 uppercase tracking-wide">
                                        Toplam İş Adedi
                                    </div>
                                    <div className="text-5xl font-bold">
                                        {toplamIs.toLocaleString('tr-TR')}
                                    </div>
                                </div>
                                
                                <div className="bg-gradient-to-br from-green-500 to-teal-600 p-6 rounded-xl text-white shadow-lg">
                                    <div className="text-xs font-medium mb-2 opacity-90 uppercase tracking-wide flex items-center gap-2">
                                        <TrendingUp size={14} />
                                        Toplam Hakediş
                                    </div>
                                    <div className="text-5xl font-bold">
                                        {toplamHakedis.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
            
            {/* Excel Modal */}
            {excelModalAcik && excelModalVeri && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 modal-overlay" onClick={() => setExcelModalAcik(false)}>
                    <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden modal-content" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div 
                            className="px-6 py-4 border-b border-gray-200"
                            style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)',
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="text-white" size={24} />
                                    <div>
                                        <h2 className="text-xl font-bold text-white">İşlem Detayları</h2>
                                        <p className="text-blue-100 text-sm mt-0.5">
                                            {excelModalVeri.personelAdi} - {excelModalVeri.hesapTuru}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setExcelModalAcik(false)}
                                    className="p-2 hover:bg-white/20 rounded-full transition-all text-white"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 min-h-96 overflow-y-auto">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                                #
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                                Model
                                            </th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                                Adet
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-200">
                                                Toplam
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {excelModalVeri.islemler.map((islem, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                                    {islem.model}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-center font-semibold">
                                                    {islem.adet.toLocaleString('tr-TR')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    {islem.fiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                                                    {(islem.adet * islem.fiyat).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gradient-to-r from-gray-50 to-gray-100">
                                        <tr>
                                            <td colSpan="2" className="px-4 py-4 text-sm font-bold text-gray-900 uppercase tracking-wide">
                                                Genel Toplam
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-blue-600 text-center">
                                                {excelModalVeri.toplamAdet?.toLocaleString('tr-TR')} Adet
                                            </td>
                                            <td className="px-4 py-4"></td>
                                            <td className="px-4 py-4 text-lg font-bold text-green-600 text-right">
                                                {excelModalVeri.toplamHakedis?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setExcelModalAcik(false)}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all font-medium text-sm"
                            >
                                Kapat
                            </button>
                            <button
                                onClick={() => {
                                    handleKayitSecimi(excelModalVeri);
                                    setExcelModalAcik(false);
                                }}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all font-semibold text-sm flex items-center gap-2 shadow-md"
                            >
                                <Edit size={16} />
                                Düzenle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fiyat Ekleme Modal */}
            {fiyatEklemeMenuAcik && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 modal-overlay" onClick={() => setFiyatEklemeMenuAcik(false)}>
                    <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Yeni Fiyat Ekle
                        </h2>
                        
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Hesap Türü</label>
                            <div className="flex gap-3">
                                {HESAP_TURLERI.map(tur => (
                                    <button
                                        key={tur}
                                        onClick={() => setYeniFiyat(prev => ({ ...prev, hesapTuru: tur }))}
                                        className={`flex-1 px-5 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                                            yeniFiyat.hesapTuru === tur
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tur === 'Dikim' ? <Scissors size={16} /> : <Zap size={16} />}
                                        {tur}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Modeller (virgülle ayırın)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Örn: 08, 85, 176, 262, 341"
                                value={yeniFiyat.modeller}
                                onChange={(e) => setYeniFiyat(prev => ({ ...prev, modeller: e.target.value }))}
                            />
                            <div className="text-xs text-gray-500 mt-2">
                                Modelleri virgülle ayırarak girin
                            </div>
                        </div>
                        
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Birim Fiyat (TL)</label>
                            <input
                                type="number"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Örn: 375"
                                value={yeniFiyat.fiyat}
                                onChange={(e) => setYeniFiyat(prev => ({ ...prev, fiyat: e.target.value }))}
                                step="0.01"
                            />
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setFiyatEklemeMenuAcik(false)}
                                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-all font-medium text-sm"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleFiyatEkle}
                                disabled={isSaving}
                                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                            >
                                {isSaving ? <Loader className="animate-spin" size={16} /> : <PlusCircle size={16} />}
                                {isSaving ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Hakedis;                           