import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
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
import EmployeeManager from './components/EmployeeManager';
import RenkAnalizi from './components/RenkAnalizi';
import Hakedis from './components/Hakedis';
import Iscilik from './components/Iscilik';
import './App.css'; 
import './styles/AppleStyle.css';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SOCKET_URL = 'http://31.57.33.249:3001';

function App() {
  
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [permissions, setPermissions] = useState(
    JSON.parse(localStorage.getItem('permissions')) || {}
  );
  const [unreadCount, setUnreadCount] = useState(0);
  
  
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setRole(localStorage.getItem('role'));
      setUsername(localStorage.getItem('username'));
      setPermissions(JSON.parse(localStorage.getItem('permissions')) || {});
    }
  }, []);

  // Socket bağlantısı ve unread dinleme (Chat'e girmeden önce)
  useEffect(() => {
    if (!username) return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('App socket bağlantısı kuruldu');
      // Kullanıcıyı register et
      socket.emit('register', username);
    });

    // Okunmamış mesaj güncelleme dinle
    socket.on('unread:update', ({ user: u, room, count }) => {
      if (u === username) {
        setUnreadCount(count);
        // Global event ile Sidebar'ı güncelle
        try {
          window.dispatchEvent(new CustomEvent('chat:unread', { detail: count }));
        } catch (e) {}
      }
    });

    // İlk bağlantıda okunmamış sayıyı al
    (async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/chat/unread?user=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const total = data.reduce((s, it) => s + (it.count || 0), 0);
            setUnreadCount(total);
            try {
              window.dispatchEvent(new CustomEvent('chat:unread', { detail: total }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.log('İlk unread al hatası:', err);
      }
    })();

    return () => {
      socket.off('unread:update');
      socket.disconnect();
    };
  }, [username]);

  
  
  const handleLoginSuccess = (newToken, user) => {
    if (newToken && user) {
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('role', user.role);
      localStorage.setItem('username', user.username);
      localStorage.setItem('permissions', JSON.stringify(user.permissions));
      
      
      setToken(newToken);
      setRole(user.role);
      setUsername(user.username);
      setPermissions(user.permissions);
    }
  };

  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('permissions');
    setToken(null);
    setRole(null);
    setUsername(null);
    setPermissions({});
    setUnreadCount(0);
  };

  return (
    <HashRouter>
      <div className="App">
        {}
        {!token ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : (
          
          <div className="dashboard-layout">
            <Sidebar onLogout={handleLogout} unreadCount={unreadCount} />
            <div className="main-content">
              <Routes>
                {}
                <Route path="/" element={<Dashboard role={role} />} />
                <Route path="/calisanlar" element={<Employees />} />
                <Route path="/renk" element={<RenkAnalizi />} />
                <Route path="/ceksenetler" element={<Ceksenet />} />
                <Route path="/order" element={<Order />} />
                <Route path="/siparis" element={<Siparis />} />
                <Route path="/odemeler" element={<Odemeler />} />
                <Route path="/sirketler" element={<Sirketler />} />
                <Route path="/urun-satis" element={<UrunSatis />} />
                 <Route path="/absences" element={<AbsenceTracker />} />
                 <Route path="/employee-manager" element={<EmployeeManager />} />
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
