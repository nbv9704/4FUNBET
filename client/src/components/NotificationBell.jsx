// client/src/components/NotificationBell.jsx
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Bell } from 'lucide-react';
import useApi from '../hooks/useApi';
import useSocket from '../hooks/useSocket';
import { useUser } from '../context/UserContext';
import { useRouter } from 'next/navigation';

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const n of list) {
    const id = n?._id || n?.id;
    if (!id || !seen.has(id)) {
      if (id) seen.add(id);
      out.push(n);
    }
  }
  return out;
}

export default function NotificationBell() {
  const router = useRouter();
  const { user } = useUser();
  const { get, patch, post } = useApi();

  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [isRefreshing, setIsRefreshing]   = useState(false);

  const bellRef = useRef(null);
  const mountedRef = useRef(false);
  const inflightRef = useRef(false);

  // 🔒 Cố định các hàm API để tránh đổi identity mỗi render
  const getRef = useRef(get);
  const patchRef = useRef(patch);
  const postRef = useRef(post);
  useEffect(() => { getRef.current = get; }, [get]);
  useEffect(() => { patchRef.current = patch; }, [patch]);
  useEffect(() => { postRef.current = post; }, [post]);

  // Guard mounted
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    if (inflightRef.current) return; // chặn spam/loop
    inflightRef.current = true;
    try {
      setIsRefreshing(true);
      const res = await getRef.current(`/notification?limit=100&ts=${Date.now()}`);
      const serverList = Array.isArray(res.notifications) ? res.notifications : [];
      setNotifications(prev => dedupeById([...serverList, ...prev]));
    } catch {
      // giữ nguyên danh sách cũ nếu lỗi
    } finally {
      inflightRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, [user]);

  // Initial fetch khi user thay đổi (⚠️ chỉ phụ thuộc user để tránh loop)
  useEffect(() => {
    if (user) fetchNotifications();
    else setNotifications([]);
  }, [user, fetchNotifications]);

  // Prefetch trang /notifications khi mở dropdown → điều hướng mượt hơn
  useEffect(() => {
    if (dropdownOpen) router.prefetch('/notifications');
  }, [dropdownOpen, router]);

  // Real-time incoming notifications (dedupe)
  useSocket(user?.id, notif => {
    if (!notif) return;
    setNotifications(prev => dedupeById([notif, ...prev]));
  });

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e) {
      if (!dropdownOpen) return;
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  // Close with Escape
  useEffect(() => {
    function onKey(e) {
      if (!dropdownOpen) return;
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dropdownOpen]);

  const markAsRead = useCallback(async (id) => {
    try {
      await patchRef.current(`/notification/${id}/read`);
      setNotifications(ns => ns.map(n => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      // no-op
    }
  }, []);

  const onItemClick = useCallback(async (n) => {
    if (!n) return;

    // Mark read (best-effort)
    await markAsRead(n._id);

    // Extract roomId & path from metadata/link
    const roomId = n?.metadata?.roomId || (typeof n?.link === 'string' ? n.link.split('/').pop() : undefined);
    const path = n?.metadata?.path || n?.link || (roomId ? `/game/battle/room/${roomId}` : null);

    if (roomId) {
      try {
        // Auto-join before redirect (ignore errors like "already in room")
        await postRef.current(`/pvp/${roomId}/join`, {});
      } catch {}
    }

    if (path) {
      router.push(path);
      setDropdownOpen(false);
    }
  }, [markAsRead, router]);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => (n?.read ? acc : acc + 1), 0),
    [notifications]
  );
  const unreadBadge = unreadCount > 99 ? '99+' : unreadCount || null;
  const recent7 = useMemo(() => notifications.slice(0, 7), [notifications]);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setDropdownOpen(o => !o)}
        aria-label="Notifications"
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        className="group p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors relative"
      >
        <Bell className="w-6 h-6 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
        {unreadBadge && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full px-1 min-w-[18px] text-center"
          >
            {unreadBadge}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div
          role="menu"
          aria-label="Notifications menu"
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-lg rounded p-3 z-50"
        >
          <h3 className="font-bold mb-2">Notifications</h3>
          <ul className="max-h-64 overflow-y-auto">
            {recent7.length === 0 ? (
              <li className="text-gray-500">No notifications</li>
            ) : (
              recent7.map(n => (
                <li
                  key={n._id || n.id}
                  onClick={() => onItemClick(n)}
                  className={`py-2 border-b flex flex-col cursor-pointer ${
                    n.read ? 'text-gray-500' : 'text-gray-900 font-semibold'
                  }`}
                  title={n?.metadata?.path || ''}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onItemClick(n);
                    }
                  }}
                >
                  <span>{n.message}</span>
                  <span className="text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                </li>
              ))
            )}
          </ul>
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              onClick={fetchNotifications}
              disabled={isRefreshing}
              className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => { setDropdownOpen(false); router.push('/notifications'); }}
              className="text-sm px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
