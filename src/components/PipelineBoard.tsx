import React, { useState } from "react";
import { 
  Building2, ArrowLeft, ArrowRight, TrendingUp, DollarSign, 
  MapPin, CheckCircle, Smartphone, Award, Sparkles, MoveRight, RefreshCw, Star,
  PlusCircle, Shuffle, Layers, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Brand, PipelineStatus, ProposalSubStage, Meeting, Solution, BrandSolution } from "../types";
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
  solutions?: Solution[];
  brandSolutions?: BrandSolution[];
  onUpdateBrandSolutionStatus?: (brandId: string, solutionId: string, newStatus: PipelineStatus) => Promise<void>;
  densityMode?: 'comfortable' | 'compact';
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
  isZenMode = false,
  solutions = [],
  brandSolutions = [],
  onUpdateBrandSolutionStatus,
  densityMode = 'comfortable'
}: PipelineBoardProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confettiActiveBrandId, setConfettiActiveBrandId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'brand' | 'product'>('brand');
  const [selectedSolutionId, setSelectedSolutionId] = useState<string>('sol-1');
  
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
        if (viewType === 'product' && onUpdateBrandSolutionStatus) {
          await onUpdateBrandSolutionStatus(brandId, selectedSolutionId, sequence[newIndex]);
        } else {
          await onUpdateBrandStatus(brandId, sequence[newIndex]);
        }
        if (sequence[newIndex] === "Deal Completed") {
          setConfettiActiveBrandId(brandId);
        }
      } catch (err) {
        console.error("Failed to transition brand/product status:", err);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  return (
    <div className="glass-card rounded-[32px] border border-[#03C75A]/100 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-[#111827] text-sm sm:text-base flex items-center gap-1.5">
            <Award className="w-5 h-5 text-indigo-550" />
            <span>세일즈 칸반 파이프라인 보드</span>
          </h3>
          <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">
            B2B 영업 고객사들의 협상 및 도입 단계를 실시간으로 트래킹하고 통합 관리합니다.
          </p>
        </div>
        
        {/* Noisy simulation buttons removed to keep production views professional - moved to development backlog tab */}
      </div>

      {/* 뷰 타입 및 프로덕트 선택 관제 데스크 (세련된 기업용 B2B 탭 디자인) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-150 shadow-4xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Layers className="w-4 h-4 text-indigo-550 shrink-0" />
            <span className="text-xs font-black text-slate-700">칸반 조회 기준:</span>
          </div>
          <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setViewType('brand')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'brand'
                  ? 'bg-white text-indigo-700 shadow-3xs font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              🏢 고유 브랜드 단위
            </button>
            <button
              onClick={() => setViewType('product')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewType === 'product'
                  ? 'bg-white text-indigo-700 shadow-3xs font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              🔌 제안 프로덕트 단위
            </button>
          </div>
        </div>

        {viewType === 'product' && solutions && solutions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 animate-fadeIn">
            <span className="text-[11px] font-extrabold text-slate-400 mr-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>프로덕트 세밀 매니저:</span>
            </span>
            <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-150">
              {solutions.map((sol) => (
                <button
                  key={sol.id}
                  onClick={() => setSelectedSolutionId(sol.id)}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all border cursor-pointer ${
                    selectedSolutionId === sol.id
                      ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs'
                      : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span>{sol.name.split(' (')[0]}</span>
                </button>
              ))}
            </div>
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

      {viewType === 'matrix' ? (
        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-2xs animate-fadeIn font-sans">
          
          {/* 매트릭스 상단 요약 데스크 */}
          <div className="p-5 bg-slate-50 border-b border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-750 border border-indigo-150 px-2.5 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider font-mono">
                <Sparkles className="w-3 h-3 text-indigo-600 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Cross-Selling Matrix Mode ⚡</span>
              </span>
              <h4 className="text-xs font-black text-slate-850 mt-1.5">
                4대 세일즈 가맹 솔루션 크로스셀링 종합 현황판
              </h4>
              <p className="text-[10px] text-slate-400 font-bold leading-normal mt-0.5">
                전체 파트너 거래처의 솔루션 도입 경과를 한눈에 통제합니다. 셀 내부의 단계를 직접 전환하며 다각도 침투 전략을 수립하세요.
              </p>
            </div>

            {/* Matrix 보급 통계 */}
            <div className="flex gap-4 p-2.5 bg-white rounded-2xl border border-slate-150 shadow-4xs shrink-0 self-start md:self-auto">
              <div className="text-center px-2">
                <p className="text-[9px] text-slate-400 font-bold">전체 교차 보급률</p>
                <p className="text-xs font-black text-indigo-600 mt-0.5">
                  {(() => {
                    const totalPossible = brands.length * 4;
                    const closedDeals = brandSolutions.filter(bs => bs.pipelineStatus === 'Deal Completed').length;
                    return totalPossible > 0 ? ((closedDeals / totalPossible) * 100).toFixed(0) + '%' : '0%';
                  })()}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-150 self-center"></div>
              <div className="text-center px-2">
                <p className="text-[9px] text-slate-400 font-bold">완전 계약 종결사</p>
                <p className="text-xs font-black text-emerald-600 mt-0.5">
                  {(() => {
                    const perfects = brands.filter(b => {
                      const list = brandSolutions.filter(bs => bs.brandId === b.id);
                      return list.length === 4 && list.every(bs => bs.pipelineStatus === 'Deal Completed');
                    }).length;
                    return `${perfects} / ${brands.length}개사`;
                  })()}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-450 border-b border-slate-200">
                  <th className="p-4 pl-6">🏬 가맹 파트너 브랜드</th>
                  {solutions.map((sol) => (
                    <th key={sol.id} className="p-4 font-sans font-black text-slate-800 tracking-tight">
                      🔌 {sol.name.split(' (')[0]}
                    </th>
                  ))}
                  <th className="p-4 text-center">🏆 최종 도입 진척</th>
                  <th className="p-4 pr-6 text-center">프로필/조회</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {brands.map((brand) => {
                  const mappings = brandSolutions.filter(bs => bs.brandId === brand.id);
                  const closedCount = mappings.filter(bs => bs.pipelineStatus === 'Deal Completed').length;
                  const ratioPercent = Math.round((closedCount / 4) * 100);

                  return (
                    <tr key={brand.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center font-black text-[11px] text-indigo-700 shadow-4xs">
                            {brand.logo}
                          </span>
                          <div>
                            <p className="font-extrabold text-slate-900 text-[11.5px]">{brand.name}</p>
                            <p className="text-[9px] text-slate-450 font-bold mt-0.5">{brand.category} • {brand.targetStoresCount}개 지점</p>
                          </div>
                        </div>
                      </td>

                      {/* 4 solution columns with interactive quick statuses */}
                      {solutions.map((sol) => {
                        const mapping = mappings.find(m => m.solutionId === sol.id);
                        const status = mapping ? mapping.pipelineStatus : 'Cold Call';

                        // Dropdown inline edit mode
                        return (
                          <td key={sol.id} className="p-4">
                            <div className="relative">
                              <select
                                value={status}
                                onChange={async (e) => {
                                  if (onUpdateBrandSolutionStatus) {
                                    setUpdatingId(brand.id);
                                    try {
                                      await onUpdateBrandSolutionStatus(brand.id, sol.id, e.target.value as PipelineStatus);
                                    } catch (err) {
                                      console.error("Failed to update solution quick status:", err);
                                    } finally {
                                      setUpdatingId(null);
                                    }
                                  }
                                }}
                                className={`text-[10px] font-black rounded-xl p-2 px-3.5 border outline-none cursor-pointer transition-all ${
                                  status === 'Deal Completed'
                                    ? 'bg-emerald-50 text-emerald-850 border-emerald-250 hover:bg-emerald-100/50'
                                    : status === 'Proposal & Negotiation'
                                    ? 'bg-amber-50 text-amber-850 border-amber-250 hover:bg-amber-100/50'
                                    : status === 'First Meeting'
                                    ? 'bg-blue-50 text-blue-850 border-blue-250 hover:bg-blue-100/50'
                                    : 'bg-slate-55 text-slate-400 border-slate-200/70 hover:bg-slate-100/80'
                                }`}
                              >
                                <option value="Cold Call">📞 콜드콜 접촉</option>
                                <option value="First Meeting">🤝 첫 대면 미팅</option>
                                <option value="Proposal & Negotiation">⏳ 제안 및 협상</option>
                                <option value="Deal Completed">🏆 최종 계약 완료</option>
                              </select>
                            </div>
                          </td>
                        );
                      })}

                      {/* 완료율 */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-18 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${closedCount === 4 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-indigo-500'}`} 
                              style={{ width: `${ratioPercent}%` }}
                            ></div>
                          </div>
                          <span className={`text-[9.5px] font-black ${closedCount === 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {closedCount === 4 ? '도입종결 🏆' : `${ratioPercent}% (${closedCount}/4)`}
                          </span>
                        </div>
                      </td>

                      {/* 조치 */}
                      <td className="p-4 pr-6 text-center">
                        <button
                          onClick={() => onSelectBrand?.(brand.id)}
                          className="px-3 py-1.5 text-[9.5px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/80 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer shadow-4xs"
                        >
                          조회 🔍
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${densityMode === 'compact' ? 'gap-2.5' : 'gap-4'}`}>
          {STAGES.map((stage) => {
          // Extract matching items based on user-centric brand view or product-centric granular view
          const stageItems = (() => {
            if (viewType === 'brand') {
              return brands
                .filter((b) => b.pipelineStatus === stage.id)
                .map(b => ({
                  ...b,
                  uniqueKey: `brand-${b.id}`,
                  isProductCard: false,
                  displayDesc: b.description,
                  displayRevenue: b.monthlyRevenueEst
                }));
            } else {
              const sol = solutions.find(s => s.id === selectedSolutionId);
              return brandSolutions
                .filter(bs => bs.solutionId === selectedSolutionId && bs.pipelineStatus === stage.id)
                .map(bs => {
                  const b = brands.find(brand => brand.id === bs.brandId);
                  if (!b) return null;
                  
                  // Product specific weighted revenue: typically 35% of total brand estimate
                  const totalRev = parseRevenueEst(b.monthlyRevenueEst);
                  const prodRevEst = (totalRev * 0.35); // 35% share for specific solution
                  
                  // Re-format into a pretty string in Korean
                  const formattedProdRev = `월평균 ${(prodRevEst / 10000000).toFixed(0)}천만원 선 제안`;

                  return {
                    ...b,
                    uniqueKey: `prod-${b.id}-${bs.solutionId}`,
                    isProductCard: true,
                    solutionId: bs.solutionId,
                    solutionName: sol?.name,
                    solutionCode: sol?.code,
                    displayDesc: `[${sol?.name.split(' (')[0]}] 협상 진척 - 부서: ${bs.department || '가맹총괄'}`,
                    displayRevenue: formattedProdRev,
                    rawBrand: b
                  };
                })
                .filter(Boolean) as any[];
            }
          })();
          
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
                    stageItems.length > 0 ? "bg-white shadow-3xs" : "bg-slate-200/50 text-slate-450"
                  }`}>
                    {stageItems.length}
                  </span>
                </div>

                {/* Salesforce Dynamic Weighted Deal Value Forecast */}
                {stageItems.length > 0 && (
                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-0.5 bg-white/50 px-2 py-1 rounded-xl border border-slate-100/40">
                    <span className="font-bold">가중 기댓값 (Est)</span>
                    <span className="font-extrabold text-indigo-700">
                      ₩{(() => {
                        const totalVal = stageItems.reduce((acc, item) => {
                          const parsed = parseRevenueEst(item.displayRevenue || item.monthlyRevenueEst);
                          const prob = stage.id === "Cold Call" ? 0.15 : stage.id === "First Meeting" ? 0.40 : stage.id === "Proposal & Negotiation" ? 0.75 : 1.0;
                          return acc + (parsed * prob);
                        }, 0);
                        return (totalVal / 100000000).toFixed(2) + "억원";
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
                  {stageItems.length > 0 ? (
                    stageItems.map((brand) => {
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
                        // Fallbacks
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
                            key={brand.uniqueKey}
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
                            className={`transition-all duration-300 relative group cursor-pointer border ${
                              densityMode === 'compact' ? 'p-3 rounded-xl' : 'p-4 rounded-2xl'
                            } ${
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
                                <span className="text-[8px] bg-slate-100 text-slate-400 font-bold px-1.5 py-0.5 rounded">
                                  {brand.targetStoresCount}개점
                                </span>
                              )}
                            </div>
                          </div>

                        <div className="space-y-1.5 text-[10px] text-slate-400 font-sans">
                          {/* Hide description and est values in Zen mode for subtracted modernist look */}
                          {!isZenMode && (
                            <>
                              <p className="line-clamp-2 italic text-slate-400 pr-1 leading-normal animate-fadeIn">
                                {brand.displayDesc || brand.description}
                              </p>
                              
                              <div className="flex items-center justify-between text-[9px] font-semibold text-slate-600 mt-2 bg-slate-50/50 p-1.5 rounded-lg border border-slate-101 animate-fadeIn">
                                <span>예상 가치:</span>
                                <span className="text-indigo-600 font-bold">{brand.displayRevenue || brand.monthlyRevenueEst}</span>
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

                        {brand.pipelineStatus === "Proposal & Negotiation" && !isZenMode && !brand.isProductCard && (
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

                        {/* Transition Controllers - Hidden by default, progressive disclosure on mouse-hover */}
                        <div className={`flex items-center justify-between mt-3.5 pt-2.5 border-t md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                          isZenMode ? "border-slate-100/40" : "border-slate-100/70"
                        } font-sans`}>
                          <button
                            disabled={!canMovePrev || isUpdating || isLoading}
                            onClick={() => handleMove(brand.id, brand.pipelineStatus, "prev")}
                            className={`p-1 px-1.5 text-[8px] font-extrabold rounded-md disabled:opacity-30 transition-all flex items-center gap-0.5 cursor-pointer ${
                              isZenMode 
                                ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50/50" 
                                : "text-slate-400 hover:bg-slate-100"
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
      )}
    </div>
  );
}
