import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiArrowUpCircle, FiArrowDownCircle, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { ToastContainer, toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { PageHeader, LoadingSpinner, ErrorAlert, SuccessAlert } from './SharedComponents';
import './CekSenet.css';

const API_URL = 'http://31.57.33.249:3001/api/ceksenet';
const SIRKETLER_API_URL = 'http://31.57.33.249:3001/api/sirketler';

const CekSenetler = () => {
    const [alinanCekSenetler, setAlinanCekSenetler] = useState([]);
    const [verilenCekSenetler, setVerilenCekSenetler] = useState([]);
    const [sirketler, setSirketler] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingCekSenetId, setEditingCekSenetId] = useState(null);
    const [activeSection, setActiveSection] = useState('alinan');

    const [modal, setModal] = useState({
        isOpen: false,
        message: '',
        onConfirm: null,
    });

    const initialFormData = {
        tip: 'alınan',
        firma: '',
        banka: '',
        borclu: '',
        verilmeTarihi: '',
        vadeTarihi: '',
        tutar: '',
        paraBirimi: 'TRY',
        durum: 'Kasa',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [editFormData, setEditFormData] = useState({});

    useEffect(() => {
        fetchCekSenetler();
        fetchSirketler();
    }, []);

    const fetchCekSenetler = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL);
            const alinanlar = response.data.filter(cs => cs.tip === 'alınan');
            const verilenler = response.data.filter(cs => cs.tip === 'verilen');
            setAlinanCekSenetler(alinanlar);
            setVerilenCekSenetler(verilenler);
        } catch (error) {
            console.error("Çek/Senetler yüklenirken hata:", error);
            toast.error("Çek/Senetler yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const fetchSirketler = async () => {
        try {
            const response = await axios.get(SIRKETLER_API_URL);
            setSirketler(response.data);
        } catch (error) {
            console.error("Şirketler yüklenirken hata:", error);
            toast.error("Şirket listesi yüklenirken bir hata oluştu.");
        }
    };

    const getSirketAdi = (id) => {
        const sirket = sirketler.find(s => s._id === id);
        return sirket ? sirket.sirketAdi : 'Bilinmiyor';
    };

    const getSirketParaBirimi = (id) => {
        const sirket = sirketler.find(s => s._id === id);
        return sirket ? sirket.sirketCariBirimi : 'TRY';
    };

    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newForm = { ...prev, [name]: value };
            if (name === 'firma' && value) {
                const sirketParaBirimi = getSirketParaBirimi(value);
                newForm.paraBirimi = sirketParaBirimi;
            }
            return newForm;
        });
    };

    const handleEditFormInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.firma) {
                toast.error("Lütfen bir firma seçin.");
                return;
            }
            await axios.post(API_URL, formData);
            toast.success('Çek/senet başarıyla eklendi.');
            setFormData(initialFormData);
            fetchCekSenetler();
            setActiveSection(formData.tip === 'alınan' ? 'alinan' : 'verilen');
        } catch (error) {
            console.error("Çek/senet eklenirken hata:", error);
            toast.error("Çek/senet eklenirken bir hata oluştu.");
        }
    };

    const handleUpdateCekSenet = async () => {
        try {
            await axios.put(`${API_URL}/${editingCekSenetId}`, editFormData);
            toast.success('Çek/senet başarıyla güncellendi.');
            setEditingCekSenetId(null);
            fetchCekSenetler();
        } catch (error) {
            console.error("Çek/senet güncellenirken hata:", error);
            toast.error("Çek/senet güncellenirken bir hata oluştu.");
        }
    };

    const handleDelete = (id) => {
        setModal({
            isOpen: true,
            message: 'Bu çek/senedi silmek istediğinizden emin misiniz?',
            onConfirm: () => confirmDelete(id),
        });
    };

    const confirmDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/${id}`);
            toast.success('Çek/senet başarıyla silindi.');
            setModal({ ...modal, isOpen: false });
            fetchCekSenetler();
        } catch (error) {
            console.error("Çek/senet silinirken hata:", error);
            toast.error("Çek/senet silinirken bir hata oluştu.");
        }
    };

    const handleEditClick = (cekSenet) => {
        setEditingCekSenetId(cekSenet._id);
        setEditFormData({
            ...cekSenet,
            vadeTarihi: cekSenet.vadeTarihi.substring(0, 10),
            verilmeTarihi: cekSenet.verilmeTarihi ? cekSenet.verilmeTarihi.substring(0, 10) : ''
        });
    };

    const handleCancelEdit = () => {
        setEditingCekSenetId(null);
    };

    return (
        <div className="main-container">
            <div className="header-container">
                <h1 className="title">Çek ve Senet Yönetimi</h1>
                <p className="subtitle">Alınan ve verilen çek/senetleri buradan takip edebilirsiniz.</p>
                <div className="header-actions">
                    <button className={`tab-button ${activeSection === 'ekle' ? 'active' : ''}`} onClick={() => setActiveSection('ekle')}>
                        <FiPlus /> Ekle
                    </button>
                    <button className={`tab-button ${activeSection === 'alinan' ? 'active' : ''}`} onClick={() => setActiveSection('alinan')}>
                        <FiArrowDownCircle /> Alınanlar
                    </button>
                    <button className={`tab-button ${activeSection === 'verilen' ? 'active' : ''}`} onClick={() => setActiveSection('verilen')}>
                        <FiArrowUpCircle /> Verilenler
                    </button>
                </div>
            </div>

            {activeSection === 'ekle' && (
                <div className="add-form-container">
                    <h2 className="section-title">Yeni Çek/Senet Ekle</h2>
                    <form onSubmit={handleFormSubmit} className="add-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label><FiDollarSign /> Tip</label>
                                <select className="form-control" name="tip" value={formData.tip} onChange={handleFormInputChange}>
                                    <option value="alınan">Alınan</option>
                                    <option value="verilen">Verilen</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Firma</label>
                                <select className="form-control select-firm" name="firma" value={formData.firma} onChange={handleFormInputChange} required>
                                    <option value="">Firma Seçin</option>
                                    {sirketler.map(sirket => (
                                        <option key={sirket._id} value={sirket._id}>{sirket.sirketAdi}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Banka / Borçlu</label>
                                <input type="text" className="form-control" name="banka" value={formData.banka} onChange={handleFormInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Vade Tarihi</label>
                                <input type="date" className="form-control" name="vadeTarihi" value={formData.vadeTarihi} onChange={handleFormInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Tutar</label>
                                <input type="number" className="form-control" name="tutar" value={formData.tutar} onChange={handleFormInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Para Birimi</label>
                                <input type="text" className="form-control" name="paraBirimi" value={formData.paraBirimi} onChange={handleFormInputChange} readOnly />
                            </div>
                        </div>
                        <div className="form-group submit-group">
                            <button type="submit" className="btn primary submit-btn"><FiPlus /> Kaydet</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="content-container">
                {loading && <div className="loader"></div>}

                {activeSection === 'alinan' && (
                    <>
                        <h2 className="section-title">Alınan Çek / Senetler</h2>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Firma</th>
                                        <th>Banka / Borçlu</th>
                                        <th>Vade Tarihi</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alinanCekSenetler.length > 0 ? (
                                        alinanCekSenetler.map(cs => (
                                            <tr key={cs._id}>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <select className="form-control" name="firma" value={editFormData.firma} onChange={handleEditFormInputChange}>
                                                        {sirketler.map(sirket => (
                                                            <option key={sirket._id} value={sirket._id}>{sirket.sirketAdi}</option>
                                                        ))}
                                                    </select>
                                                ) : getSirketAdi(cs.firma)}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="text" className="form-control" name="banka" value={editFormData.banka} onChange={handleEditFormInputChange} />
                                                ) : cs.banka}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="date" className="form-control" name="vadeTarihi" value={editFormData.vadeTarihi} onChange={handleEditFormInputChange} />
                                                ) : new Date(cs.vadeTarihi).toLocaleDateString()}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="number" className="form-control" name="tutar" value={editFormData.tutar} onChange={handleEditFormInputChange} />
                                                ) : `${cs.tutar} ${cs.paraBirimi}`}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <select className="form-control" name="durum" value={editFormData.durum} onChange={handleEditFormInputChange}>
                                                        <option value="Kasa">Kasa</option>
                                                        <option value="Ödendi">Ödendi</option>
                                                    </select>
                                                ) : cs.durum}</td>
                                                <td className="actions-cell">
                                                    {editingCekSenetId === cs._id ? (
                                                        <>
                                                            <button className="btn-icon primary" onClick={handleUpdateCekSenet}><FiSave /></button>
                                                            <button className="btn-icon secondary" onClick={handleCancelEdit}><FiX /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-icon secondary" onClick={() => handleEditClick(cs)}><FiEdit /></button>
                                                            <button className="btn-icon danger" onClick={() => handleDelete(cs._id)}><FiTrash2 /></button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="no-data">Hiç alınan çek/senet kaydı bulunamadı.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeSection === 'verilen' && (
                    <>
                        <h2 className="section-title">Verilen Çek / Senetler</h2>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Firma</th>
                                        <th>Banka / Borçlu</th>
                                        <th>Vade Tarihi</th>
                                        <th>Tutar</th>
                                        <th>Durum</th>
                                        <th>İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {verilenCekSenetler.length > 0 ? (
                                        verilenCekSenetler.map(cs => (
                                            <tr key={cs._id}>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <select className="form-control" name="firma" value={editFormData.firma} onChange={handleEditFormInputChange}>
                                                        {sirketler.map(sirket => (
                                                            <option key={sirket._id} value={sirket._id}>{sirket.sirketAdi}</option>
                                                        ))}
                                                    </select>
                                                ) : getSirketAdi(cs.firma)}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="text" className="form-control" name="banka" value={editFormData.banka} onChange={handleEditFormInputChange} />
                                                ) : cs.banka}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="date" className="form-control" name="vadeTarihi" value={editFormData.vadeTarihi} onChange={handleEditFormInputChange} />
                                                ) : new Date(cs.vadeTarihi).toLocaleDateString()}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <input type="number" className="form-control" name="tutar" value={editFormData.tutar} onChange={handleEditFormInputChange} />
                                                ) : `${cs.tutar} ${cs.paraBirimi}`}</td>
                                                <td>{editingCekSenetId === cs._id ? (
                                                    <select className="form-control" name="durum" value={editFormData.durum} onChange={handleEditFormInputChange}>
                                                        <option value="Kasa">Kasa</option>
                                                        <option value="Ödendi">Ödendi</option>
                                                    </select>
                                                ) : cs.durum}</td>
                                                <td className="actions-cell">
                                                    {editingCekSenetId === cs._id ? (
                                                        <>
                                                            <button className="btn-icon primary" onClick={handleUpdateCekSenet}><FiSave /></button>
                                                            <button className="btn-icon secondary" onClick={handleCancelEdit}><FiX /></button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button className="btn-icon secondary" onClick={() => handleEditClick(cs)}><FiEdit /></button>
                                                            <button className="btn-icon danger" onClick={() => handleDelete(cs._id)}><FiTrash2 /></button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" className="no-data">Hiç verilen çek/senet kaydı bulunamadı.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {modal.isOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <p>{modal.message}</p>
                        <div className="modal-actions">
                            <button className="btn danger" onClick={modal.onConfirm}>Evet, Sil</button>
                            <button className="btn secondary" onClick={() => setModal({ ...modal, isOpen: false })}>İptal</button>
                        </div>
                    </div>
                </div>
            )}
            <ToastContainer
                position="top-center"
                autoClose={1500}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                transition={Bounce}
            />
        </div>
    );
};

export default CekSenetler;