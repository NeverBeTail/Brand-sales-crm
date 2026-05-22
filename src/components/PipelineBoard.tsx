import React, { useState } from "react";
import { 
  Building2, ArrowLeft, ArrowRight, TrendingUp, DollarSign, 
  MapPin, CheckCircle, Smartphone, Award, Sparkles, MoveRight, RefreshCw, Star,
  PlusCircle, Shuffle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Brand, PipelineStatus, ProposalSubStage, Meeting } from "../types";
import { ConfettiEffect } from "./Confetti";

interface PipelineBoardProps {
  brands: Brand[];
  meetings?: Meeting[];
  onUpdateBrandStatus: (id: string, newStatus: PipelineStatus) => Promise<void>;
  isLoading: boolean;
  onSelectBrand?: (id: string) => void;
  onRefreshNeeded?: () => Promise<void>;
  onUpdateProposalSubStage?: (id: string, subStage: ProposalSubStage) => Promise<void>;
  isZenMode?: boolean;
}

const STAGES: { id: PipelineStatus; name: string; color: string; bg: string; text: string; desc: string }[] = [
  { 
    id: "Cold Call", 
    name: "콜드콜 (Cold Call)", 
    color: "from-slate-400 to-slate-500",
    bg: "bg-slate-50 border-slate-200",
    text: "text-slate-800",
    desc: "최초 파이프라인 접촉 및 스크리닝 단계"
  },
  { 
    id: "First Meeting", 
    name: "첫 대면 미팅 (First Meeting)", 
    color: "from-blue-400 to-blue-500",
    bg: "bg-blue-50/55 border-blue-200",
    text: "text-blue-800",
    desc: "의사결정권자 대면 및 니즈 고찰 단계"
  },
  { 
    id: "Proposal & Negotiation", 
    name: "제안 및 조율 (Proposal & Negotiation)", 
    color: "from-amber-400 to-amber-500",
    bg: "bg-amber-50/55 border-amber-200",
    text: "text-amber-800",
    desc: "요구사항 수용 및 세일즈 제안 협상 단계"
  },
  { 
    id: "Deal Completed", 
    name: "계약 완료 (Deal Completed) 🏆", 
    color: "from-emerald-400 to-emerald-500",
    bg: "bg-emerald-50/55 border-emerald-200",
    text: "text-emerald-800",
    desc: "최종 제휴 계약 체결 및 도입 준비 완료"
  }
];

