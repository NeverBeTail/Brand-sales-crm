import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Calendar, Phone, Mail, Mic, Sparkles, MapPin, 
  RefreshCw, CheckCircle, Video, Play, ArrowRight, Star, Plus, 
  Trash2, Layers, Award, FileText, ChevronRight, CheckCircle2, UserCheck,
  Check, Trello, BarChart3, Bell, Search, Download, ShieldAlert,
  Bot, ShieldCheck, Clock
} from 'lucide-react';

import { Brand, Contact, Meeting, SyncStatus, PipelineStatus } from './types';
import { loginWithGoogle, logout as firebaseLogout, auth, db } from './lib/firebase';
import { createGoogleCalendarEvent, deleteGoogleCalendarEvent, listGoogleCalendarEvents } from './lib/googleCalendar';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import BrandHistoryTimeline from './components/BrandHistoryTimeline';
import MeetingForm from './components/MeetingForm';
import VoiceRecorder from './components/VoiceRecorder';
import PipelineBoard from './components/PipelineBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuditLogTimeline from './components/AuditLogTimeline';
import SalesGamification from './components/SalesGamification';
import AIChatbot from './components/AIChatbot';
import AdminPanel from './components/AdminPanel';
import { SkeletonBrandMap, ElegantEmptyState } from './components/PremiumComponents';
import Brand360View from './components/Brand360View';
import { motion, AnimatePresence } from 'motion/react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[FIRESTORE COMPLIANCE ERROR] ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 1800): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};


