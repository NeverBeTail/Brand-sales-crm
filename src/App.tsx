import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Calendar, Phone, Mail, Mic, Sparkles, MapPin, 
  RefreshCw, CheckCircle, Video, Play, ArrowRight, Star, Plus, 
  Trash2, Layers, Award, FileText, ChevronRight, CheckCircle2, UserCheck,
  Check, Trello, BarChart3, Bell, Search, Download, ShieldAlert,
  Bot, ShieldCheck, Clock, Wrench, BookOpen
} from 'lucide-react';

// 타입
import type { Brand, Contact, Meeting, PipelineStatus, Solution, BrandSolution, ViewMode, AuditLog, NewBrandFormData, AIAnalysisResult, EmailDraft } from './types';

// 커스텀 훅
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { useCalendarSync } from './hooks/useCalendarSync';

// 유틸리티 & 상수
import { withTimeout, getPipelineProgress, getPipelineIndex } from './lib/utils';
import { PIPELINE_STAGES, SOLUTION_NAMES, VIEW_MODE_LABELS, INITIAL_BRAND_FORM, SUPER_ADMIN_EMAIL } from './constants';

// Firebase (일부 핸들러에서 직접 사용)
import { loginWithGoogle, logout as firebaseLogout, auth, db } from './lib/firebase';
import { deleteGoogleCalendarEvent } from './lib/googleCalendar';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

// 컴포넌트
import BrandHistoryTimeline from './components/BrandHistoryTimeline';
import MeetingForm from './components/MeetingForm';
import VoiceRecorder from './components/VoiceRecorder';
import PipelineBoard from './components/PipelineBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AuditLogTimeline from './components/AuditLogTimeline';
import SalesGamification from './components/SalesGamification';
import AIChatbot from './components/AIChatbot';
import AdminPanel from './components/AdminPanel';
import CommandPalette from './components/CommandPalette';
import { SkeletonBrandMap, ElegantEmptyState } from './components/PremiumComponents';
import Brand360View from './components/Brand360View';
import UserGuide from './components/UserGuide';
import PropertyDetail from './components/PropertyDetail';
import { motion, AnimatePresence } from 'motion/react';


