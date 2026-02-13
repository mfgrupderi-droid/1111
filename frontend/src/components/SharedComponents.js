import React from 'react';

/**
 * Standart Loading Spinner
 * @param {string} text - Yüklenirken gösterilecek metin
 */
export const LoadingSpinner = ({ text = 'Yükleniyor...' }) => (
  <div className="loading-screen">
    <div className="loading-screen__container">
      <div className="loading-screen__spinner"></div>
      <p className="loading-screen__text">{text}</p>
    </div>
  </div>
);

/**
 * Inline Loading Spinner (Küçük, metin yanında)
 * @param {string} text - Yanında gösterilecek metin
 */
export const InlineLoading = ({ text = 'Yükleniyor...' }) => (
  <div className="loading-spinner">
    <div className="loading-spinner__icon"></div>
    {text && <span className="loading-spinner__text">{text}</span>}
  </div>
);

/**
 * Standart Page Header
 * @param {string} title - Başlık
 * @param {string} subtitle - Alt başlık
 * @param {ReactNode} icon - Icon component (lucide-react)
 * @param {boolean} gradient - Gradient background kullanılsın mı?
 */
export const PageHeader = ({ title, subtitle, icon: Icon, gradient = false }) => (
  <div className={`page-header ${gradient ? 'page-header--gradient' : ''}`}>
    {Icon && (
      <div className="page-header__icon">
        <Icon size={24} />
      </div>
    )}
    <div>
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
  </div>
);

/**
 * Boş Durum İçeriği
 * @param {string} message - Mesaj
 * @param {ReactNode} icon - Icon component
 */
export const EmptyState = ({ message = 'Veri bulunamadı', icon: Icon }) => (
  <div className="flex-center" style={{ minHeight: '300px', flexDirection: 'column', gap: '1rem' }}>
    {Icon && <Icon size={48} color="var(--text-tertiary)" />}
    <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>{message}</p>
  </div>
);

/**
 * Error Alert
 * @param {string} message - Hata mesajı
 * @param {function} onClose - Kapatma callback
 */
export const ErrorAlert = ({ message, onClose }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
    padding: 'var(--spacing-lg)',
    backgroundColor: '#fee2e2',
    borderLeft: '4px solid var(--accent-danger)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--spacing-lg)'
  }}>
    <div style={{ flex: 1 }}>
      <p style={{ color: 'var(--accent-danger)', fontWeight: '600', margin: 0 }}>
        {message}
      </p>
    </div>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent-danger)',
          cursor: 'pointer',
          fontSize: '20px',
          padding: 0
        }}
      >
        ×
      </button>
    )}
  </div>
);

/**
 * Success Alert
 * @param {string} message - Başarı mesajı
 * @param {function} onClose - Kapatma callback
 */
export const SuccessAlert = ({ message, onClose }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-lg)',
    padding: 'var(--spacing-lg)',
    backgroundColor: '#dcfce7',
    borderLeft: '4px solid var(--accent-success)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--spacing-lg)'
  }}>
    <div style={{ flex: 1 }}>
      <p style={{ color: 'var(--accent-success)', fontWeight: '600', margin: 0 }}>
        {message}
      </p>
    </div>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent-success)',
          cursor: 'pointer',
          fontSize: '20px',
          padding: 0
        }}
      >
        ×
      </button>
    )}
  </div>
);

/**
 * Modal Header (Modal açılırken kullanılacak)
 * @param {string} title - Modal başlığı
 * @param {function} onClose - Kapatma callback
 */
export const ModalHeader = ({ title, onClose }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: 'var(--spacing-lg)'
  }}>
    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{title}</h2>
    {onClose && (
      <button
        onClick={onClose}
        style={{
          background: 'var(--bg-tertiary)',
          border: 'none',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          cursor: 'pointer',
          fontSize: '20px',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ×
      </button>
    )}
  </div>
);

const sharedComponents = {
  LoadingSpinner,
  InlineLoading,
  PageHeader,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
  ModalHeader
};

export default sharedComponents;

