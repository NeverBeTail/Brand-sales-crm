import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, CheckCircle2, Layers, FileText, Timer, 
  AlertTriangle, RefreshCw, ChevronRight, ArrowUpDown, 
  Check, PlayCircle, ClipboardList, HelpingHand,
  Users, Phone, Mail, UserPlus, MapPin, Briefcase, Info, Bell, BellRing,
  BookOpen, Lightbulb, ThumbsUp, X, CheckSquare, Calendar, Plus, ChevronDown, Edit3,
  Send, MessageSquare, AtSign, DollarSign, Bot, ArrowRight, UserCheck
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

interface Comment {
  id: string;
  author: string;
  role: string;
  avatar: string;
  content: string;
  createdAt: string;
  isAI?: boolean;
}

// Timeline Unified Event Type
interface TimelineNode {
  id: string;
  type: 'comment' | 'meeting' | 'system_log';
  timestamp: string;
  author?: string;
  role?: string;
  content: string;
  avatar?: string;
  isAI?: boolean;
  meetingData?: Meeting;
}

const COLLABORATORS = [
  { name: "김영업 과장", role: "Sales Rep", initial: "김", color: "bg-teal-50 text-teal-700 border-teal-100" },
  { name: "박리드 실장", role: "Adviser Lead", initial: "박", color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  { name: "이마케팅 대리", role: "Onboarding Spec", initial: "이", color: "bg-rose-50 text-rose-700 border-rose-100" },
  { name: "기획관제 어드민", role: "Manager", initial: "어", color: "bg-amber-50 text-amber-800 border-amber-100" }
];

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

const getDefaultComments = (brandId: string, brandName: string): Comment[] => {
  return [
    {
      id: `${brandId}-c1`,
      author: "김영업 과장",
      role: "Sales Representative",
      avatar: "김",
      content: `최근 ${brandName} 본사 미팅에서 본부장님이 기술 온보딩 비용 소급 적용에 상당한 호의적 반응을 보이셨습니다. 네이버예약 라인 연동 기획안 보충해서 다음 미팅 때 승부해 보겠습니다!`,
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    },
    {
      id: `${brandId}-c2`,
      author: "박리드 실장",
      role: "Adviser Lead",
      avatar: "박",
      content: `@김영업 과장님 고생하셨습니다. 수수료율 조건 내에서 본사 마진율 검토 기안 완료됐으니, 차주 계약 결재 상정 과정에서 추가 조건 제안도 같이 꺼내 보시죠.`,
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: `${brandId}-c3`,
      author: "Sales AI Agent",
      role: "System Agent",
      avatar: "🤖",
      content: `📢 [시스템 기가동 알림] ${brandName}의 스마트 비즈니스 파이프라인 협의 단계가 [First Meeting]으로 업그레이드 이관되었습니다.`,
      createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      isAI: true
    }
  ];
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
  
  // Tab control: 'timeline' (Feed & comments), 'data' (Buyers & general diagnostics), 'playbook' (Strategic simulator & Pitch builder)
  const [activeTab, setActiveTab] = useState<'timeline' | 'data' | 'playbook'>('timeline');

  // Real-time custom state
  const [commissionRate, setCommissionRate] = useState<string>("2.8%");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

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

  // Load / Save Comments & Commission Rate for this brand
  useEffect(() => {
    const saved = localStorage.getItem(`crm_comments_${brand.id}`);
    if (saved) {
      setComments(JSON.parse(saved));
    } else {
      const defaultComs = getDefaultComments(brand.id, brand.name);
      setComments(defaultComs);
      localStorage.setItem(`crm_comments_${brand.id}`, JSON.stringify(defaultComs));
    }

    const rates: Record<string, string> = {
      "brand-1": "2.8%",
      "brand-2": "3.2%",
      "brand-3": "3.0%",
      "brand-4": "2.5%"
    };
    setCommissionRate(localStorage.getItem(`commission_rate_${brand.id}`) || rates[brand.id] || "2.8%");
  }, [brand.id, brand.name]);

  const saveCommentsToStorage = (newComments: Comment[]) => {
    setComments(newComments);
    localStorage.setItem(`crm_comments_${brand.id}`, JSON.stringify(newComments));
  };

  // Generate a customized pitch script for the brand's parameters
  const handleGenerateLocalPitch = () => {
    setIsGeneratingPitch(true);
    setTimeout(() => {
      const targetSol = solutions.find(s => s.id === pitchSolutionId);
      const solName = targetSol ? targetSol.name : "CRM 지능형 마케팅 솔루션";
      const decisionMaker = contacts.find(c => c.role === '브랜드 본사 담당자') || contacts[0];
      const buyerName = decisionMaker ? `${decisionMaker.name} ${decisionMaker.position || "담당자님"}` : "본사 핵심 바이어님";
      const categoryLabel = brand.category || "F&B Brand";

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

■ 도입 12주 이내 점포 매출 순증 미달성 시, 해당 솔루션료 라이선스 전액 환불 보증 조항 적용:
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

행여 가맹점 관리에 부담이 갈 세부 오프라인 교육 스트레스를 저희 전문가 그룹이 무상으로 온전히 위임 해결해 드리겠습니다. 단골 점주들이 먼저 '참 편하다'며 미소 짓는 고품격 성장 스마트 모듈 제안을 받아보세요.

담당 파트너님과 점주님의 상생 동행관계를 푸르게 빛내고 싶습니다.

감사합니다.

상생 영업 파트너 매니저 드림`;
      }

      setPitchDraft(generated);
      setIsGeneratingPitch(false);
      triggerToast("Gemini 기반 맞춤형 제안서 초안 작성이 끝났습니다! 🖋️");
    }, 750);
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
    triggerToast(`${type === 'phone' ? '전화번호' : '이메일 주소'}가 복사되었습니다.`);
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
        triggerToast("바이어 실시간 인라인 정보가 자동 저장(Blur Save)되었습니다. ✨");
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
        triggerToast("리마인더 알림 설정을 변경하였습니다. 🔔");
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

  const handleAddComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim()) return;

    const matchedCollab = COLLABORATORS.find(c => c.name === (userRole === 'Admin' ? '기획관제 어드민' : '김영업 과장'));
    const authorName = matchedCollab ? matchedCollab.name : "영업 전문가";
    const authorRoleName = matchedCollab ? matchedCollab.role : userRole;
    const authorAvatar = matchedCollab ? matchedCollab.initial : "영";

    const myComment: Comment = {
      id: `comment-${Date.now()}`,
      author: authorName,
      role: authorRoleName,
      avatar: authorAvatar,
      content: newCommentText,
      createdAt: new Date().toISOString()
    };

    const updated = [...comments, myComment];
    saveCommentsToStorage(updated);
    setNewCommentText("");
    setShowMentionSuggestions(false);
    triggerToast("협업 코멘트가 실시간 피드에 등록되었습니다. 💬");
    onRefreshMeetings(); // Trigger parent refresh
  };

  const handleCommentTextChange = (text: string) => {
    setNewCommentText(text);
    const words = text.split(" ");
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith("@")) {
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleSelectMention = (collabName: string) => {
    const words = newCommentText.split(" ");
    words[words.length - 1] = `@${collabName} `;
    setNewCommentText(words.join(" "));
    setShowMentionSuggestions(false);
  };

  const handleUpdateCommission = (newRate: string) => {
    setCommissionRate(newRate);
    localStorage.setItem(`commission_rate_${brand.id}`, newRate);
    triggerToast("제휴 수수료율이 업데이트되었습니다. 🪙");
  };

  // Segment meetings logs
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

  // Combine User comments + meetings logs + system events into unified chronological feed
  const timelineNodes: TimelineNode[] = [];

  // Add comments as nodes
  comments.forEach(c => {
    timelineNodes.push({
      id: c.id,
      type: 'comment',
      timestamp: c.createdAt,
      author: c.author,
      role: c.role,
      content: c.content,
      avatar: c.avatar,
      isAI: c.isAI
    });
  });

  // Add meetings as nodes (acting as AI summarized transcripts/meetings checkpoints)
  brandMeetings.forEach(m => {
    const matchedSol = solutions.find(s => s.id === m.solutionId);
    const solLabel = matchedSol ? matchedSol.name.split(' (')[0] : "일반 제안 세션";
    
    timelineNodes.push({
      id: m.id,
      type: 'meeting',
      timestamp: m.dateTime,
      author: m.department || "B2B 영업 TF",
      role: "AI 회의록 시스템",
      content: m.notes || `${m.title} 대면 미팅이 수행 완료되었습니다.`,
      meetingData: m,
      avatar: "🤖",
      isAI: true // Display with AI summaries style
    });
  });

  // Sort unified timelines chunk descending (latest updates at top)
  const sortedTimeline = [...timelineNodes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] relative overflow-hidden font-sans">
      
      {/* -------------------------------------------------------------
          TOP BAR: [최상단 Sticky Header] 고정 헤더 영역
         ------------------------------------------------------------- */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0 bg-white z-20 shadow-4xs">
        <div className="flex items-center gap-3">
          <span className={`w-9.5 h-9.5 flex items-center justify-center rounded-2xl text-[14.5px] font-black shadow-inner ${
            brand.category === 'F&B Brand' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[#FFF1F2] text-[#E11D48]'
          }`}>
            {brand.logo}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-[14.5px] tracking-tight">{brand.name}</h3>
              <span className={`text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.5 rounded-md border ${
                brand.category === 'F&B Brand' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-rose-50 border-rose-100 text-rose-700'
              }`}>
                {brand.category === 'F&B Brand' ? 'F&B 푸드' : '리테일 파트너'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5 tracking-tight flex items-center gap-1.5">
              <span>Account 360° 비즈니스 협업 정보망</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className="text-indigo-600">Linear Active State</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Easy sync button */}
          <button 
            type="button"
            onClick={() => setLocalSyncCount(p => p + 1)}
            disabled={isLoading}
            className={`p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-400 transition-all cursor-pointer ${isLoading ? 'animate-spin text-indigo-500' : ''}`}
            title="실시간 원터치 수동 동기화"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="패널 닫기"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          TABS SWITCHER: Notion & Linear 스타일 탭 바
         ------------------------------------------------------------- */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-105 flex gap-1.5 shrink-0 z-10 overflow-x-auto scrollbar-none">
        {[
          { id: 'timeline', label: "💬 실시간 통동 피드", icon: MessageSquare, count: sortedTimeline.length },
          { id: 'data', label: "📊 가맹 제어 & 바이어", icon: Users },
          { id: 'playbook', label: "🔌 도입 & 플레이북", icon: Sparkles }
        ].map(t => {
          const isActive = activeTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setShowMentionSuggestions(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10.5px] font-black transition-all cursor-pointer select-none ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-2xs' 
                  : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {'count' in t && t.count !== undefined && (
                <span className={`text-[8.5px] px-1 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Embedded confettis */}
      <ConfettiEffect
        active={!!confettiSolutionId}
        onComplete={() => setConfettiSolutionId(null)}
      />

      {/* Toast representation bubble */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-18 inset-x-6 mx-auto max-w-xs bg-slate-900 text-white p-3 rounded-xl text-[10px] font-bold text-center shadow-lg z-50 flex items-center justify-center gap-2 border border-slate-800"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          MAIN CORE WORKSPACE CONTAINER
         ------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scroll-smooth min-h-0 relative">
        
        {updateError && (
          <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-2xl flex items-start gap-2 text-xs text-rose-800 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{updateError}</span>
          </div>
        )}

        {/* =============================================================
            TAB 1: UNIFIED CHRONOLOGICAL FEED (💬 실시간 통동 피드)
           ============================================================= */}
        {activeTab === 'timeline' && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Quick Pitch Letter Prompt banner */}
            <div className="bg-indigo-50/50 p-4 rounded-3xl border-0 flex items-center justify-between gap-4 shadow-4xs hover:bg-indigo-50/75 transition-all">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase text-indigo-700 tracking-wider font-mono">
                  Smart Onboarding Tips ⚡
                </span>
                <p className="text-[11px] font-extrabold text-slate-800 leading-normal">
                  담당 바이어 맞춤형 세일즈 피칭 초안이 필요하신가요?
                </p>
                <p className="text-[9.5px] text-slate-400 font-bold leading-normal">
                  오른쪽 '도입 & 플레이북' 탭에서 AI가 제안하는 극복 시나리오와 맞춤형 이메일을 1초 만에 확인하세요.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveTab('playbook')} 
                className="p-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl transition-all shadow-4xs shrink-0 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Combined Chronological Stream list */}
            <div className="space-y-4 relative">
              {/* Central Connection vertical timeline line */}
              <div className="absolute left-4.5 top-4 bottom-4 w-0.5 bg-slate-100/80 z-0" />

              {sortedTimeline.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-slate-400 py-12 flex flex-col items-center justify-center">
                  <MessageSquare className="w-7 h-7 text-slate-300 mb-1.5" />
                  <p className="text-xs font-black text-slate-500">통합 피드에 기록된 미팅 이력이나 협업 대화가 없습니다.</p>
                  <p className="text-[10px] text-slate-400 mt-1">하단 고정창에 첫 공동 실시간 영엽 회의록 메모를 전파해 보세요!</p>
                </div>
              ) : (
                sortedTimeline.map((node) => {
                  const isComment = node.type === 'comment';
                  const isAI = node.isAI;

                  // 1) RENDER AI-SUMMARIZED GORGEOUS CARD (for meetings logs & bot reports)
                  if (!isComment && isAI && node.meetingData) {
                    const meet = node.meetingData;
                    const matchedSol = solutions.find(s => s.id === meet.solutionId);
                    const solLabel = matchedSol ? matchedSol.name : "일반 세일즈 제안";
                    
                    return (
                      <div key={`node-${node.id}`} className="flex gap-4 relative z-10 group animate-fadeIn">
                        {/* Round glowing Purple Star Icon Node */}
                        <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-black shrink-0 shadow-sm shadow-purple-200/50">
                          <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                        </div>

                        {/* Bento Style AI-Meeting Summary Card ( 연한 보라색 배경과 마법봉 아이콘 적용 ) */}
                        <div className="flex-1 bg-purple-50/60 hover:bg-purple-50 border border-purple-100/40 rounded-3xl p-4.5 text-left space-y-3 transition-all hover:-translate-y-0.5 hover:shadow-2xs">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                                  🤖 Gemini AI 회의 요약
                                </span>
                                <span className={`text-[8.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                  pipelineColors[meet.pipelineStatus]?.bg || 'bg-slate-150'
                                } ${pipelineColors[meet.pipelineStatus]?.text || 'text-slate-600'}`}>
                                  {meet.pipelineStatus}
                                </span>
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-[12.5px] mt-1.5">{meet.title}</h4>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-purple-400">
                              {new Date(meet.dateTime).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {meet.notes && (
                            <div className="text-[11px] text-slate-700 leading-relaxed font-semibold">
                              <span className="text-purple-700 block font-bold text-[8px] uppercase tracking-wide mb-1">회의록 원문 요약 (Notes Summary)</span>
                              <p className="bg-white/80 p-3 rounded-2xl border border-purple-100/30 whitespace-pre-wrap">{meet.notes}</p>
                            </div>
                          )}

                          {meet.actionItems && meet.actionItems.length > 0 && (
                            <div className="space-y-1.5 pt-1.5 border-t border-purple-200/20 text-[10.5px]">
                              <span className="text-rose-600 font-extrabold block text-[8px] uppercase tracking-wider">🚨 동시 추출 후속 과제 (Action Items)</span>
                              <div className="grid grid-cols-1 gap-1.5">
                                {meet.actionItems.map((aiItem, aIdx) => (
                                  <div key={aIdx} className="flex items-start gap-1.5 bg-[#FFF5F5] border border-rose-100 p-2 rounded-xl text-left">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span className="font-bold text-slate-700 text-[10px] leading-relaxed">{aiItem}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quick Switch Reminder control in timeline */}
                          <div className="flex justify-between items-center pt-2.5 border-t border-purple-200/15 text-[8.5px] font-mono text-purple-500">
                            <span>B2B 자동 링커 온보딩</span>
                            <button
                              type="button" 
                              onClick={() => handleToggleReminder(meet.id, meet.reminderSet || false)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-black cursor-pointer transition-all select-none ${
                                meet.reminderSet 
                                  ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]" 
                                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <Bell className={`w-3 h-3 ${meet.reminderSet ? 'text-[#D97706] animate-swing' : ''}`} />
                              <span>{meet.reminderSet ? "구글캘린더 연동 알림 켬" : "알림 기가동 예약"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2) RENDER SYSTEM EVENT CHIP 🤖
                  if (node.isAI && node.avatar === "🤖" && isComment) {
                    return (
                      <div key={`node-${node.id}`} className="flex gap-4 relative z-10 animate-fadeIn">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center justify-center font-black shrink-0 shadow-inner">
                          <Bot className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-3.5 text-left flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[8.5px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">SYSTEM AGENT</span>
                            <p className="text-[11px] font-bold text-slate-700 mt-1">{node.content}</p>
                          </div>
                          <span className="text-[8px] font-mono font-bold text-slate-450 whitespace-nowrap">
                            {new Date(node.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 3) RENDER CORE USER COMMENTS
                  return (
                    <div key={`node-${node.id}`} className="flex gap-4 relative z-10 group animate-fadeIn">
                      {/* Avatar initial circle */}
                      <div className="w-9 h-9 rounded-xl bg-white border border-slate-150 text-[11px] font-extrabold text-slate-700 flex items-center justify-center shrink-0 uppercase shadow-xs">
                        {node.avatar}
                      </div>

                      {/* Comment Message balloon */}
                      <div className="flex-1 bg-white hover:bg-slate-25/40 border border-slate-102/70 rounded-3xl p-4 text-left space-y-1 transition-all hover:translate-y-px">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800 font-black">{node.author}</span>
                            <span className="text-[8.5px] font-mono font-bold text-slate-400 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
                              {node.role}
                            </span>
                          </div>
                          <span className="text-[8.5px] text-slate-400 font-bold font-mono">
                            {new Date(node.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-800 font-medium leading-relaxed whitespace-pre-wrap selection:bg-[#E0F2FE]">
                          {node.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 2: ACCOUNT DATA & DIAGNOSTICS (📊 가맹 제어 & 바이어)
           ============================================================= */}
        {activeTab === 'data' && (
          <div className="space-y-5 animate-fadeIn text-left">
            
            {/* 2A: Bento Card of rigid statistics (가맹점 수, 수수료율 등 폼 데이터 바인딩) */}
            <div className="bg-white rounded-3xl p-5 shadow-4xs space-y-4 font-sans">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">가맹 브랜드 상세 대시보드</span>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-50/50 p-4.5 rounded-2xl border-0">
                  <span className="text-[9px] font-bold text-slate-440 block uppercase tracking-wider">추정 월 매출 등급</span>
                  <span className="text-[14px] font-black text-[#04C75A] mt-1.5 block">
                    {brand.monthlyRevenueEst || "미파악 전세"}
                  </span>
                </div>

                {/* 제휴 수수료율 (Commission Rate Data Point) */}
                <div className="bg-slate-50/50 p-4.5 rounded-2xl border-0 relative group">
                  <span className="text-[9px] font-bold text-slate-440 block uppercase tracking-wider">제휴 영업 수수료율</span>
                  <div className="flex items-center justify-between gap-2.5 mt-1">
                    <input 
                      type="text"
                      value={commissionRate}
                      onChange={(e) => handleUpdateCommission(e.target.value)}
                      placeholder="예시: 2.8%"
                      className="text-[14px] font-black text-indigo-700 bg-transparent border-b border-transparent focus:border-indigo-400 focus:outline-none w-18 p-0"
                      title="클릭 시 즉시 계약 수수료 지수 변경 가능"
                    />
                    <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4.5 rounded-2xl border-0 col-span-2">
                  <span className="text-[9px] font-bold text-slate-440 block uppercase tracking-wider">온보딩 실마리 매장 타겟 수</span>
                  <p className="text-[11px] text-slate-800 font-extrabold mt-1.5">
                    현재 전국 직가맹망 본점 외 <strong className="text-indigo-600 font-black text-[14px]">{brand.targetStoresCount || 0}</strong>개 자라 지점 보유
                  </p>
                </div>
              </div>

              {/* HQ Map position & Description info */}
              <div className="space-y-3.5 pt-2 text-[11px] font-medium leading-relaxed">
                <div className="flex items-start gap-2 text-slate-650 bg-slate-25/50 p-3.5 rounded-2xl">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[9px] text-slate-400 font-black">본사 실소재지</span>
                    <strong className="text-slate-800 font-bold select-all text-[11.5px]">{brand.headquarters || "등록된 본사 등록 주소명이 존재하지 않습니다."}</strong>
                  </div>
                </div>

                <div className="bg-slate-50/30 p-4 rounded-2xl border border-slate-100/50 text-[11px] leading-relaxed">
                  <span className="block text-[9px] font-bold text-slate-400 mb-1">상업 가맹 브랜드 핵심 소개 요약</span>
                  <p className="text-slate-600 font-medium italic">{brand.description || "등록된 부가 소개 텍스트가 없습니다."}</p>
                </div>
              </div>

              {/* Sub-stages of core Negotiations */}
              {onUpdateProposalSubStage && (
                <div className="pt-2.5 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-700 flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-amber-500" />
                      <span>제안서 상세 품의 단계 (CRM Pipeline Track)</span>
                    </span>
                    <span className="text-[8px] font-mono font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md uppercase">
                      현재 기안: {brand.proposalSubStage || 'Draft'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                    {[
                      { id: 'Draft', step: '01', title: '송신 완료' },
                      { id: 'Tech', step: '02', title: '기술 검증' },
                      { id: 'Negotiation', step: '03', title: '단조율' },
                      { id: 'Approval', step: '04', title: '최종 기안' }
                    ].map((stepObj) => {
                      const isCurrent = brand.proposalSubStage === stepObj.id;
                      const stageArr = ['Draft', 'Tech', 'Negotiation', 'Approval'];
                      const isDoneSaved = brand.proposalSubStage ? stageArr.indexOf(stepObj.id) <= stageArr.indexOf(brand.proposalSubStage) : false;

                      return (
                        <button
                          key={stepObj.id}
                          type="button"
                          onClick={() => onUpdateProposalSubStage(brand.id, stepObj.id as any)}
                          className={`text-left p-2.5 rounded-xl border flex flex-col justify-between h-15 cursor-pointer transition-all select-none hover:-translate-y-px active:scale-95 ${
                            isCurrent 
                              ? 'bg-amber-500 text-white border-amber-600 shadow-3xs text-xs' 
                              : isDoneSaved
                              ? 'bg-amber-50/50 border-amber-200 text-amber-900 font-extrabold text-xs'
                              : 'bg-white border-slate-150 text-slate-550 text-xs'
                          }`}
                        >
                          <span className={`text-[7.5px] font-mono font-bold tracking-widest ${isCurrent ? 'text-white/85' : 'text-slate-400'}`}>
                            STAGE {stepObj.step}
                          </span>
                          <span className="font-extrabold text-[9.5px] block truncate">{stepObj.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2B: Contacts network (담당 바이어망 - double-click inline editor) */}
            <div className="bg-white rounded-3xl p-5 shadow-4xs space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">귀사 도킹 담당 명록 (더블클릭 편집 지원)</span>
                
                <button
                  type="button"
                  onClick={() => setIsAddingContact(!isAddingContact)}
                  className="flex items-center gap-1.5 text-[9px] font-black bg-slate-50 hover:bg-slate-100 text-slate-800 transition-all p-1.5 px-2.5 rounded-xl cursor-pointer shadow-4xs border border-slate-100"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isAddingContact ? '화면접기' : '바이어 직접 추가'}</span>
                </button>
              </div>

              {isAddingContact && (
                <form onSubmit={handleContactSubmit} className="bg-indigo-50/10 p-4 border border-indigo-150/40 rounded-2xl space-y-3.5 animate-fadeIn">
                  <span className="block text-[10px] font-black text-indigo-700">👤 신규 제휴 바이어 인적 등록</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <label className="text-[8.5px] font-bold text-slate-400">성명 (필수)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="최주희 대리"
                        value={newContact.name}
                        onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                        className="w-full text-xs p-2 border border-slate-150 rounded-xl bg-white focus:outline-none font-bold"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8.5px] font-bold text-slate-400">직급 / 담당업무</label>
                      <input 
                        type="text" 
                        placeholder="마케팅 본부 실무"
                        value={newContact.position}
                        onChange={(e) => setNewContact({...newContact, position: e.target.value})}
                        className="w-full text-xs p-2 border border-slate-150 rounded-xl bg-white focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <label className="text-[8.5px] font-bold text-slate-400">세일즈 역할</label>
                      <select
                        value={newContact.role}
                        onChange={(e) => setNewContact({...newContact, role: e.target.value as any})}
                        className="w-full text-xs p-2 border border-slate-150 rounded-xl bg-white focus:outline-none font-black"
                      >
                        <option value="브랜드 본사 담당자">브랜드 본사 담당자</option>
                        <option value="VAN대리점">VAN대리점</option>
                        <option value="그 외">그 외</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8.5px] font-bold text-slate-400">연락 무선정보</label>
                      <input 
                        type="text" 
                        placeholder="010-XXXX-XXXX"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                        className="w-full text-xs p-2 border border-slate-150 rounded-xl bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs">
                    <label className="text-[8.5px] font-bold text-slate-400">이메일 주소</label>
                    <input 
                      type="email" 
                      placeholder="buyer@brandcorp.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                      className="w-full text-xs p-2 border border-slate-150 rounded-xl bg-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingContact(false)}
                      className="px-3 py-1.5 bg-white border border-slate-150 font-bold text-[9.5px] rounded-xl cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-[#03C75A] text-white font-bold text-[9.5px] rounded-xl cursor-pointer"
                    >
                      인적 바이어 추가
                    </button>
                  </div>
                </form>
              )}

              {contacts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-25/50 rounded-2xl">
                  <p className="text-xs font-bold text-slate-450">등록 완료된 도합 바이어가 존재하지 않습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(['브랜드 본사 담당자', 'VAN대리점', '그 외'] as const).map(roleCategory => {
                    const categorized = contacts.filter(c => c.role === roleCategory);
                    if (categorized.length === 0) return null;

                    return (
                      <div key={roleCategory} className="space-y-2">
                        <span className="text-[9.5px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full inline-block">
                          {roleCategory} ({categorized.length})
                        </span>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {categorized.map(c => {
                            const isEd = editingContactId === c.id;
                            return (
                              <div
                                key={c.id}
                                className={`p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/30 rounded-2xl transition-all space-y-2.5 ${
                                  isEd ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                                }`}
                              >
                                {isEd ? (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                      <input 
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                        onBlur={() => handleInlineAutoSave(c.id)}
                                        onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                        className="p-1 px-1.5 border border-indigo-300 rounded-lg focus:outline-none bg-white font-black"
                                        placeholder="바이어 성명"
                                        autoFocus
                                      />
                                      <input 
                                        type="text"
                                        value={editForm.position}
                                        onChange={(e) => setEditForm({...editForm, position: e.target.value})}
                                        onBlur={() => handleInlineAutoSave(c.id)}
                                        onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                        className="p-1 px-1.5 border border-indigo-300 rounded-lg focus:outline-none bg-white font-bold text-slate-550"
                                        placeholder="직무"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <input 
                                        type="text"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                                        onBlur={() => handleInlineAutoSave(c.id)}
                                        onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                        className="p-1 px-1.5 border border-indigo-300 rounded-lg focus:outline-none bg-white"
                                        placeholder="연락 번호"
                                      />
                                      <input 
                                        type="text"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                        onBlur={() => handleInlineAutoSave(c.id)}
                                        onKeyDown={(e) => handleKeyDownContact(e, c.id)}
                                        className="p-1 px-1.5 border border-indigo-300 rounded-lg focus:outline-none bg-white"
                                        placeholder="이메일 주소"
                                      />
                                    </div>
                                    <span className="block text-[7.5px] font-semibold text-slate-400">
                                      [Enter 키 혹은 외부 클릭 시 자동 저장 처리됩니다]
                                    </span>
                                  </div>
                                ) : (
                                  <div 
                                    onDoubleClick={() => handleStartEditContact(c)}
                                    className="flex items-center justify-between gap-3 cursor-pointer group"
                                    title="더블 클릭 시 즉시 정보 수정 상태 연계"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 bg-indigo-50 text-indigo-700 font-extrabold text-[11px] rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                                        {c.name.substring(0, 1)}
                                      </div>
                                      <div>
                                        <h5 className="font-extrabold text-[11.5px] text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                                          <span>{c.name}</span>
                                          <Edit3 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        </h5>
                                        <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">{c.position || "실무 소통 관리"}</p>
                                      </div>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-400 pr-1 group-hover:text-slate-600">더블클릭 수정 📱</span>
                                  </div>
                                )}

                                {!isEd && (
                                  <div className="bg-white/80 p-2.5 rounded-xl text-[10px] grid grid-cols-1 gap-1 border border-slate-100/55">
                                    {c.phone && (
                                      <div className="flex justify-between items-center text-slate-650 font-bold">
                                        <span className="flex items-center gap-1 truncate select-all">
                                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="font-mono text-[10.5px]">{c.phone}</span>
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleCopy(c.phone, 'phone')}
                                          className="text-[8px] text-[#03C75A] font-black border border-slate-150 px-1 bg-white hover:bg-slate-50 rounded-md cursor-pointer select-none"
                                        >
                                          복사
                                        </button>
                                      </div>
                                    )}
                                    {c.email && (
                                      <div className="flex justify-between items-center text-slate-650 font-bold">
                                        <span className="flex items-center gap-1 truncate select-all">
                                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="text-[10.5px] truncate">{c.email}</span>
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => handleCopy(c.email, 'email')}
                                          className="text-[8px] text-[#03C75A] font-black border border-slate-150 px-1 bg-white hover:bg-slate-50 rounded-md cursor-pointer select-none"
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============================================================
            TAB 3: DEBUT & OBJECTIONS (🔌 도입 & 플레이북 플랫)
           ============================================================= */}
        {activeTab === 'playbook' && (
          <div className="space-y-5 animate-fadeIn text-left">
            
            {/* 3A: Solution pipeline counter (제품라인 교차 및 도입 파이프라인 관리스케일) */}
            <div className="bg-white rounded-3xl p-5 shadow-4xs space-y-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">4개 교차 세일즈 제품 도입 경과 (Cross-Selling State)</span>
              
              <div className="space-y-3">
                {solutions.map(sol => {
                  const mapping = brandSolutions.find(bs => bs.solutionId === sol.id);
                  const currentStatus = mapping?.pipelineStatus || "Cold Call";
                  const theme = solutionThemes[sol.code] || {
                    bg: "bg-slate-50", border: "border-slate-150", text: "text-slate-705", accent: "bg-slate-400"
                  };
                  const isEdSol = editingSolutionId === sol.id;

                  return (
                    <div 
                      key={sol.id} 
                      className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden ${theme.bg} ${theme.border}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <span className="text-[7.5px] font-mono tracking-widest font-black text-slate-400 block">SOLUTION SPECIFIERS</span>
                          <h6 className={`text-[11px] font-black ${theme.text}`}>{sol.name} ({sol.code})</h6>
                        </div>
                        
                        {!isEdSol && (
                          <button
                            type="button"
                            onClick={() => setEditingSolutionId(sol.id)}
                            className="bg-white border border-slate-200 hover:bg-slate-50 text-[9px] font-extrabold px-2.5 py-1 rounded-xl text-slate-650 transition-all cursor-pointer select-none"
                          >
                            상태 수정
                          </button>
                        )}
                      </div>

                      {isEdSol ? (
                        <div className="space-y-1.5 pt-1 text-[10px] animate-fadeIn w-full">
                          <label className="text-[8.5px] font-extrabold text-slate-400 block">단계 직접 변경 연동</label>
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
                                className={`text-[9.5px] p-1.5 rounded-lg font-extrabold text-center cursor-pointer select-none transition-all ${
                                  currentStatus === st.id 
                                    ? "bg-slate-900 text-white" 
                                    : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {st.text}
                              </button>
                            ))}
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setEditingSolutionId(null)}
                            className="text-[8.5px] text-slate-500 hover:underline font-black block text-right pt-0.5 cursor-pointer"
                          >
                            수정 취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-0.5 text-[10px] font-extrabold text-slate-550">
                          <span className="flex items-center gap-1.5 text-[9.5px]">
                            <span className={`w-1.5 h-1.5 rounded-full ${theme.accent}`} />
                            <span>{currentStatus === 'Cold Call' ? '📞 콜드콜 접촉' : currentStatus === 'First Meeting' ? '🤝 첫 대면 미팅' : currentStatus === 'Proposal & Negotiation' ? '⏳ 제안 설명 및 단조율' : '🏆 최종 계약 완료'}</span>
                          </span>
                          <span className="font-mono text-[9px] text-slate-400 font-bold">
                            {pipelineColors[currentStatus]?.progress}% 완료
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3B: Interactive counter objection handler (실지 반대 극복 시큐레이터) */}
            <div className="bg-white rounded-3xl p-5 shadow-4xs space-y-4">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">가맹 바이어 설득 플레이북 (Objection Handlers)</span>
              
              <div className="space-y-3">
                {[
                  {
                    title: "이미 경쟁사 B2B 기기로 적립 사용 중입니다",
                    quote: "“매장에 경쟁사의 기기와 적립 혜택 툴을 이미 수년째 계약해서 사용 중입니다. 굳이 조건 수수료를 내가면서까지 바꿀 납득할 매력이 없어요.”",
                    tactics: "타사 단순 적립을 넘은 실질 AI 이탈률 방지 재방문율 24% 부스팅 성과를 강조하며, 남은 위약금을 소급 메울 웰컴 지원 크레딧과 무상 세팅 팩을 제공하여 심리 전환 장벽을 제로로 만듭니다.",
                    script: `"${brand.name} 바이어님, 기존 도구에 만족하시는 것 역시 훌륭하십니다. 다만 30%의 유효 적립 단골들이 최근 경쟁사 지점으로 이주하는 사각지대는 놓치고 계실 수 있습니다. 도도포인트 및 커넥트 라인은 이들의 행동을 AI 예측 복원해 드리는 특별 강점이 확보되어 있는 만큼, 기존 위약금을 적극 완화해 드릴 대행 지원 팩을 한시 배정해 드리겠습니다."`
                  },
                  {
                    title: "지점주들이 새로운 프로그램 조작을 어려워합니다",
                    quote: "“지점주들이 새로운 관리기 조작법이나 교육을 이수받는 걸 아주 피로해하고 싫어해 본사 관리단에서 큰 주저가 일어납니다.”",
                    tactics: "60대 대리점주 및 가맹 점주님들도 단 1분 만에 완벽 적응할 수준의 원터치 '체인지 스마트 프리셋'을 현시하고, 도입 후 첫 주간 본사 직영 코칭 에이전트 무상 파견 1:1 순회 밀착 강습을 약속합니다.",
                    script: `"${brand.name} 본부장님, 신규 기기 수급에 따른 가맹 점주님들의 실제 심적 스트레스는 지극히 당연히 겪을 고민이 맞습니다. 이에 저희 기술 파트는 복잡한 점주 화면을 일절 생략한 '간편 미러링 장부'를 도입함과 동시에, 전담 방문 에이전트들이 1주일간 지점을 직방하며 무료로 맞춤 세팅과 현장 점주 교육을 완벽 대행함을 서합 기두 기재해 드립니다."`
                  },
                  {
                    title: "추가 지출되는 월정 라이선스료 부담 & ROI 우려",
                    quote: "“매장당 지속 지출되는 월 전용 수수료 대비 매출이 과연 그 이상 올라간다는 실 데이터가 신뢰성이 있는지요?”",
                    tactics: "평균 가맹점 객단가 18% 증가 및 매장 방문 유효 빈도 1.7회 상승 검증 데이터를 제공고, '도입 첫 달 매출 소급 미순증 발생 시 전액 라이선스료 환불 보증제' 안전 서약 합의서를 제안서에 삽입합니다.",
                    script: `"${brand.name} 부장님, 월 마케팅 도입비는 숨은 지출이 아닌 객단가 18%가 오르는 확실한 자산 투자가 맞습니다. 저희는 실 적용 성공 수치를 바탕으로 기획안 내 '도입 직후 매출 추가 순증 미달성 환불 보증제' 공식 계약 조문을 공식 추진해 드릴 수 있어 점주들의 초기 우려를 선제 차단해 드릴 수 있습니다."`
                  }
                ].map((obj, index) => {
                  const isActive = activeObjectionIndex === index;
                  const hasVoted = !!votedObjections[index];
                  return (
                    <div 
                      key={obj.title}
                      onClick={() => setActiveObjectionIndex(index)}
                      className={`p-3.5 border rounded-2xl transition-all cursor-pointer space-y-2.5 text-[11px] ${
                        isActive 
                          ? 'bg-amber-500/5 border-amber-300 ring-2 ring-amber-400/10' 
                          : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/40'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <h6 className="font-extrabold text-[11px] text-slate-805 leading-tight flex items-center gap-1.5">
                          <Check className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-500 font-black' : 'text-slate-350'}`} />
                          <span>{obj.title}</span>
                        </h6>
                        {isActive && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVotedObjections(p => ({ ...p, [index]: !p[index] }));
                            }}
                            className={`flex items-center gap-1 text-[8px] font-black p-1 px-2 rounded-lg cursor-pointer transition-all select-none border ${
                              hasVoted 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-white border-slate-200 text-slate-400'
                            }`}
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            <span>{hasVoted ? '적용했음' : '체크'}</span>
                          </button>
                        )}
                      </div>

                      {isActive && (
                        <div className="space-y-3.5 pt-2 border-t border-slate-100 animate-fadeIn text-[10.5px]">
                          <div className="bg-white p-3 rounded-xl border border-slate-100 font-medium italic text-slate-600">
                            <span className="block text-[8px] text-slate-400 font-black uppercase not-italic mb-0.5">바이어 발언 지표</span>
                            {obj.quote}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-amber-600 font-extrabold block text-[8.5px]">⚡ 카운터 극복 권유 전술 (Sales Counter Tactic)</span>
                            <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 font-extrabold text-slate-700">
                              {obj.tactics}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center bg-slate-20 py-1">
                              <span className="text-indigo-600 font-extrabold block text-[8.5px]">💬 즉시 피칭 추천 스크립팅</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(obj.script);
                                  triggerToast("스크립 문안 복사가 끝났습니다. 바이어에게 전파해 보세요! 📋");
                                }}
                                className="text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-150 px-1.5 py-0.5 rounded cursor-pointer select-none"
                              >
                                복사
                              </button>
                            </div>
                            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/30 font-medium leading-relaxed font-sans text-slate-800">
                              {obj.script}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3C: AI pitch mail maker (기지바이어 맞춤 메일 초안 빌더) */}
            <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
                <h5 className="text-[12.5px] font-extrabold tracking-tight">AI 맞춤형 제안 이메일 초안 빌더</h5>
              </div>

              <div className="grid grid-cols-1 gap-3.5 text-[10px] text-slate-200">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">목표 판매 솔루션 제품</span>
                  <select
                    value={pitchSolutionId}
                    onChange={(e) => setPitchSolutionId(e.target.value)}
                    className="w-full text-[10px] p-2 rounded-xl bg-slate-800 text-white border-0 focus:ring-1 focus:ring-indigo-400 focus:outline-none font-bold select-none cursor-pointer"
                  >
                    {solutions.map(sol => (
                      <option key={sol.id} value={sol.id}>{sol.name} ({sol.code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-400 block tracking-widest">설득 지향 제안 성과 어치 톤</span>
                  <select
                    value={pitchTone}
                    onChange={(e) => setPitchTone(e.target.value as any)}
                    className="w-full text-[10px] p-2 rounded-xl bg-slate-800 text-white border-0 focus:ring-1 focus:ring-indigo-400 focus:outline-none font-bold select-none cursor-pointer"
                  >
                    <option value="professional">🛡️ 파트너사 신뢰 지점장 케어 웰컴 톤</option>
                    <option value="revenue">📈 점포 당 마진 수수료 극대화 ROI 톤</option>
                    <option value="friendly">🤝 상생 프렌들리 상록수 톤</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateLocalPitch}
                disabled={isGeneratingPitch}
                className="w-full bg-[#03C75A] hover:bg-[#02a249] active:scale-95 disabled:opacity-50 text-white text-[10.5px] font-black p-2.5 rounded-xl transition-all shadow-md shadow-[#03C75A]/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isGeneratingPitch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini 가상 제안 제너레이팅 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>바이어 맞춤 피칭 초안 빌드 개시</span>
                  </>
                )}
              </button>

              <div className="space-y-1.5 pt-1.5 text-left text-[10px]">
                <div className="flex justify-between items-center text-[7.5px] font-mono font-bold text-slate-400">
                  <span>OUTFLOW CODIED PITCH LETTER</span>
                  {pitchDraft && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pitchDraft);
                        triggerToast("제안서 메일 초안 카탈로그가 복사되었습니다! 📨");
                      }}
                      className="text-[8.5px] font-black text-[#03C75A] bg-slate-800 hover:bg-slate-750 px-2 py-0.5 rounded cursor-pointer select-none"
                    >
                      문안 인쇄 복사
                    </button>
                  )}
                </div>

                {isGeneratingPitch ? (
                  <div className="bg-slate-850 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2 h-44 animate-pulse border border-white/5">
                    <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                    <p className="text-[9px] font-bold text-slate-400">바이어 직함을 연계하여 전용 이메일을 설계 중입니다...</p>
                  </div>
                ) : pitchDraft ? (
                  <textarea
                    value={pitchDraft}
                    onChange={(e) => setPitchDraft(e.target.value)}
                    className="w-full h-44 bg-slate-800 border-0 focus:ring-1 focus:ring-indigo-400 focus:outline-none rounded-xl p-3 text-[10px] leading-relaxed font-bold font-mono text-slate-200"
                    placeholder="제안서 빌더 개시해 보십시오."
                  />
                ) : (
                  <div className="bg-slate-800/40 border border-dashed border-slate-700/50 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 h-44">
                    <BookOpen className="w-5 h-5 text-slate-500" />
                    <p className="text-[10px] font-extrabold text-[#F8FAFC]">메일 제안서 시안 대기 중</p>
                    <p className="text-[8px] text-slate-400">설정에 따라 1초 내에 커스텀 마크업 제안 메일을 구성합니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* -------------------------------------------------------------
          BOTTOM FIXED INPUT: [하단 고정: 입력창] 언제나 타임라인 하단에 고정
          (실시간 협업 코멘트 작성 및 멘션 제어창)
         ------------------------------------------------------------- */}
      {activeTab === 'timeline' && (
        <div className="p-4 px-6 border-t border-slate-100 bg-white shrink-0 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.015)] relative">
          
          {/* Mention dropdown menu list overlay */}
          <AnimatePresence>
            {showMentionSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-6 right-6 mb-2 bg-white border border-slate-150 rounded-2xl shadow-lg z-50 overflow-hidden text-left"
              >
                <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between text-[8.5px] font-black text-slate-405 uppercase tracking-widest font-mono">
                  <span>👥 협업 공유인 멘션 (@Mention list)</span>
                  <span>단어 선택</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto">
                  {COLLABORATORS.map(collab => (
                    <button
                      key={collab.name}
                      type="button"
                      onClick={() => handleSelectMention(collab.name)}
                      className="w-full px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors text-left font-bold cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-650 flex items-center justify-center">
                          {collab.initial}
                        </span>
                        <div>
                          <p className="text-[11px] text-slate-800 font-extrabold">{collab.name}</p>
                          <p className="text-[8.5px] text-slate-405 font-medium">{collab.role}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-indigo-500 font-black">선택 🤝</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAddComment} className="flex gap-2.5 items-end">
            <div className="flex-1 relative bg-slate-50 rounded-2xl border border-slate-105 p-1 flex items-center">
              
              {/* Mention shortcut cue button */}
              <button
                type="button" 
                onClick={() => {
                  setNewCommentText(p => p + "@");
                  setShowMentionSuggestions(true);
                }}
                className={`p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all cursor-pointer ${showMentionSuggestions ? 'text-indigo-600' : ''}`}
                title="동료 멘션하기 (@)"
              >
                <AtSign className="w-3.5 h-3.5" />
              </button>

              <input 
                type="text"
                value={newCommentText}
                onChange={(e) => handleCommentTextChange(e.target.value)}
                placeholder="@멘션으로 동료를 소환하고 브랜드 세일즈 협의 내용을 전파하세요..."
                className="w-full text-[11.5px] font-medium bg-transparent border-none py-1.5 px-2 text-slate-800 focus:outline-none placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="p-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 text-white rounded-2xl transition-all shadow-md shadow-slate-950/5 cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* User Role Indicator caption */}
          <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-400 mt-2 pr-1 select-none">
            <span>실시간 연동: **localStorage sync**</span>
            <span>귀하 권한 등급: {userRole === 'Admin' ? '기획관제 어드민(Admin)' : '영업대표(Sales_Rep)'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
