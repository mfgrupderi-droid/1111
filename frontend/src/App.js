import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard'; 
import Employees from './components/Employees'; 
import Ceksenet from './components/Ceksenetler'; 
import Chat from './components/Chat'; 
import Siparis from './components/Siparis2';
import Odemeler from './components/Odemeler';
import Sirketler from './components/Sirketler';
import Sevkiyat from './components/Sevkiyat';
import UrunSatis from './components/UrunSatis';
import UrunAlis from './components/UrunAlis';
import Order from './components/Order';
import Users from './components/UserManagement';
import Calisanlar from './components/Calisanlar';
import AbsenceTracker from './components/AbsenceTracker';
import Hakedis from './components/Hakedis';
import Iscilik from './components/Iscilik';
import './App.css'; 
import './styles/AppleStyle.css';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // localStorage'dan token, role, username ve permissions verilerini alıyoruz
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [permissions, setPermissions] = useState(
    JSON.parse(localStorage.getItem('permissions')) || {}
  );
  
  // Uygulama ilk yüklendiğinde localStorage'ı kontrol et
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setRole(localStorage.getItem('role'));
      setUsername(localStorage.getItem('username'));
      setPermissions(JSON.parse(localStorage.getItem('permissions')) || {});
    }
  }, []);

  // Giriş başarılı olduğunda çağrılan fonksiyon.
  // API'den dönen token ve user objesini doğrudan alacak şekilde güncellendi.
  const handleLoginSuccess = (newToken, user) => {
    if (newToken && user) {
      // localStorage'a tüm gerekli bilgileri kaydediyoruz
      localStorage.setItem('token', newToken);
      localStorage.setItem('role', user.role);
      localStorage.setItem('username', user.username);
      localStorage.setItem('permissions', JSON.stringify(user.permissions));
      
      // State'leri güncelliyoruz
      setToken(newToken);
      setRole(user.role);
      setUsername(user.username);
      setPermissions(user.permissions);
    }
  };

  // Çıkış yapıldığında çağrılan fonksiyon. Tüm localStorage verilerini temizler.
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('permissions');
    setToken(null);
    setRole(null);
    setUsername(null);
    setPermissions({});
  };

  return (
    <HashRouter>
      <div className="App">
        {/* Token yoksa, Login sayfasını göster */}
        {!token ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          /* Token varsa, ana uygulama arayüzünü göster */
          <div className="dashboard-layout">
            <Sidebar onLogout={handleLogout} />
            <div className="main-content">
              <Routes>
                {/* Router ile bileşenlerin rotalarını tanımlıyoruz */}
                <Route path="/" element={<Dashboard role={role} />} />
                <Route path="/calisanlar" element={<Employees />} />
                <Route path="/ceksenetler" element={<Ceksenet />} />
                <Route path="/order" element={<Order />} />
                <Route path="/siparis" element={<Siparis />} />
                <Route path="/odemeler" element={<Odemeler />} />
                <Route path="/sirketler" element={<Sirketler />} />
                <Route path="/urun-satis" element={<UrunSatis />} />
                 <Route path="/absences" element={<AbsenceTracker />} />
                 <Route path="/hakedis" element={<Hakedis />} />
                <Route path="/urun-alis" element={<UrunAlis />} />
                <Route path="/iscilikler" element={<Iscilik />} />
                <Route path="/calisanlar" element={<Calisanlar />} />
                <Route path="/sevkiyat" element={<Sevkiyat />} />
                <Route path="/users" element={<Users permissions={permissions} />} />
                <Route path="/chat" element={<Chat username={username} />} />
              </Routes>
            </div>
          </div>
        )}
      </div>
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
    </HashRouter>
  );
}

export default App;