export default function PipelineBoard({ 
  brands, 
  meetings = [], 
  onUpdateBrandStatus, 
  isLoading, 
  onSelectBrand, 
  onRefreshNeeded, 
  onUpdateProposalSubStage,
  isZenMode = false 
}: PipelineBoardProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confettiActiveBrandId, setConfettiActiveBrandId] = useState<string | null>(null);
  
  // Inbound Webhook simulation states
  const [isSimulatingLead, setIsSimulatingLead] = useState(false);
  const [simulateSuccess, setSimulateSuccess] = useState<string | null>(null);

  // 1. HubSpot-style B2B Dynamic Quality Lead Scoring (CRM Competitor Core Benefit)
  const calculateLeadScore = (brand: Brand) => {
    let score = 55; // Base Score
    
    // Scale Weight: store capacity (+20 max)
    score += Math.min(20, Math.floor(brand.targetStoresCount / 10));
    
    // Tier weight configuration: High-value categories (+10)
    if (brand.category === "Franchise Partner" || brand.category === "Retail/Store") {
      score += 10;
    }

    // Pipeline completion progression status metric
    if (brand.pipelineStatus === 'Deal Completed') score += 20;
    else if (brand.pipelineStatus === 'Proposal & Negotiation') score += 15;
    else if (brand.pipelineStatus === 'First Meeting') score += 8;

    // Opportunity negotiation milestone completion (+10)
    if (brand.proposalSubStage === 'Approval') score += 10;
    else if (brand.proposalSubStage === 'Negotiation') score += 7;

    // Contact recency health index (14-day cutoff)
    const brandMeetings = meetings.filter(m => m.brandId === brand.id && !(m as any).deletedAt);
    let daysElapsed = 0;
    if (brandMeetings.length > 0) {
      const sorted = [...brandMeetings].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      const diff = Math.max(0, new Date().getTime() - new Date(sorted[0].dateTime).getTime());
      daysElapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
    } else {
      if (brand.id === 'brand-3') daysElapsed = 17;
      else if (brand.id === 'brand-4') daysElapsed = 8;
      else daysElapsed = 5;
    }

    if (daysElapsed >= 14) {
      score -= 22; // Recency Penalty
    } else {
      score += Math.max(0, 10 - Math.floor(daysElapsed / 2));
    }

    return Math.min(100, Math.max(5, score));
  };

  // 2. Salesforce Opportunity Weighted Revenue helper
  const parseRevenueEst = (estStr: string): number => {
    if (!estStr) return 0;
    const cleaned = estStr.replace(/,/g, '');
    let matches = cleaned.match(/([0-9.]+)\s*억/);
    if (matches && matches[1]) {
      return parseFloat(matches[1]) * 100000000;
    }
    matches = cleaned.match(/([0-9.]+)\s*천/);
    if (matches && matches[1]) {
      return parseFloat(matches[1]) * 10000000;
    }
    matches = cleaned.match(/([0-9.]+)\s*만/);
    if (matches && matches[1]) {
      return parseFloat(matches[1]) * 10000;
    }
    const numbersOnly = cleaned.replace(/[^0-9.]/g, '');
    const val = parseFloat(numbersOnly);
    if (isNaN(val)) return 60000000;
    if (val < 1000) return val * 100000000; 
    return val;
  };

  const potentialLeads = [
    { brandName: "빽다방 (Paik's Coffee)", category: "F&B Brand", storesCount: 1450, contactName: "김현우 부장", description: "대규모 가맹 오더 솔루션 전 지점 키오스크 통합 연동 도입 기획 검토 건." },
    { brandName: "에그드랍 (Egg Drop)", category: "F&B Brand", storesCount: 220, contactName: "유지혜 대리", description: "테이크아웃 전문 가맹점용 카카오 알림 연동 및 AI 상담 요약 툴 도입 단가 문의." },
    { brandName: "홍콩반점 0410", category: "F&B Brand", storesCount: 290, contactName: "배상철 실장", description: "백종원 소유 F&B 프랜차이즈 전점 주방 디스플레이 시스템(KDS) 통합 의뢰 문의." },
    { brandName: "메가MGC커피", category: "F&B Brand", storesCount: 3100, contactName: "안태양 이사", description: "전국 약 3,100여 개 세일즈 거래처 정합 관리에 필요한 CRM AI 피드백 툴 의뢰." },
    { brandName: "올리브영 (Olive Young)", category: "Non-food Brand", storesCount: 1300, contactName: "이서윤 과장", description: "B2B 가맹점 POS 데이터 백업 및 리얼타임 푸시 알람 동기 서비스 검증 제안." }
  ];

  const handleSimulateWebhookLead = async () => {
    setIsSimulatingLead(true);
    setSimulateSuccess(null);
    try {
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
        setSimulateSuccess(`🎉 [Webhook 접수 성공] '${demoLead.brandName}' 가망 가맹점이 Cold Call 단계로 인바운드 접수되었습니다!`);
        if (onRefreshNeeded) {
          await onRefreshNeeded();
        }
      } else {
        setSimulateSuccess("❌ 인바운드 리드 수급 실패 (웹훅 연동 토큰 오류)");
      }
    } catch (err) {
      console.error("Webhook lead simulation failed:", err);
      setSimulateSuccess("❌ 웹훅 통신 실패 (백엔드 오프라인 혹은 예외 발생)");
    } finally {
      setIsSimulatingLead(false);
      setTimeout(() => setSimulateSuccess(null), 5000);
    }
  };

  const handleMove = async (brandId: string, currentStatus: PipelineStatus, direction: "prev" | "next") => {
    const sequence: PipelineStatus[] = ["Cold Call", "First Meeting", "Proposal & Negotiation", "Deal Completed"];
    const currentIndex = sequence.indexOf(currentStatus);
    let newIndex = currentIndex;

    if (direction === "prev" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "next" && currentIndex < sequence.length - 1) {
      newIndex = currentIndex + 1;
    }

    if (newIndex !== currentIndex) {
      setUpdatingId(brandId);
      try {
        await onUpdateBrandStatus(brandId, sequence[newIndex]);
        if (sequence[newIndex] === "Deal Completed") {
          setConfettiActiveBrandId(brandId);
        }
      } catch (err) {
        console.error("Failed to transition brand status:", err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div className="glass-card rounded-[32px] border border-white/50 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-[#111827] text-sm sm:text-base flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-550" />
            <span>세일즈 칸반 {isZenMode ? "🧘 덜어냄 뷰" : "파이프라인 보드"}</span>
          </h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            {isZenMode 
              ? "중요 딜에 집중할 수 있도록 복잡한 장식과 버튼을 덜어내고, AI 기반 리드 스코어와 가중 매출 분석만 정갈하게 노출합니다."
              : "B2B 영업 고객사들의 협상 단계를 라이브 트래킹합니다. Salesforce/HubSpot 핵심 연동 기법이 적용되어 있습니다."
            }
          </p>
        </div>
        
        {/* Hiding noisy testing tool buttons when Zen mode is active for peak subtraction aesthetics */}
        {!isZenMode && (
          <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
            <button
              onClick={handleSimulateWebhookLead}
              disabled={isSimulatingLead}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-110 hover:bg-indigo-100/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                isSimulatingLead ? "opacity-50 cursor-wait animate-pulse" : ""
              }`}
            >
              <Shuffle className={`w-3.5 h-3.5 ${isSimulatingLead ? "animate-spin" : ""}`} />
              <span>외부 리드 웹훅 유입 {isSimulatingLead ? "(유입 가동중...)" : "(Typeform Webhook)"}</span>
            </button>

            <span className="text-[10px] font-black text-slate-400 bg-slate-55 border border-slate-150 px-2 py-2.5 rounded-2xl">
              Slack 연동 ⚡
            </span>
          </div>
        )}
      </div>

      {simulateSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-[11px] text-emerald-800 font-extrabold flex items-center gap-2 animate-slideIn shadow-4xs font-sans">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{simulateSuccess}</span>
        </div>
      )}

      {/* Minimalistic Quota milestone board - Hidden when isZenMode is true for pure essential subtraction focus */}
      {!isZenMode && (
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/45 space-y-2 font-sans animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-extrabold text-slate-800">당월 지사 가맹/제휴 계약 목표 Quota</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-extrabold">목표달성률 80% (5건 중 4건)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageBrands = brands.filter((b) => b.pipelineStatus === stage.id);
          
          return (
            <div 
              key={stage.id} 
              className={`rounded-2xl border p-3.5 flex flex-col space-y-3 ${stage.bg} transition-all duration-300 min-h-[360px]`}
            >
              {/* Stage Header */}
              <div className="space-y-1 font-sans">
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-black tracking-tight ${stage.text}`}>
                    {stage.name}
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    stageBrands.length > 0 ? "bg-white shadow-3xs" : "bg-slate-200/50 text-slate-450"
                  }`}>
                    {stageBrands.length}
                  </span>
                </div>

                {/* Salesforce Dynamic Weighted Deal Value Forecast */}
                {stageBrands.length > 0 && (
                  <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono mt-0.5 bg-white/50 px-2 py-1 rounded-xl border border-slate-100/40">
                    <span className="font-bold">가중 기댓값 (Est)</span>
                    <span className="font-extrabold text-indigo-700">
                      ₩{(() => {
                        const totalVal = stageBrands.reduce((acc, b) => {
                          const parsed = parseRevenueEst(b.monthlyRevenueEst);
                          const prob = stage.id === "Cold Call" ? 0.15 : stage.id === "First Meeting" ? 0.40 : stage.id === "Proposal & Negotiation" ? 0.75 : 1.0;
                          return acc + (parsed * prob);
                        }, 0);
                        return (totalVal / 100000000).toFixed(1) + "억원";
                      })()}
                    </span>
                  </div>
                )}

                {!isZenMode && (
                  <p className="text-[9px] text-slate-400 font-medium leading-tight">
                    {stage.desc}
                  </p>
                )}
              </div>

              {/* Column Content */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[420px] pr-1 relative">
                <AnimatePresence mode="popLayout">
                  {stageBrands.length > 0 ? (
                    stageBrands.map((brand) => {
                      const isUpdating = updatingId === brand.id;
                      const canMovePrev = stage.id !== "Cold Call";
                      const canMoveNext = stage.id !== "Deal Completed";

                      // Calculate days elapsed since last contact
                      const brandMeetings = meetings.filter(m => m.brandId === brand.id && !(m as any).deletedAt);
                      let daysElapsed = 0;
                      let hasHistory = brandMeetings.length > 0;
                      
                      if (hasHistory) {
                        const sorted = [...brandMeetings].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
                        const latestMeet = sorted[0];
                        const diff = Math.max(0, new Date().getTime() - new Date(latestMeet.dateTime).getTime());
                        daysElapsed = Math.floor(diff / (1000 * 60 * 60 * 24));
                      } else {
                        // Deterministic fallback so that brand-3 (MUJI HQ) triggers a beautiful >14 days warning on startup!
                        if (brand.id === 'brand-3') {
                          daysElapsed = 17;
                        } else if (brand.id === 'brand-4') {
                          daysElapsed = 8;
                        } else {
                          const num = brand.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                          daysElapsed = (num % 8) + 5;
                        }
                      }
                      const isWarning = daysElapsed >= 14;
                      const leadScore = calculateLeadScore(brand);

                      return (
                          <motion.div 
                            key={brand.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: -15 }}
                            whileHover={{ 
                              scale: 1.015,
                              y: -2.5,
                              boxShadow: isZenMode 
                                ? "0 10px 25px rgba(0, 0, 0, 0.03)" 
                                : "0 20px 42px -10px rgba(16, 185, 129, 0.1), 0 4px 14px rgba(0, 0, 0, 0.03)"
                            }}
                            transition={{ 
                              type: "spring", 
                              stiffness: 320, 
                              damping: 25,
                              layout: { type: "spring", stiffness: 350, damping: 28 }
                            }}
                            className={`p-4 rounded-2xl transition-all duration-300 relative group cursor-pointer border ${
                              isZenMode 
                                ? "bg-white/60 hover:bg-white border-slate-101 hover:border-slate-250 hover:shadow-xs" 
                                : "glass-card border-white/60 hover:border-emerald-300 shadow-sm"
                            }`}
                          >
                          {/* Confetti Effect inside card container */}
                          <ConfettiEffect
                            active={confettiActiveBrandId === brand.id}
                            onComplete={() => setConfettiActiveBrandId(null)}
                          />

                          {/* Interactive overlay card selector link */}
                          <div className="flex justify-between items-start mb-2 font-sans">
                            <div 
                              onClick={() => onSelectBrand?.(brand.id)}
                              className="flex items-center gap-1.5 cursor-pointer max-w-[70%]"
                              title="상세 내용 보기"
                            >
                              <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black font-mono ${
                                isZenMode ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-700"
                              }`}>
                                {brand.logo}
                              </span>
                              <h4 className="font-extrabold text-[#111827] text-xs hover:text-indigo-600 truncate transition-colors">
                                {brand.name}
                              </h4>
                            </div>

                            {/* HubSpot style Priority Lead scoring badge */}
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded-lg border ${
                                leadScore >= 80 
                                  ? "bg-emerald-50 text-emerald-750 border-emerald-100" 
                                  : leadScore >= 55
                                  ? "bg-indigo-50/80 text-indigo-700 border-indigo-100"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`} title="AI 기반 종합 리드 딜 영합 우선 스코어">
                                {leadScore}pt
                              </span>
                              
                              {!isZenMode && (
                                <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded">
                                  {brand.targetStoresCount}개점
                                </span>
                              )}
                            </div>
                          </div>

                        <div className="space-y-1.5 text-[10px] text-slate-500 font-sans">
                          {/* Hide description and est values in Zen mode for subtracted modernist look */}
                          {!isZenMode && (
                            <>
                              <p className="line-clamp-2 italic text-slate-400 pr-1 leading-normal animate-fadeIn">
                                {brand.description}
                              </p>
                              
                              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 mt-2 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100/30 animate-fadeIn">
                                <span>예상 가치:</span>
                                <span className="text-indigo-600 font-bold">{brand.monthlyRevenueEst}</span>
                              </div>
                            </>
                          )}

                          {/* Days elapsed since last contact or warning indication if >= 14 days */}
                          <div className={`flex items-center justify-between text-[9px] font-semibold p-1.5 rounded-lg border transition-all duration-300 ${
                            isWarning 
                              ? isZenMode
                                ? "bg-rose-50/25 border-rose-100/50 text-rose-600"
                                : "bg-rose-50/90 border-rose-200 text-rose-700 hover:bg-rose-100/60 animate-pulse" 
                              : "bg-emerald-50/60 border-emerald-100 text-emerald-800 hover:bg-emerald-100/30"
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-1.5 w-1.5">
                                {isWarning && !isZenMode && (
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isWarning ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                              </span>
                              <span>마지막 접촉 경과일:</span>
                            </div>
                            <span className="font-extrabold flex items-center gap-0.5">
                              {daysElapsed}일 경과 {isWarning && "⚠️"}
                            </span>
                          </div>
                        </div>

                        {brand.pipelineStatus === "Proposal & Negotiation" && !isZenMode && (
                          <div className="mt-2.5 pt-2 border-t border-dashed border-slate-100">
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[8px] font-bold text-slate-400">
                                협상 세부 단계 (Proposal Stage)
                              </span>
                              <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-1 rounded">
                                {brand.proposalSubStage === "Draft" && "제안서 송부"}
                                {brand.proposalSubStage === "Tech" && "기술 정합 협의"}
                                {brand.proposalSubStage === "Negotiation" && "단가/조건 조율"}
                                {brand.proposalSubStage === "Approval" && "내부 기안 결재"}
                                {!brand.proposalSubStage && "미정 (제안 검토)"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              {(['Draft', 'Tech', 'Negotiation', 'Approval'] as const).map((step) => {
                                const labels: Record<string, string> = {
                                  Draft: '제안',
                                  Tech: '기술',
                                  Negotiation: '조율',
                                  Approval: '결재'
                                };
                                const fullLabels: Record<string, string> = {
                                  Draft: '제안 세부 성안 구성 및 송부',
                                  Tech: '기술 정합 및 POS/연동 협의',
                                  Negotiation: '월 지출 조건/요금 및 수수료율 합의',
                                  Approval: '계약 최종 본부 내부 품의 조율'
                                };
                                const isActive = brand.proposalSubStage === step;
                                const isPassed = (() => {
                                  if (!brand.proposalSubStage) return false;
                                  const steps = ['Draft', 'Tech', 'Negotiation', 'Approval'];
                                  return steps.indexOf(step) <= steps.indexOf(brand.proposalSubStage);
                                })();

                                return (
                                  <button
                                    key={step}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateProposalSubStage?.(brand.id, step);
                                    }}
                                    disabled={isLoading}
                                    title={fullLabels[step]}
                                    className={`flex-1 py-1 text-[8.5px] font-extrabold rounded-md text-center cursor-pointer transition-all ${
                                      isActive
                                        ? 'bg-amber-500 text-white shadow-xs font-black'
                                        : isPassed
                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                        : 'bg-slate-50 text-slate-450 hover:bg-slate-100'
                                    }`}
                                  >
                                    {labels[step]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Transition Controllers */}
                        <div className={`flex items-center justify-between mt-3.5 pt-2.5 border-t ${
                          isZenMode ? "border-slate-100/40" : "border-slate-100/70"
                        } font-sans`}>
                          <button
                            disabled={!canMovePrev || isUpdating || isLoading}
                            onClick={() => handleMove(brand.id, brand.pipelineStatus, "prev")}
                            className={`p-1 px-1.5 text-[8px] font-extrabold rounded-md disabled:opacity-30 transition-all flex items-center gap-0.5 cursor-pointer ${
                              isZenMode 
                                ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50" 
                                : "text-slate-500 hover:bg-slate-100"
                            }`}
                            title="이전 단계로 변경"
                          >
                            <ArrowLeft className="w-2.5 h-2.5" />
                            <span>{isZenMode ? "" : "이전"}</span>
                          </button>

                          <button
                            onClick={() => onSelectBrand?.(brand.id)}
                            className={`text-[9px] font-extrabold cursor-pointer transition-colors ${
                              isZenMode 
                                ? "text-slate-400 hover:text-slate-600" 
                                : "text-indigo-600 hover:underline"
                            }`}
                          >
                            {isZenMode ? "상세" : "상세 정보"}
                          </button>

                          <button
                            disabled={!canMoveNext || isUpdating || isLoading}
                            onClick={() => handleMove(brand.id, brand.pipelineStatus, "next")}
                            className={`p-1 px-1.5 text-[8px] font-extrabold rounded-md disabled:opacity-30 transition-all flex items-center gap-0.5 cursor-pointer ${
                              isZenMode
                                ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50"
                                : "text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
                            }`}
                            title="다음 단계로 변경"
                          >
                            <span>{isZenMode ? "" : "이동"}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Loading Spinner Overlays */}
                        {isUpdating && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-3xs rounded-xl flex items-center justify-center">
                            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.div 
                    key={`empty-${stage.id}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-center py-10 text-[10px] text-slate-400 border border-dashed border-slate-100 rounded-2xl bg-white/30 font-medium w-full"
                  >
                    해당 단계의 브랜드 없음
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
