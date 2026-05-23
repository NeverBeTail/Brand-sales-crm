import React, { useEffect, useState } from 'react';
import { 
  Award, TrendingUp, CheckCircle, Flame, Target, Trophy, 
  ChevronRight, RefreshCw, Zap, Medal, Star, Plus, ShieldCheck
} from 'lucide-react';

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
}

export default function SalesGamification({ userRole, onGoalCompleted }: SalesGamificationProps) {
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
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>1st Gold</span>
          </div>
        );
      case 1:
        return (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
            <Medal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>2nd Silver</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 bg-orange-50 border border-orange-100/80 text-orange-700 p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-4xs">
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
          bar: 'bg-emerald-505',
          text: 'text-emerald-700',
          bg: 'bg-emerald-50/50 border-emerald-100',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-100',
          progressColor: 'from-emerald-400 to-teal-500'
        };
      case 'rose':
        return {
          bar: 'bg-rose-500',
          text: 'text-rose-700',
          bg: 'bg-rose-50/50 border-rose-100',
          badge: 'bg-rose-100 text-rose-800 border-rose-100',
          progressColor: 'from-rose-400 to-pink-500'
        };
      case 'indigo':
      default:
        return {
          bar: 'bg-indigo-505',
          text: 'text-indigo-700',
          bg: 'bg-indigo-50/50 border-indigo-100',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-150',
          progressColor: 'from-indigo-400 to-violet-500'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Sales Target Goal Gauge Bars (Pastel Theme) */}
      <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <Target className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <span className="text-[9.5px] font-black text-indigo-500 uppercase tracking-widest block leading-none">Sales Target Tracker</span>
                <h2 className="text-sm font-black text-slate-850 mt-1">월별 개인 영업 달성률 현황판</h2>
              </div>
            </div>

            <button 
              onClick={fetchGoals}
              className="p-1.5 hover:bg-slate-55 rounded-xl border border-slate-100 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-extrabold text-slate-500"
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
                <div key={g.id} className="p-4 rounded-2xl border bg-white/70 shadow-4xs border-slate-100 hover:border-slate-200/80 transition-all space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-950">{g.userName}</span>
                        <span className="text-[9px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase font-mono">
                          {g.userRole}
                        </span>
                        <span className="text-slate-250 font-medium">|</span>
                        <span className="text-[10.5px] text-slate-450 font-bold">{g.period}</span>
                      </div>
                      <p className="text-[11.5px] text-slate-400 font-extrabold mt-1 uppercase tracking-wider flex items-center gap-1">
                        <span className="text-slate-400">목표 지표:</span>
                        <span className="text-slate-700 font-black">{g.metricName}</span>
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
                            : 'bg-[#4F46E5] hover:bg-indigo-700 border-indigo-600 shadow-3xs'
                        }`}
                        disabled={g.currentValue >= g.targetValue}
                        title="실적 1건 추가 기록"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                      </button>
                    </div>
                  </div>

                  {/* Pastel Gauge Progress Bar */}
                  <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden shadow-inset">
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

        <div className="bg-slate-50 border border-slate-100 p-3 sm:px-4 rounded-2xl text-[11px] font-medium text-slate-500 flex items-start gap-1.5 mt-5">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-extrabold text-slate-705">영업 성과 가상 활성화 기제:</span> 위 목표 트래커의 성격별 실적 <span className="font-bold text-indigo-600 bg-indigo-50 px-1 border border-indigo-100 rounded">+ 버튼</span>을 클릭하면, 실시간으로 KPI 진척 데이터가 업데이트 되며 사내 감사 이력(Audit Log) 및 인앱 알림 종(Bell)에 성공 트리거 피드가 실시간 연동 격발됩니다.
          </p>
        </div>
      </div>

      {/* Gamified Team Leaderboard Card (Trophy layout) */}
      <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-3xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-amber-55/60 rounded-2xl border border-amber-100">
              <Trophy className="w-4 h-4 text-amber-650" />
            </div>
            <div>
              <span className="text-[9.5px] font-black text-amber-550 uppercase tracking-widest block leading-none">Leaderboard</span>
              <h2 className="text-sm font-black text-slate-850 mt-1">세일즈 실적 명예의 전당</h2>
            </div>
          </div>

          <p className="text-[11.5px] text-slate-400 font-semibold leading-relaxed">
            현재 5월 누적 달성 지표 비율을 기준으로 구성원 가중치별 서열이 실시간 게이미피케이션으로 연동 배열됩니다.
          </p>

          <div className="space-y-3 pt-2">
            {getSortedLeaderboard().map((g, index) => {
              const theme = getColorTheme(g.color);
              const pct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
              
              return (
                <div 
                  key={g.id} 
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all hover:scale-[1.01] ${
                    index === 0 
                      ? 'bg-amber-50/15 border-amber-100 ring-2 ring-amber-400/5' 
                      : index === 1 
                      ? 'bg-slate-50/20 border-slate-100' 
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Circle */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                      index === 0 
                        ? 'bg-amber-100 text-amber-700' 
                        : index === 1 
                        ? 'bg-slate-105 text-slate-600' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
                        <span>{g.userName}</span>
                        {index === 0 && <Flame className="w-3 h-3 text-red-500 inline fill-red-400" />}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{g.metricName}</p>
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

        <div className="mt-5 border-t border-slate-50 pt-3.5 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-500" />
            <span>Enterprise Gamification Engine</span>
          </p>
        </div>
      </div>
    </div>
  );
}
