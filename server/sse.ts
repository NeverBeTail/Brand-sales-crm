import express from "express";
import { db } from "./db";

// ==========================================
// Phase 7 Real-time In-App Notification Engine (SSE)
// ==========================================
export let sseClients: express.Response[] = [];

export function pushNotification(type: "pipeline" | "action_item" | "system", title: string, message: string) {
  const newNotif = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  db.notifications.unshift(newNotif);
  
  // Limit to most recent 100 to save memory
  if (db.notifications.length > 100) {
    db.notifications.pop();
  }

  // Broadcast to all active SSE clients
  console.log(`📡 [SSE BROADCAST] Dispatching notification to ${sseClients.length} listener(s): "${title}"`);
  sseClients.forEach(clientRes => {
    try {
      clientRes.write(`data: ${JSON.stringify(newNotif)}\n\n`);
    } catch (err) {
      console.log("Stale SSE connection detected during broadcast failure.");
    }
  });
  
  return newNotif;
}
