import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      
      
      const response = await axios.post('http://31.57.33.249:3001/api/users/login', { username, password });

      
      if (response.status === 200) {
        const { token, user } = response.data;

        
        localStorage.setItem('token', token);

        
        onLoginSuccess(token, user);
        toast.success('Giriş başarılı!');
      }
    } catch (error) {
      setIsLoading(false);
      let errorMessage = 'Giriş başarısız.';

      
      if (error.response) {
        
        errorMessage = error.response.data.msg || errorMessage;
      } else if (error.request) {
        
        errorMessage = 'Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.';
      } else {
        
        errorMessage = 'İstek oluşturulurken bir hata oluştu.';
      }
      toast.error(errorMessage);
      console.error('Login Error:', error);
    }
  };

  return (
    <>
      <style>{`
        :root {
          --primary-color: #007bff;
          --primary-color-dark: #0056b3;
          --secondary-color: #6c757d;
          --background-color: #f8f9fa;
          --card-background: #fff;
          --text-color: #333;
          --border-color: #ced4da;
          --shadow-color: rgba(0, 0, 0, 0.1);
        }

        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--background-color);
          margin: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }

        .login-card {
          background-color: var(--card-background);
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 8px 25px var(--shadow-color);
          width: 100%;
          max-width: 400px;
          text-align: center;
          transition: transform 0.3s ease-in-out;
        }
        
        .login-card:hover {
          transform: translateY(-5px);
        }

        .login-card h2 {
          margin-bottom: 1.5rem;
          color: var(--text-color);
          font-weight: 700;
        }

        .form-group {
          margin-bottom: 1rem;
          text-align: left;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: var(--text-color);
          font-weight: 500;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          line-height: 1.5;
          color: var(--text-color);
          background-color: #f1f3f5;
          background-clip: padding-box;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }

        .form-control:focus {
          border-color: var(--primary-color);
          outline: 0;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }

        .btn-primary2 {
          width: 100%;
          color: #fff;
          background-color: var(--primary-color);
          border: none;
          padding: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.2s;
          border-radius: 8px;
          margin-top: 1rem;
        }

 
.btn {
 width: 6.5em;
 height: 2.3em;
 margin: 0.5em;
 background: black;
 color: white;
 border: none;
 border-radius: 0.625em;
 font-size: 20px;
 font-weight: bold;
 cursor: pointer;
 position: relative;
 z-index: 1;
 overflow: hidden;
}

button:hover {
 color: black;
}

button:after {
 content: "";
 background: white;
 position: absolute;
 z-index: -1;
 left: -20%;
 right: -20%;
 top: 0;
 bottom: 0;
 transform: skewX(-45deg) scale(0, 1);
 transition: all 0.5s;
}

button:hover:after {
 transform: skewX(-45deg) scale(1, 1);
 -webkit-transition: all 0.5s;
 transition: all 0.5s;
}
}
        }
      `}</style>
      <div className="login-card">
        <h2>Giriş Yap</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              type="text"
              id="username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button class="btn"> Giriş Yap</button>
        </form>
      </div>
    </>
  );
};

export default Login;
