import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, CheckCircle2, Layers, FileText, Timer, 
  AlertTriangle, RefreshCw, ChevronRight, ArrowUpDown, 
  Check, PlayCircle, ClipboardList, HelpingHand,
  Users, Phone, Mail, UserPlus, MapPin, Briefcase, Info, Bell, BellRing,
  BookOpen, Lightbulb, ThumbsUp, X, CheckSquare, Calendar, Plus, ChevronDown, Edit3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Brand, Meeting, Solution, BrandSolution, PipelineStatus, Contact } from "../types";
import { ConfettiEffect } from "./Confetti";

interface Brand360ViewProps {
  brand: Brand;
  meetings: Meeting[];
  userRole: string;
  onRefreshMeetings: () => void;
  syncTrigger?: number; // Reload trigger when new meeting adds
  onClose?: () => void;
  onUpdateProposalSubStage?: (id: string, subStage: 'Draft' | 'Tech' | 'Negotiation' | 'Approval') => Promise<void>;
}

// Pastel style configs for 4 Solution lines
const solutionThemes: Record<string, { bg: string; border: string; text: string; badge: string; accent: string }> = {
  DODO: { 
    bg: "bg-purple-50/40 hover:bg-purple-50/70", 
    border: "border-purple-100/80", 
    text: "text-purple-800", 
    badge: "bg-purple-150 text-purple-700",
    accent: "bg-purple-500"
  },
  WAITING: { 
    bg: "bg-emerald-50/40 hover:bg-emerald-50/70", 
    border: "border-emerald-100/80", 
    text: "text-emerald-800", 
    badge: "bg-emerald-150 text-emerald-700",
    accent: "bg-emerald-500"
  },
  NAVER_RES: { 
    bg: "bg-blue-50/40 hover:bg-blue-50/70", 
    border: "border-blue-100/80", 
    text: "text-blue-800", 
    badge: "bg-blue-150 text-blue-700",
    accent: "bg-blue-500"
  },
  NAVER_CONN: { 
    bg: "bg-amber-50/40 hover:bg-amber-50/70", 
    border: "border-amber-100/80", 
    text: "text-amber-900", 
    badge: "bg-amber-150 text-amber-800",
    accent: "bg-amber-500"
  }
};

