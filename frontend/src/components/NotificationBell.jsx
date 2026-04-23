import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await axiosClient.get('/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unreadCount);
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      try {
        await axiosClient.put('/notifications/read-all');
        setUnread(0);
        setNotifications(n => n.map(x => ({ ...x, is_read: true })));
      } catch {}
    }
  };

  const handleClickNotification = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={handleOpen} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', padding: '4px 8px', borderRadius: '8px' }}>
        🔔
        {unread > 0 && (
          <span style={{ position: 'absolute', top: '0', right: '0', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '44px', right: '0', width: '340px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 1002, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', fontSize: '14px', color: '#1a1a1a' }}>
            🔔 Thông báo
          </div>
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px', fontSize: '14px' }}>Chưa có thông báo nào.</p>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleClickNotification(n)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #f8fafc',
                  background: n.is_read ? '#fff' : '#f0f9ff',
                  fontSize: '13px', color: '#334155', lineHeight: 1.5,
                  cursor: n.link ? 'pointer' : 'default',
                  transition: '0.15s',
                }}
                onMouseEnter={e => { if (n.link) e.currentTarget.style.background = '#e0f2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '#fff' : '#f0f9ff'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span>{n.content}</span>
                  {!n.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px' }} />}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  {new Date(n.created_at).toLocaleString('vi-VN')}
                  {n.link && <span style={{ color: '#3b82f6', marginLeft: '6px' }}>→ Xem</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
