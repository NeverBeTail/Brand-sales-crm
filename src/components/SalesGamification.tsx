import React, { useEffect, useState } from 'react';
import { 
  Award, TrendingUp, CheckCircle, Flame, Target, Trophy, 
  RefreshCw, Zap, Medal, Star, Plus, ShieldCheck, Phone, Calendar, Bot, Lock
} from 'lucide-react';
import { Brand, Meeting, BrandSolution } from '../types';

interface SalesGoal {
  id: string;
  userName: string;
  userRole: 'Admin' | 'Sales_Rep';
  targetType: string;
  metricName: string;
  targetValue: number;
  currentValue: number;
  period: string;
  color: string;
}

interface SalesGamificationProps {
  userRole: 'Admin' | 'Sales_Rep';
  onGoalCompleted: () => void;
  brands: Brand[];
  meetings: Meeting[];
  brandSolutions: BrandSolution[];
}

export default function SalesGamification({ 
  userRole, 
  onGoalCompleted, 
  brands = [], 
  meetings = [], 
  brandSolutions = [] 
}: SalesGamificationProps) {
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMess, setErrorMess] = useState<string | null>(null);

  const fetchGoals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sales-goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
        setErrorMess(null);
      }
    } catch (err) {
      console.error('Failed to fetch sales goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleIncrement = async (id: string) => {
    setErrorMess(null);
    try {
      const res = await fetch(`/api/sales-goals/${id}/increment`, {
        method: 'POST',
        headers: {
          'X-User-Role': userRole
        }
      });
      if (res.ok) {
        const result = await res.json();
        // Update local state
        setGoals(prev => prev.map(g => g.id === id ? result.updatedGoal : g));
        onGoalCompleted();
      } else {
        const errData = await res.json();
        setErrorMess(errData.error || '목표 진척 격상 처리에 실패하였습니다.');
      }
    } catch (err) {
      console.error('Failed to increment goal:', err);
    }
  };

  // Rank goals by completion percentage
  const getSortedLeaderboard = () => {
    return [...goals].sort((a, b) => {
      const pctA = a.currentValue / a.targetValue;
      const pctB = b.currentValue / b.targetValue;
      return pctB - pctA;
    });
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center gap-1 bg-amber-500/12 border border-amber-500/25 text-amber-300 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>1st Gold</span>
          </div>
        );
      case 1:
        return (
          <div className="flex items-center gap-1 bg-white/50/40 border border-[#03C75A]/10 text-slate-600 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
            <Medal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>2nd Silver</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 bg-orange-500/12 border border-orange-500/25 text-orange-300 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
            <Award className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>3rd Bronze</span>
          </div>
        );
    }
  };

  const getColorTheme = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bar: 'bg-[#03C75A]',
          text: 'text-[#03C75A]',
          bg: 'bg-[#03C75A]/10 border-[#03C75A]/15',
          badge: 'bg-[#03C75A]/12 text-[#03C75A] border-[#03C75A]/20',
          progressColor: 'from-[#03C75A] to-[#34d399]'
        };
      case 'rose':
        return {
          bar: 'bg-rose-500',
          text: 'text-rose-400',
          bg: 'bg-rose-950/20 border-rose-900/30',
          badge: 'bg-rose-950/20 text-rose-300 border-rose-900/25',
          progressColor: 'from-rose-500 to-pink-500'
        };
      case 'indigo':
      default:
        return {
          bar: 'bg-[#1eca6b]',
          text: 'text-[#1eca6b]',
          bg: 'bg-[#1eca6b]/10 border-[#1eca6b]/15',
          badge: 'bg-[#1eca6b]/12 text-[#1eca6b] border-[#1eca6b]/20',
          progressColor: 'from-[#1eca6b] to-[#03C75A]'
        };
    }
  };

  // Helper to dynamically calculate B2B achievements for each sales rep
  const getAchievementsForUser = (userName: string) => {
    const userGoal1 = goals.find(g => g.userName === userName && g.metricName.includes("계약")); // Deal Closed
    const userGoal2 = goals.find(g => g.userName === userName && g.metricName.includes("미팅")); // Meetings Hosted
    const userGoal3 = goals.find(g => g.userName === userName && g.metricName.includes("발굴")); // Prospecting
    
    let completedDealsCount = 0;
    let hasCrossSell = false;
    let aiSummaryCount = 0;
    
    if (userName === '이도윤 이사') {
      completedDealsCount = brands.filter(b => b.pipelineStatus === 'Deal Completed').length;
      hasCrossSell = brands.some(b => brandSolutions.filter(bs => bs.brandId === b.id && bs.pipelineStatus === 'Deal Completed').length >= 2);
      aiSummaryCount = meetings.filter(m => m.summary && m.actionItems && m.actionItems.length > 0).length;
    } else if (userName === '최성우 본부장') {
      completedDealsCount = brandSolutions.filter(bs => bs.pipelineStatus === 'Deal Completed' && bs.department === '대기전략파트').length;
      hasCrossSell = true; // Paul Bassett or Salady solutions cross-selling attribution
      aiSummaryCount = meetings.filter(m => m.department === '대기전략파트' && m.summary).length;
    } else if (userName === '한채원 대리') {
      completedDealsCount = brandSolutions.filter(bs => bs.brandId === 'brand-2' && bs.pipelineStatus === 'Deal Completed').length;
      hasCrossSell = false;
      aiSummaryCount = meetings.filter(m => m.brandId === 'brand-2' && m.summary).length;
    }
    
    return [
      {
        id: 'cold_call',
        name: '콜드콜 정복자',
        description: '신규 아웃바운드 개척 및 발굴 5건 이상 성사',
        requiredText: '개척 발굴 5건 이상',
        gradient: 'from-sky-400 via-blue-500 to-indigo-500',
        icon: Phone,
        isUnlocked: userName === '이도윤 이사' ? true : userName === '최성우 본부장' ? true : (userGoal3 ? userGoal3.currentValue >= 5 : false),
        current: userName === '이도윤 이사' ? 5 : userName === '최성우 본부장' ? 5 : (userGoal3 ? userGoal3.currentValue : 0),
        target: 5
      },
      {
        id: 'meeting_machine',
        name: '미팅 몬스터',
        description: '영업 대면/비대면 미팅 10회 이상 수행 및 조율',
        requiredText: '누적 미팅 10회 이상',
        gradient: 'from-indigo-500 via-purple-500 to-pink-500',
        icon: Calendar,
        isUnlocked: userName === '이도윤 이사' ? true : (userGoal2 ? userGoal2.currentValue >= 10 : false),
        current: userName === '이도윤 이사' ? 10 : (userGoal2 ? userGoal2.currentValue : 6),
        target: 10
      },
      {
        id: 'big_deal',
        name: '빅딜 마에스트로',
        description: '최종 계약 완료(Deal Completed) 1건 이상 성사',
        requiredText: '계약 완료 브랜드 보유',
        gradient: 'from-amber-400 via-orange-500 to-yellow-600',
        icon: Trophy,
        isUnlocked: completedDealsCount >= 1,
        current: completedDealsCount,
        target: 1
      },
      {
        id: 'cross_sell',
        name: '교차판매 스페셜리스트',
        description: '단일 가맹 브랜드에 2개 이상의 교차 솔루션 도입 완료',
        requiredText: '동일 브랜드 2개 이상 도입',
        gradient: 'from-emerald-400 via-teal-500 to-teal-600',
        icon: Zap,
        isUnlocked: hasCrossSell,
        current: hasCrossSell ? 2 : (userName === '한채원 대리' ? 1 : 0),
        target: 2
      },
      {
        id: 'ai_pioneer',
        name: 'AI 스마트 개척자',
        description: 'AI 상담요약 또는 RAG 영업 비서 3회 이상 연동 활용',
        requiredText: 'AI 비서 요약 3회 이상',
        gradient: 'from-rose-400 via-pink-500 to-rose-600',
        icon: Bot,
        isUnlocked: aiSummaryCount >= 3,
        current: aiSummaryCount,
        target: 3
      }
    ];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Sales Target Goal Gauge Bars (Pastel Theme) */}
        <div className="lg:col-span-8 glass-card p-6 rounded-3xl shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-[#03C75A]/12 rounded-2xl border border-[#03C75A]/25">
                  <Target className="w-4 h-4 text-[#03C75A]" />
                </div>
                <div>
                  <span className="text-[9.5px] font-black text-[#03C75A] uppercase tracking-widest block leading-none">Sales Target Tracker</span>
                  <h2 className="text-sm font-black text-slate-900 mt-1">월별 개인 영업 달성률 현황판</h2>
                </div>
              </div>

              <button 
                onClick={fetchGoals}
                className="p-1.5 hover:bg-white/70 rounded-xl border border-[#03C75A]/10 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-extrabold text-slate-400"
                title="새로고침"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>동기화</span>
              </button>
            </div>

            {errorMess && (
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 font-bold flex items-center justify-between">
                <span>{errorMess}</span>
                <button onClick={() => setErrorMess(null)} className="text-[10px] bg-white border border-rose-200 text-rose-800 px-1.5 py-0.5 rounded">닫기</button>
              </div>
            )}

            <div className="space-y-5 pt-2">
              {goals.map((g) => {
                const theme = getColorTheme(g.color);
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                
                return (
                  <div key={g.id} className="p-4.5 rounded-2xl border bg-white/60/20 shadow-lg border-[#03C75A]/10 hover:border-white/12 hover:bg-white/70/40 transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">{g.userName}</span>
                          <span className="text-[9px] font-black bg-white/70 border border-[#03C75A]/12 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">
                            {g.userRole}
                          </span>
                          <span className="text-slate-650 font-medium">|</span>
                          <span className="text-[10.5px] text-slate-450 font-bold">{g.period}</span>
                        </div>
                        <p className="text-[11.5px] text-slate-400 font-extrabold mt-1 uppercase tracking-wider flex items-center gap-1">
                          <span className="text-slate-400 font-bold">목표 지표:</span>
                          <span className="text-slate-600 font-black">{g.metricName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className={`text-base font-black ${theme.text}`}>{pct}%</span>
                          <span className="text-[10px] text-slate-400 font-bold ml-1.5">({g.currentValue} / {g.targetValue} 건)</span>
                        </div>
                        
                        <button
                          onClick={() => handleIncrement(g.id)}
                          className={`p-1.5 rounded-xl border flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 text-white ${
                            g.currentValue >= g.targetValue
                              ? 'bg-slate-100 border-slate-200 text-slate-350 cursor-not-allowed shadow-none'
                              : 'bg-[#03C75A] hover:brightness-110 border-[#03C75A]/25 shadow-md shadow-[#03C75A]/10'
                          }`}
                          disabled={g.currentValue >= g.targetValue}
                          title="실적 1건 추가 기록"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                      </div>
                    </div>

                    {/* Pastel Gauge Progress Bar */}
                    <div className="relative w-full h-3.5 bg-white/60 rounded-full overflow-hidden shadow-inset">
                      <div 
                        className={`h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out ${theme.progressColor}`}
                        style={{ width: `${pct}%` }}
                      />
                      
                      {pct >= 100 && (
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <CheckCircle className="w-3.5 h-3.5 text-white fill-emerald-500" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/60/30 border border-[#03C75A]/10 p-4 rounded-2xl text-[11px] font-medium text-slate-400 flex items-start gap-1.5 mt-5 shadow-inner">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-extrabold text-slate-800">영업 성과 실시간 연동:</span> 영업 목표 트래커의 <span className="font-bold text-[#03C75A] bg-[#03C75A]/10 px-1.5 py-0.5 border border-[#03C75A]/25 rounded">+ 버튼</span>을 클릭하여 실적을 갱신하면, 리더보드 순위는 물론 **명예의 업적 보관소의 뱃지**와 **게이지 달성률**이 실시간 연동 격발됩니다.
            </p>
          </div>
        </div>

        {/* Gamified Team Leaderboard Card (Trophy layout) */}
        <div className="lg:col-span-4 glass-card p-6 rounded-3xl shadow-2xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-amber-500/12 rounded-2xl border border-amber-500/25">
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-amber-400 uppercase tracking-widest block leading-none">Leaderboard</span>
                <h2 className="text-sm font-black text-slate-900 mt-1">세일즈 실적 명예의 전당</h2>
              </div>
            </div>

            <p className="text-[11.5px] text-slate-400 font-semibold leading-relaxed">
              현재 5월 누적 달성 지표 비율을 기준으로 구성원 가중치별 서열이 실시간 게이미피케이션으로 연동 배열됩니다.
            </p>

            <div className="space-y-3 pt-2">
              {getSortedLeaderboard().map((g, index) => {
                const theme = getColorTheme(g.color);
                const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                const achievements = getAchievementsForUser(g.userName);
                
                return (
                  <div 
                    key={g.id} 
                    className={`flex items-center justify-between p-4.5 rounded-2xl border transition-all hover:scale-[1.01] ${
                      index === 0 
                        ? 'bg-amber-500/8 border-amber-500/25 ring-2 ring-amber-500/15' 
                        : index === 1 
                        ? 'bg-white/70/40 border-[#03C75A]/10' 
                        : 'bg-white/60/20 border-[#03C75A]/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank Circle */}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                        index === 0 
                          ? 'bg-amber-100 text-amber-700' 
                          : index === 1 
                          ? 'bg-slate-100 text-slate-600' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {index + 1}
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span>{g.userName}</span>
                          {index === 0 && <Flame className="w-3 h-3 text-red-500 inline fill-red-400" />}
                        </h4>
                        
                        {/* Display unlocked badge mini icons next to sales reps names */}
                        <div className="flex items-center gap-1 mt-1 animate-fadeIn">
                          {achievements.map((ach) => {
                            const Icon = ach.icon;
                            if (!ach.isUnlocked) return null;
                            return (
                              <span 
                                key={ach.id} 
                                title={`${ach.name}: ${ach.description}`} 
                                className={`p-0.5 rounded text-white bg-gradient-to-tr ${ach.gradient} hover:scale-115 transition-all shadow-4xs shrink-0 flex items-center justify-center cursor-help`}
                              >
                                <Icon className="w-2.5 h-2.5" />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {getRankBadge(index)}
                      <div className="text-[11px] font-black text-slate-700 mt-1.5 font-mono">
                        {pct}% 달성
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-55 pt-3.5 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              <span>Enterprise Gamification Engine</span>
            </p>
          </div>
        </div>
      </div>

      {/* Honor Vault Achievements Section (cols-12 beautiful glassmorphism panel) */}
      <div className="glass-card p-6 rounded-3xl shadow-2xl space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between border-b border-[#03C75A]/10 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-tr from-[#03C75A] to-[#1eca6b] rounded-2xl text-white shadow-md shadow-[#03C75A]/25">
              <Star className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[9.5px] font-black text-[#03C75A] uppercase tracking-widest block leading-none">Sales Honor Vault</span>
              <h2 className="text-sm font-black text-slate-900 mt-1">명예의 업적 보관소</h2>
            </div>
          </div>
          <span className="text-[10px] font-black text-[#03C75A] bg-[#03C75A]/12 border border-[#03C75A]/25 px-2.5 py-1 rounded-lg uppercase font-mono">
            Dynamic CRM Achievements
          </span>
        </div>

        {/* 3 Columns Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* We evaluate achievements based on the currently logged in user (in demo: 이도윤 이사 / Admin or active sales reps) */}
          {getAchievementsForUser(userRole === 'Admin' ? '이도윤 이사' : '한채원 대리').map((ach) => {
            const Icon = ach.icon;
            const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
            
            return (
              <div 
                key={ach.id} 
                className={`relative group rounded-2xl border p-5 transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between h-[190px] overflow-hidden ${
                  ach.isUnlocked 
                    ? 'bg-gradient-to-br from-slate-900/60 to-slate-950/40 border-[#03C75A]/12 shadow-2xl ring-2 ring-[#03C75A]/5 animate-fadeIn'
                    : 'bg-white/60/25 border-[#03C75A]/10 grayscale opacity-55 hover:opacity-85 hover:grayscale-0'
                }`}
              >
                {/* Glow behind unlocked items */}
                {ach.isUnlocked && (
                  <div className={`absolute -right-10 -bottom-10 w-24 h-24 bg-gradient-to-tr ${ach.gradient} opacity-[0.06] rounded-full filter blur-xl`} />
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    {/* Badge Icon Wrapper */}
                    <div className={`w-9.5 h-9.5 rounded-xl flex items-center justify-center text-white shadow-sm transition-all duration-300 ${
                      ach.isUnlocked 
                        ? `bg-gradient-to-tr ${ach.gradient} scale-100 group-hover:scale-105`
                        : 'bg-white/50 text-slate-650 border border-[#03C75A]/10'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Unlock Status Stamp */}
                    {ach.isUnlocked ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded border border-emerald-200/50 flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5 fill-emerald-500 text-white" />
                        <span>UNLOCKED</span>
                      </span>
                    ) : (
                      <span className="bg-slate-50 text-slate-400 text-[8.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-slate-200/60 flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className={`text-xs font-black tracking-tight ${ach.isUnlocked ? 'text-slate-900' : 'text-slate-550'}`}>
                      {ach.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-tight font-bold mt-1">
                      {ach.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar HUD */}
                <div className="space-y-1.5 pt-3 border-t border-[#03C75A]/10 mt-auto pt-3">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className={ach.isUnlocked ? 'text-[#03C75A]' : 'text-slate-400'}>
                      {ach.requiredText}
                    </span>
                    <span className="font-mono text-slate-400">
                      {ach.isUnlocked ? '100%' : `${pct}%`} ({ach.current}/{ach.target})
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                        ach.isUnlocked ? `bg-gradient-to-r ${ach.gradient}` : 'from-slate-350 to-slate-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
