// client/src/components/NotificationBell.jsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import useApi from '../hooks/useApi';
import useSocket from '../hooks/useSocket';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/navigation';

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const { get, patch, post } = useApi();
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const bellRef = useRef();

  // Fetch recent notifications
  useEffect(() => {
    if (!user) return;
    get(`/notification?limit=100`)
      .then(res => setNotifications(res.notifications || []))
      .catch(() => setNotifications([]));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time incoming notifications
  useSocket(user?.id, notif => {
    setNotifications(prev => [notif, ...prev]);
  });

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  const markAsRead = async (id) => {
    try {
      await patch(`/notification/${id}/read`);
      setNotifications(ns => ns.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const onItemClick = async (n) => {
    await markAsRead(n._id);

    // Extract roomId & path from metadata/link
    const roomId = n?.metadata?.roomId || n?.link?.split('/').pop();
    const path = n?.metadata?.path || n?.link || (roomId ? `/game/battle/room/${roomId}` : null);

    if (roomId) {
      try {
        // Auto-join before redirect (ignore errors like "already in room")
        await post(`/pvp/${roomId}/join`, {});
      } catch {}
    }

    if (path) {
      router.push(path);
      setDropdownOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recent7     = notifications.slice(0, 7);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setDropdownOpen(o => !o)}
        aria-label="Notifications"
        className="group p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors relative"
      >
        <Bell className="w-6 h-6 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg rounded p-3 z-50">
          <h3 className="font-bold mb-2">Notifications</h3>
          <ul className="max-h-64 overflow-y-auto">
            {recent7.length === 0 ? (
              <li className="text-gray-500">No notifications</li>
            ) : (
              recent7.map(n => (
                <li
                  key={n._id}
                  onClick={() => onItemClick(n)}
                  className={`py-2 border-b flex flex-col cursor-pointer ${
                    n.read ? 'text-gray-500' : 'text-gray-900 font-semibold'
                  }`}
                  title={n?.metadata?.path || ''}
                >
                  {/* message already includes inviter's name (from server) */}
                  <span>{n.message}</span>
                  <span className="text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
          <div className="pt-2 text-right">
            <button
              onClick={() => { setDropdownOpen(false); router.push('/notifications'); }}
              className="text-blue-600 text-sm hover:underline"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