export default function App() {
  // Primary States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSynced: null,
    syncedEventsCount: 0,
    isSyncing: false
  });

  const [selectedBrandId, setSelectedBrandId] = useState<string>('brand-1');
  const [isAddingMeeting, setIsAddingMeeting] = useState<boolean>(false);
  const [isAddingBrand, setIsAddingBrand] = useState<boolean>(false);
  const [newBrandForm, setNewBrandForm] = useState({
    name: '',
    category: 'F&B Brand' as any,
    headquarters: '',
    description: '',
    targetStoresCount: 5,
    monthlyRevenueEst: '월 평균 1억원 규모 예상',
    pipelineStatus: 'Cold Call' as any,
    contactName: '',
    contactRole: '브랜드 본사 담당자' as any,
    contactPosition: '담당 바이어',
    contactPhone: '',
    contactEmail: ''
  });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'profile' | 'pipeline' | 'analytics' | 'audit' | 'chatbot' | 'admin'>('profile');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Active AI recording output session
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    transcript: string;
    summary: string;
    actionItems: string[];
  } | null>(null);

  // Phase 6 Proactive AI Email Generator States
  const [emailDraft, setEmailDraft] = useState<{ subject: string; body: string } | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [crossSellingWarning, setCrossSellingWarning] = useState<string | null>(null);
  const [sync360Trigger, setSync360Trigger] = useState<number>(0);

  // Phase 7: CRM In-App Notifications & Global Intelligent Search States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{ brands: any[], contacts: any[], meetings: any[] } | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Phase 8: Enterprise RBAC, Soft Delete Protective Layer & Auditor Timeline Channels
  const [userRole, setUserRole] = useState<'Admin' | 'Manager' | 'Sales_Rep'>('Admin');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rbacError, setRbacError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // B2B Email Draft Generator dispatch handler
  const handleGenerateEmailDraft = async (brandName: string, summary: string, actionItems: string[]) => {
    try {
      setIsGeneratingEmail(true);
      setEmailDraft(null);
      setCopiedEmail(false);
      
      const response = await fetch('/api/meetings/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          summary,
          actionItems,
          contactName: contacts.find(c => c.brandId === selectedBrandId && c.role === '브랜드 본사 담당자')?.name || "실무진 담당자님"
        })
      });

      if (!response.ok) throw new Error('이메일 초안 생성 에러');
      const data = await response.json();
      setEmailDraft(data);
    } catch (err) {
      console.error("Failed to generate CRM automated follow-up email:", err);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // Phase 8 Compliance Auditor log loader
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { 'X-User-Role': userRole }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data || []);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch compliance audit logs:", err);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [userRole]);

  const refreshAllStates = async () => {
    try {
      setLoading(true);
      if (!isLoggedIn) return;

      try {
        const [resBrands, resContacts, resMeetings] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'brands')),
            getDocs(collection(db, 'contacts')),
            getDocs(collection(db, 'meetings'))
          ]),
          1500
        );

        setBrands(resBrands.docs.map(d => ({ id: d.id, ...d.data() } as Brand)));
        setContacts(resContacts.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
        setMeetings(resMeetings.docs.map(d => ({ id: d.id, ...d.data() } as Meeting)));
      } catch (fbErr) {
        console.warn("⚠️ Firestore-based direct fetch failed (sandboxed / guest-bypass) or timed out. Falling back to Node Express APIs:", fbErr);
        const [apiBrands, apiContacts, apiMeetings] = await Promise.all([
          fetch('/api/brands').then(res => res.json()),
          fetch('/api/contacts').then(res => res.json()),
          fetch('/api/meetings').then(res => res.json())
        ]);
        setBrands(apiBrands);
        setContacts(apiContacts);
        setMeetings(apiMeetings);
      }
      
      // Let's pretend calendar sync is fetched still
      fetch('/api/calendar/sync-status').then(r => r.json()).then(resSync => setSyncStatus(resSync));
    } catch (err) {
      console.error("Failed to refresh state data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const email = user.email || 'unknown';
          const isPlacenDomain = email.endsWith('@placen.co.kr');
          const isSuperAdmin = email === 'rudals5569@gmail.com';
          const userDocRef = doc(db, 'approved_users', email);
          
          let userRoleResult = 'Sales_Rep';
          try {
            const userDoc = await withTimeout(getDoc(userDocRef), 1500);
            if (userDoc.exists()) {
              userRoleResult = userDoc.data()?.role || 'Sales_Rep';
            } else {
              // Auto-approve the internal users and the primary admin
              const defaultRole = isSuperAdmin ? 'Admin' : 'Sales_Rep';
              setDoc(userDocRef, { approvedAt: new Date().toISOString(), role: defaultRole }).catch(err => {
                console.warn("Background auto-approval user document write failed:", err);
              });
              userRoleResult = defaultRole;
            }
          } catch (fbErr) {
            console.warn("⚠️ Firestore direct auth document check failed/timed out. Falling back to default role setup based on email:", fbErr);
            userRoleResult = isSuperAdmin ? 'Admin' : 'Sales_Rep';
          }
          
          setUserRole(userRoleResult as any);
          setIsLoggedIn(true);
          setLoginEmail(email);
        } catch(err) {
           console.error("Auth verification failed:", err);
           alert('인증 확인 중 오류가 발생했습니다.');
           await firebaseLogout();
        }
      } else {
        setIsLoggedIn(false);
        setLoginEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  // Load backend seed data on mount and subscribe to real-time meeting updates
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchInitial = async () => {
      await refreshAllStates();
    };
    fetchInitial();

    console.log("🔌 [REALTIME SYNC] Initiating socket-like onSnapshot observer for Firestore meetings...");
    const meetingsCollection = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCollection, (snapshot) => {
      const updatedMeetings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Meeting));
      setMeetings(updatedMeetings);
      console.log(`🔌 [REALTIME SYNC] Synchronized ${updatedMeetings.length} meetings in real-time.`);
    }, (error) => {
      console.warn("⚠️ Real-time Firestore onSnapshot observer skipped (bypassed / no permission):", error);
    });

    return () => {
      console.log("🔌 [REALTIME SYNC] Unsubscribed from real-time meetings observer.");
      unsubscribeMeetings();
    };
  }, [isLoggedIn]);

  // Phase 7 Real-time Notifications & Polling fallback with Server-Sent Events
  useEffect(() => {
    // 1. Fetch initial in-app notifications
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data && data.notifications) {
            setNotifications(data.notifications);
          }
        }
      } catch (err) {
        console.warn("Could not fetch notifications initially.", err);
      }
    };
    fetchNotifications();

    // 2. Open standard EventSource channel for push messages
    console.log("🔌 [SSE CONNECT] Establishing real-time notification gateway...");
    const eventSource = new EventSource('/api/notifications/sse');

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        console.log("🔔 [SSE RECEIVED] Real-time notification pushed successfully:", newNotif);
        // Prepend so that newest appears first!
        setNotifications(prev => [newNotif, ...prev]);
      } catch (err) {
        console.error("Failed to parse incoming real-time push payload:", err);
      }
    };

    eventSource.onerror = () => {
      console.log("SSE connection status reset. EventSource automatically handles reconnection.");
    };

    // 3. Keep a 5-second polling interval as fallback
    const pollingFallback = setInterval(fetchNotifications, 5000);

    return () => {
      console.log("🔌 [SSE DISCONNECT] Cleaning up real-time gateway link...");
      eventSource.close();
      clearInterval(pollingFallback);
    };
  }, []);

  // Mark single notification as read
  const handleReadNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Failed to mark single notification as read:", err);
    }
  };

  // Mark all notifications as read
  const handleReadAllNotifications = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // B2B CRM Global Intelligent autocomplete search trigger with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setIsSearchOpen(true);
        }
      } catch (err) {
        console.error("Autocomplete search dispatcher error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update Brand Status (CRM Kanban Board trigger - Phase 3 Core Requirement)
  const handleUpdateBrandStatus = async (id: string, newStatus: PipelineStatus) => {
    try {
      if (!isLoggedIn) return;
      
      try {
        const brandRef = doc(db, 'brands', id);
        await updateDoc(brandRef, { pipelineStatus: newStatus });
        setRbacError(null);
      } catch (fbErr) {
        console.warn("⚠️ Firestore client-side status update failed. Falling back to Node Express API:", fbErr);
        await fetch(`/api/brands/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole
          },
          body: JSON.stringify({ pipelineStatus: newStatus })
        });
      }
      
      setBrands(prev => prev.map(b => b.id === id ? { ...b, pipelineStatus: newStatus } : b));

      const logMeeting: any = {
        id: `meet-${Date.now()}`,
        brandId: id,
        title: `[시스템 동기화] 세일즈 파이프라인 수급 단계 변경: -> ${newStatus}`,
        dateTime: new Date().toISOString(),
        type: 'Offline',
        location: 'B2B CRM 칸반 보드 실시간 변경',
        pipelineStatus: newStatus,
        notes: `상무단 및 현장 관리 차트 동기화: 담당 영업 사원이 Trello 스마트 칸반 보드에서 해당 브랜드의 관계 가치를 직접 [${newStatus}] 단계로 레벨 업하였습니다.`,
        createdAt: new Date().toISOString(),
        ownerId: auth.currentUser?.uid || ''
      };

      try {
        const meetRef = doc(db, 'meetings', logMeeting.id);
        await setDoc(meetRef, logMeeting);
      } catch (fbErr) {
        console.warn("⚠️ Firestore client-side meeting creation failed, posting to local Express instead:", fbErr);
        await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole
          },
          body: JSON.stringify(logMeeting)
        });
      }

      setMeetings(prev => [logMeeting, ...prev]);
    } catch (err: any) {
      console.error("Failed to update brand status in Kanban Board:", err);
      if (err.code === 'permission-denied') {
        setRbacError("🔒 권한이 없습니다.");
      }
    }
  };

  // Update Brand Proposal Sub-stage (CRM deep tunnel tracking - Phase 9 Detail Funnel)
  const handleUpdateProposalSubStage = async (id: string, subStage: 'Draft' | 'Tech' | 'Negotiation' | 'Approval') => {
    try {
      if (!isLoggedIn) return;
      
      try {
        const brandRef = doc(db, 'brands', id);
        await updateDoc(brandRef, { proposalSubStage: subStage });
      } catch (fbErr) {
        console.warn("⚠️ Firestore client-side subStage update failed. Falling back to local Express API:", fbErr);
        await fetch(`/api/brands/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole
          },
          body: JSON.stringify({ proposalSubStage: subStage })
        });
      }
      
      setBrands(prev => prev.map(b => b.id === id ? { ...b, proposalSubStage: subStage } : b));

      const stageLabels: Record<string, string> = {
        Draft: '제안서 구성 및 송부 📄',
        Tech: '기술 정합성 검토 ⚙️',
        Negotiation: '제휴 요금 조건 조율 🤝',
        Approval: '최종 내부 기안 승인 ✍️'
      };

      const logMeeting: any = {
        id: `meet-sub-${Date.now()}`,
        brandId: id,
        title: `[협상 상세] 제안 및 조율 하위 마일스톤 격상: ${stageLabels[subStage] || subStage}`,
        dateTime: new Date().toISOString(),
        type: 'Offline',
        location: 'B2B CRM 내부 조율 프로세스',
        pipelineStatus: 'Proposal & Negotiation',
        notes: `제안 및 조율 단계 내 상세 기안 진행 이력: 협상 진척도가 [${stageLabels[subStage] || subStage}] 마일스톤으로 수동 업데이트되었습니다.`,
        createdAt: new Date().toISOString(),
        ownerId: auth.currentUser?.uid || ''
      };

      try {
        const meetRef = doc(db, 'meetings', logMeeting.id);
        await setDoc(meetRef, logMeeting);
      } catch (fbErr) {
        console.warn("⚠️ Firestore client-side meeting creation failed, posting to local Express instead:", fbErr);
        await fetch('/api/meetings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Role': userRole
          },
          body: JSON.stringify(logMeeting)
        });
      }

      setMeetings(prev => [logMeeting, ...prev]);
    } catch (err) {
      console.error("Failed to update proposal subStage:", err);
    }
  };

  const runTwoWayCalendarSync = async (accessToken: string) => {
    setIsSyncingCalendar(true);
    let importedCount = 0;
    let exportedCount = 0;

    try {
      // 1. Fetch events from Google Calendar
      const googleEvents = await listGoogleCalendarEvents(accessToken, 30);
      
      // Keep track of our local matches & new insertions
      const updatedLocalMeetings = [...meetings];

      // Step A: Import new meetings from Google Calendar to CRM if they match brands
      for (const evt of googleEvents) {
        const isAlreadySynced = meetings.some(m => m.googleEventId === evt.id);
        if (isAlreadySynced) continue;

        // Try to match brand name
        const matchedBrand = brands.find(b => 
          (evt.summary && evt.summary.toLowerCase().includes(b.name.toLowerCase())) ||
          (evt.description && evt.description.toLowerCase().includes(b.name.toLowerCase()))
        );

        if (matchedBrand) {
          const newMeetId = `gcal-${evt.id}`;
          const newMeet: Meeting = {
            id: newMeetId,
            brandId: matchedBrand.id,
            title: evt.summary || "구글 캘린더 연동 회의",
            dateTime: evt.start?.dateTime || evt.start?.date || new Date().toISOString(),
            type: evt.location ? 'Offline' : 'Online',
            location: evt.location || '회의실 / 온라인',
            googleMeetLink: evt.hangoutLink || '',
            pipelineStatus: matchedBrand.pipelineStatus,
            notes: evt.description || 'Google Calendar에서 가져옴',
            summary: 'Google Calendar로부터 자동 수신 및 동기화된 미팅입니다.',
            actionItems: [],
            googleEventId: evt.id,
            googleCalendarHtmlLink: evt.htmlLink
          };

          // Save new imported meeting to both local state and backend/Firestore
          try {
            await setDoc(doc(db, 'meetings', newMeetId), newMeet);
          } catch (e) {
            console.warn("Direct Firestore insert bypassed:", e);
          }

          await fetch('/api/meetings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-Role': userRole
            },
            body: JSON.stringify(newMeet)
          });

          updatedLocalMeetings.unshift(newMeet);
          importedCount++;
        }
      }

      // Step B: Export local meetings to Google Calendar if they aren't on calendar yet
      for (const m of meetings) {
        if (!m.googleEventId) {
          const brandObj = brands.find(b => b.id === m.brandId);
          const brandName = brandObj ? brandObj.name : '미지정';
          
          // Map hardcoded solution names as fallback
          const solutionNames: Record<string, string> = {
            'sol-1': '도도포인트 (Dodo Point)',
            'sol-2': '나우웨이팅 (Now Waiting)',
            'sol-3': '네이버예약 (Naver Booking)',
            'sol-4': '네이버커넥트 (Naver Connect)'
          };
          const solutionName = m.solutionId ? (solutionNames[m.solutionId] || '기본 솔루션') : '미지정';

          const createdGEvent = await createGoogleCalendarEvent(accessToken, {
            title: `${brandName ? `[${brandName}] ` : ''}${m.title}`,
            dateTime: m.dateTime,
            location: m.location,
            notes: m.notes,
            department: m.department,
            solutionName: solutionName
          });

          if (createdGEvent) {
            const updatedProps = {
              googleEventId: createdGEvent.id,
              googleCalendarHtmlLink: createdGEvent.htmlLink,
              googleMeetLink: createdGEvent.hangoutLink || m.googleMeetLink || ''
            };

            try {
              await updateDoc(doc(db, 'meetings', m.id), updatedProps);
            } catch (e) {
              console.warn("Direct Firestore update bypassed:", e);
            }

            await fetch(`/api/meetings/${m.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'X-User-Role': userRole
              },
              body: JSON.stringify(updatedProps)
            });

            exportedCount++;
          }
        }
      }

      await refreshAllStates();
      alert(`구글 캘린더 양방향 동기화 완수!\n- 가져온 일정: ${importedCount}건\n- 업로드한 일정: ${exportedCount}건`);
    } catch (error) {
      console.error("Failed inside runTwoWayCalendarSync:", error);
      alert("동기화 처리 과정 중 오류가 발생했습니다.");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Sync Google Calendar handler
  const handleCalendarSync = async () => {
    let currentToken = googleAccessToken;

    if (!currentToken) {
      const confirmConnect = confirm("구글 캘린더와 실시간 양방향 연동을 수행하기 위해 Google 계정 토큰 갱신 및 접근 승인이 필요합니다. 연동을 시작할까요?");
      if (!confirmConnect) {
        // Fallback simulator sync directly on local Express db
        setIsSyncingCalendar(true);
        try {
          const res = await fetch('/api/calendar/sync', { 
            method: 'POST',
            headers: { 'X-User-Role': userRole }
          });
          const newStatus = await res.json();
          setSyncStatus(newStatus);
          alert("구글 계정 연동을 건너뛰고 로컬 데이터 시뮬레이셔널 동기화로 진행했습니다.");
        } catch (simErr) {
          console.error(simErr);
        } finally {
          setIsSyncingCalendar(false);
        }
        return;
      }

      try {
        const loginRes = await loginWithGoogle();
        if (loginRes && loginRes.accessToken) {
          setGoogleAccessToken(loginRes.accessToken);
          currentToken = loginRes.accessToken;
        } else {
          alert("승인 실패 또는 토큰을 획득하지 못했습니다.");
          return;
        }
      } catch (err) {
        console.error("Sign in failed:", err);
        alert("원터치 로그인 연동 과정에 실패했습니다.");
        return;
      }
    }

    if (currentToken) {
      await runTwoWayCalendarSync(currentToken);
    }
  };

  // Submit newly discovered Outbound Brand
  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandForm.name.trim()) {
      alert("브랜드명을 기입해주세요.");
      return;
    }
    try {
      const response = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole
        },
        body: JSON.stringify(newBrandForm)
      });

      if (response.ok) {
        setRbacError(null);
        const result = await response.json();
        
        // Add brand and potentially select it
        if (result.brand) {
          setSelectedBrandId(result.brand.id);
        }

        // Close form and reset
        setIsAddingBrand(false);
        setNewBrandForm({
          name: '',
          category: 'F&B Brand' as any,
          headquarters: '',
          description: '',
          targetStoresCount: 5,
          monthlyRevenueEst: '월 평균 1억원 규모 예상',
          pipelineStatus: 'Cold Call' as any,
          contactName: '',
          contactRole: '브랜드 본사 담당자' as any,
          contactPosition: '담당 바이어',
          contactPhone: '',
          contactEmail: ''
        });

        alert("📥 [아웃바운드 영업 기회 추가] 새 브랜드 프로필과 담당 바이어, 4대 교차 제품군 영업 파이프라인이 즉시 가동되었습니다!");

        // Refresh state
        await refreshAllStates();
        fetchAuditLogs();
      } else {
        const errData = await response.json();
        alert(`에러: ${errData.error || "브랜드 등록에 실패했습니다."}`);
      }
    } catch (err) {
      console.error("Failed to submit new outbound brand:", err);
      alert("브랜드 등록 중 오류가 발생했습니다.");
    }
  };

  // Submit new meeting schedule
  const handleMeetingSubmit = async (data: any) => {
    try {
      let finalData = { ...data };

      if (googleAccessToken) {
        const brandObj = brands.find(b => b.id === data.brandId);
        const brandName = brandObj ? brandObj.name : '미지정';
        
        const solutionNames: Record<string, string> = {
          'sol-1': '도도포인트 (Dodo Point)',
          'sol-2': '나우웨이팅 (Now Waiting)',
          'sol-3': '네이버예약 (Naver Booking)',
          'sol-4': '네이버커넥트 (Naver Connect)'
        };
        const solutionName = data.solutionId ? (solutionNames[data.solutionId] || '기본 솔루션') : '미지정';

        const createdGEvent = await createGoogleCalendarEvent(googleAccessToken, {
          title: `${brandName ? `[${brandName}] ` : ''}${data.title}`,
          dateTime: data.dateTime,
          location: data.location,
          notes: data.notes,
          department: data.department,
          solutionName: solutionName
        });

        if (createdGEvent) {
          finalData = {
            ...finalData,
            googleEventId: createdGEvent.id,
            googleCalendarHtmlLink: createdGEvent.htmlLink,
            googleMeetLink: createdGEvent.hangoutLink || ''
          };
        }
      }

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Role': userRole
        },
        body: JSON.stringify(finalData)
      });
      if (response.ok) {
        setRbacError(null);
        const result = await response.json();
        
        // Load target meeting
        setMeetings(prev => [result, ...prev]);
        setIsAddingMeeting(false);
        fetch('/api/contacts').then(r => r.json()).then(data => setContacts(data));

        if (result.warning) {
          setCrossSellingWarning(result.warning);
          // Auto scroll to top of details column where the alarm banner is shown
          window.scrollTo({ top: 300, behavior: 'smooth' });
        } else {
          setCrossSellingWarning(null);
          alert(`구글 캘린더에 일정이 동기화되었으며, 전송이 완료되었습니다 ${result.googleMeetLink ? '\n(Google Meet 참여방 자동 탑재 완료)' : ''}`);
        }

        // Hard refresh states to load solutions updating
        await refreshAllStates();
        setSync360Trigger(prev => prev + 1);
        fetchAuditLogs();
      } else if (response.status === 403) {
        const errData = await response.json();
        setRbacError(errData.error || "🔒 일정 추가 권한이 없습니다.");
      }
    } catch (err) {
      console.error("Error creating meeting:", err);
    }
  };

  // Delete specific meeting
  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("해당 세일즈 미팅 이력을 캘린더 및 CRM 목록에서 영구 삭제하시겠습니까?")) return;
    try {
      // Find meeting to check for googleEventId
      const meet = meetings.find(m => m.id === id);
      if (meet && meet.googleEventId && googleAccessToken) {
        // Run silent calendar event deletion in the background
        deleteGoogleCalendarEvent(googleAccessToken, meet.googleEventId).catch(err => {
          console.warn("Failed to delete Google Calendar associated event:", err);
        });
      }

      const response = await fetch(`/api/meetings/${id}`, { 
        method: 'DELETE',
        headers: {
          'X-User-Role': userRole
        }
      });
      if (response.ok) {
        setRbacError(null);
        setMeetings(prev => prev.filter(m => m.id !== id));
        fetchAuditLogs();
      } else if (response.status === 403) {
        const errData = await response.json();
        setRbacError(errData.error || "🔒 삭제 권한이 제한되어 있습니다.");
      }
    } catch (err) {
      console.error("Delete meeting failed:", err);
    }
  };

  // Secure CSV Report Exporter with RBAC and Activity Logging feedback
  const handleExportCsv = async () => {
    setIsExporting(true);
    setRbacError(null);
    try {
      const response = await fetch(`/api/export-csv?role=${userRole}`);
      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json();
          setRbacError(errData.error || "🔒 보고서 추출 권한이 제한되어 있습니다.");
          return;
        }
        throw new Error("Failed to export report");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `B2B_CRM_Leads_Report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      fetchAuditLogs();
    } catch (err) {
      console.error("CSV report export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // AI Voice Record summary receiver
  const handleSummaryGenerated = (transcript: string, summary: string, actionItems: string[]) => {
    setAiAnalysisResult({ transcript, summary, actionItems });

    // Suggest saving this to the latest meeting
    const filteredMeetings = meetings.filter(m => m.brandId === selectedBrandId);
    if (filteredMeetings.length > 0) {
      const latestMeetingId = filteredMeetings[0].id;
      // Let's auto patch the latest associated meeting
      fetch(`/api/meetings/${latestMeetingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: transcript,
          summary: summary,
          actionItems: actionItems
        })
      }).then(res => res.json())
        .then(updated => {
          setMeetings(prev => prev.map(m => m.id === latestMeetingId ? updated : m));
        });
    }
  };

  const getPipelineProgress = (status: PipelineStatus) => {
    switch(status) {
      case 'Cold Call': return { text: '콜드콜', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'First Meeting': return { text: '첫 대면 미팅', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'Proposal & Negotiation': return { text: '도입 제안 및 조율', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'Deal Completed': return { text: '계약 완료 🏆', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  const getPipelineIndex = (status: PipelineStatus) => {
    const sequence: PipelineStatus[] = ['Cold Call', 'First Meeting', 'Proposal & Negotiation', 'Deal Completed'];
    return sequence.indexOf(status);
  };

  const pipelineStages: { name: string; label: PipelineStatus }[] = [
    { name: '콜드콜', label: 'Cold Call' },
    { name: '첫 미팅', label: 'First Meeting' },
    { name: '도입 제안', label: 'Proposal & Negotiation' },
    { name: '계약 완료', label: 'Deal Completed' }
  ];

  // Active highlighted Brand elements
  const activeBrand = brands.find(b => b.id === selectedBrandId) || brands[0];
  const activeContacts = contacts.filter(c => c.brandId === selectedBrandId);
  const activeMeetings = meetings.filter(m => m.brandId === selectedBrandId);

  // Quick stat helpers
  const totalFnb = brands.filter(b => b.category === 'F&B Brand').length;
  const totalRetail = brands.filter(b => b.category === 'Non-food Brand').length;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginRes = await loginWithGoogle();
      if (loginRes && loginRes.accessToken) {
        setGoogleAccessToken(loginRes.accessToken);
      }
    } catch (err) {
      console.error(err);
      alert('로그인에 실패했습니다.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Ambient background glows for glassmorphism layout depth */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#03C75A]/10 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-400/8 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="glass-card p-8 rounded-[36px] max-w-sm w-full space-y-6 relative z-10 shadow-xl text-center animate-fadeIn border border-white/50">
          <div className="space-y-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-[#03C75A] to-[#10b981] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-[#03C75A]/25">
              <Building2 className="w-6.5 h-6.5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">B2B Sales CRM</h1>
            <p className="text-xs text-slate-500 font-bold leading-normal">영업 파이프라인 관리 시스템 로그인</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-3 pt-1">
            <button 
              type="submit"
              className="w-full py-4 bg-[#03C75A] hover:bg-[#029a45] active:scale-[0.98] text-white rounded-2xl font-black text-xs sm:text-[13px] tracking-wide transition-all shadow-md shadow-[#03C75A]/20 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity="0.85"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor" opacity="0.7"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity="0.9"/>
              </svg>
              <span>Google 계정으로 로그인</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                setIsLoggedIn(true);
                setLoginEmail('rudals5569@gmail.com');
                setUserRole('Admin');
              }}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 rounded-2xl font-extrabold text-xs sm:text-[13px] tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200/60"
            >
              <span>데모 모드로 바로 시작하기 ⚡</span>
            </button>
          </form>
          
          <div className="border-t border-slate-200/50 pt-4">
            <p className="text-center text-[10px] text-slate-400 font-bold tracking-wider">
              © 2026 Sales CRM System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col antialiased">
      
      {/* Dynamic Brand CRM Navigation Ribbon */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-50/75 px-4 py-2.5 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-2 bg-blue-500/10 rounded-xl">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 sm:text-base">
              B2B Brand Sales CRM
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">영업팀 전용 구글 연동 및 AI 회의 요약</p>
          </div>
        </div>

        {/* Global Combined Intelligent Search bar (Phase 7 Core Requirement) */}
        <div className="hidden md:flex relative flex-1 max-w-sm lg:max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="파트너 브랜드명, 담당 바이어, 회의 키워드 통합 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full text-xs pl-9 pr-8 py-2 bg-slate-100 hover:bg-slate-200/60 focus:bg-white focus:ring-2 focus:ring-indigo-505/20 focus:border-indigo-500 rounded-xl border border-transparent transition-all outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown suggestions */}
          {isSearchOpen && searchResults && (
            <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200/85 rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
              <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">통합 Intelligent 검색 결과</span>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="text-[10px] text-[#4F46E5] hover:text-indigo-600 font-extrabold"
                >
                  닫기
                </button>
              </div>

              {/* Brands results */}
              {searchResults.brands.length > 0 && (
                <div className="p-2 border-b border-slate-100 bg-slate-50/30">
                  <span className="text-[9px] font-bold text-slate-400 px-2 block mb-1">🏬 거래처 브랜드 ({searchResults.brands.length})</span>
                  {searchResults.brands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrandId(brand.id);
                        setIsDrawerOpen(true);
                        setIsSearchOpen(false);
                      }}
                      className="w-full text-left font-sans text-xs px-2.5 py-1.5 hover:bg-white hover:shadow-2xs rounded-lg flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span className="font-bold text-slate-800">{brand.name}</span>
                      <span className="text-[8px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{brand.pipelineStatus}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Contacts results */}
              {searchResults.contacts.length > 0 && (
                <div className="p-2 border-b border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 px-2 block mb-1">👤 담당 바이어 ({searchResults.contacts.length})</span>
                  {searchResults.contacts.map(contact => {
                    const br = brands.find(b => b.id === contact.brandId);
                    return (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setSelectedBrandId(contact.brandId);
                          setIsDrawerOpen(true);
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left font-sans text-xs px-2.5 py-1.5 hover:bg-slate-50 rounded-lg flex flex-col transition-all cursor-pointer"
                      >
                        <div className="flex justify-between w-full">
                          <span className="font-bold text-slate-800">{contact.name} ({contact.position})</span>
                          {br && <span className="text-[8px] font-bold text-indigo-500">{br.name}</span>}
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">{contact.email}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Meetings results */}
              {searchResults.meetings.length > 0 && (
                <div className="p-2 bg-slate-50/20">
                  <span className="text-[9px] font-bold text-slate-400 px-2 block mb-1">📅 회의록 및 액션아이템 ({searchResults.meetings.length})</span>
                  {searchResults.meetings.map(meet => {
                    const br = brands.find(b => b.id === meet.brandId);
                    return (
                      <button
                        key={meet.id}
                        onClick={() => {
                          setSelectedBrandId(meet.brandId);
                          setIsDrawerOpen(true);
                          setIsSearchOpen(false);
                        }}
                        className="w-full text-left font-sans text-xs px-2.5 py-1.5 hover:bg-white hover:shadow-2xs rounded-lg flex flex-col transition-all cursor-pointer"
                      >
                        <div className="flex justify-between w-full">
                          <span className="font-bold text-slate-800 line-clamp-1">{meet.title}</span>
                          {br && <span className="text-[8px] font-bold text-indigo-500 shrink-0 ml-1">{br.name}</span>}
                        </div>
                        {meet.summary && (
                          <span className="text-[10px] text-slate-500 mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100 leading-relaxed font-sans">{meet.summary}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchResults.brands.length === 0 && searchResults.contacts.length === 0 && searchResults.meetings.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  ⚠️ 일치하는 단어가 없습니다. 키워드를 변경해 보십시오.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Action Handlers Area */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Zen Aesthetic Minimalist Switch (Subtraction Aesthetic) */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black tracking-tight border transition-all duration-300 select-none cursor-pointer ${
              isZenMode 
                ? 'bg-slate-900 border-slate-900 text-slate-100 shadow-md shadow-slate-905/20 scale-[1.02]' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-55'
            }`}
            title="불필요한 요소를 제거하고 여백과 주요 딜에만 집중하는 '덜어냄의 미학' 레이아웃을 활성화합니다."
          >
            <span className="relative flex h-2 w-2">
              {isZenMode && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isZenMode ? 'bg-emerald-500' : 'bg-slate-350'}`}></span>
            </span>
            <span>{isZenMode ? '덜어냄 🧘' : '기본 구성'}</span>
          </button>

          {/* Simulated user identity and logout */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 px-2 rounded-xl border border-slate-200 shadow-3xs">
            <ShieldAlert className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
            <span className="hidden xl:inline text-[9px] font-extrabold text-[#4F46E5] tracking-wider px-1.5 py-0.5">{loginEmail} ({userRole})</span>
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setLoginEmail('');
                setLoginPassword('');
              }}
              className="text-[9px] font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 ml-1 transition-all"
            >
              로그아웃
            </button>
          </div>
          
          {/* CSV Export Button (Phase 7 Core Requirement, updated with secure JS dispatch) */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border shadow-2xs transition-all select-none cursor-pointer ${
              isExporting 
                ? 'bg-slate-50 border-slate-100 text-slate-400' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title="CRM 전체 데이터 엑셀(CSV) 추출 다운로드"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'text-slate-350 animate-spin' : 'text-indigo-500'}`} />
            <span className="hidden lg:inline">{isExporting ? '추출중...' : '보고서 CSV 추출'}</span>
          </button>

          {/* In-App Bell Notification Dropdown Button (Phase 7 Core Requirement) */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all select-none cursor-pointer flex items-center justify-center animate-fadeIn"
            >
              <Bell className={`w-3.5 h-3.5 text-indigo-550 ${notifications.some(n => !n.isRead) ? 'animate-wiggle' : 'hover:animate-wiggle'}`} />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] flex items-center justify-center rounded-full ring-2 ring-white">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Notifications Menu list dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3.5 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-indigo-55/35 flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">실시간 인앱 알림 체널</span>
                  {notifications.some(n => !n.isRead) && (
                    <button
                      onClick={handleReadAllNotifications}
                      className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 bg-white px-2 py-0.5 rounded transition-all cursor-pointer"
                    >
                      모두 읽음
                    </button>
                  )}
                </div>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-sans">
                      체크인된 실시간 영업 뉴스 알림이 없습니다.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => handleReadNotification(notif.id)}
                        className={`p-3 font-sans text-xs hover:bg-slate-50 transition-all cursor-pointer relative ${!notif.isRead ? 'bg-indigo-50/20' : ''}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 justify-between">
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg ${
                            notif.type === 'pipeline' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100/50' 
                              : notif.type === 'action_item'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100/50'
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                          }`}>
                            {notif.type === 'pipeline' ? '파이프라인' : notif.type === 'action_item' ? '후속 미션' : '시스템'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-850 text-[11px] mb-0.5">{notif.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{notif.message}</p>
                        
                        {!notif.isRead && (
                          <span className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-[#4F46E5] rounded-full"></span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Global Google Calendar sync status button */}
          <button
            onClick={handleCalendarSync}
            disabled={isSyncingCalendar}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 disabled:opacity-50 transition-all select-none cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">구글 캘린더 동기화 ({syncStatus.syncedEventsCount})</span>
            <span className="lg:hidden">동기화 ({syncStatus.syncedEventsCount})</span>
          </button>
        </div>
      </header>

      {/* Corporate RBAC Security & Safety Enforcement Warn Banner */}
      {rbacError && (
        <div className="bg-[#FFF1F2] border-b border-rose-100 p-3 px-4 sm:px-6 flex items-center justify-between text-xs text-rose-800 animate-fadeIn">
          <div className="flex items-center gap-2 max-w-5xl">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-extrabold text-[#E11D48] bg-white border border-rose-200/50 px-1.5 py-0.5 rounded uppercase font-mono text-[9px] tracking-wider shrink-0">ACCESS RESTRICTED</span>
            <p className="font-semibold leading-relaxed text-[11px] sm:text-xs">{rbacError}</p>
          </div>
          <button 
            onClick={() => setRbacError(null)}
            className="text-[10px] bg-white border border-rose-200 text-[#E11D48] hover:text-rose-800 hover:bg-rose-100/30 px-2 py-1 rounded-lg transition-all font-black ml-4 shrink-0 cursor-pointer"
          >
            확인 ✕
          </button>
        </div>
      )}

      {/* View Mode Switching Ribbon */}
      <div className="glass-panel sticky top-[57px] z-30 border-b border-white/40 p-4 px-4 sm:px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#01893d] uppercase tracking-widest bg-[#dafbe4] px-2.5 py-1 rounded-md border border-[#a2f2bd]">
              <Sparkles className="w-3.5 h-3.5 text-[#03C75A] animate-pulse" />
              <span>세일즈 기회 다차원 시각화</span>
            </span>
            <h2 className="text-sm font-black text-slate-900 mt-1.5">
              {viewMode === 'profile' 
                ? '⏳ 대규모 프랜차이즈 영업 활동 및 AI 음성 원터치 피드' 
                : viewMode === 'pipeline' 
                ? '📋 B2B CRM 세일즈 파이프라인 Trello 칸반 대시보드' 
                : viewMode === 'audit'
                ? '🔒 B2B CRM 엔터프라이즈 보안 및 데이터 감사 이력 추적 (Audit Logs)'
                : viewMode === 'chatbot'
                ? '💬 RAG 기반 AI 영업 어시스턴트 (PostgreSQL pgvector 유사도 탐색)'
                : viewMode === 'admin'
                ? '🛠️ CRM 전사 데이터 마이그레이션 및 실시간 사용자 권한 통제 센터'
                : '📊 실시간 영업 활동 성과 및 파이프라인 전환율 분석'}
            </h2>
          </div>
          
          <div className="flex flex-wrap bg-slate-200/50 backdrop-blur-md p-1.5 rounded-2xl items-center gap-1 border border-black/5 select-none shrink-0 shadow-3xs">
            <button
              onClick={() => setViewMode('profile')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'profile'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>활동 타임라인</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'pipeline'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Trello className="w-3.5 h-3.5" />
              <span>세일즈 칸반</span>
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>영업 통계</span>
            </button>
            <button
              onClick={() => setViewMode('chatbot')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'chatbot'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI 영업 비서</span>
            </button>
            <button
              onClick={() => setViewMode('audit')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'audit'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>보안 감사 {userRole !== 'Sales_Rep' && auditLogs.length > 0 ? `(${auditLogs.length})` : ''}</span>
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black tracking-tight transition-all duration-250 cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-[#03C75A] text-white shadow-md shadow-[#03C75A]/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>어드민 & 마이그레이션</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'analytics' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 space-y-6">
          <SalesGamification 
            userRole={userRole} 
            onGoalCompleted={fetchAuditLogs} 
          />
          <div className="border-t border-slate-100/80 my-5" />
          <AnalyticsDashboard brands={brands} meetings={meetings} />
        </main>
      ) : viewMode === 'pipeline' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6">
          <PipelineBoard 
            brands={brands}
            meetings={meetings}
            isLoading={loading}
            onUpdateBrandStatus={handleUpdateBrandStatus}
            onSelectBrand={(id) => {
              setSelectedBrandId(id);
              setIsDrawerOpen(true);
            }}
            onRefreshNeeded={refreshAllStates}
            onUpdateProposalSubStage={handleUpdateProposalSubStage}
            isZenMode={isZenMode}
          />
        </main>
      ) : viewMode === 'audit' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn">
          <AuditLogTimeline 
            userRole={userRole}
            auditLogs={auditLogs}
            onRefresh={fetchAuditLogs}
          />
        </main>
      ) : viewMode === 'chatbot' ? (
        <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn font-sans">
          <AIChatbot 
            userRole={userRole}
            onSelectBrand={(id) => {
              setSelectedBrandId(id);
              setIsDrawerOpen(true);
            }}
          />
        </main>
      ) : viewMode === 'admin' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn">
          <AdminPanel
            brands={brands}
            contacts={contacts}
            meetings={meetings}
            userRole={userRole}
            onChangeUserRole={(newRole) => setUserRole(newRole)}
            currentUserEmail={loginEmail}
            onRefreshCrmState={refreshAllStates}
            auditLogsCount={auditLogs.length}
          />
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left column - Brand Directory Picker & Stats Panel (Large/Desktop 4 columns) */}
        <section className="lg:col-span-4 space-y-4">
          
          {/* Quick Metrics (Pastel styling) - Hiding in Zen Mode for maximum breathing room and subtracted aesthetic */}
          {!isZenMode && (
            <div className="grid grid-cols-2 gap-3.5 animate-fadeIn">
              <div className="bg-[#EEF2FF] border border-blue-105 p-3 rounded-2xl">
                <span className="text-[10px] uppercase font-extrabold text-blue-600 tracking-wider">주요 카테고리</span>
                <p className="text-xl font-black text-slate-850 mt-1">{totalFnb} F&B 브랜드</p>
                <div className="h-1 w-8 bg-blue-400 rounded-full mt-2" />
              </div>
              <div className="bg-[#FFF1F2] border border-pink-105 p-3 rounded-2xl">
                <span className="text-[10px] uppercase font-extrabold text-pink-600 tracking-wider">논푸드/리테일</span>
                <p className="text-xl font-black text-slate-850 mt-1">{totalRetail} 아웃렛 대상</p>
                <div className="h-1 w-8 bg-pink-400 rounded-full mt-2" />
              </div>
            </div>
          )}

          {/* Interactive Brand Directory Select Area */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-indigo-50">
              <div>
                <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest">실시간 영업 타겟</h3>
                <span className="text-[10px] text-slate-400 font-medium">총 {brands.length}개 계약 및 기회 발견</span>
              </div>
              <button
                onClick={() => setIsAddingBrand(!isAddingBrand)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all select-none cursor-pointer border border-indigo-100 shadow-3xs"
              >
                <Plus className="w-3 h-3 text-indigo-600" />
                <span>아웃바운드 발굴</span>
              </button>
            </div>

            {isAddingBrand && (
              <form onSubmit={handleBrandSubmit} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/60 space-y-3 animate-fadeIn">
                <div className="border-b border-slate-200 pb-1.5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                    <span>신규 아웃바운드 개척 등록</span>
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingBrand(false)} 
                    className="text-slate-400 hover:text-slate-650 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  {/* Brand Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">브랜드명 (필수)</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 런던 베이글 뮤지엄"
                      value={newBrandForm.name}
                      onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Category */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500">카테고리</label>
                      <select
                        value={newBrandForm.category}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, category: e.target.value as any })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="F&B Brand">F&B 외식</option>
                        <option value="Non-food Brand">제품/리테일</option>
                        <option value="Retail/Store">오프라인 스토어</option>
                        <option value="Franchise Partner">프랜차이즈 가맹</option>
                      </select>
                    </div>

                    {/* Pipeline status */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500">영업 초기 단계</label>
                      <select
                        value={newBrandForm.pipelineStatus}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, pipelineStatus: e.target.value as any })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="Cold Call">콜드콜 (Cold Call)</option>
                        <option value="First Meeting">첫 대면 미팅 약속</option>
                        <option value="Proposal & Negotiation">기안 조율 단계</option>
                        <option value="Deal Completed">계약 완료 🏆</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Target stores count */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500">타겟 매장 수</label>
                      <input
                        type="number"
                        min="1"
                        value={newBrandForm.targetStoresCount}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, targetStoresCount: Number(e.target.value) })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    {/* Revenue Est */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500">월 매출 규모</label>
                      <input
                        type="text"
                        placeholder="예: 월 6,000만원 예상"
                        value={newBrandForm.monthlyRevenueEst}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, monthlyRevenueEst: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Headquarters info */}
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500">본사 주소 / 본점 주소</label>
                    <input
                      type="text"
                      placeholder="예: 서울시 강남구 압구정로"
                      value={newBrandForm.headquarters}
                      onChange={(e) => setNewBrandForm({ ...newBrandForm, headquarters: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500">요약 설명 및 전략</label>
                    <textarea
                      placeholder="아웃바운드 영업 타겟 발굴 이유 기입"
                      value={newBrandForm.description}
                      onChange={(e) => setNewBrandForm({ ...newBrandForm, description: e.target.value })}
                      className="w-full text-[10px] p-2 bg-white border border-slate-200 rounded-lg focus:outline-none h-12 resize-none leading-tight"
                    />
                  </div>

                  {/* Optional contact info */}
                  <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1">
                    <span className="block text-[9px] font-black text-indigo-700 tracking-wider mb-1.5">👤 첫 담당 바이어 정보 (연동용)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="이름 (예: 김지훈 대리)"
                        value={newBrandForm.contactName}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactName: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="직책 (예: 브랜드 제휴 담당)"
                        value={newBrandForm.contactPosition}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactPosition: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <input
                        type="text"
                        placeholder="연락처 (예: 010-9999-0000)"
                        value={newBrandForm.contactPhone}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactPhone: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="이메일 주소"
                        value={newBrandForm.contactEmail}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactEmail: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsAddingBrand(false)}
                    className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 rounded-lg font-bold cursor-pointer transition-all text-[11px]"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold cursor-pointer transition-all text-[11px] flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>영업 등록</span>
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {loading ? (
                <div className="space-y-3 py-2">
                  <div className="p-3.5 border border-slate-100 bg-white rounded-2xl space-y-3 animate-pulse">
                    <div className="flex gap-2.5 items-center">
                      <div className="w-8 h-8 rounded-xl bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-3 w-28 bg-slate-150 rounded-md" />
                        <div className="h-2 w-16 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-100 rounded" />
                    <div className="h-2.5 w-full bg-slate-100 rounded-md" />
                  </div>
                  <div className="p-3.5 border border-slate-100 bg-white rounded-2xl space-y-3 animate-pulse">
                    <div className="flex gap-2.5 items-center">
                      <div className="w-8 h-8 rounded-xl bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-3 w-20 bg-slate-150 rounded-md" />
                        <div className="h-2 w-12 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                    <div className="h-0.5 bg-slate-100 rounded" />
                    <div className="h-2.5 w-full bg-slate-100 rounded-md" />
                  </div>
                </div>
              ) : (
                brands.map((b) => {
                  const isSelected = selectedBrandId === b.id;
                  const brandMeetings = meetings.filter(m => m.brandId === b.id);
                  const isCompleted = brandMeetings.some(m => m.pipelineStatus === 'Deal Completed');
                  
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBrandId(b.id);
                        // Clear active summaries to focus on other brands cleanly
                        setAiAnalysisResult(null);
                      }}
                      className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-slate-50 border-slate-150 ring-2 ring-indigo-150/50' 
                          : 'bg-white border-slate-100/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 flex items-center justify-center rounded-xl text-xs font-black shadow-xs ${
                            b.category === 'F&B Brand' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#FCE7F3] text-[#9D174D]'
                          }`}>
                            {b.logo}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{b.name}</h4>
                            <span className="text-[10px] text-slate-450 font-semibold">{b.category === 'F&B Brand' ? 'F&B 외식' : '제품 리테일'}</span>
                          </div>
                        </div>
                        {isCompleted && (
                          <span className="bg-emerald-105 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            계약완료
                          </span>
                        )}
                      </div>
                      
                      {(() => {
                        const lastContact = brandMeetings.length > 0 
                          ? new Date(Math.max(...brandMeetings.map(m => new Date(m.dateTime).getTime()))).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                          : '활동 이력 없음';
                        return (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-350 shrink-0" />
                              <span>최근 접촉: {lastContact}</span>
                            </span>
                            <span className="font-semibold text-emerald-800 shrink-0 bg-[#dafbe4] px-1.5 py-0.5 rounded border border-[#a2f2bd]">
                              본점 외 {b.targetStoresCount}개 매장
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right column - Spacious Workspace & Real-time AI activity dashboard (8 columns) */}
        {activeBrand ? (
          <section className="lg:col-span-8 space-y-5">

            {/* Cross-selling Warning Alert Banner when duplicated contacts are caught within 7 days */}
            {crossSellingWarning && (
              <div className="bg-amber-50 border border-amber-200/85 p-4 rounded-3xl flex items-start gap-3 shadow-6xs animate-pulse relative pr-10">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-955">⚠️ 교차 영업 부서 간 컨택 중복 경보</h4>
                  <p className="text-[11px] text-amber-800 font-bold leading-relaxed">{crossSellingWarning}</p>
                </div>
                <button 
                  onClick={() => setCrossSellingWarning(null)} 
                  className="absolute top-4 right-4 text-amber-600 hover:text-amber-800 text-xs font-extrabold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Core General CRM Activity Feed */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-indigo-50/55">
                <div>
                  <h3 className="font-bold text-slate-850 text-xs sm:text-sm">세일즈 히스토리 및 영림 피드</h3>
                  <p className="text-[10px] text-slate-450 font-semibold">시간과 관계 다차원을 통해 가맹 영업 진척도를 관리합니다. 가맹사를 선택하면 360° 상세 분석 정보를 확인할 수 있습니다.</p>
                </div>
                <button
                  onClick={() => setIsAddingMeeting(!isAddingMeeting)}
                  className="px-3 py-1.5 text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-6xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 세일즈 일정 생성</span>
                </button>
              </div>

              {loading ? (
                <SkeletonBrandMap />
              ) : (
                <BrandHistoryTimeline 
                  brands={brands} 
                  selectedBrandId={selectedBrandId} 
                  meetings={meetings}
                  onSelectBrand={(id) => {
                    setSelectedBrandId(id);
                    setIsDrawerOpen(true);
                  }} 
                />
              )}
            </div>
            
            {/* Target Detailed Card: Pastel theme details */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs relative overflow-hidden hidden">
              
              {/* Highlight background blobs for pastel warmth */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-105 rounded-full filter blur-3xl opacity-35 pointer-events-none" />
              <div className="absolute bottom-4 left-1/3 w-28 h-28 bg-emerald-105 rounded-full filter blur-3xl opacity-30 pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3.5">
                <div className="flex items-center gap-3">
                  <span className={`w-12 h-12 flex items-center justify-center rounded-2xl text-lg font-black shrink-0 ${
                    activeBrand.category === 'F&B Brand' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {activeBrand.logo}
                  </span>
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold mb-1 ${
                      activeBrand.category === 'F&B Brand' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                    }`}>
                      {activeBrand.category === 'F&B Brand' ? 'F&B Brand 가맹사' : '논푸드 리테일 체인'}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">{activeBrand.name}</h2>
                  </div>
                </div>

                {/* Main add scheduling button */}
                <button
                  onClick={() => setIsAddingMeeting(!isAddingMeeting)}
                  className="px-3.5 py-2 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>새 세일즈 일정 생성</span>
                </button>
              </div>

              {/* Dynamic Pipeline Tracker view (Korean instructions) */}
              <div className="pt-4 pb-1">
                <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3.5">영업 파이프라인 진행 상태 (Pipeline)</h4>
                
                {/* Visual steps bar */}
                <div className="grid grid-cols-4 gap-1.5 relative">
                  {pipelineStages.map((stage, idx) => {
                    // find latest meeting pipeline status index to highlight active path
                    let currentStatusIndex = 0;
                    if (activeMeetings.length > 0) {
                      currentStatusIndex = Math.max(...activeMeetings.map(m => getPipelineIndex(m.pipelineStatus)));
                    }
                    const isPassed = currentStatusIndex >= idx;
                    const isActive = currentStatusIndex === idx;

                    return (
                      <div key={idx} className="text-center space-y-2">
                        <div className={`h-2 rounded-full transition-all ${
                          isActive 
                             ? 'bg-blue-500 animate-pulse' 
                             : isPassed 
                             ? 'bg-blue-400' 
                             : 'bg-slate-100'
                        }`} />
                        <span className={`block text-[10px] font-bold ${
                          isActive ? 'text-blue-600 scale-105' : isPassed ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {stage.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50/60 p-3 rounded-2xl border border-slate-100 mb-3 text-center">
                    <div>
                      <h4 className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">추정 월 매출 규모</h4>
                      <p className="font-black text-[#01893d] mt-1 text-xs">{activeBrand.monthlyRevenueEst}</p>
                    </div>
                    <div className="border-l border-slate-200">
                      <h4 className="font-bold text-slate-400 text-[9px] uppercase tracking-wider">세일즈 타겟</h4>
                      <p className="font-black text-slate-800 mt-1 text-xs">본점 외 {activeBrand.targetStoresCount}개 지점</p>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-slate-400 text-[10px] uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-300" />
                    <span>본사 참고 주소: <span className="text-slate-500 font-medium select-all">{activeBrand.headquarters}</span></span>
                  </h4>
                  
                  <h4 className="font-bold text-slate-450 text-[10px] uppercase mt-3.5">브랜드 부가 설명</h4>
                  <p className="text-slate-500 mt-1 bg-slate-50/50 p-2 rounded-xl text-[11px] line-clamp-3">{activeBrand.description}</p>
                </div>

                <div className="bg-slate-50/40 p-3.5 rounded-2xl space-y-2.5">
                  <h4 className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5 pb-1 border-b border-slate-100">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>핵심 컨택포인트 / 키맨 ({activeContacts.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {activeContacts.map((contact) => (
                      <div key={contact.id} className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-800">{contact.name}</span>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border ${
                            contact.role === '브랜드 본사 담당자' 
                              ? 'bg-blue-50 border-blue-100 text-blue-700' 
                              : contact.role === 'VAN대리점'
                              ? 'bg-amber-50 border-amber-100 text-amber-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            {contact.role}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5 text-[10px] font-semibold">{contact.position}</p>
                        <div className="flex gap-2.5 mt-2.5 text-[10px] text-slate-600">
                          <span className="flex items-center gap-0.5 select-all text-slate-500 hover:text-slate-800">
                            <Phone className="w-3 h-3 text-slate-400" /> {contact.phone}
                          </span>
                          <span className="flex items-center gap-0.5 select-all text-slate-500 hover:text-slate-800">
                            <Mail className="w-3 h-3 text-slate-400" /> {contact.email}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Proposal & Negotiation Funnel Control Panel */}
            {activeBrand.pipelineStatus === "Proposal & Negotiation" && (
              <div className="bg-[#FFFBEB] border border-amber-200 p-5 rounded-3xl shadow-xs space-y-4 relative overflow-hidden animate-fadeIn">
                {/* Highlight backgrounds */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/60 rounded-full filter blur-xl opacity-40 pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-500 rounded-xl text-white shadow-3xs">
                      <Sparkles className="w-4 h-4 text-white" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-amber-950 text-xs sm:text-sm">핵심 협상 진척도 매니저 (Detailed Funnel)</h3>
                      <p className="text-[10px] text-amber-700 font-bold mt-0.5">최종 제휴 계약성사를 위한 상무단/실무 조건 조율 세부 단계</p>
                    </div>
                  </div>
                  
                  <span className="text-[9px] px-2.5 py-1 rounded-full font-black bg-amber-200 text-amber-800 shrink-0 self-start sm:self-auto uppercase tracking-wider shadow-6xs">
                     협상 조율 정합 가동 🎯
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 relative z-10 w-full overflow-hidden">
                  {[
                    { id: 'Draft', step: '01', title: '제안 성안 구성', desc: '고객 맞춤형 제안서 송부 및 검토 진행' },
                    { id: 'Tech', step: '02', title: '기술/포스 적합 협의', desc: '본사 단말 연동 설계 및 전결 규정 확인' },
                    { id: 'Negotiation', step: '03', title: '수수료 조건 조율', desc: '요금 정산 주기 및 마일스톤 분할 조율' },
                    { id: 'Approval', step: '04', title: '최종 내부 품의 승인', desc: 'B2B 본부 기안 승인 단말 및 SLA 인가' }
                  ].map((subStep) => {
                    const isCurrent = activeBrand.proposalSubStage === subStep.id;
                    const isCompleted = activeBrand.proposalSubStage 
                      ? ['Draft', 'Tech', 'Negotiation', 'Approval'].indexOf(subStep.id) <= ['Draft', 'Tech', 'Negotiation', 'Approval'].indexOf(activeBrand.proposalSubStage)
                      : false;

                    return (
                      <button
                        key={subStep.id}
                        onClick={() => handleUpdateProposalSubStage(activeBrand.id, subStep.id as any)}
                        className={`text-left p-3.5 rounded-2xl transition-all border flex flex-col justify-between min-h-[110px] select-none hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-6xs md:w-auto w-full ${
                          isCurrent 
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                            : isCompleted
                            ? 'bg-amber-100/80 border-amber-200/60 text-amber-900 hover:bg-amber-150/70'
                            : 'bg-white border-amber-250/20 text-slate-500 hover:bg-amber-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[8px] font-mono tracking-widest font-black ${isCurrent ? 'text-white/80' : 'text-amber-700'}`}>
                            STAGE {subStep.step}
                          </span>
                          {isCompleted && !isCurrent && (
                            <Check className="w-3.5 h-3.5 text-amber-600 font-black animate-scaleIn shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 text-wrap">
                          <h4 className={`text-[11.5px] font-black leading-tight tracking-tight ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                            {subStep.title}
                          </h4>
                          <p className={`text-[9.5px] leading-tight mt-1 line-clamp-2 font-medium ${isCurrent ? 'text-white/85' : 'text-slate-450'}`}>
                            {subStep.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Account 360-degree comprehensive visual hub is now mounted in the Right Slide-In Drawer */}

            {/* Collapsible Meeting addition scheduler form */}
            {isAddingMeeting && (
              <div className="transition-all duration-300 transform scale-100">
                <MeetingForm 
                  brands={brands}
                  contacts={contacts}
                  onSubmit={handleMeetingSubmit}
                  onCancel={() => setIsAddingMeeting(false)}
                />
              </div>
            )}

            {/* Smart Voice-to-Text Section (STT & Whisper Gemini Summarizer) */}
            <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2.5 border-b border-indigo-50/55">
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 bg-rose-50 text-rose-500 rounded-xl">
                    <Mic className="w-4 h-4 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">실사 대화 원터치 녹음 회의록</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">이동 중 스마트폰 특화: 자동 받아쓰기 및 AI 핵심 요약 추출</p>
                  </div>
                </div>
              </div>

              {/* Recorder UI Embedded */}
              <VoiceRecorder onSummaryGenerated={handleSummaryGenerated} />

              {/* Display AI Smart Analysis output if present */}
              {aiAnalysisResult && (
                <div className="bg-indigo-50/65 border border-indigo-150 p-4.5 rounded-2xl space-y-3.5 transition-all">
                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-800">
                    <Sparkles className="w-4 h-4 animate-spin-slow text-indigo-500" />
                    <span>Gemini 3.5-flash 정밀 오디오 분석 성공!</span>
                  </div>

                  {/* Transcript */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">실시간 받아쓰기 오디오 텍스트</span>
                    <p className="text-xs text-slate-655 bg-white p-3 rounded-xl border border-indigo-100/50 leading-relaxed font-sans">{aiAnalysisResult.transcript}</p>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">3줄 핵심 요약 및 쟁점</span>
                      <span className="bg-emerald-100 text-emerald-700 text-[8px] font-extrabold px-1.5 rounded">AUTO</span>
                    </div>
                    <p className="text-xs text-slate-800 bg-emerald-50/60 p-3 rounded-xl border border-emerald-150/65 font-bold leading-relaxed">{aiAnalysisResult.summary}</p>
                  </div>

                  {/* Action items */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-[#7C3AED] uppercase tracking-widest">후속 Action Items (마일스톤 태깅)</span>
                    <ul className="space-y-1.5 pt-1">
                      {aiAnalysisResult.actionItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Proactive AI: Follow-up Email Draft Box */}
                  <div className="pt-3 border-t border-slate-250/20 space-y-2.5">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">
                        Proactive AI: 밀착 세일즈 제언
                      </span>
                      {!emailDraft && (
                        <button
                          onClick={() => handleGenerateEmailDraft(activeBrand.name, aiAnalysisResult.summary, aiAnalysisResult.actionItems)}
                          disabled={isGeneratingEmail}
                          className="px-3 py-1 bg-[#4F46E5] text-white rounded-lg text-[10px] font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          {isGeneratingEmail ? "초안 작성 중..." : "📨 B2B 후속 감사 메일 자동 초안 생성"}
                        </button>
                      )}
                    </div>

                    {emailDraft && (
                      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-indigo-500/35 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-bold text-indigo-400">자동 추천 초안</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(emailDraft.body);
                                setCopiedEmail(true);
                                setTimeout(() => setCopiedEmail(false), 2000);
                              }}
                              className="text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition-all cursor-pointer"
                            >
                              {copiedEmail ? "✓ 복사 완료" : "📋 본문 복사"}
                            </button>
                            <a
                              href={`mailto:?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`}
                              className="text-[9px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded transition-all flex items-center gap-0.5"
                            >
                              🚀 메일 발송
                            </a>
                          </div>
                        </div>
                        <div className="space-y-1 text-left">
                          <p className="text-[10px] font-bold text-slate-350">제목: {emailDraft.subject}</p>
                          <p className="text-[10px] text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                            {emailDraft.body}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 text-center italic font-semibold pt-1">
                    ※ 분석된 회의록은 해당 브랜드의 가장 최근 세일즈 미팅 이력에 자동으로 안전 매핑 보관 완료되었습니다.
                  </div>
                </div>
              )}
            </div>

            {/* Integrated Sales Historical Meetings Timeline Section */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                <div>
                  <h3 className="font-bold text-slate-850 text-xs sm:text-sm">타임라인 미팅 히스토리</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">{activeBrand.name} 전속 이력 모음</p>
                </div>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  총 {activeMeetings.length}개 이력
                </span>
              </div>

              {activeMeetings.length > 0 ? (
                <div className="space-y-4.5">
                  {activeMeetings.map((meet, index) => {
                    const pipeInfo = getPipelineProgress(meet.pipelineStatus);
                    return (
                      <div key={meet.id} className="relative pl-6 pb-2.5 last:pb-0">
                        {/* Timeline vertical bar */}
                        {index !== activeMeetings.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100" />
                        )}
                        
                        {/* Timeline circle dot */}
                        <div className="absolute left-1.5 top-2 w-2.5 h-2.5 rounded-full bg-blue-300 border-2 border-white shadow-xs" />

                        <div className="bg-[#FAFBFD]/80 border border-slate-100 p-4 rounded-2xl hover:shadow-xs transition-all">
                          <div className="flex flex-wrap justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 border rounded-full ${pipeInfo.color}`}>
                                  {pipeInfo.text}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">
                                  {new Date(meet.dateTime).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 mt-2 text-xs sm:text-sm">{meet.title}</h4>
                            </div>

                            {/* Meeting Type Flag */}
                            <div className="flex items-center gap-1">
                              {meet.type === 'Online' ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1.5 rounded-xl">
                                  <Video className="w-3.5 h-3.5 text-blue-500" />
                                  <span>ONLINE MEET</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1.5 rounded-xl">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  <span>FIELD VISIT</span>
                                </span>
                              )}

                              {/* Delete button from Timeline */}
                              <button
                                onClick={() => handleDeleteMeeting(meet.id)}
                                className="p-1 px-1.5 text-slate-350 hover:text-red-500 rounded bg-slate-50 hover:bg-rose-50 border border-slate-50 hover:border-rose-100 transition-all cursor-pointer"
                                title="미팅 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Meeting specifics */}
                          <div className="mt-3 text-xs space-y-2">
                            {meet.type === 'Online' && meet.googleMeetLink && (
                              <div className="bg-emerald-50/60 p-2 rounded-xl flex items-center justify-between border border-emerald-110">
                                <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1">
                                  <Video className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>참석용 구글 미트 연결 링크</span>
                                </span>
                                <a 
                                  href={meet.googleMeetLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] font-extrabold text-emerald-600 hover:underline bg-white px-2 py-1 border border-emerald-250 rounded shadow-xs"
                                >
                                  입장하기
                                </a>
                              </div>
                            )}

                            {meet.location && meet.type === 'Offline' && (
                              <p className="text-slate-500 flex items-center gap-1 text-[11px] font-medium bg-slate-50/60 p-2 rounded-xl">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>장소: {meet.location}</span>
                              </p>
                            )}

                            {/* Standard text notes */}
                            {meet.notes && (
                              <div className="bg-slate-50/50 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase">미팅 쟁점 요약 (Raw Note)</span>
                                <p className="text-slate-600 font-medium text-[11px] leading-relaxed mt-1">{meet.notes}</p>
                              </div>
                            )}

                            {/* Real-time transcription, summary, or Action items inside the saved timeline record */}
                            {meet.summary && (
                              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                                <span className="text-[10px] text-emerald-700 font-extrabold uppercase flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>AI 핵심 회의록 정제 요약</span>
                                </span>
                                <p className="text-slate-800 font-bold text-[11px] leading-relaxed mt-1">{meet.summary}</p>
                              </div>
                            )}

                            {meet.actionItems && meet.actionItems.length > 0 && (
                              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 space-y-1.5">
                                <span className="text-[10px] text-indigo-700 font-extrabold uppercase">정밀 실천 수칙 (Action Items)</span>
                                <ul className="space-y-1">
                                  {meet.actionItems.map((ai, rawIdx) => (
                                    <li key={rawIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                                      <Check className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5 font-black" />
                                      <span>{ai}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ElegantEmptyState 
                  title="세일즈 미팅 히스토리가 존재하지 않습니다."
                  description="현장에서 나눈 따끈따끈한 회의 일정을 상단의 '새 세일즈 일정 생성' 단추를 눌러 등록하거나 원터치 녹음을 기동하여 보십시오."
                  iconType="meetings"
                />
              )}
            </div>
          </section>
        ) : (
          <section className="col-span-1 lg:col-span-8 flex items-center justify-center p-8 bg-white rounded-3xl border border-slate-150 shadow-3xs animate-fadeIn min-h-[500px]">
            <ElegantEmptyState 
              title="실시간 B2B 영업 타겟 브랜드 선택 수락대기"
              description="좌측 디렉토리 항목에서 임의의 F&B 매장이나 리테일 브랜드를 터치해 주십시오. 상세 계약 마일스톤, 연계 동선 맵, 협의 수칙 및 AI 보이스 비서가 기동합니다."
              iconType="analytics"
            />
          </section>
        )}
      </main>
      )}

      {/* Elegant minimalist platform footer */}
      <footer className="bg-white border-t border-slate-100 py-4.5 text-center text-[10px] text-slate-450 mt-10">
        <div>PropTech & B2B Brand Sales CRM Engine with Google Calendar Sync & Gemini STT</div>
        <div className="mt-1 text-slate-400">Copyright © 2026. Powered by AI Studio Deep End. All Rights Reserved.</div>
      </footer>

      {/* Elegant Slide-In Right Sheet Drawer with transparent glass backdrop */}
      <AnimatePresence>
        {isDrawerOpen && activeBrand && (
          <>
            {/* Elegant glassmorphic backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] z-40 cursor-pointer animate-fadeIn"
            />
            
            {/* Slide-in Sheet Drawer Edge */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-[92vw] sm:w-[500px] md:w-[550px] lg:w-[600px] bg-white border-l border-slate-150 shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-50 flex flex-col focus:outline-none"
            >
              <Brand360View 
                brand={activeBrand} 
                meetings={meetings} 
                userRole={userRole} 
                onRefreshMeetings={refreshAllStates} 
                syncTrigger={sync360Trigger}
                onClose={() => setIsDrawerOpen(false)}
                onUpdateProposalSubStage={handleUpdateProposalSubStage}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
