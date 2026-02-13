import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  DollarSign,
  Bot,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader,
} from "lucide-react";
import { PageHeader, LoadingSpinner, InlineLoading } from "./SharedComponents";

const Dashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rates, setRates] = useState({ USD: null, EUR: null, GBP: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Merhaba! Ben MaliAI, Sana nasıl yardımcı olabilirim?' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        const data = await res.json();
        setRates({
          USD: data.rates.TRY,
          EUR: data.rates.TRY / data.rates.EUR,
          GBP: data.rates.TRY / data.rates.GBP,
        });
      } catch {
        setRates({ USD: 34.25, EUR: 37.8, GBP: 43.15 });
      }
    };
    fetchRates();
  }, []);

  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
  const parseMarkdown = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

 const sendMessage = async () => {
  if (!inputMessage.trim() || isLoading) return;

  const userMessage = inputMessage.trim();
  setInputMessage("");
  setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
  setIsLoading(true);

  const aiMessageIndex = messages.length + 1;
  setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

  try {
    const response = await fetch('http://31.57.33.249:3001/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let aiResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          
          try {
            const parsed = JSON.parse(data);
            aiResponse += parsed.text;
            
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[aiMessageIndex] = { 
                role: 'assistant', 
                content: aiResponse 
              };
              return newMessages;
            });
          } catch (e) {}
        }
      }
    }
  } catch (error) {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[aiMessageIndex] = { 
        role: 'assistant', 
        content: 'Hata oluştu.' 
      };
      return newMessages;
    });
  } finally {
    setIsLoading(false);
  }
};
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  
  const navigateMonth = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(currentDate.getMonth() + dir);
    setCurrentDate(d);
  };

  
  const generateCalendar = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const weeks = [];
    let d = 1;
    
    const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;
    
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < adjustedFirstDay) || d > days) {
          week.push(null);
        } else {
          week.push(d++);
        }
      }
      weeks.push(week);
      if (d > days) break;
    }
    return weeks;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day) => {
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  const months = [
    "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
    "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
  ];

  return (
    <div 
      className="modern-dashboard" 
      style={{
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {}
      <header style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        padding: '1.5rem 1rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '2.2rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em'
        }}>
          BOZKURTSAN
        </h1>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          alignItems: 'center',
          marginTop: '0.75rem',
          fontSize: '0.9rem',
          color: '#64748b',
          fontWeight: 500
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <Clock size={16} />
            <span>{currentTime.toLocaleTimeString("tr-TR")}</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.8rem',
            background: 'rgba(255, 255, 255, 0.7)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <MapPin size={16} />
            <span>{currentTime.toLocaleDateString("tr-TR")}</span>
          </div>
        </div>
      </header>

      {}
      <main style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {}
        <section 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.8
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} />
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}>Takvim</h2>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '16px'
          }}>
            <button 
              onClick={() => navigateMonth(-1)} 
              style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667eea'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{
              fontWeight: 600,
              color: '#1e293b',
              fontSize: '1rem'
            }}>
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button 
              onClick={() => navigateMonth(1)} 
              style={{
                background: 'rgba(102, 126, 234, 0.1)',
                border: 'none',
                padding: '0.5rem',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667eea'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.2)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '0.25rem'
            }}>
              {weekDays.map((d) => (
                <div key={d} style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  padding: '0.5rem'
                }}>{d}</div>
              ))}
            </div>
            {generateCalendar().map((w, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '0.25rem'
              }}>
                {w.map((d, j) => (
                  <div
                    key={j}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: d ? 'pointer' : 'default',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      background: isSelected(d) 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : isToday(d)
                        ? 'rgba(251, 191, 36, 0.2)'
                        : 'transparent',
                      color: isSelected(d) 
                        ? 'white'
                        : isToday(d)
                        ? '#f59e0b'
                        : '#374151',
                      transform: isSelected(d) ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected(d) ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
                    }}
                    onClick={() =>
                      d &&
                      setSelectedDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth(),
                          d
                        )
                      )
                    }
                    onMouseEnter={(e) => {
                      if (d && !isSelected(d)) {
                        e.target.style.background = 'rgba(102, 126, 234, 0.1)';
                        e.target.style.transform = 'scale(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (d && !isSelected(d)) {
                        e.target.style.background = isToday(d) ? 'rgba(251, 191, 36, 0.2)' : 'transparent';
                        e.target.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    {d || ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {}
        <section 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.8
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <DollarSign size={18} />
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}>Kurlar</h2>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {[
              { key: 'USD', symbol: '$', gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', rate: rates.USD },
              { key: 'EUR', symbol: '€', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', rate: rates.EUR },
              { key: 'GBP', symbol: '£', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', rate: rates.GBP }
            ].map((currency) => (
              <div 
                key={currency.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '20px',
                  padding: '1rem 1.25rem',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '16px',
                  fontSize: '1.25rem',
                  color: 'white',
                  fontWeight: 'bold',
                  background: currency.gradient
                }}>
                  {currency.symbol}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: 0
                  }}>{currency.rate?.toFixed(2)}</div>
                  <div style={{
                    fontSize: '0.825rem',
                    color: '#64748b',
                    marginTop: '0.25rem',
                    fontWeight: 500
                  }}>{currency.key} / TRY</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {}
        <section 
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '600px',
            gridColumn: 'span 2'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.8
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={18} />
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 700,
              color: '#1e293b',
              letterSpacing: '-0.025em'
            }}>MaliAI</h2>
          </div>

          {}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div style={{
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(248, 250, 252, 0.8)',
                  color: msg.role === 'user' ? 'white' : '#374151',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  border: msg.role === 'assistant' ? '1px solid rgba(226, 232, 240, 0.5)' : 'none',
                  lineHeight: 1.5,
                  fontSize: '0.9rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {parseMarkdown(msg.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                maxWidth: '80%'
              }}>
                <div style={{
                  background: 'rgba(248, 250, 252, 0.8)',
                  padding: '0.75rem 1rem',
                  borderRadius: '20px 20px 20px 4px',
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <Loader size={16} className="animate-spin" style={{
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Yazıyor...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {}
          <div style={{
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Bir şey sorun..."
              disabled={isLoading}
              style={{
                flex: 1,
                border: '2px solid rgba(226, 232, 240, 0.8)',
                borderRadius: '16px',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                e.target.style.background = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgba(248, 250, 252, 0.8)';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isLoading || !inputMessage.trim() ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading && inputMessage.trim()) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