export default function App() {
  // ── 핵심 데이터 상태 ──
  const [brands, setBrands] = useState<Brand[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [brandSolutions, setBrandSolutions] = useState<BrandSolution[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSynced: string | null; syncedEventsCount: number; isSyncing: boolean }>({
    lastSynced: null,
    syncedEventsCount: 0,
    isSyncing: false
  });

  // ── UI 상태 ──
  const [selectedBrandId, setSelectedBrandId] = useState<string>('brand-1');
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandForm, setNewBrandForm] = useState<NewBrandFormData>({ ...INITIAL_BRAND_FORM });
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // ── AI 분석 & 이메일 생성 ──
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [crossSellingWarning, setCrossSellingWarning] = useState<string | null>(null);
  const [sync360Trigger, setSync360Trigger] = useState(0);

  // ── 알림 ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // ── RBAC & 인증 ──
  const [userRole, setUserRole] = useState<'Admin' | 'Sales_Rep'>('Admin');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [rbacError, setRbacError] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  // ── 사용자 관리 ──
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const matchedProfile = approvedUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());

  const canEditPipeline = userRole === 'Admin' || (matchedProfile?.canEditPipeline !== undefined 
    ? !!matchedProfile.canEditPipeline 
    : false);

  const canUseAI = userRole === 'Admin' || (matchedProfile?.canUseAI !== undefined 
    ? !!matchedProfile.canUseAI 
    : true);

  const canViewAudit = userRole === 'Admin' || (matchedProfile?.canViewAudit !== undefined 
    ? !!matchedProfile.canViewAudit 
    : false);

  const canManageUsers = userRole === 'Admin' || (matchedProfile?.canManageUsers !== undefined 
    ? !!matchedProfile.canManageUsers 
    : false);

  const canExportCSV = userRole === 'Admin' || (matchedProfile?.canExportCSV !== undefined 
    ? !!matchedProfile.canExportCSV 
    : false);

  // Administrative User Addition (real Firestore database execution)
  const handleAdminAddUser = async (userObj: { 
    email: string; 
    name: string; 
    role: string; 
    team: string; 
    avatarUrl: string; 
    status?: string;
    canEditPipeline?: boolean;
    canUseAI?: boolean;
    canViewAudit?: boolean;
    canManageUsers?: boolean;
    canExportCSV?: boolean;
  }) => {
    try {
      const refinedFields = {
        name: userObj.name,
        role: userObj.role,
        team: userObj.team,
        avatarUrl: userObj.avatarUrl || '',
        status: userObj.status || 'Active',
        approvedAt: new Date().toISOString(),
        canEditPipeline: userObj.canEditPipeline !== undefined ? userObj.canEditPipeline : (userObj.role === 'Admin'),
        canUseAI: userObj.canUseAI !== undefined ? userObj.canUseAI : true,
        canViewAudit: userObj.canViewAudit !== undefined ? userObj.canViewAudit : (userObj.role === 'Admin'),
        canManageUsers: userObj.canManageUsers !== undefined ? userObj.canManageUsers : (userObj.role === 'Admin'),
        canExportCSV: userObj.canExportCSV !== undefined ? userObj.canExportCSV : (userObj.role === 'Admin')
      };
      await setDoc(doc(db, 'approved_users', userObj.email.trim().toLowerCase()), refinedFields);
      
      const newAudit = {
        id: `audit-user-add-${Date.now()}`,
        userId: loginEmail,
        userName: matchedProfile?.name || loginEmail,
        userRole: userRole,
        action: 'UPDATE_PIPELINE' as any,
        targetType: 'USER_ROLE',
        targetName: userObj.email,
        details: `신규 영업팀 구성원 권한 승인 등록 완료: ${userObj.name} (${userObj.role}, ${userObj.team})`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
    } catch (err) {
      console.error("Failed to register new coworker in Firestore:", err);
      throw err;
    }
  };

  // Administrative User Update (real Firestore database execution)
  const handleAdminUpdateUser = async (email: string, updatedFields: any) => {
    try {
      const targetEmail = email.trim().toLowerCase();
      const fieldsToSave: any = {
        name: updatedFields.name,
        role: updatedFields.role,
        team: updatedFields.team,
        avatarUrl: updatedFields.avatarUrl || ''
      };
      if (updatedFields.status !== undefined) {
        fieldsToSave.status = updatedFields.status;
      }
      if (updatedFields.canEditPipeline !== undefined) fieldsToSave.canEditPipeline = updatedFields.canEditPipeline;
      if (updatedFields.canUseAI !== undefined) fieldsToSave.canUseAI = updatedFields.canUseAI;
      if (updatedFields.canViewAudit !== undefined) fieldsToSave.canViewAudit = updatedFields.canViewAudit;
      if (updatedFields.canManageUsers !== undefined) fieldsToSave.canManageUsers = updatedFields.canManageUsers;
      if (updatedFields.canExportCSV !== undefined) fieldsToSave.canExportCSV = updatedFields.canExportCSV;
      
      await updateDoc(doc(db, 'approved_users', targetEmail), fieldsToSave);

      if (targetEmail === loginEmail.toLowerCase()) {
        if (updatedFields.role) {
          setUserRole(updatedFields.role);
        }
      }

      const newAudit = {
        id: `audit-user-upd-${Date.now()}`,
        userId: loginEmail,
        userName: matchedProfile?.name || loginEmail,
        userRole: userRole,
        action: 'UPDATE_PIPELINE' as any,
        targetType: 'USER_ROLE',
        targetName: email,
        details: `영업 구성원 프로필/역할/상태 설정 실시간 마이그레이션 적용 완료: ${updatedFields.name} (상태: ${updatedFields.status || 'Active'})`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
    } catch (err) {
      console.error("Failed to update coworker profiles in Firestore:", err);
      throw err;
    }
  };

  // Administrative User Deletion (real Firestore database execution)
  const handleAdminDeleteUser = async (email: string) => {
    try {
      const targetEmail = email.trim().toLowerCase();
      await deleteDoc(doc(db, 'approved_users', targetEmail));

      const newAudit = {
        id: `audit-user-del-${Date.now()}`,
        userId: loginEmail,
        userName: matchedProfile?.name || loginEmail,
        userRole: userRole,
        action: 'UPDATE_PIPELINE' as any,
        targetType: 'USER_ROLE',
        targetName: email,
        details: `영업 구성원 직급 권한 강제 파기 및 정지 완료: ${email}`,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
    } catch (err) {
      console.error("Failed to delete user mapping in Firestore:", err);
      throw err;
    }
  };

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
      
      // Fetch solutions and brandSolutions mapping for product-centric segmentation
      try {
        const [apiSolutions, apiBrandSolutions] = await Promise.all([
          fetch('/api/solutions').then(res => res.json()),
          fetch('/api/brand-solutions').then(res => res.json())
        ]);
        setSolutions(apiSolutions);
        setBrandSolutions(apiBrandSolutions);
      } catch (solErr) {
        console.warn("⚠️ Failed to fetch solutions or brandSolutions mappings:", solErr);
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
              const uData = userDoc.data();
              if (uData?.status === 'Inactive') {
                setRbacError("🚫 비활성화된 계정입니다. 해당 서비스 로그인 권한이 제한되었습니다. 최고 관리자에게 문의하세요.");
                setIsLoggedIn(false);
                setLoginEmail('');
                await firebaseLogout();
                return;
              }
              userRoleResult = uData?.role || 'Sales_Rep';
            } else {
              // Auto-approve the internal users and the primary admin
              const defaultRole = isSuperAdmin ? 'Admin' : 'Sales_Rep';
              setDoc(userDocRef, { approvedAt: new Date().toISOString(), role: defaultRole, status: 'Active' }).catch(err => {
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

  // Reactive automatic real-time logout for deactivated sessions
  useEffect(() => {
    if (isLoggedIn && loginEmail && approvedUsers.length > 0) {
      const currentProfile = approvedUsers.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
      if (currentProfile && currentProfile.status === 'Inactive') {
        alert("🚫 관리자에 의해 계정이 즉각 비활성화되었습니다. 즉시 안전하게 로그아웃 조치됩니다.");
        setIsLoggedIn(false);
        setLoginEmail('');
        firebaseLogout();
      }
    }
  }, [approvedUsers, isLoggedIn, loginEmail]);

  // Load backend seed data on mount and subscribe to real-time sync across multiple collections
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchInitial = async () => {
      await refreshAllStates();
    };
    fetchInitial();

    console.log("🔌 [REALTIME SYNC] Initiating socket-like onSnapshot observers for multi-user collaboration...");
    
    // 1. Live Meetings Sync
    const meetingsCollection = collection(db, 'meetings');
    const unsubscribeMeetings = onSnapshot(meetingsCollection, (snapshot) => {
      const updatedMeetings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Meeting));
      setMeetings(updatedMeetings);
    }, (error) => {
      console.warn("⚠️ Real-time Firestore meetings sync unavailable:", error);
    });

    // 2. Live Brands Sync (real relationships, mutual tagging)
    const brandsCollection = collection(db, 'brands');
    const unsubscribeBrands = onSnapshot(brandsCollection, (snapshot) => {
      const updatedBrands = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Brand));
      setBrands(updatedBrands);
    }, (error) => {
      console.warn("⚠️ Real-time Firestore brands sync unavailable:", error);
    });

    // 3. Live Contacts Sync
    const contactsCollection = collection(db, 'contacts');
    const unsubscribeContacts = onSnapshot(contactsCollection, (snapshot) => {
      const updatedContacts = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
      setContacts(updatedContacts);
    }, (error) => {
      console.warn("⚠️ Real-time Firestore contacts sync unavailable:", error);
    });

    // 4. Live Logged in Users Sync (RBAC profile synchronizations)
    const usersCollection = collection(db, 'approved_users');
    const unsubscribeUsers = onSnapshot(usersCollection, (snapshot) => {
      const updatedUsers = snapshot.docs.map(d => ({ email: d.id, ...d.data() }));
      setApprovedUsers(updatedUsers);
    }, (error) => {
      console.warn("⚠️ Real-time Firestore approved_users sync unavailable:", error);
    });

    return () => {
      console.log("🔌 [REALTIME SYNC] Disconnecting socket-like Firestore observers.");
      unsubscribeMeetings();
      unsubscribeBrands();
      unsubscribeContacts();
      unsubscribeUsers();
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
      if (!canEditPipeline) {
        setRbacError("🔒 세일즈 칸반 가공(canEditPipeline) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요.");
        alert("🔒 세일즈 칸반 가공(canEditPipeline) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요.");
        return;
      }
      
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

  // Update Brand-Solution Status (Product-centric Kanban update - User requested segmentation)
  const handleUpdateBrandSolutionStatus = async (brandId: string, solutionId: string, newStatus: PipelineStatus) => {
    try {
      if (!isLoggedIn) return;
      if (!canEditPipeline) {
        setRbacError("🔒 세일즈 칸반 가공(canEditPipeline) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요.");
        alert("🔒 세일즈 칸반 가공(canEditPipeline) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요.");
        return;
      }

      const response = await fetch(`/api/brand-solutions/${brandId}/${solutionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': userRole
        },
        body: JSON.stringify({ pipelineStatus: newStatus })
      });

      if (response.ok) {
        setRbacError(null);
        await refreshAllStates();
      } else {
        throw new Error("Failed to update brand-product pipeline status");
      }
    } catch (err) {
      console.error("Failed to update brand solution status:", err);
      alert("프로덕트별 파이프라인 상태 변경 중 오류가 발생했습니다.");
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

  // Collapsible Sidebar, Density mode & Command Palette States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('isSidebarCollapsed');
    return saved === 'true';
  });
  const [densityMode, setDensityMode] = useState<'comfortable' | 'compact'>(() => {
    const saved = localStorage.getItem('densityMode');
    return saved === 'compact' ? 'compact' : 'comfortable';
  });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isSimulatingLeadFromApp, setIsSimulatingLeadFromApp] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);
  const [isSimulatingSlack, setIsSimulatingSlack] = useState(false);
  const [slackResult, setSlackResult] = useState<string | null>(null);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('isSidebarCollapsed', String(newVal));
      return newVal;
    });
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSimulateWebbookLeadFromApp = async () => {
    setIsSimulatingLeadFromApp(true);
    setWebhookResult(null);
    try {
      const potentialLeads = [
        { brandName: "에그드랍 (Egg Drop)", category: "F&B Brand", storesCount: 220, contactName: "유지혜 대리", description: "테이크아웃 전문 가맹점용 카카오 알림 연동 및 AI 상담 요약 툴 도입 단가 문의." },
        { brandName: "홍콩반점 0410", category: "F&B Brand", storesCount: 290, contactName: "배상철 실장", description: "백종원 소유 F&B 프랜차이즈 전점 주방 디스플레이 시스템(KDS) 통합 의뢰 문의." },
        { brandName: "메가MGC커피", category: "F&B Brand", storesCount: 3100, contactName: "안태양 이사", description: "전국 약 3,100여 개 세일즈 거래처 정합 관리에 필요한 CRM AI 피드백 툴 의뢰." },
        { brandName: "올리브영 (Olive Young)", category: "Non-food Brand", storesCount: 1300, contactName: "이서윤 과장", description: "B2B 가맹점 POS 데이터 백업 및 리얼타임 푸시 알람 동기 서비스 검증 제안." }
      ];
      const demoLead = potentialLeads[Math.floor(Math.random() * potentialLeads.length)];
      
      const response = await fetch("/api/webhooks/inbound-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer crm-inbound-lead-token-2026"
        },
        body: JSON.stringify({
          brandName: demoLead.brandName,
          category: demoLead.category,
          storesCount: demoLead.storesCount,
          contactName: demoLead.contactName,
          description: demoLead.description,
          contactPosition: "본사 신사업 추진 전략팀장",
          contactEmail: `inbound-${demoLead.brandName.replace(/[^a-zA-Z]/g, '').toLowerCase()}@partnership.co.kr`,
          phone: "010-4493-2949"
        })
      });

      if (response.ok) {
        setWebhookResult(`[인바운드 웹훅성공] '${demoLead.brandName}' 리드가 가입 유입되었습니다!`);
        await refreshAllStates();
        setNotifications(prev => [
          {
            id: 'webhook-sim-' + Date.now(),
            type: 'pipeline',
            title: `📥 백로그 웹훅 접수 알림`,
            message: `외장 폼(Typeform)으로부터 거래처 '${demoLead.brandName}' 가 Cold Call 단계로 가입 접수 완료되었습니다.`,
            isRead: false,
            createdAt: new Date().toISOString()
          },
          ...prev
        ]);
      } else {
        setWebhookResult("❌ 웹훅 유입 접수 실패 (인가 토큰 오류)");
      }
    } catch (err) {
      console.error(err);
      setWebhookResult("❌ 시뮬레이션 실패: 네트워크 연결 오류");
    } finally {
      setIsSimulatingLeadFromApp(false);
      setTimeout(() => setWebhookResult(null), 5000);
    }
  };

  const handleSimulateSlackApp = () => {
    setIsSimulatingSlack(true);
    setTimeout(() => {
      setSlackResult("🔔 슬랙 #sales-deal-room 채널로 파이프라인 변동 요약 JSON 전송 완료 (가상 시뮬레이션)");
      setIsSimulatingSlack(false);
      setNotifications(prev => [
        {
          id: 'slack-sim-' + Date.now(),
          type: 'system',
          title: `💬 Slack 연동 성공 알림`,
          message: `#sales-deal-room 채널로 계약 가치 및 실시간 알림 데이터가 전송되었습니다.`,
          isRead: false,
          createdAt: new Date().toISOString()
        },
        ...prev
      ]);
      setTimeout(() => setSlackResult(null), 5000);
    }, 700);
  };

  const renderBacklogDashboard = () => {
    return (
      <div className="space-y-6 font-sans max-w-7xl mx-auto px-4 py-2">
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <Wrench className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-905">📬 B2B CRM 연동 개발 로드맵 및 백로그 가두리</h3>
              <p className="text-xs text-slate-400 mt-1 lines-normal">
                본부 업무 몰입도를 높이고 프로덕션 환경을 깔끔하게 유지하기 위해, 미개발/외연 동기화(구글 캘린더, 슬랙 연동, 수동 인바운드 웹훅 유입) 통제 항목들은 백로그 지형에 안전하게 격리되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Calendar Sync Item */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-150">
                RELEASE DELAYED ⏳ (구글 양방향 캘린더)
              </span>
              <span className="text-xs text-slate-400 font-mono">Backlog #01</span>
            </div>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>동기 구글 캘린더 실시간 양방향 전송 체제</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              본부 미팅 선약이 완료되면, 담당 세일즈맨과 제휴사 담당자의 구글 캘린더에 실시간으로 일정을 전송하고 Google Meet 참여 URL을 자동 탑재해 줍니다.
            </p>
            
            <div className="border-t border-slate-100/80 pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Google 연동 상태:</span>
                {googleAccessToken ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    연결됨 (보안 토큰 유효)
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold">미연결</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {!googleAccessToken ? (
                  <button
                    onClick={async () => {
                      try {
                        const loginRes = await loginWithGoogle();
                        if (loginRes && loginRes.accessToken) {
                          setGoogleAccessToken(loginRes.accessToken);
                          alert("OAuth 2.0 구글 연동 완료!");
                        }
                      } catch (e) {
                        alert("연동 실패: " + e);
                      }
                    }}
                    className="w-full text-center py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-3xs transition-all"
                  >
                    Google OAuth 2.0 인증 갱신 및 토큰 가져오기 🔑
                  </button>
                ) : (
                  <button
                    onClick={() => setGoogleAccessToken(null)}
                    className="w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-xs rounded-xl cursor-pointer transition-all"
                  >
                    구글 연동 해제 (토큰 삭제)
                  </button>
                )}

                <button
                  onClick={handleCalendarSync}
                  disabled={isSyncingCalendar}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl font-black text-xs disabled:opacity-50 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                  <span>실시간 구글 캘린더 강제 수동 동기화 ({syncStatus.syncedEventsCount}건)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Lead Item */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-150">
                SANDBOX RUNNING 🧪 (인바운드 웹훅 유입)
              </span>
              <span className="text-xs text-slate-400 font-mono">Backlog #02</span>
            </div>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Typeform 외부 리드 유입 API 연동</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              본사 제휴 랜딩 및 외부 설문 입력창 접수 시 대외비 보안 토큰을 수반하여 가망 거래처의 성명, 매장 규모 등의 데이터가 자동으로 칸반 Cold Call 단계로 인바운드 접수 처리되는 구조입니다.
            </p>
            
            <div className="border-t border-slate-101 pt-4 space-y-2.5">
              <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[10px] font-mono text-slate-400 leading-normal overflow-x-auto">
                로컬 API: <code>/api/webhooks/inbound-lead</code>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSimulateWebbookLeadFromApp}
                  disabled={isSimulatingLeadFromApp}
                  className="w-full text-center py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-[#4F46E5] font-black text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingLeadFromApp ? 'animate-spin' : ''}`} />
                  <span>외부 리드 인바운드 웹훅 가상 유입 기동</span>
                </button>

                {webhookResult && (
                  <p className="text-[10px] text-indigo-600 text-center font-black bg-indigo-50/45 p-1.5 rounded-lg border border-indigo-150/40 animate-pulse">
                    {webhookResult}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Slack Webhook Item */}
          <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-3xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase bg-rose-50 text-rose-750 px-2.5 py-1 rounded-md border border-rose-150">
                PENDING SPEC ⏱️ (슬랙 실시간 채널 피드)
              </span>
              <span className="text-xs text-slate-400 font-mono">Backlog #03</span>
            </div>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span className="text-rose-500">⚡</span>
              <span>Slack Webhook 거래처 진전 현황 실시간 동보 전송</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              사내 특정 채널 (예: <code>#sales-deal-room</code>)로 빅딜 완료 혹은 파이프라인 협상 단계 가치가 실시간 변동될 때 영업 성과 비동기 푸시 알림을 자동 발송하는 기술입니다.
            </p>
            
            <div className="border-t border-slate-101 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="bg-slate-50/50 p-2.5 rounded-xl text-[10px] font-mono text-slate-400 leading-relaxed flex-1">
                Webhook URL: <code>https://hooks.slack.com/services/T00000000/B00000000/...</code>
              </div>

              <div className="shrink-0">
                <button
                  onClick={handleSimulateSlackApp}
                  disabled={isSimulatingSlack}
                  className="px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-extrabold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                >
                  <span>슬랙 가상 메신저 전송 테스트 {isSimulatingSlack ? '(추출...)' : '(Mock Webhook)'}</span>
                </button>
              </div>
            </div>

            {slackResult && (
              <p className="text-[10.5px] text-rose-700 font-extrabold bg-[#FFF1F2] border border-rose-200/50 p-2 rounded-xl text-center shadow-4xs animate-slideIn">
                {slackResult}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans bg-[#f0f4f0]">
        {/* Ambient background glows for premium glassmorphic depth */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#03C75A]/12 rounded-full filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1eca6b]/8 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="glass-card p-9 rounded-[32px] max-w-sm w-full space-y-6 relative z-10 shadow-2xl text-center animate-fadeIn border border-[#03C75A]/10">
          <div className="space-y-2">
            <div className="w-14 h-14 bg-gradient-to-tr from-[#03C75A] to-[#1eca6b] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#03C75A]/20">
              <Building2 className="w-6.5 h-6.5" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">B2B Sales CRM</h1>
            <p className="text-xs text-slate-400 font-bold leading-normal">영업 파이프라인 관리 시스템 로그인</p>
          </div>
          
          {rbacError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl p-4 text-[11px] font-bold text-left leading-relaxed animate-fadeIn">
              <span className="text-rose-500 font-black block mb-1">⚠️ 보안 통제 안내</span>
              {rbacError}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-3.5 pt-1">
            <button 
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-[#03C75A] to-[#02b351] hover:brightness-110 active:scale-[0.98] text-white rounded-2xl font-black text-xs sm:text-[13px] tracking-wide transition-all shadow-md shadow-[#03C75A]/15 flex items-center justify-center gap-2.5 cursor-pointer border border-[#03C75A]/25"
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
              className="w-full py-3.5 bg-white/40 hover:bg-white/60 hover:border-[#03C75A]/25 active:scale-[0.98] text-slate-700 rounded-2xl font-extrabold text-xs sm:text-[13px] tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#03C75A]/15"
            >
              <span>데모 모드로 바로 시작하기 ⚡</span>
            </button>
          </form>
          
          <div className="border-t border-[#03C75A]/10 pt-4">
            <p className="text-center text-[10px] text-slate-400 font-bold tracking-wider">
              © 2026 Sales CRM System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f0] text-slate-800 flex antialiased overflow-hidden font-sans">
      
      {/* 1. Collapsible Left Sidebar (LNB) for Desktop Work Speed & Context Retention */}
      <aside 
        className={`backdrop-blur-2xl bg-white/60 text-slate-500 border-r border-[#03C75A]/10 flex flex-col justify-between transition-all duration-300 z-30 shrink-0 select-none shadow-[4px_0_30px_rgba(3,199,90,0.06)] ${
          isSidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex flex-col">
          {/* Sidebar Header Title / logo */}
          <div className="p-4 border-b border-[#03C75A]/10 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#03C75A]/25 to-[#1eca6b]/25 rounded-xl text-[#03C75A] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-fadeIn">
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">
                  B2B Brand CRM
                </h1>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest font-mono mt-0.5">
                  CRM Node Enterprise
                </p>
              </div>
            )}
          </div>
 
          {/* Quick User Identity Badge */}
          <div className="p-3 border-b border-[#03C75A]/10 bg-white/40 flex items-center gap-2.5">
            {matchedProfile?.avatarUrl ? (
              <img 
                src={matchedProfile.avatarUrl} 
                alt={matchedProfile.name || loginEmail}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-lg object-cover border border-[#03C75A]/15 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-[#03C75A]/20 text-[#03C75A] border border-[#03C75A]/30 flex items-center justify-center font-black text-xs uppercase shadow-3xs shrink-0">
                {(matchedProfile?.name || loginEmail).charAt(0)}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex flex-col items-start leading-none animate-fadeIn truncate">
                <span className="text-[11px] font-black text-slate-800 truncate w-full">
                  {matchedProfile?.name || loginEmail.split('@')[0]}
                </span>
                <span className="text-[8px] font-black text-[#03C75A] bg-[#03C75A]/10 px-1.5 py-0.5 rounded border border-[#03C75A]/20 tracking-wide mt-1">
                  {matchedProfile?.role || userRole}
                </span>
              </div>
            )}
          </div>

          {/* Vertical Menu Navigation list */}
          <nav className="p-2.5 space-y-1">
            <button
              onClick={() => setViewMode('profile')}
              title="활동 타임라인 및 브랜드 리스트"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn">활동 타임라인</span>}
            </button>

            <button
              onClick={() => setViewMode('property-detail')}
              title="가맹 자산 상세 포트폴리오 및 키맨/상담 이력 조회"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'property-detail'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn flex items-center gap-1.5">자산 마스터 상세 <span className="text-[8px] uppercase font-mono px-1 bg-emerald-500 text-white font-extrabold rounded-md ml-0.5">detail</span></span>}
            </button>

            <button
              onClick={() => setViewMode('guide')}
              title="통합 CRM 사용 가이드 해설서"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'guide'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn flex items-center gap-1">사용설명 가이드 <span className="text-[8px] uppercase font-mono px-1 bg-rose-500 text-white font-extrabold rounded-md ml-0.5 animate-pulse">new</span></span>}
            </button>

            <button
              onClick={() => setViewMode('pipeline')}
              title="B2B CRM 세일즈 파이프라인 칸반 대시보드"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'pipeline'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <Trello className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn">세일즈 칸반</span>}
            </button>

            <button
              onClick={() => setViewMode('analytics')}
              title="영업 목표 실적 및 파이프라인 통계 분석"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn">영업 퀄리파이어</span>}
            </button>

            <button
              onClick={() => setViewMode('chatbot')}
              title="RAG 기반 AI 영업 비서 인앱 도우미"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'chatbot'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <Bot className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn flex items-center gap-1">AI 영업 비서 {!canUseAI && '🔒'}</span>}
            </button>

            <button
              onClick={() => setViewMode('audit')}
              title="보안 감사 이력 기록 로그 추적기"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'audit'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn flex items-center gap-1">보안 감사 {!canViewAudit && '🔒'}</span>}
            </button>

            <button
              onClick={() => setViewMode('admin')}
              title="전사 권한 할당 및 사용자 관리 통제소"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15 font-black'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn flex items-center gap-1">어드민 백앤드 {!canManageUsers && '🔒'}</span>}
            </button>

            {/* Specialized Roadmap / Sandbox view which contains Calendar Sync & Webhook simulation */}
            <button
              onClick={() => setViewMode('backlog')}
              title="백로그 로드맵 및 서드파티 통합 샌드박스"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewMode === 'backlog'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-650/15'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-white/5 font-medium'
              }`}
            >
              <Wrench className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fadeIn">연동대기 백로그 🧪</span>}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer with toggles and collapsible trigger */}
        <div className="p-3 border-t border-[#03C75A]/10 bg-white/40 space-y-3 shrink-0">
          {/* Collapsible trigger chevron button */}
          <button
            onClick={toggleSidebar}
            className="w-full h-8 flex items-center justify-center bg-white/50 hover:bg-white/70 text-slate-400 hover:text-slate-800 rounded-lg border border-[#03C75A]/10 transition-colors cursor-pointer font-black"
            title={isSidebarCollapsed ? "메뉴 보기 늘리기" : "메뉴 보기 줄이기"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            ) : (
              <div className="flex items-center gap-1 text-[10px] font-black tracking-tight text-slate-400">
                <span>◀ 사이드바 접기</span>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Container Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Compact Workspace Header */}
        <header className="bg-white/40 backdrop-blur-2xl border-b border-[#03C75A]/10 px-8 py-5.5 z-20 shrink-0 flex items-center justify-between shadow-[0_4px_24px_rgba(3,199,90,0.06)]">
          <div className="flex items-center gap-2 text-slate-350">
            {/* View indicators */}
            <span className="text-[10px] font-black text-[#03C75A] bg-[#03C75A]/10 border border-[#03C75A]/20 rounded-lg px-2.5 py-1 uppercase tracking-wider font-mono">
              STAGE
            </span>
            <span className="text-xs text-slate-500">/</span>
            <span className="text-xs font-black text-slate-900 leading-tight">
              {viewMode === 'profile' && '⏳ 실시간 프랜차이즈 거래 정합 피드'}
              {viewMode === 'guide' && '📚 B2B CRM 통합 사용 설명 가이드'}
              {viewMode === 'property-detail' && '🏢 B2B 가맹 자산 상세 포트폴리오'}
              {viewMode === 'pipeline' && '📋 CRM 영업 진행 칸반 보드'}
              {viewMode === 'analytics' && '📊 파이프라인 실적 계측기'}
              {viewMode === 'chatbot' && '💬 RAG AI 영업 컨설팅 센터'}
              {viewMode === 'audit' && '🔒 엔터프라이즈 보안 감사 기록'}
              {viewMode === 'admin' && '🛠️ 최고 관리자 설정 및 권한 통제'}
              {viewMode === 'backlog' && '📬 릴리즈 대기 백로그 & 개발 시뮬레이터'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Command Palette Trigger Input */}
            <button 
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center justify-between w-64 lg:w-80 px-3 py-2 bg-white/60 hover:bg-white/50 border border-[#03C75A]/12 rounded-xl transition-all text-slate-400 text-xs text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 text-[11px] font-medium">단축키 검색...</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/70 border border-[#03C75A]/15 rounded-lg shadow-4xs text-[8px] font-mono font-black text-slate-400">
                <span>⌘K</span>
              </div>
            </button>

            {/* Export CSV Report */}
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border bg-white/70 hover:bg-white/60 text-slate-800 border-[#03C75A]/12 transition-all cursor-pointer"
            >
              <Download className="w-3 h-3 text-[#03C75A]" />
              <span>{isExporting ? '추출중...' : 'CSV 추출'}</span>
            </button>

            {/* Notifications Alert Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 rounded-xl hover:bg-white/60 border border-[#03C75A]/12 transition-all select-none cursor-pointer flex items-center justify-center bg-white/50"
              >
                <Bell className="w-3.5 h-3.5 text-[#03C75A]" />
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-black text-[9px] flex items-center justify-center rounded-full ring-2 ring-white animate-pulse">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Notification contents panel */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white/70 border border-[#03C75A]/12 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans glass-panel">
                  <div className="p-3 bg-white/60 border-b border-[#03C75A]/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#03C75A] uppercase">알림 목록 ({notifications.filter(n => !n.isRead).length})</span>
                    <button
                      onClick={handleReadAllNotifications}
                      className="text-[9px] font-bold text-slate-400 hover:text-[#03C75A] bg-slate-850 border border-[#03C75A]/10 px-2 py-0.5 rounded"
                    >
                      전체 읽음
                    </button>
                  </div>
                  <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-5 text-center text-[10.5px] text-slate-400 font-bold">알림 피드가 비어있습니다.</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => handleReadNotification(n.id)}
                          className={`p-3 text-[10.5px] hover:bg-white/5 transition-all cursor-pointer relative ${!n.isRead ? 'bg-[#03C75A]/8' : ''}`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="font-bold text-slate-800">{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-400 leading-tight">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setLoginEmail('');
                setLoginPassword('');
              }}
              className="text-[10px] font-black text-rose-455 bg-rose-950/20 border border-rose-900/30 hover:bg-rose-900/40 rounded-xl px-2.5 py-1.5 transition-all cursor-pointer shadow-3xs"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Corporate RBAC Safety Warn Banner */}
        {rbacError && (
          <div className="bg-[#FFF1F2] border-b border-rose-100 p-3 px-5 flex items-center justify-between text-xs text-rose-800 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="font-extrabold text-[#E11D48] bg-white border border-rose-200/50 px-1.5 py-0.5 rounded uppercase font-mono text-[9px] tracking-wider shrink-0 font-sans">ACCESS RESTRICTED</span>
              <p className="font-semibold text-[11px] sm:text-xs leading-relaxed font-sans">{rbacError}</p>
            </div>
            <button 
              onClick={() => setRbacError(null)}
              className="text-[10px] bg-white border border-rose-200 text-[#E11D48] hover:text-rose-800 hover:bg-rose-100/30 px-2.5 py-1 rounded-lg transition-all font-black shrink-0 cursor-pointer font-sans"
            >
              ✕ 닫기
            </button>
          </div>
        )}

      {viewMode === 'guide' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-5 py-6">
          <UserGuide />
        </main>
      ) : viewMode === 'analytics' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 space-y-6">
          <SalesGamification 
            userRole={userRole} 
            onGoalCompleted={fetchAuditLogs} 
            brands={brands}
            meetings={meetings}
            brandSolutions={brandSolutions}
          />
          <div className="border-t border-slate-100/80 my-5" />
          <AnalyticsDashboard brands={brands} meetings={meetings} />
        </main>
      ) : viewMode === 'pipeline' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6">
          <PipelineBoard 
            brands={brands}
            meetings={meetings}
            solutions={solutions}
            brandSolutions={brandSolutions}
            onUpdateBrandSolutionStatus={handleUpdateBrandSolutionStatus}
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
          {!canViewAudit ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 text-center max-w-xl mx-auto my-12 animate-fadeIn space-y-4 shadow-3xs">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-slate-800">🔒 보안 감사 기록 접근 보호 (Feature Controlled)</h3>
              <p className="text-xs text-slate-550 leading-relaxed max-w-md">
                현재 로그인한 영업 계정은 최고 관리자가 관리자 패널에서 설정한 개별 기능 스위치 통제 규약에 의해 <strong className="text-slate-700">[보안 감사 로그 이력]</strong> 탐색 및 조회 수급 자격이 일시 정지 상태입니다.
              </p>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] font-medium text-slate-400 w-full text-left">
                💡 보장 내역: 사내 포렌식 이력 추적 및 탐색 권한 제한 (403 Forbidden)
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                🔔 소속 가맹전략영업본부 최고 최고관리자에게 개별 기능 스위치(Switch) 활성화를 요청해 주세요.
              </p>
              
              <div className="pt-4 mt-2 w-full border-t border-slate-150 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">⚡ 데모 제어판: 시뮬레이션 권한 변경</span>
                <button
                  id="btn-switch-admin-audit"
                  onClick={() => {
                    setUserRole('Admin');
                    setRbacError(null);
                  }}
                  className="px-4 py-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-extrabold text-[11px] rounded-xl cursor-pointer shadow-3xs transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  슈퍼 어드민 (Super Admin) 권한으로 복귀하기
                </button>
              </div>
            </div>
          ) : (
            <AuditLogTimeline 
              userRole={userRole}
              auditLogs={auditLogs}
              onRefresh={fetchAuditLogs}
            />
          )}
        </main>
      ) : viewMode === 'chatbot' ? (
        <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn font-sans">
          {!canUseAI ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-md rounded-3xl border border-slate-200 text-center max-w-xl mx-auto my-12 animate-fadeIn space-y-4 shadow-3xs">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-slate-800">🔒 AI 영업 비서 인공지능 차단 (Feature Controlled)</h3>
              <p className="text-xs text-slate-550 leading-relaxed max-w-md">
                현재 로그인한 영업 계정은 최고 관리자가 설정한 개별 개발 기능 수동 제어 규약에 의해 <strong className="text-slate-700">[Gemini 1.5 RAG 대화형 인공지능 비서]</strong> 가동 권한이 일시 제한되었습니다.
              </p>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] font-medium text-slate-400 w-full text-left">
                💡 보장 내역: Gemini 1.5 어시스턴스, 영업 미팅 요약 및 제안 교차 기획 가이드 차단
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                🔔 소속 최고 관리자에게 해당 계정의 &apos;AI 영업 비서 사용&apos; 개별 스위치 개봉을 요청하세요.
              </p>

              <div className="pt-4 mt-2 w-full border-t border-slate-150 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">⚡ 데모 제어판: 시뮬레이션 권한 변경</span>
                <button
                  id="btn-switch-admin-ai"
                  onClick={() => {
                    setUserRole('Admin');
                    setRbacError(null);
                  }}
                  className="px-4 py-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-extrabold text-[11px] rounded-xl cursor-pointer shadow-3xs transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  슈퍼 어드민 (Super Admin) 권한으로 복귀하기
                </button>
              </div>
            </div>
          ) : (
            <AIChatbot 
              userRole={userRole}
              onSelectBrand={(id) => {
                setSelectedBrandId(id);
                setIsDrawerOpen(true);
              }}
            />
          )}
        </main>
      ) : viewMode === 'admin' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn">
          {!canManageUsers ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white/70 backdrop-blur-md rounded-3xl border border-slate-205 text-center max-w-xl mx-auto my-12 animate-fadeIn space-y-4 shadow-3xs">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-sm font-black text-slate-800">🔒 인사 통제 및 조직 마이그레이션 센터 제한</h3>
              <p className="text-xs text-slate-550 leading-relaxed max-w-md">
                현재 로그인한 협조원 계정은 최고 관리자가 지정한 개별 보안 기능 통제에 의해 <strong className="text-slate-700">[어드민 대시보드 및 마이그레이션 실행 도구]</strong> 접근권이 제한되어 있습니다.
              </p>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] font-medium text-slate-400 w-full text-left">
                💡 보장 내역: 신규 구성원 승인 등록, 개별 스위치 조율, CSV 백업 및 데이터베이스 파기/이식 도구 통제
              </div>
              <p className="text-[10px] text-slate-400 font-bold">
                🔔 최고 통제권을 가진 Super Admin 직속 계정에만 열려 있는 통제 공간입니다.
              </p>

              <div className="pt-4 mt-2 w-full border-t border-slate-200/50 flex flex-col items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">⚡ 데모 제어판: 시뮬레이션 권한 변경</span>
                <button
                  id="btn-switch-admin-manage"
                  onClick={() => {
                    setUserRole('Admin');
                    setRbacError(null);
                  }}
                  className="px-4 py-2 bg-[#03C75A] hover:bg-[#02b350] text-white font-extrabold text-[11px] rounded-xl cursor-pointer shadow-3xs transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  슈퍼 어드민 (Super Admin) 권한으로 복귀하기
                </button>
              </div>
            </div>
          ) : (
            <AdminPanel
              brands={brands}
              contacts={contacts}
              meetings={meetings}
              userRole={userRole}
              onChangeUserRole={(newRole) => setUserRole(newRole)}
              currentUserEmail={loginEmail}
              onRefreshCrmState={refreshAllStates}
              auditLogsCount={auditLogs.length}
              approvedUsers={approvedUsers}
              onAdminAddUser={handleAdminAddUser}
              onAdminUpdateUser={handleAdminUpdateUser}
              onAdminDeleteUser={handleAdminDeleteUser}
            />
          )}
        </main>
      ) : viewMode === 'backlog' ? (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 animate-fadeIn">
          {renderBacklogDashboard()}
        </main>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left column - Brand Directory Picker & Stats Panel (Large/Desktop 4 columns) */}
        <section className="lg:col-span-4 space-y-4">
          
          {/* Quick Metrics (Pastel styling) - Hiding in Zen Mode for maximum breathing room and subtracted aesthetic */}
          {!isZenMode && (
            <div className="grid grid-cols-2 gap-3.5 animate-fadeIn">
              <div className="bg-[#03C75A]/8 border border-[#03C75A]/15 p-4.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
                <span className="text-[10px] uppercase font-black text-[#03C75A] tracking-wider">주요 카테고리</span>
                <p className="text-xl font-black text-slate-900 mt-1.5">{totalFnb} F&B 브랜드</p>
                <div className="h-1 w-8 bg-gradient-to-r from-[#03C75A] to-[#1eca6b] rounded-full mt-2" />
              </div>
              <div className="bg-[#1eca6b]/8 border border-[#1eca6b]/15 p-4.5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] relative overflow-hidden">
                <span className="text-[10px] uppercase font-black text-[#1eca6b] tracking-wider">논푸드/리테일</span>
                <p className="text-xl font-black text-slate-900 mt-1.5">{totalRetail} 아웃렛 대상</p>
                <div className="h-1 w-8 bg-gradient-to-r from-[#1eca6b] to-[#03C75A] rounded-full mt-2" />
              </div>
            </div>
          )}

          {/* Interactive Brand Directory Select Area */}
          <div className="glass-card p-5 rounded-3xl space-y-3">
            <div className="flex justify-between items-center pb-3.5 border-b border-[#03C75A]/10">
              <div>
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">실시간 영업 타겟</h3>
                <span className="text-[10px] text-slate-400 font-bold">총 {brands.length}개 계약 및 기회 발견</span>
              </div>
              <button
                onClick={() => setIsAddingBrand(!isAddingBrand)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-[#03C75A]/12 hover:bg-[#03C75A]/25 text-[#03C75A] border border-[#03C75A]/25 transition-all select-none cursor-pointer shadow-sm shadow-[#03C75A]/5"
              >
                <Plus className="w-3.5 h-3.5 text-[#03C75A]" />
                <span>아웃바운드 발굴</span>
              </button>
            </div>

            {isAddingBrand && (
              <form onSubmit={handleBrandSubmit} className="bg-white/50 p-4 rounded-2xl border border-[#03C75A]/10 space-y-3.5 animate-fadeIn">
                <div className="border-b border-[#03C75A]/10 pb-2.5 flex justify-between items-center">
                  <span className="text-[10px] font-black text-[#03C75A] uppercase tracking-wider flex items-center gap-1">
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
                    <label className="block text-[10px] font-bold text-slate-400">브랜드명 (필수)</label>
                    <input
                      type="text"
                      required
                      placeholder="예: 런던 베이글 뮤지엄"
                      value={newBrandForm.name}
                      onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
                      className="w-full text-xs p-2.5 glass-input rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Category */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-400">카테고리</label>
                      <select
                        value={newBrandForm.category}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, category: e.target.value as any })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      >
                        <option value="F&B Brand">F&B 외식</option>
                        <option value="Non-food Brand">제품/리테일</option>
                        <option value="Retail/Store">오프라인 스토어</option>
                        <option value="Franchise Partner">프랜차이즈 가맹</option>
                      </select>
                    </div>

                    {/* Pipeline status */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-400">영업 초기 단계</label>
                      <select
                        value={newBrandForm.pipelineStatus}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, pipelineStatus: e.target.value as any })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
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
                      <label className="block text-[9px] font-bold text-slate-400">타겟 매장 수</label>
                      <input
                        type="number"
                        min="1"
                        value={newBrandForm.targetStoresCount}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, targetStoresCount: Number(e.target.value) })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                    </div>

                    {/* Revenue Est */}
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-400">월 매출 규모</label>
                      <input
                        type="text"
                        placeholder="예: 월 6,000만원 예상"
                        value={newBrandForm.monthlyRevenueEst}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, monthlyRevenueEst: e.target.value })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Headquarters info */}
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-400">본사 주소 / 본점 주소</label>
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
                    <label className="block text-[9px] font-bold text-slate-400">요약 설명 및 전략</label>
                    <textarea
                      placeholder="아웃바운드 영업 타겟 발굴 이유 기입"
                      value={newBrandForm.description}
                      onChange={(e) => setNewBrandForm({ ...newBrandForm, description: e.target.value })}
                      className="w-full text-[10px] p-2.5 glass-input rounded-xl focus:outline-none h-14 resize-none leading-tight"
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
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="직책 (예: 브랜드 제휴 담당)"
                        value={newBrandForm.contactPosition}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactPosition: e.target.value })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      <input
                        type="text"
                        placeholder="연락처 (예: 010-9999-0000)"
                        value={newBrandForm.contactPhone}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactPhone: e.target.value })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                      <input
                        type="email"
                        placeholder="이메일 주소"
                        value={newBrandForm.contactEmail}
                        onChange={(e) => setNewBrandForm({ ...newBrandForm, contactEmail: e.target.value })}
                        className="w-full text-xs p-2 glass-input rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsAddingBrand(false)}
                    className="px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 rounded-lg font-bold cursor-pointer transition-all text-[11px]"
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
                  <div className="p-4 bg-white/70 border border-[#03C75A]/10 rounded-2xl space-y-3 animate-pulse">
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
                  <div className="p-4 bg-white/70 border border-[#03C75A]/10 rounded-2xl space-y-3 animate-pulse">
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
                            b.category === 'F&B Brand' ? 'bg-[#03C75A]/12 text-[#03C75A] border border-[#03C75A]/15' : 'bg-[#1eca6b]/12 text-[#1eca6b] border border-[#1eca6b]/15'
                          }`}>
                            {b.logo}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900">{b.name}</h4>
                            <span className="text-[10px] text-slate-400 font-bold">{b.category === 'F&B Brand' ? 'F&B 외식' : '제품 리테일'}</span>
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
                          <div className="mt-2.5 pt-2.5 border-t border-[#03C75A]/10 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                            <span className="text-slate-400 font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-550 shrink-0" />
                              <span>최근 접촉: {lastContact}</span>
                            </span>
                            <span className="font-bold text-[#03C75A] shrink-0 bg-[#03C75A]/10 px-2 py-0.5 rounded-lg border border-[#03C75A]/20">
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
                  <p className="text-[10.5px] text-slate-400 font-medium">가맹점 발굴 및 실시간 미팅 조율 상담 피드백 공간입니다.</p>
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
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>본사 참고 주소: <span className="text-slate-400 font-medium select-all">{activeBrand.headquarters}</span></span>
                  </h4>
                  
                  <h4 className="font-bold text-slate-450 text-[10px] uppercase mt-3.5">브랜드 부가 설명</h4>
                  <p className="text-slate-400 mt-1 bg-slate-50/50 p-2 rounded-xl text-[11px] line-clamp-3">{activeBrand.description}</p>
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
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>
                            {contact.role}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5 text-[10px] font-semibold">{contact.position}</p>
                        <div className="flex gap-2.5 mt-2.5 text-[10px] text-slate-500">
                          <span className="flex items-center gap-0.5 select-all text-slate-400 hover:text-slate-800">
                            <Phone className="w-3 h-3 text-slate-400" /> {contact.phone}
                          </span>
                          <span className="flex items-center gap-0.5 select-all text-slate-400 hover:text-slate-800">
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
                            : 'bg-white border-amber-250/20 text-slate-400 hover:bg-amber-50/30'
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
                      <div className="bg-white/70 text-slate-900 p-4 rounded-xl border border-indigo-500/35 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-[10px] font-bold text-indigo-400">자동 추천 초안</span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(emailDraft.body);
                                setCopiedEmail(true);
                                setTimeout(() => setCopiedEmail(false), 2000);
                              }}
                              className="text-[9px] font-bold bg-slate-800 hover:bg-white/50 text-slate-800 px-2.5 py-1 rounded transition-all cursor-pointer"
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
                          <p className="text-[10px] text-slate-500 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
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
                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
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
                                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-1.5 rounded-xl">
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
                              <p className="text-slate-400 flex items-center gap-1 text-[11px] font-medium bg-slate-50/60 p-2 rounded-xl">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>장소: {meet.location}</span>
                              </p>
                            )}

                            {/* Standard text notes */}
                            {meet.notes && (
                              <div className="bg-slate-50/50 p-2.5 rounded-xl">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase">미팅 쟁점 요약 (Raw Note)</span>
                                <p className="text-slate-500 font-medium text-[11px] leading-relaxed mt-1">{meet.notes}</p>
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
              className="fixed inset-0 bg-white/40 backdrop-blur-[1px] z-40 cursor-pointer animate-fadeIn"
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

      {/* Global Command Palette search panel */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        brands={brands}
        contacts={contacts}
        meetings={meetings}
        setViewMode={setViewMode}
        onSelectBrand={(id) => {
          setSelectedBrandId(id);
          setIsDrawerOpen(true);
        }}
      />
    </div>
    </div>
  );
}