const pipelineColors: Record<PipelineStatus, { bg: string; text: string; border: string; progress: number }> = {
  "Cold Call": { bg: "bg-slate-100/80", text: "text-slate-600", border: "border-slate-200", progress: 25 },
  "First Meeting": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-150", progress: 50 },
  "Proposal & Negotiation": { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-150", progress: 75 },
  "Deal Completed": { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200/60", progress: 100 }
};

export default function Brand360View({ 
  brand, 
  meetings, 
  userRole, 
  onRefreshMeetings, 
  syncTrigger = 0,
  onClose,
  onUpdateProposalSubStage
}: Brand360ViewProps) {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [brandSolutions, setBrandSolutions] = useState<BrandSolution[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSolutionId, setEditingSolutionId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [localSyncCount, setLocalSyncCount] = useState(0);

  // States for adding a new contact inline
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    role: "브랜드 본사 담당자" as Contact['role'],
    position: "",
    phone: "",
    email: ""
  });
  
  // States for contact inline double-click editing (Auto-save)
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [confettiSolutionId, setConfettiSolutionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    position: "",
    phone: "",
    email: ""
  });

  // Minimalist Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // States for the Interactive Pitch Playbook section
  const [activeObjectionIndex, setActiveObjectionIndex] = useState<number>(0);
  const [pitchSolutionId, setPitchSolutionId] = useState<string>("");
  const [pitchTone, setPitchTone] = useState<'professional' | 'revenue' | 'friendly'>('professional');
  const [pitchDraft, setPitchDraft] = useState<string>("");
  const [isGeneratingPitch, setIsGeneratingPitch] = useState<boolean>(false);
  const [votedObjections, setVotedObjections] = useState<Record<number, boolean>>({});
  const [pitchCopied, setPitchCopied] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Helper to show custom toast
  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Clean timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Load solutions, mappings, and brand-specific contacts
  useEffect(() => {
    async function fetch360Data() {
      setIsLoading(true);
      try {
        const solRes = await fetch("/api/solutions");
        const solutionsData = await solRes.json();
        setSolutions(solutionsData);
        if (solutionsData && solutionsData.length > 0) {
          setPitchSolutionId(solutionsData[0].id);
        }

        const bsRes = await fetch(`/api/brand-solutions/${brand.id}`);
        const bsData = await bsRes.json();
        setBrandSolutions(bsData);

        const contactRes = await fetch("/api/contacts");
        const contactsData = await contactRes.json();
        // Filter specifically for current brand ID
        setContacts(contactsData.filter((c: any) => c.brandId === brand.id));
      } catch (err) {
        console.error("Error loading account 360 data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetch360Data();
  }, [brand.id, syncTrigger, localSyncCount]);

  // Generate a customized pitch script for the brand's parameters
  const handleGenerateLocalPitch = () => {
    setIsGeneratingPitch(true);
    setPitchCopied(false);
    setTimeout(() => {
      const targetSol = solutions.find(s => s.id === pitchSolutionId);
      const solName = targetSol ? targetSol.name : "CRM 지능형 마케팅 솔루션";
      const decisionMaker = contacts.find(c => c.role === '브랜드 본사 담당자') || contacts[0];
      const buyerName = decisionMaker ? `${decisionMaker.name} ${decisionMaker.position || "담당자님"}` : "본사 핵심 바이어님";
      const categoryLabel = brand.category || "B2B F&B";

      let generated = "";

      if (pitchTone === 'professional') {
        generated = `[B2B 세일즈 협선 제안안] ${brand.name}의 지속 가능한 가맹 비즈니스 혁신 방향성

안녕하세요 ${brand.name} ${buyerName},

B2B 공동 영업 지원 사업부의 ${userRole === 'Admin' ? '정예 리드 어드바이저' : 'Sales Representative'}입니다.

최근 국내 ${categoryLabel} 시장 내에서 ${brand.name} 매장의 정밀한 지점 확장 전세와 가치 보존전략은 영업 실무 현장에서도 가히 압도적인 롤모델로 회자되고 있습니다. 

본론에 앞서 저희가 금번 ${brand.name} 맞춤형 교차 솔루션으로 설계 제안드리는 대상은 [${solName}]입니다. 본 서비스는 매장 단골들의 정밀한 이탈 지점을 사전에 분석 차단하며 가맹 매장의 매출 구조를 정량 부스팅하는 혁신 시스템입니다:

■ 주요 핵심 성과 도킹 가치:
1. 객단가 상향 극대화: 단골 고객의 재방문 빈도 24% 증대 및 주문 당 단품 매출 18% 추가 증량 (실 고객 데이터 통계 기반)
2. 시니어 점주 친화 UI: 60대 지점주님도 1분 내 적응을 보장하는 원터치 자동 처리 프로세스 구현

무거운 본사 도입 비용 장벽을 타파하기 위해, 첫 1개월간 무상 시범 운영 및 직영 에이전트 방문 1:1 현장 기술 온보딩 연동 서비스 팩을 모두 무상 제공할 예정입니다.

다음 주 초반, 부담 없는 15분 미만의 유선 미팅 혹은 간편 온라인 티타임을 신청하고자 합니다. 수락을 염두해주시는 가벼운 슬롯이 있으시다면 피드백 주시면 대행하겠습니다.

감사합니다.

B2B 비즈니스 솔루션팀 드림`;
      } else if (pitchTone === 'revenue') {
        generated = `[가상 성과 기획서] ${brand.name} 가맹 매장당 연 1,440만원의 추가 마진 증진 기안

안녕하세요 ${brand.name} ${buyerName} 귀하,

본 비즈니스 리타게팅 연동을 담당하고 있는 전문 기획팀입니다.

소비 경기 둔화와 원재료 부담 가중 속에서 가맹점주님들이 실제 체감하시는 고정 영업 비용 장벽은 나날이 높아만 가고 있습니다. 본 팀은 신규 광고 지출 증가 제로를 약속하면서, 오직 자사 고객들의 매장 이주 회전율을 재정비해 매출 장막을 깨부수는 확실한 무기인 [${solName}]의 적극 협선을 기안드립니다.

체계적인 ROI 통계 리포트가 보증하는 현시적 성과:

■ 도입 12주 이내 점주 직접 확인 가능 지수:
- 메뉴 단가 14% 상승: 결제 전 AI 연동 맞춤형 쿠폰 패키지 및 콤보 구성 유도 연동
- 재방문 임계 단축: 타겟팅 단골 도래 시각 알림으로 2차 오더 주기 평균 10일 가속화 
- 매장당 연간 누계 영업 이익 기여액: +14,400,000 KRW 추가 확보

저희는 이번 계약 기획안에 '도입 4주 이내 점포 매출 순증 미달성 시, 해당 솔루션료 라이선스 전액 환불' 민감 보증 조항을 공식 합의 서약해 드릴 수 있습니다. 하드웨어 도입 세팅비 역시 본사 바우처를 소급 적용해 무료 기각 지원합니다.

바이어님께서 주도하시는 금년도 가맹 마진 증진 혁신 기획에 강력한 시너지 디딤돌이 될 수 있기를 적극 희망합니다.

감사합니다.

영업 성과 부스팅 부서 드림`;
      } else {
        generated = `[상생 공동 프로젝트안] ${brand.name} 점주님들의 편리한 미소와 동반 매출 촉진을 위한 스마트화 제안

안녕하세요 ${brand.name}의 멋진 파트너 ${buyerName}!

따뜻하고 조화로운 매장 발전을 위해 불철주야 동행하는 세종 파트너십 담당자입니다.

가맹 브랜드의 거대한 가치를 높이기 위해 현장 지점주님들과 매일같이 치열하게 밀접 소통하시는 바이어님의 보이지 않는 고민과 고단함을 가슴 깊이 이해하고 있습니다.

저희가 제안해 드리는 [${solName}]은 복잡하고 다루기 까다로운 차가운 기술용 헬퍼가 아닙니다. 60세 이상의 가맹 지 점주님께서도 터치 소리 한 번에 즉각적으로 단골 손님과의 친근한 마케팅 유대를 100% 자동 분배 실행하도록 돕는 착하고 섬세한 스마트 가맹 장부입니다.

■ ${brand.name} 가족 분들을 위한 특별 혜택 리스트:
- 모바일-점포 연동 간편 지표: 눈이 편안한 원터치 점주 전용 스피어 화면 무상 업그레이드
- 본사-가맹 통계 클리어: 정산 및 전 가맹 쿠폰 소진 내역을 수작업 없이 1초 스마트 대조 연관 자동화
- 도입 온보딩 완전 교육 대행: 자사 직영 에이전트의 7일간 밀착 일대일 점주 한글 강습 무상 배정

행여 가맹점 관리에 부담이 갈 세부 오프라인 교육 스트레스를 저희 전문가 그룹이 무상으로 온전히 위임 해결해 드리겠습니다. 단골 점주들이 먼저 '참 편하다'며 미소 짓는 고품격 성장을 저희 상생 팩과 설계해 보시길 권유합니다.

담당 파트너님과 점주님의 상생 상록수를 함께 푸르게 빛내고 싶습니다. 언제든 반가운 응답 부탁드립니다!

행복과 웃음이 가득한 가정 되시길 빌며,
상생 영업 파트너 매니저 드림`;
      }

      setPitchDraft(generated);
      setIsGeneratingPitch(false);
    }, 850);
  };

  // Handle pipeline status shift directly from 360 board
  const handleUpdateSolutionPipeline = async (solutionId: string, targetStatus: PipelineStatus) => {
    setUpdateError(null);
    const solution = solutions.find(s => s.id === solutionId);
    
    // Default department mapping for updates
    let dept = "고객솔루션TF";
    if (solution?.code === "DODO") dept = "마케팅사업부";
    else if (solution?.code === "WAITING") dept = "대기전략파트";
    else if (solution?.code === "NAVER_RES") dept = "예약플랫폼팀";
    else if (solution?.code === "NAVER_CONN") dept = "영업개발팀";

    try {
      const response = await fetch(`/api/brand-solutions/${brand.id}/${solutionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": userRole
        },
        body: JSON.stringify({
          pipelineStatus: targetStatus,
          department: dept
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "상태 변경 권한 초과 또는 네트워크 에러");
      }

      setEditingSolutionId(null);
      setLocalSyncCount(prev => prev + 1);
      if (targetStatus === "Deal Completed") {
        setConfettiSolutionId(solutionId);
      }
      triggerToast("솔루션 진행 단계가 업데이트되었습니다. ⚙️");
      onRefreshMeetings(); // Reload main app state (triggers global sidebars)
    } catch (err: any) {
      setUpdateError(err.message || "권한이 없거나 상태 수정에 실패했습니다.");
      setTimeout(() => setUpdateError(null), 4500);
    }
  };

  // Submit new contact inline
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name.trim()) return;

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": userRole
        },
        body: JSON.stringify({
          brandId: brand.id,
          ...newContact
        })
      });

      if (response.ok) {
        setNewContact({
          name: "",
          role: "브랜드 본사 담당자",
          position: "",
          phone: "",
          email: ""
        });
        setIsAddingContact(false);
        setLocalSyncCount(prev => prev + 1);
        triggerToast("신규 바이어가 목록에 직접 추가되었습니다. 👤");
        onRefreshMeetings(); // Trigger global app state refresh
      } else {
        const errorData = await response.json();
        alert(errorData.error || "담당자 등록에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("담당자 등록에 실패했습니다.");
    }
  };

  const handleCopy = (text: string, type: 'phone' | 'email') => {
    navigator.clipboard.writeText(text);
    triggerToast(`${type === 'phone' ? '전화번호' : '이메일 주소'}가 클립보드에 복사되었습니다.`);
  };

  // Double Click inline editing mode initiation
  const handleStartEditContact = (c: Contact) => {
    setEditingContactId(c.id);
    setEditForm({
      name: c.name,
      position: c.position || "",
      phone: c.phone || "",
      email: c.email || ""
    });
  };

  // Inline blur auto-save logic
  const handleInlineAutoSave = async (contactId: string) => {
    if (editingContactId !== contactId) return;

    // Local state preview update right away to ensure speed
    setContacts(prev => prev.map(c => c.id === contactId ? {
      ...c,
      name: editForm.name,
      position: editForm.position,
      phone: editForm.phone,
      email: editForm.email
    } : c));

    // Exit editing mode
    setEditingContactId(null);

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": userRole
        },
        body: JSON.stringify({
          name: editForm.name,
          position: editForm.position,
          phone: editForm.phone,
          email: editForm.email
        })
      });

      if (response.ok) {
        triggerToast("바이어 연락 수단 정보가 실시간 인라인 자동 저장(Blur auto-save)되었습니다. ✨");
        onRefreshMeetings();
      } else {
        triggerToast("⚠️ 실시간 자동 저장을 실패하였습니다.");
      }
    } catch (err) {
      console.error(err);
      triggerToast("⚠️ 네트워크 상태 오류로 저장을 실패했습니다.");
    }
  };

  const handleKeyDownContact = (e: React.KeyboardEvent, contactId: string) => {
    if (e.key === 'Enter') {
      handleInlineAutoSave(contactId);
    }
  };

  const handleToggleReminder = async (meetingId: string, currentReminderState: boolean) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": userRole
        },
        body: JSON.stringify({
          reminderSet: !currentReminderState,
          reminderSent: false
        })
      });

      if (response.ok) {
        setLocalSyncCount(prev => prev + 1);
        triggerToast("리마인더 알림 설정을 토글하였습니다. 🔔");
        onRefreshMeetings();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "권한이 없습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("리마인더 설정 중 오류가 발생했습니다.");
    }
  };

  // Compile meetings & consolidated action tasks
  const brandMeetings = meetings.filter(m => m.brandId === brand.id && !m.solutionId?.startsWith("delete"));
  const consolidatedActionItems = brandMeetings.flatMap(m => {
    const meetSol = solutions.find(s => s.id === m.solutionId);
    const items = m.actionItems || [];
    return items.map((item, idx) => ({
      meetingId: m.id,
      meetingTitle: m.title,
      text: item,
      department: m.department || "공동세일즈팀",
      solutionName: meetSol ? meetSol.name : "일반 세일즈",
      dateTime: m.dateTime,
      uniqueKey: `${m.id}-item-${idx}`
    }));
  });

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Drawer Sticky Top Header */}
      <div className="flex justify-between items-center px-5 py-4.5 border-b border-slate-100 shrink-0 bg-slate-50/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-black shadow-[0_8px_30px_rgb(0,0,0,0.02)] ${
            brand.category === 'F&B Brand' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#FCE7F3] text-[#9D174D]'
          }`}>
            {brand.logo}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-slate-900 text-[13.5px] tracking-tight">{brand.name}</h3>
              <span className={`text-[8.5px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded-md ${
                brand.category === 'F&B Brand' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
              }`}>
                {brand.category === 'F&B Brand' ? 'F&B 브랜드' : '제품 리테일'}
              </span>
            </div>
            <p className="text-[10px] text-slate-450 font-semibold tracking-tight mt-0.5">Account 360° 다차원 실시간 제어반 (Linear Stream)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh syncer */}
          <button 
            onClick={() => setLocalSyncCount(p => p + 1)}
            className={`p-1.5 hover:bg-slate-100 border border-slate-200/55 rounded-lg text-slate-400 transition-all cursor-pointer ${isLoading ? 'animate-spin text-indigo-500' : ''}`}
            title="실시간 강제 수동 동기화"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200/55 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="제어반 드로어 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Toast popup absolute aligned */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-18 inset-x-4 mx-auto max-w-sm bg-slate-900/90 text-white p-3 rounded-xl text-[11px] font-bold text-center shadow-lg z-[100] backdrop-blur-xs flex items-center justify-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stream Area - NO TABS (Linear Vertical Flow) */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 scroll-smooth">
        
        {updateError && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-2 text-xs text-rose-700 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{updateError}</span>
          </div>
        )}

        {/* -------------------------------------------------------------
            SECTION 1: 고객 개요 (Brand Overview) 
           ------------------------------------------------------------- */}
        <section className="space-y-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono tracking-wider font-extrabold text-slate-500/80 uppercase">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>01 . 고객 개요 및 파이프라인 진행</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100/70 p-4.5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]/50 transition-all">
            
            {/* Highlights metric counters */}
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/40 text-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">추정 월 매출 규모</span>
                <span className="text-[13.5px] font-black text-[#01893d] mt-1 block">{brand.monthlyRevenueEst || "미파악"}</span>
              </div>
              <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/40 text-center">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">영업 타겟</span>
                <span className="text-[13.5px] font-black text-indigo-700 mt-1 block">본점 외 {brand.targetStoresCount || 0}개 매장</span>
              </div>
            </div>

            {/* Address & Description */}
            <div className="space-y-2.5 text-[11.5px] leading-relaxed">
              <div className="flex items-start gap-2 text-slate-600 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>본사 소재 주소: <strong className="text-slate-800 select-all font-bold">{brand.headquarters || "기재 대기 중"}</strong></span>
              </div>
              
              <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-100/40 text-xs">
                <span className="block text-[10px] font-bold text-slate-400 mb-1">가맹사 핵심 랜드마크 요약</span>
                <p className="text-slate-600 tracking-tight font-medium leading-normal">{brand.description || "등록된 부가 영문설명이 존재하지 않습니다."}</p>
              </div>
            </div>

            {/* Proposal Checklist & Negotiation Tracker */}
            {onUpdateProposalSubStage && (
              <div className="space-y-3 pt-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-[10.5px] font-bold text-slate-700 flex items-center gap-1">
                    <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                    <span>제안 심층 검토 단계 (Proposal Checklist Pipeline)</span>
                  </span>
                  <span className="text-[9.5px] font-mono font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                    현재: {brand.proposalSubStage === 'Draft' ? '01_제안 송부' : brand.proposalSubStage === 'Tech' ? '02_기술 가늠' : brand.proposalSubStage === 'Negotiation' ? '03_조건 합의' : brand.proposalSubStage === 'Approval' ? '04_품의 인가' : '미착수 단계'}
                  </span>
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                  {[
                    { id: 'Draft', step: '01', title: '제안서 송신', color: 'from-[#FFF8E1] to-[#FFE082]' },
                    { id: 'Tech', step: '02', title: '기술 검증', color: 'from-[#E1F5FE] to-[#81D4FA]' },
                    { id: 'Negotiation', step: '03', title: '피드백합의', color: 'from-[#E8F5E9] to-[#A5D6A7]' },
                    { id: 'Approval', step: '04', title: '최종 기안', color: 'from-[#F3E5F5] to-[#B39DDB]' }
                  ].map((subStep) => {
                    const isCurrent = brand.proposalSubStage === subStep.id;
                    const stageArray = ['Draft', 'Tech', 'Negotiation', 'Approval'];
                    const isCompleted = brand.proposalSubStage 
                      ? stageArray.indexOf(subStep.id) <= stageArray.indexOf(brand.proposalSubStage)
                      : false;

                    return (
                      <button
                        key={subStep.id}
                        type="button"
                        onClick={() => onUpdateProposalSubStage(brand.id, subStep.id as any)}
                        className={`text-left p-2.5 rounded-lg transition-all border flex flex-col justify-between min-h-[66px] cursor-pointer hover:scale-[1.01] active:scale-[0.99] select-none ${
                          isCurrent 
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                            : isCompleted
                            ? 'bg-amber-50/60 border-amber-200/50 text-amber-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-500 font-medium'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[8px] font-mono tracking-widest font-black ${isCurrent ? 'text-white/80' : 'text-amber-700/70'}`}>
                            STAGE {subStep.step}
                          </span>
                          {isCompleted && !isCurrent && (
                            <Check className="w-3 h-3 text-amber-600 italic shrink-0" />
                          )}
                        </div>
                        <span className={`text-[10px] font-black leading-none mt-1.5 ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                          {subStep.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION 2: 담당자망 연동 (Contacts Network & Auto-save)
           ------------------------------------------------------------- */}
        <section className="space-y-3.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono tracking-wider font-extrabold text-slate-500/80 uppercase">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>02 . 담당 바이어망 명록</span>
            </div>
            
            <button
              type="button"
              onClick={() => setIsAddingContact(!isAddingContact)}
              className="flex items-center gap-1 text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer select-none"
            >
              <UserPlus className="w-3 h-3 text-slate-500" />
              <span>{isAddingContact ? '접기' : '바이어 추가'}</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-100/70 p-4.5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]/50 transition-all">
            
            <div className="text-[10.5px] font-medium text-slate-400/85">
              💡 바이어의 이름영역을 <strong className="text-emerald-700 font-black">더블 클릭</strong>하시면 그 자리에서 즉시 수정 인풋으로 전환되며 포커스 아웃(Blur) 혹은 Enter 입력 시 <strong className="text-emerald-700 font-black">실시간 자동 저장(Auto-save)</strong> 처리됩니다.
            </div>

            {/* Inline New Contact inputs */}
            {isAddingContact && (
              <form onSubmit={handleContactSubmit} className="bg-emerald-50/10 p-3.5 border border-emerald-100/60 rounded-xl space-y-3.5 animate-fadeIn">
                <span className="block text-[9.5px] font-mono font-black text-emerald-700 uppercase tracking-wider">👤 신규 담당 바이어 추가 주소록</span>
                
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-450">바이어 성명 (필수)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="예: 최주희 대리"
                      value={newContact.name}
                      onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500/20 focus:outline-none bg-white font-medium"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-450">부서 / 직책</label>
                    <input 
                      type="text" 
                      placeholder="예: 마케팅 사업부 소속"
                      value={newContact.position}
                      onChange={(e) => setNewContact({...newContact, position: e.target.value})}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500/20 focus:outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-450">세일즈 의사선택 권한</label>
                    <select
                      value={newContact.role}
                      onChange={(e) => setNewContact({...newContact, role: e.target.value as any})}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none font-bold"
                    >
                      <option value="브랜드 본사 담당자">브랜드 본사 담당자</option>
                      <option value="VAN대리점">VAN대리점</option>
                      <option value="그 외">그 외</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-450">연락 실번호</label>
                    <input 
                      type="text" 
                      placeholder="010-XXXX-XXXX"
                      value={newContact.phone}
                      onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                      className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500/20 focus:outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-0.5 text-xs">
                  <label className="text-[9px] font-bold text-slate-450">바이어 이메일 주소</label>
                  <input 
                    type="email" 
                    placeholder="buyer@brand-company.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                    className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500/20 focus:outline-none bg-white font-medium"
                  />
                </div>

                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingContact(false)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] rounded-lg font-extrabold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded-lg font-extrabold cursor-pointer"
                  >
                    도킹 바이어 추가
                  </button>
                </div>
              </form>
            )}

            {/* Contacts list directory styling with inline double-click editing */}
            {contacts.length === 0 ? (
              <div className="bg-slate-25/40 border border-slate-150 p-6 rounded-xl flex flex-col items-center justify-center text-center py-7">
                <Users className="w-6 h-6 text-slate-300 mb-1" />
                <p className="text-xs font-bold text-slate-400">등록 완료된 핵심 세일즈 바이어가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(['브랜드 본사 담당자', 'VAN대리점', '그 외'] as const).map(category => {
                  const categoryContacts = contacts.filter(c => c.role === category);
                  
                  return (
                    <div key={category} className="space-y-2.5">
                      {/* Category Header */}
                      <div className="flex items-center justify-between px-1">
                        <span className={`text-[10px] font-black tracking-tight px-2 py-0.5 rounded-full border ${
                          category === '브랜드 본사 담당자' 
                            ? 'bg-blue-50/80 border-blue-100 text-blue-700'
                            : category === 'VAN대리점'
                            ? 'bg-amber-50/80 border-amber-100 text-amber-800'
                            : 'bg-slate-50/80 border-slate-200 text-slate-600'
                        }`}>
                          {category} <span className="opacity-70">({categoryContacts.length}명)</span>
                        </span>
                        <div className="h-px bg-slate-100 flex-1 ml-3" />
                      </div>

                      {categoryContacts.length === 0 ? (
                        <div className="bg-slate-50/40 border border-dashed border-slate-100/70 p-3 rounded-xl text-center py-3.5">
                          <p className="text-[9px] font-bold text-slate-400">등록된 담당 바이어가 없습니다.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                          {categoryContacts.map(c => {
                            const roleLabels: Record<Contact['role'], { text: string; bg: string; border: string }> = {
                              "브랜드 본사 담당자": { text: "본사 담당", bg: "bg-blue-50 text-blue-700", border: "border-blue-100" },
                              "VAN대리점": { text: "VAN 대리점", bg: "bg-amber-50 text-amber-800", border: "border-amber-100" },
                              "그 외": { text: "기타 담당", bg: "bg-slate-100 text-slate-700", border: "border-slate-200" }
                            };
                            const roleLabelConfig = roleLabels[c.role] || { text: "일반 담당자", bg: "bg-slate-50 text-slate-600", border: "border-slate-105" };
                            const isEditingNow = editingContactId === c.id;

                            return (
                              <div 
                                key={c.id} 
                                className={`bg-white border rounded-lg p-3.5 space-y-2.5 transition-all flex flex-col justify-between ${
                                  isEditingNow ? 'border-indigo-400 ring-2 ring-indigo-50/70' : 'border-slate-100/60 hover:border-slate-200 hover:shadow-2xs'
                                }`}
                              >
                                {/* Contact top header representation */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-start gap-1">
                                    {isEditingNow ? (
                                      /* INLINE DOUBLE CLICK INPUT FORM */
                                      <div className="space-y-1.5 w-full text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                          <input 
                                            type="text"
                                            value={editForm.name}
                                            placeholder="성명 (더블클릭 편집)"
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            onBlur={() => handleInlineAutoSave(c.id)}
                                            onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                            className="p-1 px-1.5 border border-indigo-200 rounded-md bg-white font-extrabold focus:ring-1 focus:ring-indigo-500 w-full focus:outline-none text-[11px]"
                                            autoFocus
                                          />
                                          <input 
                                            type="text"
                                            value={editForm.position}
                                            placeholder="부서/직명"
                                            onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                                            onBlur={() => handleInlineAutoSave(c.id)}
                                            onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                            className="p-1 px-1.5 border border-indigo-200 rounded-md bg-white font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 w-full focus:outline-none text-[11px]"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <input 
                                            type="text"
                                            value={editForm.phone}
                                            placeholder="연락 번호"
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            onBlur={() => handleInlineAutoSave(c.id)}
                                            onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                            className="p-1 px-1.5 border border-indigo-200 rounded-md bg-white font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 w-full focus:outline-none text-[10px]"
                                          />
                                          <input 
                                            type="email"
                                            value={editForm.email}
                                            placeholder="이메일"
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            onBlur={() => handleInlineAutoSave(c.id)}
                                            onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                            className="p-1 px-1.5 border border-indigo-200 rounded-md bg-white font-bold text-slate-600 focus:ring-1 focus:ring-indigo-500 w-full focus:outline-none text-[10px]"
                                          />
                                        </div>
                                        <span className="block text-[8px] font-mono text-indigo-400 font-extrabold mt-1">
                                          [Enter 입력 혹은 바깥 영역 클릭(Blur) 시 실시간 자동 저장]
                                        </span>
                                      </div>
                                    ) : (
                                      /* READ ONLY VISUAL LAYER */
                                      <div 
                                        onDoubleClick={() => handleStartEditContact(c)}
                                        className="flex items-center gap-2 cursor-pointer group w-full justify-between"
                                        title="더블 클릭하여 바이어 정보 즉시 인라인 편집"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-7 h-7 rounded-full bg-slate-100 text-[11px] font-black text-slate-600 border border-slate-200 flex items-center justify-center shrink-0 uppercase">
                                            {c.name.substring(0, 1)}
                                          </div>
                                          <div className="text-left">
                                            <h5 className="text-[11.5px] font-black text-slate-800 leading-tight group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
                                              <span>{c.name}</span>
                                              <Edit3 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h5>
                                            <p className="text-[9.5px] text-slate-400 font-extrabold">{c.position || "가맹 협의 총괄팀"}</p>
                                          </div>
                                        </div>
                                        
                                        <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded-md border shrink-0 ${roleLabelConfig.bg} ${roleLabelConfig.border} ${roleLabelConfig.text}`}>
                                          {roleLabelConfig.text}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Contact metadata visual copy list */}
                                {!isEditingNow && (
                                  <div className="bg-slate-50/50 p-2 rounded-lg text-[10px] space-y-1 border border-slate-100/50 text-left">
                                    {c.phone && (
                                      <div className="flex items-center justify-between text-slate-600 font-bold group">
                                        <span className="flex items-center gap-1.5">
                                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="select-all font-mono text-[10.5px]">{c.phone}</span>
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleCopy(c.phone, 'phone')}
                                          className="text-[8px] text-emerald-700 bg-white hover:bg-slate-100 border border-slate-200 px-1 rounded transition-all font-black cursor-pointer select-none"
                                        >
                                          복사
                                        </button>
                                      </div>
                                    )}
                                    {c.email && (
                                      <div className="flex items-center justify-between text-slate-600 font-bold group">
                                        <span className="flex items-center gap-1.5 truncate mr-2">
                                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="select-all truncate text-[10.5px]">{c.email}</span>
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleCopy(c.email, 'email')}
                                          className="text-[8px] text-emerald-700 bg-white hover:bg-slate-100 border border-slate-200 px-1 rounded transition-all font-black cursor-pointer select-none"
                                        >
                                          복사
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION 3: 후속 과제 실행 (Consolidated Action Tasks & Meetings Logs)
           ------------------------------------------------------------- */}
        <section className="space-y-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono tracking-wider font-extrabold text-slate-500/80 uppercase">
            <ClipboardList className="w-4 h-4 text-rose-500" />
            <span>03 . 후속 과제 및 실질 협의 이력</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100/70 p-4.5 space-y-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)]/50 transition-all">
            
            {/* 3A: Action items sub-segment */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">밀착 후속 과제 현황 ({consolidatedActionItems.length}건)</span>
              
              {consolidatedActionItems.length === 0 ? (
                <div className="bg-slate-25/40 border border-slate-150 p-4 rounded-lg flex flex-col items-center justify-center text-center text-slate-400 py-5">
                  <ClipboardList className="w-5 h-5 text-slate-300 mb-1" />
                  <p className="text-[10px] font-bold text-slate-450">회의록에서 요약 추출된 세일즈 후속 조치 업무가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {consolidatedActionItems.map(item => (
                    <div 
                      key={item.uniqueKey} 
                      className="flex items-start gap-2 text-[11px] bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 last:border-slate-100 text-left"
                    >
                      <div className="pt-0.5 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="space-y-0.5 w-full">
                        <div className="flex justify-between items-center flex-wrap gap-1">
                          <span className="text-[8px] bg-rose-50 text-rose-700 font-extrabold px-1 rounded">
                            {item.solutionName}
                          </span>
                          <span className="text-[8px] font-mono font-bold text-slate-400">
                            영업 전담: {item.department}
                          </span>
                        </div>
                        
                        <p className="text-slate-800 font-bold text-[11px] leading-relaxed mt-1">
                          {item.text}
                        </p>
                        
                        <p className="text-[8px] text-slate-400 font-medium">
                          기원: {item.meetingTitle} ({new Date(item.dateTime).toLocaleDateString('ko-KR')})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3B: Meeting logs block list */}
            <div className="space-y-2.5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">회의 대면 일정 및 스마트 코멘트 ({brandMeetings.length})</span>
              
              {brandMeetings.length === 0 ? (
                <div className="bg-slate-25/40 border border-slate-150 p-5 rounded-lg text-center text-slate-400 py-6">
                  <Calendar className="w-5 h-5 text-slate-350 mx-auto mb-1" />
                  <p className="text-[10.5px] font-bold text-slate-450">스케줄링되었거나 완료된 과거 미팅 역사가 존재하지 않습니다.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {brandMeetings.map(meet => {
                    const matchedSol = solutions.find(s => s.id === meet.solutionId);
                    return (
                      <div key={meet.id} className="bg-white border border-slate-150 rounded-lg p-3 text-left space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[8.5px] font-mono font-bold text-indigo-500 uppercase block">
                              {matchedSol ? matchedSol.name : "CRM 제안 피드백"} ({meet.pipelineStatus})
                            </span>
                            <h6 className="font-extrabold text-slate-900 text-[11.5px] mt-0.5">{meet.title}</h6>
                          </div>
                          <span className="text-[8.5px] font-mono font-black text-slate-400 shrink-0">
                            {new Date(meet.dateTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {meet.notes && (
                          <div className="text-[10px] text-slate-550 leading-relaxed font-medium">
                            <span className="text-slate-400 block font-bold text-[8.5px] uppercase">Meeting Notes (정독)</span>
                            <p className="line-clamp-3">{meet.notes}</p>
                          </div>
                        )}

                        {/* Audio Brief with play circle / reminder switch */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100/65 text-[9px] text-slate-500">
                          <span className="font-mono text-slate-400 font-bold">오디오 받아쓰기 지원 수록</span>
                          <button
                            type="button" 
                            onClick={() => handleToggleReminder(meet.id, meet.reminderSet || false)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border font-extrabold select-none cursor-pointer transition-all ${
                              meet.reminderSet 
                                ? "bg-amber-50 text-amber-700 border-amber-200" 
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Bell className={`w-3 h-3 ${meet.reminderSet ? 'text-amber-500 animate-swing' : ''}`} />
                            <span>{meet.reminderSet ? "알림 기가동" : "리마인더 예약"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION 4: 맞춤형 플레이북 스크립트 도출
           ------------------------------------------------------------- */}
        <section className="space-y-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-mono tracking-wider font-extrabold text-slate-500/80 uppercase">
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>04 . 맞춤형 플레이북 및 솔루션</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-100/70 p-4.5 space-y-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)]/50 transition-all">
            
            {/* 4A: Product Pipeline Multi-Track Tracking */}
            <div className="space-y-3.5 border-b border-slate-100 pb-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">제품라인 교차 파이프라인 (Cross-Selling Tracking)</span>
              
              <div className="space-y-2.5">
                {solutions.map(sol => {
                  const mapping = brandSolutions.find(bs => bs.solutionId === sol.id);
                  const currentStatus = mapping?.pipelineStatus || "Cold Call";
                  const theme = solutionThemes[sol.code] || {
                    bg: "bg-slate-50", border: "border-slate-150", text: "text-slate-700", accent: "bg-slate-400"
                  };
                  const isEditingNow = editingSolutionId === sol.id;

                  return (
                    <div 
                      key={sol.id} 
                      className={`rounded-lg p-3 border transition-all text-left flex flex-col justify-between gap-1.5 ${theme.bg} ${theme.border} relative overflow-hidden`}
                    >
                      <ConfettiEffect
                        active={confettiSolutionId === sol.id}
                        onComplete={() => setConfettiSolutionId(null)}
                      />
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <span className="text-[8px] font-mono tracking-widest font-black text-slate-400 block">SOLUTION LINE</span>
                          <h6 className={`text-[11px] font-black ${theme.text}`}>{sol.name} ({sol.code})</h6>
                        </div>
                        
                        {!isEditingNow && (
                          <button
                            type="button"
                            onClick={() => setEditingSolutionId(sol.id)}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-[9px] font-extrabold px-2 py-0.5 rounded-md text-slate-600 transition-all cursor-pointer select-none"
                          >
                            상태 수정
                          </button>
                        )}
                      </div>

                      {isEditingNow ? (
                        /* PIPELINE SWITCH SELECTOR */
                        <div className="space-y-1.5 pt-1 text-[10px] animate-fadeIn w-full">
                          <label className="text-[8.5px] font-extrabold text-slate-400 block">클라우드 교체 대면 상태 변경</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {[
                              { id: "Cold Call", text: "콜드콜" },
                              { id: "First Meeting", text: "첫대면" },
                              { id: "Proposal & Negotiation", text: "단조율" },
                              { id: "Deal Completed", text: "완료🏆" }
                            ].map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleUpdateSolutionPipeline(sol.id, st.id as PipelineStatus)}
                                className={`text-[9.5px] p-1 rounded font-extrabold text-center cursor-pointer select-none transition-colors ${
                                  currentStatus === st.id 
                                    ? "bg-slate-900 text-white" 
                                    : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {st.text}
                              </button>
                            ))}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setEditingSolutionId(null)}
                            className="text-[8.5px] text-slate-500 hover:text-slate-800 tracking-tight font-black underline block text-right pt-1"
                          >
                            닫기
                          </button>
                        </div>
                      ) : (
                        /* READ ONLY TRACK HIGHLIGHT */
                        <div className="flex items-center justify-between mt-1 text-[10px] font-extrabold text-slate-600/90">
                          <span className="flex items-center gap-1 text-[9.5px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.accent}`} />
                            <span>최종 단계: {currentStatus === 'Cold Call' ? '콜드콜 발굴' : currentStatus === 'First Meeting' ? '첫대면 확보' : currentStatus === 'Proposal & Negotiation' ? '제안 조율' : '계약 인가완료'}</span>
                          </span>
                          <span className="font-mono text-[9px] tracking-wide text-slate-400">
                            {pipelineColors[currentStatus]?.progress}% 완료
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4B: Objection Handling Simulator */}
            <div className="space-y-3.5 border-b border-slate-100 pb-4 text-left">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">실지 반대 극복 시뮬레이션 (Objections Handling)</span>
              
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {[
                  {
                    title: "이미 다른 B2B 서비스를 이용 중입니다",
                    quote: "“매장에 경쟁사 기기와 적립 혜택 툴을 이미 3년 이상 계약해 사용 중이라서 지금 뚜렷이 수수료를 내가며 솔루션을 바꿀 매력이 없어요.”",
                    tactics: "타사 대비 단순 포인트 적립을 넘은 AI 리타게팅 재방문 촉진 효과(매출 증량 24%)를 강조 수리하고 남은 계약위약금을 프로모션 팩으로 파격 대체 제안하여 소구합니다.",
                    script: `"${brand.name} 바이어님, 기존 혜택 수단과 연동에 큰 불편을 못 느끼시는 점 역시 긍정적입니다. 다만 평균 15%의 일반 단골들이 3달 이상 사각지대에서 이탈한다는 지표 또한 놓치고 계실 수 있습니다. 저희가 추천해드린 자동 챗 제안 링커는 이탈률을 획기적으로 방지(Retention률 2.3배 향상)하는 독보적 강점이 있습니다. 지금 교체 계약을 약조해 주신다면 기존 위약금 손실을 전액 보충할 기간 사용 크레딧 무상 교환을 특권 보장합니다."`,
                    tip: "이탈율 수치와 실무 위약금 대체 카달로그를 제시하여 비용 전환 심리의 문턱을 제로로 만드세요."
                  },
                  {
                    title: "가맹지점주 교육 및 사용 기피 우려",
                    quote: "“현장 점주들이 새로운 관리기 조작법이나 바이어 교육 패키지를 불편해하고 귀찮아할 게 본사로선 큰 매장 관리 장애물입니다.”",
                    tactics: "60대 이상 시니어 점주님도 1분이면 완숙 마스터하는 초대형 원키 간소 모드를 현시하고 본사 직영 현장 도입 전문가 1:1 파견 및 인프라 무상 대행 온보딩 팩 서비스를 전경 배치하여 안심시킵니다.",
                    script: `"${brand.name} 본부장님, 지점주님들의 사용 피로도와 조작 오작 위험은 당연히 고민할 이슈가 맞습니다. 이에 저희 디자인 센터는 별도 조작이 일절 필요 없는 '스마트 물류 자동 미러링 장부'를 완성했습니다. 특히 도입하시는 첫 주 동안 저희 세일즈 매니저 파트너가 각 매장을 매일 가맹 대면 대행하는 헌신적인 일대일 점주 밀착 케어 서비스가 추가 지출 없이 제공됨을 기안서로 약속드립니다."`,
                    tip: "본부 관리자의 업무 간소화와 자사 크루의 현장 직접 순회 무상 케어 패키지를 강력 강조하세요."
                  },
                  {
                    title: "B2B 솔루션 이용료 부담 & 확실한 ROI",
                    quote: "“매월 추가 지출되는 고정 단말 임대 전용료나 대량 메일 발송비 대비 매출이 유관하게 나온다는 실 데이터가 있습니까?”",
                    tactics: "고객 객단가 18% 증가 및 유효 방문 빈도 1.7회 가치 순증이라는 수치적 성공 레퍼런스를 제시하며, 오프닝 1개월간 매출 증가 미발생시 전액 환불을 보장하는 보증 특약 기재를 약속합니다.",
                    script: `"${brand.name} 본사 부장님, 월정 인허가료는 비축되는 단순 손실 비용이 아닙니다. 실제 도입한 대형 가맹 매장의 평균 단가 분석 결과 3개월 내 재방문 주기가 유의미하게 22일 단축되어 가맹점 마진이 평균 120만 원 이상 늘어났기 때문입니다. 저희 솔루션의 성과 확신을 입증해드릴 '매출 추가 순증 미달성 환불 보증제' 계약 특약 삽입을 추진하겠습니다."`,
                    tip: "성공 사례 분석표를 제공하고 자사 마진 기반의 매출 환급 안전 보장을 전면에 걸어 확신을 주세요."
                  }
                ].map((obj, oIdx) => {
                  const isActive = activeObjectionIndex === oIdx;
                  const hasVoted = !!votedObjections[oIdx];
                  return (
                    <div 
                      key={obj.title}
                      className={`border rounded-lg p-3 transition-all text-left space-y-2 ${
                        isActive 
                          ? "bg-amber-500/5 border-amber-300 ring-1 ring-amber-350/40" 
                          : "bg-slate-50/60 hover:bg-slate-50 border-slate-200/50 cursor-pointer"
                      }`}
                      onClick={() => setActiveObjectionIndex(oIdx)}
                    >
                      <div className="flex justify-between items-center gap-1.5">
                        <h6 className="text-[10.5px] font-black text-slate-800 flex items-center gap-1 text-left leading-normal">
                          <Check className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500 font-extrabold' : 'text-slate-350'}`} />
                          <span>{obj.title}</span>
                        </h6>
                        {isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVotedObjections(prev => ({ ...prev, [oIdx]: !prev[oIdx] }));
                            }}
                            className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer select-none shrink-0 ${
                              hasVoted 
                                ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-black" 
                                : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"
                            }`}
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            <span>{hasVoted ? "공감함" : "유용함"}</span>
                          </button>
                        )}
                      </div>

                      {isActive && (
                        <div className="text-[10px] space-y-2.5 animate-fadeIn pt-2 border-t border-slate-100/70">
                          <div className="bg-white p-2.5 rounded-md border border-slate-200 text-slate-500 leading-normal text-left">
                            <span className="block text-[8px] font-mono text-slate-400 font-bold uppercase mb-0.5">바이어 실제 우려 발언</span>
                            <p className="font-bold italic text-slate-650">{obj.quote}</p>
                          </div>

                          <div className="space-y-0.5 text-left">
                            <span className="text-[8.5px] font-black text-amber-600 block">⚡ 전략적 카운터 전술 (Tactic Approach)</span>
                            <p className="font-bold text-slate-600 leading-relaxed bg-amber-50 p-2 rounded border border-amber-100">
                              {obj.tactics}
                            </p>
                          </div>

                          <div className="space-y-0.5 text-left">
                            <div className="flex justify-between items-center flex-wrap gap-1">
                              <span className="text-[8.5px] font-black text-indigo-600">💬 추천 피칭 스크립트 (Suggested Pitch Script)</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(obj.script);
                                  triggerToast("스크립트 문안이 클립보드에 복사완료되었습니다. ✨");
                                }}
                                className="text-[8px] font-black bg-indigo-50 border border-indigo-150 text-indigo-600 hover:bg-indigo-100 px-1.5 py-0.5 rounded select-none cursor-pointer"
                              >
                                복사
                              </button>
                            </div>
                            <div className="bg-indigo-50/30 p-2.5 rounded border border-indigo-100/50 text-[10px] text-slate-850 font-medium leading-relaxed font-sans">
                              {obj.script}
                            </div>
                          </div>

                          <div className="bg-emerald-50/40 p-2 border border-emerald-100 rounded text-[8.5px] text-left">
                            <span className="text-emerald-700 font-black block">💡 영업 Pro-Tip 가이던스</span>
                            <p className="font-bold text-slate-600 leading-normal">{obj.tip}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4C: AI Customized Sales Pitch Letter Draft Builder */}
            <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-200/55 space-y-3.5 text-left">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <h5 className="text-[11.5px] font-black text-slate-800">바이어 맞춤 제안 메일 초안 빌더 (Pitch Maker)</h5>
              </div>

              <div className="grid grid-cols-1 gap-2 text-[10px]">
                <div className="space-y-1">
                  <label className="text-[8.5px] font-black text-slate-450 uppercase block">추천 세일즈 솔루션 라이인</label>
                  <select
                    value={pitchSolutionId}
                    onChange={(e) => setPitchSolutionId(e.target.value)}
                    className="w-full text-[10px] p-2 border border-slate-200 rounded-lg bg-white font-extrabold focus:outline-none select-none cursor-pointer"
                  >
                    {solutions.map(sol => (
                      <option key={sol.id} value={sol.id}>{sol.name} ({sol.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8.5px] font-black text-slate-450 uppercase block">세일즈 어프로치 타겟 및 톤</label>
                  <select
                    value={pitchTone}
                    onChange={(e) => setPitchTone(e.target.value as any)}
                    className="w-full text-[10px] p-2 border border-slate-200 rounded-lg bg-white font-extrabold focus:outline-none select-none cursor-pointer"
                  >
                    <option value="professional">🛡️ 신뢰성 고정비 제로 톤</option>
                    <option value="revenue">📈 점주 마진 극대화 정량 톤</option>
                    <option value="friendly">🤝 상생 상록수 보좌 프렌들리 톤</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateLocalPitch}
                disabled={isGeneratingPitch}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-all shadow-6xs border border-indigo-700 cursor-pointer select-none flex items-center justify-center gap-1.5"
              >
                {isGeneratingPitch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>초안 빌딩 컴파일 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>메인 이메일 제안서 빌드 개시</span>
                  </>
                )}
              </button>

              <div className="space-y-1.5 pt-1 text-left">
                <div className="flex justify-between items-center text-[8.5px] font-mono font-bold text-slate-400/90">
                  <span>COMPILED PITCH SHEET PREVIEW</span>
                  {pitchDraft && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pitchDraft);
                        triggerToast("제안용 메일 초안 템플릿이 성공적으로 복사되었습니다. 📋");
                      }}
                      className="text-[8.5px] font-black text-indigo-600 border border-indigo-150 bg-white hover:bg-slate-150 px-2 py-0.5 rounded cursor-pointer select-none"
                    >
                      클립보드 메일 복사
                    </button>
                  )}
                </div>

                {isGeneratingPitch ? (
                  <div className="bg-white border border-slate-150 p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-2 h-44 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                    <p className="text-[9px] font-bold text-slate-400 leading-normal">제안서 매니저가 바이어 의사결정권자 직함을 인입하고 있습니다...</p>
                  </div>
                ) : pitchDraft ? (
                  <textarea
                    value={pitchDraft}
                    onChange={(e) => setPitchDraft(e.target.value)}
                    className="w-full h-44 border border-slate-200 rounded-lg p-3 text-[10px] leading-relaxed font-bold font-mono bg-white text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="상단의 제안서 빌드 개시 버튼을 클릭하십시오."
                  />
                ) : (
                  <div className="bg-white/70 border border-dashed border-slate-200 p-6 rounded-lg flex flex-col items-center justify-center text-center space-y-1.5 h-44">
                    <BookOpen className="w-5 h-5 text-slate-350" />
                    <p className="text-[10px] font-extrabold text-[#475569]">메일 제안서 시안 대기 중</p>
                    <p className="text-[8px] text-slate-400">설정에 따라 1초 내에 커스텀 마크업 텍스트를 완성합니다.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}
