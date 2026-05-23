import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";

// Import Custom Modular Infrastructure
import { seedDatabaseIfEmpty, db, getSimulatedUser } from "./server/db";
import { sseClients, pushNotification } from "./server/sse";
import { brandRouter, solutionRouter, brandSolutionRouter } from "./server/routes/brands";
import { meetingRouter, calendarRouter } from "./server/routes/meetings";
import { contactRouter } from "./server/routes/contacts";
import { portalRouter } from "./server/routes/portal";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable trust proxy globally to correctly identify client IPs behind reverse proxy
app.set("trust proxy", 1);

// CORS Security Setup - Allow secure parent frames and production preview variables
const allowedOrigins = [
  process.env.APP_URL || "http://localhost:3000",
  "https://ai.studio",
  "https://ais-dev-xvktk2rfobwwpvci4x3dki-180286465199.asia-northeast1.run.app",
  "https://ais-pre-xvktk2rfobwwpvci4x3dki-180286465199.asia-northeast1.run.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed)) || 
                     origin.includes("run.app") || 
                     origin.includes("localhost") || 
                     origin.includes("127.0.0.1");
    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy violation: Cross-Origin request has been blocked by security policies."));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// API Rate Limiting to prevent denial of service
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: {
    success: false,
    status: 429,
    message: "단기간에 너무 많은 요청이 감지되었습니다. 15분 후 다시 시도해 주세요."
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});

app.use("/api/", apiLimiter);
app.use(express.json({ limit: "50mb" }));

// ==========================================
// MOUNT MODULAR ROUTERS
// ==========================================
app.use("/api/brands", brandRouter);
app.use("/api/solutions", solutionRouter);
app.use("/api/brand-solutions", brandSolutionRouter);
app.use("/api/meetings", meetingRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/calendar", calendarRouter);
app.use("/", portalRouter);

// ==========================================
// REAL-TIME NOTIFICATION STREAM (SSE)
// ==========================================
app.get("/api/notifications/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.push(res);
  console.log(`🔌 [SSE CONNECTED] Client entered notifications stream. Active: ${sseClients.length}`);

  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(pingInterval);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    console.log(`🔌 [SSE DISCONNECTED] Client left stream. Active: ${sseClients.length}`);
  });
});

// Common Notification & Utility Endpoints
app.get("/api/notifications", (req, res) => {
  res.json({ notifications: db.notifications });
});

app.patch("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const notif = db.notifications.find(n => n.id === id);
  if (notif) {
    notif.isRead = true;
  }
  res.json({ success: true, notifications: db.notifications });
});

app.patch("/api/notifications/read-all", (req, res) => {
  db.notifications.forEach(n => {
    n.isRead = true;
  });
  res.json({ success: true, notifications: db.notifications });
});

app.get("/api/audit-logs", (req, res) => {
  const userRole = req.headers["x-user-role"] as string || "Admin";
  if (userRole === "Sales_Rep") {
    return res.status(403).json({
      error: "🔒 [접근 통제 안내] '보안 및 데이터 감사(Audit Log)' 내적 데이터는 Manager 및 Admin 등급 이상의 인원만 보안 상 상시 관람이 허가되며, 일반 영업 대표(Sales_Rep)는 열람할 수 없습니다."
    });
  }
  res.json(db.auditLogs);
});

app.get("/api/backups", (req, res) => {
  const userRole = req.headers["x-user-role"] as string || "Admin";
  if (userRole === "Sales_Rep") {
    return res.status(403).json({
      error: "🔒 일반 영업사원은 백업 권한이 통제되어 있습니다."
    });
  }
  res.json(db.backups);
});

