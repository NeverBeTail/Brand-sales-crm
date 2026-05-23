import React, { useState, useMemo, useEffect } from "react";
import { 
  Building2, Calendar, Phone, Mail, MapPin, Users, Info, 
  TrendingUp, FileText, CheckCircle2, ChevronRight, UserPlus, 
  Plus, Search, ThumbsUp, Layers, Check, HelpCircle, AlertCircle, 
  MessageSquare, Sparkles, Send, Copy, ArrowRight, Video, ListTodo
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Brand, Meeting, Contact, Solution, BrandSolution } from "../types";

interface PropertyDetailProps {
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (id: string) => void;
  meetings: Meeting[];
  contacts: Contact[];
  solutions: Solution[];
  brandSolutions: BrandSolution[];
  userRole: string;
  onAddContact?: (contact: Contact) => void;
  onAddMeeting?: (meeting: Meeting) => void;
}

export default function PropertyDetail({
  brands,
  selectedBrandId,
  onSelectBrand,
  meetings,
  contacts,
  solutions,
  brandSolutions,
  userRole,
  onAddContact,
  onAddMeeting
}: PropertyDetailProps) {
  // Navigation & filter states within the Property Detail Page
  const [meetingFilter, setMeetingFilter] = useState<string>("all");
  const [searchMeetingQuery, setSearchMeetingQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // New Stakeholder (Contact) form state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: "",
    position: "",
    role: "브랜드 본사 담당자" as any,
    phone: "",
    email: ""
  });

  // New Meeting form state
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    type: "Offline" as "Online" | "Offline",
    dateTime: new Date().toISOString().substring(0, 16),
    location: "",
    googleMeetLink: "",
    pipelineStatus: "First Meeting" as any,
    notes: "",
    summary: "",
    actionItemsText: ""
  });

  // Local persistent Notes tab for the Property (Brand)
  const [propertyNotes, setPropertyNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("crm_property_notes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [localNoteText, setLocalNoteText] = useState("");

  const selectedProperty = useMemo(() => {
    return brands.find(b => b.id === selectedBrandId) || brands[0];
  }, [brands, selectedBrandId]);

  // Sync local note editor when selected property changes
  useEffect(() => {
    if (selectedProperty) {
      setLocalNoteText(propertyNotes[selectedProperty.id] || "");
    }
  }, [selectedProperty, propertyNotes]);

  const handleSaveNote = () => {
    if (!selectedProperty) return;
    const updated = {
      ...propertyNotes,
      [selectedProperty.id]: localNoteText
    };
    setPropertyNotes(updated);
    localStorage.setItem("crm_property_notes", JSON.stringify(updated));
    showNotification("임시 메모가 성공적으로 저장되었습니다!");
  };

  const showNotification = (msg: string) => {
    setCopiedText(msg);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification(`${label} 복사 완료!`);
  };

  // Associated contacts / stakeholders
  const propertyContacts = useMemo(() => {
    if (!selectedProperty) return [];
    return contacts.filter(c => c.brandId === selectedProperty.id);
  }, [contacts, selectedProperty]);

  // Associated meetings sorted chronologically (newest first)
  const propertyMeetings = useMemo(() => {
    if (!selectedProperty) return [];
    let list = meetings.filter(m => m.brandId === selectedProperty.id);

    if (meetingFilter === "online") {
      list = list.filter(m => m.type === "Online");
    } else if (meetingFilter === "offline") {
      list = list.filter(m => m.type === "Offline");
    }

    if (searchMeetingQuery.trim()) {
      const q = searchMeetingQuery.toLowerCase();
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.summary && m.summary.toLowerCase().includes(q))
      );
    }

    // Sort newest first
    return [...list].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [meetings, selectedProperty, meetingFilter, searchMeetingQuery]);

  // Solutions coverage calculations
  const adoptedSolutions = useMemo(() => {
    if (!selectedProperty) return [];
    return brandSolutions.filter(bs => bs.brandId === selectedProperty.id && bs.pipelineStatus === "Deal Completed");
  }, [brandSolutions, selectedProperty]);

  const activeBrandSolutionsPercent = useMemo(() => {
    if (solutions.length === 0) return 0;
    return Math.round((adoptedSolutions.length / 4) * 100);
  }, [adoptedSolutions, solutions]);

  // Handle forms
  const handleAddContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !newContact.name) return;

    const contactObj: Contact = {
      id: `contact-${Date.now()}`,
      brandId: selectedProperty.id,
      name: newContact.name,
      position: newContact.position || "담당자",
      role: newContact.role,
      phone: newContact.phone || "010-0000-0000",
      email: newContact.email || `${newContact.name}@example.com`
    };

    if (onAddContact) {
      onAddContact(contactObj);
    }
    
    setNewContact({ name: "", position: "", role: "브랜드 본사 담당자", phone: "", email: "" });
    setShowAddContact(false);
    showNotification("새 키맨/이해관계자가 수기 등록 완료되었습니다!");
  };

  const handleAddMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty || !newMeeting.title) return;

    const actionItems = newMeeting.actionItemsText
      ? newMeeting.actionItemsText.split("\n").filter(x => x.trim() !== "")
      : [];

    const meetingObj: Meeting = {
      id: `meet-${Date.now()}`,
      brandId: selectedProperty.id,
      title: newMeeting.title,
      dateTime: newMeeting.dateTime,
      type: newMeeting.type,
      location: newMeeting.type === "Offline" ? newMeeting.location : undefined,
      googleMeetLink: newMeeting.type === "Online" ? newMeeting.googleMeetLink : undefined,
      pipelineStatus: newMeeting.pipelineStatus,
      notes: newMeeting.notes,
      summary: newMeeting.summary || "상용 가용 미팅이 원활하게 진행되었습니다.",
      actionItems,
      reminderSet: false,
      reminderSent: false
    };

    if (onAddMeeting) {
      onAddMeeting(meetingObj);
    }

    setNewMeeting({
      title: "",
      type: "Offline",
      dateTime: new Date().toISOString().substring(0, 16),
      location: "",
      googleMeetLink: "",
      pipelineStatus: "First Meeting",
      notes: "",
      summary: "",
      actionItemsText: ""
    });
    setShowAddMeeting(false);
    showNotification("새 상담 일정 및 미팅 로그가 성공적으로 적재되었습니다!");
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-16">
      {/* Toast popup alert info */}
      <AnimatePresence>
        {copiedText && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-[#03C75A] border border-[#02b350] text-white px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-black tracking-tight"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{copiedText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Property Selection Center & Visual Top Banner */}
      <div className="glass-panel rounded-[32px] border border-[#03C75A]/100 p-6 sm:p-7 shadow-sm bg-gradient-to-r from-white via-white to-emerald-50/15 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        {/* Decorative dynamic ambient glow */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-emerald-400/5 rounded-full filter blur-2xl pointer-events-none" />
        
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-[#01893d] bg-[#dafbe4] border border-[#c6f6d5] rounded-lg px-2.5 py-1 tracking-wider uppercase font-mono">
              PROPERTY WORKSPACE
            </span>
            <span className="text-[10px] text-slate-400 font-bold">/</span>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100/50 rounded-lg px-2.5 py-1 font-bold">
              360° MASTER DETAIL
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#03C75A]" />
              <span>자산 상세 및 미팅 이력</span>
            </h2>

            {/* Property Selector Combobox Dropdown */}
            <div className="relative">
              <select
                value={selectedBrandId}
                onChange={(e) => onSelectBrand(e.target.value)}
                className="text-xs font-extrabold text-[#01893d] bg-white border border-[#03C75A]/20 hover:border-[#03C75A]/40 rounded-xl px-4 py-2.5 focus:outline-none shadow-xs transition-all cursor-pointer pr-8 appearance-none"
              >
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    🏷️ {b.name} ({b.category === "F&B Brand" ? "식음료형" : "스토어/기타"})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-455">
                <ChevronRight className="w-3.5 h-3.5 rotate-90 text-[#01893d]" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            프랜차이즈 가맹 본사의 법인 세부 프로필, 핵심 키맨(Stakeholders), 실시간 음성/텍스트 상담 미팅 이력을 종결 제어합니다.
          </p>
        </div>

        {/* Dynamic score summary meters */}
        <div className="flex items-center gap-3 bg-white/80 border border-slate-100 p-2.5 rounded-2xl shadow-6xs shrink-0 self-start md:self-auto">
          <div className="text-right">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">크로스셀 수주 가치</span>
            <span className="text-base font-black text-slate-850 block mt-1">
              {adoptedSolutions.length === 4 ? "🟢 4/4 전종결 완료" : `⏳ ${adoptedSolutions.length}/4 교차판매 진행중`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center font-black text-[11px] text-[#01893d] bg-emerald-50" style={{ backgroundImage: `conic-gradient(#03C75A ${activeBrandSolutionsPercent}%, #f1f5f9 ${activeBrandSolutionsPercent}% 100%)`, border: "none" }}>
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[10px] font-black">
              {activeBrandSolutionsPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Grid Micro-Bento Panels */}
      {selectedProperty && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-6xs">
            <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">총 소집 미팅 건수</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-[#01893d]">{propertyMeetings.length}</span>
              <span className="text-[10px] text-slate-400 font-semibold">회</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">
              온라인 {propertyMeetings.filter(m => m.type === "Online").length}건 / 오프라인 {propertyMeetings.filter(m => m.type === "Offline").length}건
            </p>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-6xs">
            <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">등재 이해관계자 수</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-indigo-600">{propertyContacts.length}</span>
              <span className="text-[10px] text-slate-400 font-semibold">명</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">본사 핵심 바이어 의사 결정층</p>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-6xs">
            <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">추정 점포 포트폴리오</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-rose-600">{selectedProperty.targetStoresCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold">개점 타겟</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">연동 성숙도 매칭 가능 잠재력</p>
          </div>

          <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-6xs">
            <span className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest block">가치평가 매출 규모</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-sm font-black text-slate-800 tracking-tight">{selectedProperty.monthlyRevenueEst}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-none">본사 월 추정 가공 기결</p>
          </div>
        </div>
      )}

      {/* Main Multi-Layout workspace panel */}
      {selectedProperty && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (4 Grid span): Property Profile & Solutions Status */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Property Profile Card */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-indigo-50/50 pb-3">
                <div className="w-10 h-10 rounded-xl bg-[#03C75A]/10 text-[#01893d] flex items-center justify-center font-black text-lg border border-[#03C75A]/20">
                  {selectedProperty.logo ? (
                    <span className="text-sm font-black uppercase text-[#01893d]">{selectedProperty.name.substring(0,2)}</span>
                  ) : "🏢"}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{selectedProperty.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{selectedProperty.category}</span>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      본사 소재지
                    </span>
                    <span className="font-black text-slate-700">{selectedProperty.headquarters || "서울 종로구 가맹본부3길"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      영업 진척 단계
                    </span>
                    <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                      {selectedProperty.pipelineStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">본 가맹 브랜드 상세 요약</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold italic p-3 bg-amber-50/30 border border-amber-100/50 rounded-2xl">
                    "{selectedProperty.description || "이 가맹 본사는 현재 수도권 직영 망을 중심으로 신속한 신규 도회 가맹을 계획하고 있습니다."}"
                  </p>
                </div>
              </div>
            </div>

            {/* Adopted Solutions Progress Map */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Layers className="w-4.5 h-4.5 text-indigo-550" />
                  <span>상품 도입 상황 (Cross-sell Stack)</span>
                </h3>
                <p className="text-[10.5px] text-slate-400 font-medium">4종 핵심 서비스 온보딩 여부를 트래킹합니다.</p>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: "sol-1", name: "도도포인트 (Dodo Point)", desc: "적립 수급 및 자동 타겟팅 카카오 마케팅 툴" },
                  { id: "sol-2", name: "나우웨이팅 (Now Waiting)", desc: "태블릿 대기열 제어 오프라인 혼잡 제어" },
                  { id: "sol-3", name: "네이버예약 (Naver Reservation)", desc: "매장 내 방문예약 및 비대면 테이블 통합 예약 주문" },
                  { id: "sol-4", name: "네이버커넥트 (Naver Connect)", desc: "영수증 리뷰 포렌식 분석 및 단골 추천 자동 챗봇 연동" }
                ].map((sol) => {
                  const adopted = brandSolutions.some(bs => bs.brandId === selectedProperty.id && bs.solutionId === sol.id && bs.pipelineStatus === "Deal Completed");
                  return (
                    <div 
                      key={sol.id} 
                      className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        adopted 
                          ? "bg-emerald-50/40 border-emerald-150 text-emerald-950" 
                          : "bg-slate-50 border-slate-150/50 text-slate-400"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className={`text-[11px] font-black ${adopted ? "text-emerald-800" : "text-slate-700"}`}>
                          {sol.name}
                        </span>
                        <p className="text-[10px] text-slate-400 max-w-xs">{sol.desc}</p>
                      </div>
                      <div className={`p-1 rounded-full text-white shrink-0 mt-0.5 ${adopted ? "bg-[#03C75A]" : "bg-slate-200"}`}>
                        <Check className="w-3.5 h-3.5 stroke-[4px]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Property Private Notes */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-[#03C75A]" />
                  <span>임시 보강 기록 & 백 메모</span>
                </h3>
                <button
                  onClick={handleSaveNote}
                  className="px-2.5 py-1 text-[9px] font-black bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  메모 저장
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">영업 rep이 현장에서 파악한 성향이나 계약 협의 배경 메모입니다.</p>
              
              <textarea
                value={localNoteText}
                onChange={(e) => setLocalNoteText(e.target.value)}
                placeholder="예: '임원이 네이버예약 라인 연동 기획안 보충해서 다음 미팅 때 승부하기를 원함. 수수료 소급 조항 포함 가능성 70%.'"
                className="w-full h-28 text-[11px] p-2.5 bg-slate-50 hover:bg-slate-100/50 text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#03C75A] focus:bg-white transition-all font-medium leading-relaxed"
              />
            </div>

          </div>

          {/* Right Column (8 Grid span - Split to Stakeholders & Meetings chronicle) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Stakeholders (Contacts/Keyman) Section */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <Users className="w-4.5 h-4.5 text-indigo-550" />
                    <span>이해관계자 및 등재 키맨 ({propertyContacts.length}명)</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-medium">본 가맹 본사의 소통 채널 목록입니다.</p>
                </div>

                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="px-2.5 py-1.5 text-[10px] font-black bg-[#03C75A]/15 text-[#01893d] border border-[#03C75A]/25 rounded-xl hover:bg-[#03C75A]/25 transition flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddContact ? "닫기" : "새 키맨 등록"}</span>
                </button>
              </div>

              {/* Add Stakeholder Inline slide down form */}
              <AnimatePresence>
                {showAddContact && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddContactSubmit}
                    className="overflow-hidden bg-[#EEF2FF]/40 border border-blue-105 p-4 rounded-2xl space-y-3.5 text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2 pb-1 border-b border-blue-100">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                      <span className="font-extrabold text-slate-900">신규 의사결정권자 인적 사항 기입</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">성명 (필수)</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="김가맹 실장" 
                          value={newContact.name}
                          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">직위/부서</label>
                        <input 
                          type="text" 
                          placeholder="식품구매사업부 총괄팀장" 
                          value={newContact.position}
                          onChange={(e) => setNewContact({ ...newContact, position: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">파트너 역할군</label>
                        <select
                          value={newContact.role}
                          onChange={(e) => setNewContact({ ...newContact, role: e.target.value as any })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-505"
                        >
                          <option value="브랜드 본사 담당자">브랜드 본사 담당자</option>
                          <option value="VAN대리점">VAN대리점</option>
                          <option value="그 외">그 외 바이어</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">전화번호</label>
                        <input 
                          type="text" 
                          placeholder="010-3849-XXXX" 
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">이메일 주소</label>
                        <input 
                          type="email" 
                          placeholder="kimgameng@naver.com" 
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-blue-100">
                      <button 
                        type="button" 
                        onClick={() => setShowAddContact(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition font-bold"
                      >
                        취소
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-black"
                      >
                        이해관계자 정보 등록
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Stakeholder cards collection list */}
              {propertyContacts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs text-[11px] font-medium">
                  현재 이 가맹 자산에 등록된 직접 키맨이 없습니다. 우측 상단의 [새 키맨 등록] 버튼을 통해 이해관계자를 입력해 주세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {propertyContacts.map((contact) => (
                    <div 
                      key={contact.id} 
                      className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between hover:bg-white hover:border-[#03C75A]/20 hover:shadow-2xs transition-all relative overflow-hidden group"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-slate-850 text-xs flex items-center gap-1.5">
                              {contact.name}
                              <span className="text-[10px] font-medium text-slate-450">/ {contact.position || "사원"}</span>
                            </span>
                            <span className="inline-block text-[9px] font-black tracking-wide text-indigo-650 bg-indigo-50 border border-indigo-150 rounded px-1.5 py-0.5 mt-1">
                              {contact.role}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[10.5px] text-slate-400 font-medium pt-2 border-t border-dashed border-slate-150">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {contact.phone || "미제공"}
                            </span>
                            {contact.phone && (
                              <button 
                                onClick={() => handleCopy(contact.phone, "전화번호")}
                                className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-indigo-600 hover:underline transition"
                              >
                                복사
                              </button>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 truncate max-w-xs">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {contact.email || "미제공"}
                            </span>
                            {contact.email && (
                              <button 
                                onClick={() => handleCopy(contact.email, "이메일")}
                                className="opacity-0 group-hover:opacity-100 text-[9px] font-black text-indigo-600 hover:underline transition"
                              >
                                복사
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cron / Chronicle Meeting History Section */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-indigo-50/50">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-[#03C75A]" />
                    <span>영업 상담 미팅 역사 및 녹취 일지 ({propertyMeetings.length}회 수집됨)</span>
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-medium">과거 대외 소집 미팅 및 스마트 AI 요약본 일력입니다.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddMeeting(!showAddMeeting)}
                    className="px-3 py-1.5 text-[10px] font-black bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-1 cursor-pointer shadow-6xs"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>{showAddMeeting ? "기입 닫기" : "미팅 일정 추가"}</span>
                  </button>
                </div>
              </div>

              {/* Add Custom Meeting Schedule Form */}
              <AnimatePresence>
                {showAddMeeting && (
                  <motion.form 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    onSubmit={handleAddMeetingSubmit}
                    className="overflow-hidden bg-[#F0FDF4]/50 border border-emerald-150 p-4 rounded-2xl space-y-3 ttext-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2 pb-1 border-b border-emerald-200">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span className="font-extrabold text-[#01893d]">고객사 영업 회의 및 이력 임의 등록</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">대화/미팅 주제 (필수)</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="도도포인트 수수료율 인허 논의 미팅" 
                          value={newMeeting.title}
                          onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">일시 세팅</label>
                        <input 
                          type="datetime-local" 
                          required 
                          value={newMeeting.dateTime}
                          onChange={(e) => setNewMeeting({ ...newMeeting, dateTime: e.target.value })}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400">미팅 포맷 구분</label>
                        <select
                          value={newMeeting.type}
                          onChange={(e) => setNewMeeting({ ...newMeeting, type: e.target.value as any })}
                          className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        >
                          <option value="Offline">Offline 대면 회의</option>
                          <option value="Online">Online 화상 미팅</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        {newMeeting.type === "Offline" ? (
                          <>
                            <label className="text-[9px] font-bold text-slate-400">대면 미팅 장소</label>
                            <input 
                              type="text" 
                              placeholder="광화문 그랑서울 마케팅센터" 
                              value={newMeeting.location}
                              onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-[9px] font-bold text-slate-400">구글 미트 온라인 화상방 링크</label>
                            <input 
                              type="url" 
                              placeholder="https://meet.google.com/abc-defg-hij" 
                              value={newMeeting.googleMeetLink}
                              onChange={(e) => setNewMeeting({ ...newMeeting, googleMeetLink: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">미팅 상세 상담 이력 대본 및 노트</label>
                      <textarea 
                        rows={2}
                        placeholder="전반적인 가맹 제안 방향에 관한 핵심 요소를 자유롭게 적어 주세요." 
                        value={newMeeting.notes}
                        onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">최종 스마트 결론 한줄 요약 (CRM 에 게재할 핵심요약)</label>
                      <input 
                        type="text" 
                        placeholder="이 가맹사 담당 실장이 기술 지원 위약금 소급 적용 팩 보강을 요건으로 교차 수주에 호의적인 단계임." 
                        value={newMeeting.summary}
                        onChange={(e) => setNewMeeting({ ...newMeeting, summary: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400">후속 조치 액션 아이템 (매 줄당 한 건씩 기입)</label>
                      <textarea 
                        rows={2}
                        placeholder="예:&#13;위약금 면제 서류 본부장 전결 기안 상책&#13;예약 연동 기술 호환성 비교 테이블 메일 발송" 
                        value={newMeeting.actionItemsText}
                        onChange={(e) => setNewMeeting({ ...newMeeting, actionItemsText: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-emerald-250">
                      <button 
                        type="button" 
                        onClick={() => setShowAddMeeting(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition font-bold"
                      >
                        입력 취소
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-black"
                      >
                        신규 미팅 기안 소집
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Filtering Controls and Queries Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
                <div className="flex bg-slate-100 p-1 rounded-xl self-start border border-slate-150 text-[10.5px]">
                  <button
                    onClick={() => setMeetingFilter("all")}
                    className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${meetingFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400 hover:text-slate-900"}`}
                  >
                    일체 목록
                  </button>
                  <button
                    onClick={() => setMeetingFilter("online")}
                    className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${meetingFilter === "online" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400 hover:text-slate-900"}`}
                  >
                    비대면 화상
                  </button>
                  <button
                    onClick={() => setMeetingFilter("offline")}
                    className={`px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${meetingFilter === "offline" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-400 hover:text-slate-900"}`}
                  >
                    현장 대면
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="회의록 검색 (예: 수수료, 위약금)..."
                    value={searchMeetingQuery}
                    onChange={(e) => setSearchMeetingQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 text-[11px] font-medium border border-slate-200 rounded-xl focus:outline-none focus:bg-white transition"
                  />
                </div>
              </div>

              {/* The Chronicle Timeline Lists */}
              {propertyMeetings.length === 0 ? (
                <div className="p-12 text-center bg-slate-5/50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs text-[11px] font-medium">
                  검색 쿼리에 합치하는 가맹 미팅 및 상담 적재 기록물이 없습니다. 신규 미팅 일정을 수동 등록해 주세요.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 pt-3">
                  {propertyMeetings.map((meet, index) => {
                    const meetDateObj = new Date(meet.dateTime);
                    const formattedDate = meetDateObj.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
                    const formattedTime = meetDateObj.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div key={meet.id} className="relative group animate-fadeIn">
                        
                        {/* Vertical timeline anchor point */}
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-[#03C75A] flex items-center justify-center shadow-3xs group-hover:bg-[#03C75A] transition-all">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#03C75A] group-hover:bg-white" />
                        </div>

                        <div className="bg-slate-50/50 hover:bg-white border hover:border-[#03C75A]/25 p-4 rounded-2xl space-y-3 shadow-6xs transition-all">
                          
                          {/* Item upper headers */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-50/40 pb-2">
                            <div className="space-y-0.5">
                              <h4 className="font-extrabold text-slate-850 text-xs sm:text-sm">
                                {meet.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-bold">
                                <span>📅 {formattedDate}</span>
                                <span>• ⏰ {formattedTime}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                              {/* Format specifier badges */}
                              {meet.type === "Online" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-150 rounded-xl px-2 py-0.5 shadow-5xs">
                                  <Video className="w-3 h-3 text-blue-500" />
                                  온라인 화상
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-2 py-0.5 shadow-5xs">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  현장 대면
                                </span>
                              )}

                              <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 rounded-xl px-2 py-0.5 shadow-5xs">
                                {meet.pipelineStatus}
                              </span>
                            </div>
                          </div>

                          {/* Detail location or link if present */}
                          {meet.type === "Online" && meet.googleMeetLink && (
                            <div className="flex items-center justify-between bg-blue-50/40 border border-blue-100/50 p-2.5 rounded-xl text-[10.5px]">
                              <span className="text-slate-600 font-semibold flex items-center gap-1">
                                <Video className="w-3.5 h-3.5 text-blue-500" />
                                구글 미팅 주소: <code className="text-blue-700 font-black">{meet.googleMeetLink}</code>
                              </span>
                              <a 
                                href={meet.googleMeetLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[9px] font-black text-blue-600 hover:underline bg-white px-2 py-1 rounded border border-blue-200"
                              >
                                미트 열기 ↗
                              </a>
                            </div>
                          )}

                          {meet.type === "Offline" && meet.location && (
                            <div className="flex items-center justify-between bg-slate-100/55 p-2.5 rounded-xl text-[10.5px]">
                              <span className="text-slate-600 font-semibold flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                미팅 현장: <strong className="text-slate-700">{meet.location}</strong>
                              </span>
                            </div>
                          )}

                          {/* Meeting contents transcript notes */}
                          {meet.notes && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-[#01893d] uppercase tracking-wider block">미팅 원본 녹취/노트</span>
                              <p className="text-[11px] text-slate-600 leading-relaxed font-medium bg-white/70 border border-slate-100 p-2.5 rounded-xl">
                                {meet.notes}
                              </p>
                            </div>
                          )}

                          {/* AI Summary bullet analysis */}
                          {meet.summary && (
                            <div className="bg-amber-50/40 border border-amber-100/55 p-3 rounded-2xl space-y-1.5 shadow-5xs">
                              <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                                <span>스마트 요약 및 전환 관점</span>
                              </span>
                              <p className="text-[11px] text-slate-650 leading-relaxed font-semibold">
                                {meet.summary}
                              </p>
                            </div>
                          )}

                          {/* Action Items checklist */}
                          {meet.actionItems && meet.actionItems.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                                <ListTodo className="w-3 h-3 text-indigo-500" />
                                후속 조치 액션 플랜 ({meet.actionItems.length}건)
                              </span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px] font-semibold text-slate-600 pl-1">
                                {meet.actionItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 bg-white border border-slate-100 p-2 rounded-xl">
                                    <span className="text-[#03C75A] font-extrabold mt-0.5 shrink-0">✔</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
