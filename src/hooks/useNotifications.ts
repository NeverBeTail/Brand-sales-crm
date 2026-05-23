// ──────────────────────────────────────────────
// useNotifications: SSE 실시간 알림 및 폴링 관리 훅
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { NOTIFICATION_POLL_INTERVAL_MS } from '../constants';
import type { Notification } from '../types';

export interface NotificationState {
  notifications: Notification[];
  isNotifOpen: boolean;
}

export interface NotificationActions {
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  setIsNotifOpen: (open: boolean) => void;
  handleReadNotification: (id: string, e?: React.MouseEvent) => Promise<void>;
  handleReadAllNotifications: () => Promise<void>;
}

export function useNotifications(): NotificationState & NotificationActions {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // SSE 연결 및 폴링 fallback
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data?.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.warn('Could not fetch notifications initially.', err);
      }
    };

    fetchNotifications();

    // SSE 실시간 스트림
    const eventSource = new EventSource('/api/notifications/sse');

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications((prev) => [newNotif, ...prev]);
      } catch (err) {
        console.error('Failed to parse incoming real-time push payload:', err);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE connection status reset. EventSource automatically handles reconnection.');
    };

    // 폴링 fallback
    const pollingFallback = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      eventSource.close();
      clearInterval(pollingFallback);
    };
  }, []);

  // 단일 알림 읽음 처리
  const handleReadNotification = useCallback(async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      }
    } catch (err) {
      console.error('Failed to mark single notification as read:', err);
    }
  }, []);

  // 모든 알림 읽음 처리
  const handleReadAllNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  return {
    notifications,
    isNotifOpen,
    setNotifications,
    setIsNotifOpen,
    handleReadNotification,
    handleReadAllNotifications,
  };
}