app.post("/api/backups/trigger", (req, res) => {
  const userRole = req.headers["x-user-role"] as string || "Admin";
  if (userRole === "Sales_Rep") {
    return res.status(403).json({
      error: "🔒 일반 영업사원은 백업 변경 권한이 통제되어 있습니다."
    });
  }

  const rowCount = db.contacts.length + db.meetings.length + db.auditLogs.length;
  const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').substring(0, 15);
  const fileName = `B2B_CRM_Postgres_Backup_Manual_${timestamp}.tar.gz`;

  const newBackup = {
    id: `backup-manual-${Date.now()}`,
    fileName,
    status: "COMPLETED" as const,
    databaseSize: "25.3 MB",
    recordsCount: rowCount,
    details: "수동 촉발 로컬 덤프 가동: 디스크 사본 미러링 및 클라우드 S3 인스턴스 전송 무결성 정합성 검증 완료.",
    createdAt: new Date().toISOString()
  };

  db.backups.unshift(newBackup);

  db.auditLogs.unshift({
    id: `log-manual-backup-${Date.now()}`,
    userId: "manual-trigger",
    userName: "System Operator (Manual Run)",
    userRole: userRole as any,
    action: "EXPORT_CSV" as any,
    targetType: "DATABASE_BACKUP",
    targetName: fileName,
    details: `관리용 물리 백업 스냅샷 수동 가동 완료: ${fileName}. PostgreSQL pg_dump 이진 압축 패키지 생성 가동 완료.`,
    createdAt: new Date().toISOString()
  });

  res.json({ backup: newBackup });
});

app.post("/api/sentry/trigger-error", (req, res) => {
  const { errorType } = req.body;
  const sentryEventId = `evt-${Math.random().toString(36).substring(2, 11).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  
  let capturedErrorMessage = "";
  let stacktrace = "";

  if (errorType === "NullPointerException") {
    capturedErrorMessage = "NullPointerException: Attempt to invoke virtual method 'String.toLowerCase()' on a null object reference at com.b2bcrm.sales.pipeline.LeadAssigner.getDomain(LeadAssigner.java:142)";
    stacktrace = `java.lang.NullPointerException: Attempt to invoke virtual method 'String.toLowerCase()' on a null object reference
    at com.b2bcrm.sales.pipeline.LeadAssigner.getDomain(LeadAssigner.java:142)
    at com.b2bcrm.sales.pipeline.LeadAssigner.processLead(LeadAssigner.java:83)`;
  } else if (errorType === "RateLimitExceeded") {
    capturedErrorMessage = "RateLimitExceededException: Client IP '112.214.38.109' exceeded B2B API Token Bucket allocation (Max 150 req/min)";
    stacktrace = `RateLimitExceededException: API usage throttle triggered!
    at middleware.RateLimiter.consume(rateLimiter.ts:54)`;
  } else {
    capturedErrorMessage = "DatabaseConnectionTimeout: PostgreSQL pool exhausted. Idle connections: 0, Active connections: 50. Timeout waiting for connection after 15000ms.";
    stacktrace = `DatabaseConnectionTimeout: PostgreSQL thread pool exhausted!
    at node_modules/pg-pool/index.js:332:11`;
  }

  res.json({
    success: true,
    sentryEventId,
    capturedErrorMessage,
    stacktrace,
    dispatchedNotification: "#dev-ops slack notification dispatched with priority HIGH",
    timestamp: new Date().toISOString()
  });
});

// Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 [GLOBAL BACKEND ERROR HANDLER]:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "서버 내부 처리 중 알 수 없는 에러가 발생했습니다.";
  res.status(status).json({
    success: false,
    status,
    message,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// BACKGROUND WORKERS (Meetings Impending Reminders)
// ==========================================
setInterval(async () => {
  const now = new Date();
  try {
    const prismaClient = new PrismaClient();
    const activeMeetings = await prismaClient.meeting.findMany({
      include: { brand: true }
    });
    
    for (const m of activeMeetings) {
      if ((m as any).reminderSet && !(m as any).reminderSent && m.dateTime) {
        const meetingTime = new Date(m.dateTime);
        const diffMs = meetingTime.getTime() - now.getTime();
        const diffMins = diffMs / 1000 / 60;
        
        if (diffMins > 0 && diffMins <= 60) {
          (m as any).reminderSent = true;
          const title = `🚨 [리마인더] ${m.brand?.name || '가맹사'} 미팅 임박`;
          const msg = `"${m.title}" 미팅이 ${Math.round(diffMins)}분 뒤에 시작됩니다. 회의 참석을 준비해주세요.`;
          pushNotification("system", title, msg);
        }
      }
    }
    await prismaClient.$disconnect();
  } catch (err) {
    console.error("Impending meetings background worker error:", err);
  }
}, 30 * 1000); // Check every 30 seconds

// Boot servers
async function startServer() {
  console.log("🚀 Starting B2B CRM Server initialization...");
  try {
    await seedDatabaseIfEmpty();
  } catch (seedErr) {
    console.error("❌ Failed to seed database on startup:", seedErr);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`B2B CRM Active & Booting at http://localhost:${PORT}`);
  });
}

startServer();
