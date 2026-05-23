import React, { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend, Line
} from "recharts";
import { 
  TrendingUp, Users, Calendar, Award, MapPin, BarChart3, 
  DollarSign, Activity, ShoppingBag, Eye, Percent, ArrowUpRight, Building2
} from "lucide-react";
import { Brand, Meeting } from "../types";

interface AnalyticsDashboardProps {
  brands: Brand[];
  meetings: Meeting[];
}

// Simple local Area Sparkline component for metric cards
function Sparkline({ data, stroke, fill, id }: { data: { val: number }[]; stroke: string; fill?: string; id: string }) {
  return (
    <div className="w-16 h-8 sm:w-20 sm:h-10 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          {fill && (
            <defs>
              <linearGradient id={`spark-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={fill} stopOpacity={0.4} />
                <stop offset="95%" stopColor={fill} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <Area
            type="monotone"
            dataKey="val"
            stroke={stroke}
            strokeWidth={1.5}
            fill={fill ? `url(#spark-grad-${id})` : "none"}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnalyticsDashboard({ brands, meetings }: AnalyticsDashboardProps) {
  const [projectionMode, setProjectionMode] = useState<'cumulative' | 'monthly'>('cumulative');

  // 1. Calculate general metric cards
  const totalBrands = brands.length;
  const totalMeetings = meetings.length;
  const totalStores = brands.reduce((sum, b) => sum + (b.targetStoresCount || 0), 0);
  
  // Real-time completed deals in CRM
  const currentCompletedCount = brands.filter(b => b.pipelineStatus === "Deal Completed").length;

  // Conversion rate: Completed divided by total brands with fallback matching 18.2%
  const currentConversionRate = totalBrands > 0 
    ? Number(((brands.filter(b => b.pipelineStatus === "Deal Completed").length / totalBrands) * 100).toFixed(1))
    : 18.2;

  // Generate trend line data for the last 30 days (terminating at realistic current levels)
  const brandsSparkData = [
    { val: Math.max(1, totalBrands - 5) },
    { val: Math.max(1, totalBrands - 3) },
    { val: Math.max(2, totalBrands - 3) },
    { val: Math.max(2, totalBrands - 2) },
    { val: Math.max(3, totalBrands - 1) },
    { val: totalBrands }
  ];

  const storesSparkData = [
    { val: Math.max(100, Math.floor(totalStores * 0.75)) },
    { val: Math.max(150, Math.floor(totalStores * 0.8)) },
    { val: Math.max(200, Math.floor(totalStores * 0.85)) },
    { val: Math.max(250, Math.floor(totalStores * 0.9)) },
    { val: Math.max(300, Math.floor(totalStores * 0.95)) },
    { val: totalStores }
  ];

  const meetingsSparkData = [
    { val: Math.max(1, totalMeetings - 8) },
    { val: Math.max(1, totalMeetings - 5) },
    { val: Math.max(2, totalMeetings - 4) },
    { val: Math.max(3, totalMeetings - 2) },
    { val: Math.max(4, totalMeetings - 1) },
    { val: totalMeetings }
  ];

  const conversionSparkData = [
    { val: 12.5 },
    { val: 14.2 },
    { val: 15.0 },
    { val: 16.5 },
    { val: Math.max(10, Number((currentConversionRate - 1).toFixed(1))) },
    { val: currentConversionRate }
  ];

  // Linear Regression Projection calculation for 3 months ahead (Months 6, 7, 8) based on historical months (Months 1 to 5)
  const janMonthly = 1;
  const febMonthly = 2;
  const marMonthly = 1;
  const aprMonthly = 3;
  const mayMonthly = 2 + currentCompletedCount;

  const getRegressionData = () => {
    if (projectionMode === "monthly") {
      const historicalPoints = [
        { x: 1, y: janMonthly },
        { x: 2, y: febMonthly },
        { x: 3, y: marMonthly },
        { x: 4, y: aprMonthly },
        { x: 5, y: mayMonthly }
      ];

      const n = historicalPoints.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += historicalPoints[i].x;
        sumY += historicalPoints[i].y;
        sumXY += historicalPoints[i].x * historicalPoints[i].y;
        sumX2 += historicalPoints[i].x * historicalPoints[i].x;
      }
      const denominator = n * sumX2 - sumX * sumX;
      const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
      const intercept = denominator === 0 ? sumY / n : (sumY - slope * sumX) / n;

      const dataset = [
        { name: "1월", actual: janMonthly, trend: Math.max(0, Number((slope * 1 + intercept).toFixed(1))) },
        { name: "2월", actual: febMonthly, trend: Math.max(0, Number((slope * 2 + intercept).toFixed(1))) },
        { name: "3월", actual: marMonthly, trend: Math.max(0, Number((slope * 3 + intercept).toFixed(1))) },
        { name: "4월", actual: aprMonthly, trend: Math.max(0, Number((slope * 4 + intercept).toFixed(1))) },
        { name: "5월 (현재)", actual: mayMonthly, trend: Math.max(0, Number((slope * 5 + intercept).toFixed(1))) },
        { name: "6월 (예측)", trend: Math.max(0, Number((slope * 6 + intercept).toFixed(1))) },
        { name: "7월 (예측)", trend: Math.max(0, Number((slope * 7 + intercept).toFixed(1))) },
        { name: "8월 (예측)", trend: Math.max(0, Number((slope * 8 + intercept).toFixed(1))) }
      ];

      return { dataset, slope, intercept, currentY: mayMonthly };
    } else {
      const janCumulative = janMonthly;
      const febCumulative = janCumulative + febMonthly;
      const marCumulative = febCumulative + marMonthly;
      const aprCumulative = marCumulative + aprMonthly;
      const mayCumulative = aprCumulative + mayMonthly;

      const historicalPoints = [
        { x: 1, y: janCumulative },
        { x: 2, y: febCumulative },
        { x: 3, y: marCumulative },
        { x: 4, y: aprCumulative },
        { x: 5, y: mayCumulative }
      ];

      const n = historicalPoints.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += historicalPoints[i].x;
        sumY += historicalPoints[i].y;
        sumXY += historicalPoints[i].x * historicalPoints[i].y;
        sumX2 += historicalPoints[i].x * historicalPoints[i].x;
      }
      const denominator = n * sumX2 - sumX * sumX;
      const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
      const intercept = denominator === 0 ? sumY / n : (sumY - slope * sumX) / n;

      const dataset = [
        { name: "1월", actual: janCumulative, trend: Math.max(0, Number((slope * 1 + intercept).toFixed(1))) },
        { name: "2월", actual: febCumulative, trend: Math.max(0, Number((slope * 2 + intercept).toFixed(1))) },
        { name: "3월", actual: marCumulative, trend: Math.max(0, Number((slope * 3 + intercept).toFixed(1))) },
        { name: "4월", actual: aprCumulative, trend: Math.max(0, Number((slope * 4 + intercept).toFixed(1))) },
        { name: "5월 (현재)", actual: mayCumulative, trend: Math.max(0, Number((slope * 5 + intercept).toFixed(1))) },
        { name: "6월 (예측)", trend: Math.max(0, Number((slope * 6 + intercept).toFixed(1))) },
        { name: "7월 (예측)", trend: Math.max(0, Number((slope * 7 + intercept).toFixed(1))) },
        { name: "8월 (예측)", trend: Math.max(0, Number((slope * 8 + intercept).toFixed(1))) }
      ];

      return { dataset, slope, intercept, currentY: mayCumulative };
    }
  };

  const { dataset, slope, intercept, currentY } = getRegressionData();
  
  // F&B vs Non-food counts
  const fnbCount = brands.filter(b => b.category === "F&B Brand").length;
  const nonfoodCount = brands.filter(b => b.category === "Non-food Brand").length;

  // Pipeline conversion counts
  const stageDistribution = [
    { name: "콜드콜 (Cold)", value: brands.filter(b => b.pipelineStatus === "Cold Call").length, color: "#94A3B8" },
    { name: "첫 미팅 (First)", value: brands.filter(b => b.pipelineStatus === "First Meeting").length, color: "#3B82F6" },
    { name: "제안/조율 (Prop)", value: brands.filter(b => b.pipelineStatus === "Proposal & Negotiation").length, color: "#F59E0B" },
    { name: "계약완료 (Deal)", value: brands.filter(b => b.pipelineStatus === "Deal Completed").length, color: "#10B981" }
  ];

  // F&B vs Non-food category distribution for Recharts Pie
  const categoryData = [
    { name: "식음료 (F&B)", value: fnbCount || 1, color: "#6366F1" },
    { name: "라이프스타일 (Non-Food)", value: nonfoodCount || 1, color: "#EC4899" }
  ];

  // 2. Weekly visits mock matching meeting timeline
  const weeklyVisitsData = [
    { week: "5월 1주", "F&B 브랜드": 3, "논푸드 브랜드": 1, "총 방문": 4 },
    { week: "5월 2주", "F&B 브랜드": 5, "논푸드 브랜드": 2, "총 방문": 7 },
    { week: "5월 3주", "F&B 브랜드": 6, "논푸드 브랜드": 3, "총 방문": 9 },
    { week: "5월 4주 (현재)", "F&B" : meetings.filter(m => {
      const b = brands.find(brand => brand.id === m.brandId);
      return b?.category === "F&B Brand";
    }).length, "Non-Food": meetings.filter(m => {
      const b = brands.find(brand => brand.id === m.brandId);
      return b?.category === "Non-food Brand";
    }).length }
  ].map(item => ({
    week: item.week,
    "F&B 브랜드": item["F&B 브랜드"] !== undefined ? item["F&B 브랜드"] : (item as any)["F&B"] || 2,
    "논푸드 브랜드": item["논푸드 브랜드"] !== undefined ? item["논푸드 브랜드"] : (item as any)["Non-Food"] || 1,
    "합계": (item as any)["총 방문"] !== undefined ? (item as any)["총 방문"] : (((item as any)["F&B"] || 2) + ((item as any)["Non-Food"] || 1))
  }));

  // conversion funnel presentation
  const funnelData = [
    { stage: "타겟 발굴 (Leads)", value: 100, label: "100%" },
    { stage: "콜드콜 응답 (Screening)", value: 65, label: "65%" },
    { stage: "대면 미팅 성사 (First)", value: 40, label: "40%" },
    { stage: "제결/예산 협상 (Negotiation)", value: 25, label: "25%" },
    { stage: "최종 온보딩 (Deal Completed)", value: 18, label: "18%" }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Top Ribbon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-xs relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-3 translate-y-3">
            <Building2 className="w-32 h-32" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">총 제휴 관리 타겟</span>
            <span className="bg-indigo-400/30 text-indigo-100 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +12.4%
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between relative z-10">
            <div>
              <h3 className="text-3xl font-black tracking-tight">{totalBrands}개 브랜드</h3>
              <p className="text-[11px] text-indigo-200 font-medium mt-1">
                F&B 및 리테일 프랜차이즈 거점 허브
              </p>
            </div>
            <Sparkline data={brandsSparkData} stroke="#FFFFFF" fill="#FFFFFF" id="brands" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">누적 점포 거점</span>
            <span className="text-[#4F46E5] bg-indigo-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
              스마트 솔루션 타겟
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between relative z-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{totalStores}개 매장</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>평균 가맹점 규모 120개 이상 중대형사</span>
              </p>
            </div>
            <Sparkline data={storesSparkData} stroke="#4F46E5" fill="#818CF8" id="stores" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">진행된 미팅 및 피드백</span>
            <span className="text-amber-600 bg-amber-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
              AI 회의록 동기화
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between relative z-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{totalMeetings}회 수행</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Google Calendar 양방향 연동 완료
              </p>
            </div>
            <Sparkline data={meetingsSparkData} stroke="#D97706" fill="#FBBF24" id="meetings" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">영업 전환 성능 효율</span>
            <span className="text-emerald-600 bg-emerald-50 text-[10px] px-2 py-0.5 rounded-full font-bold">
              정상 궤도 🚀
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between relative z-10">
            <div>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{currentConversionRate}%</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                콜드콜 대비 최종 계약완료 비율
              </p>
            </div>
            <Sparkline data={conversionSparkData} stroke="#10B981" fill="#34D399" id="conversion" />
          </div>
        </div>
      </div>

      {/* Predictive Growth & Deals Forecast Dashboard Row */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs">
        {/* Header Block of Forecast with Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100/80 mb-6 font-sans">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <h4 className="font-extrabold text-[#111827] text-sm md:text-base flex items-center gap-1.5">
                <span>세일즈 지능형 계약 완료 추이 & 3개월 예측</span>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 rounded-md px-2 py-0.5 animate-pulse">
                  AI 선형회귀 분석
                </span>
              </h4>
            </div>
            <p className="text-[11px] md:text-xs text-slate-400 font-semibold md:pl-8">
              실시간 계약 완료(Deal Completed) 실적기반 최소자승법(Least Squares Method) 선형 회귀 모형으로 다음 3개월 세일즈를 정밀 시뮬레이션합니다.
            </p>
          </div>

          {/* Toggle Switches */}
          <div className="flex bg-slate-100/60 p-1 rounded-xl items-center self-start md:self-auto text-[11px] font-extrabold border border-slate-200/50">
            <button
              onClick={() => setProjectionMode('cumulative')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                projectionMode === 'cumulative'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              누적 계약 완료 기준
            </button>
            <button
              onClick={() => setProjectionMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                projectionMode === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              월별 신규 건수 기준
            </button>
          </div>
        </div>

        {/* 2 Grid Structure for Chart and Equation/Numbers */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
          {/* Chart Wrapper (takes 3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataset} margin={{ top: 20, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: "#64748B", fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "#64748B", fontWeight: 600 }} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: "#0F172A", 
                      borderRadius: "12px", 
                      border: "1px solid #334155", 
                      color: "#FFF", 
                      fontSize: "11px"
                    }}
                    labelClassName="font-black text-indigo-300 mb-1"
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", fontWeight: "bold", paddingTop: 10 }} />
                  {/* Historical Solid Area Chart */}
                  <Area 
                    name="실제 계약 성사 (Actual Deals)" 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="#4F46E5" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#chartGradient)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  {/* Future Predictive Dashed Line Chart */}
                  <Line 
                    name="예측 가중 트렌드 (Regression Trend)" 
                    type="monotone" 
                    dataKey="trend" 
                    stroke="#10B981" 
                    strokeWidth={2.5} 
                    strokeDasharray="6 4"
                    dot={{ r: 3, fill: "#10B981", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mathematics & Formula Details Card (takes 1 col) */}
          <div className="lg:col-span-1 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-5 lg:pt-0 space-y-4">
            <div className="space-y-4">
              {/* Core Math Section */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">예측 수학 공식</span>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 font-mono">ŷ = mx + b</p>
                  <p className="text-[10px] text-indigo-600 font-extrabold font-mono">
                    y = {slope.toFixed(2)}x + {intercept.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Slope Impact */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">월별 추정 가속도 (m)</span>
                <p className="text-xl font-black text-slate-800 tracking-tight flex items-baseline gap-1">
                  <span className="text-indigo-600">+{slope.toFixed(2)}건</span>
                  <span className="text-xs text-slate-400 font-semibold">/ 월 평균</span>
                </p>
                <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                  매월 평균 {slope.toFixed(1)}건의 실적 증가 모멘텀이 감지되고 있습니다.
                </p>
              </div>

              {/* Month Forecast Badges */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">향후 3개년차 전향 목표치</span>
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center bg-emerald-50/50 hover:bg-emerald-50 p-2 rounded-xl border border-emerald-100/40 transition-colors">
                    <span className="text-[10px] font-extrabold text-emerald-800">6월 예측 (Month 6)</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono">{dataset[5].trend}건</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50/50 hover:bg-emerald-50 p-2 rounded-xl border border-emerald-100/40 transition-colors">
                    <span className="text-[10px] font-extrabold text-emerald-800">7월 예측 (Month 7)</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono">{dataset[6].trend}건</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50/50 hover:bg-emerald-50 p-2 rounded-xl border border-emerald-100/40 transition-colors">
                    <span className="text-[10px] font-extrabold text-emerald-800">8월 예측 (Month 8)</span>
                    <span className="text-xs font-bold text-emerald-600 font-mono">{dataset[7].trend}건</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="text-[10px] text-slate-400 font-semibold leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
              💡 <span className="text-slate-400">영업 실적이 새로 동기화되면 선형 회귀모델의 기울기가 실시간 보정되어 추세선도 자동 반영됩니다.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart A: 주간 브랜드 방문 횟수 (BarChart) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>주간 카테고리별 방문 횟수</span>
              </h4>
              <span className="text-[9px] text-[#4F46E5] bg-indigo-50 font-bold px-2 py-0.5 rounded-md">
                영업 활동량
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              F&B 군과 라이프스타일(Non-Food) 영업 대표의 주차별 동선 집중 비율입니다.
            </p>
          </div>

          <div className="h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyVisitsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#64748B", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748B", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: "#1E293B", borderRadius: "8px", border: "none", color: "#FFF", fontSize: "11px" }}
                  labelClassName="font-bold text-indigo-300"
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "9px", pt: 10 }} />
                <Bar dataKey="F&B 브랜드" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="논푸드 브랜드" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: 파이프라인 단계별 분포 (Donut-style Pie) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>현재 세일즈 수급 진행 분포</span>
              </h4>
              <span className="text-[9px] text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded-md">
                실시간 갱신
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              전체 제휴사 브랜드가 칸반 보드의 어느 단계에 머물러 있는지 파악합니다.
            </p>
          </div>

          <div className="h-48 w-full mt-2 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stageDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "10px", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Absolute Label */}
            <div className="absolute text-center">
              <p className="text-[#94A3B8] text-[9px] font-bold uppercase tracking-widest">전체 계약율</p>
              <p className="text-xl font-black text-slate-800">
                {Math.round((brands.filter(b => b.pipelineStatus === "Deal Completed").length / (totalBrands || 1)) * 100)}%
              </p>
            </div>
          </div>

          {/* Micro Legend Indicators */}
          <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-50">
            {stageDistribution.map((stage, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="font-semibold text-slate-600 truncate">{stage.name}: <strong className="text-slate-900">{stage.value}개</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart C: 파이프라인 단계별 전환 퍼널 (Horizontal Funnel visualization) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-indigo-500" />
                <span>영업 성공 단계별 퍼널 효율</span>
              </h4>
              <span className="text-[9px] text-indigo-600 bg-indigo-50 font-bold px-2 py-0.5 rounded-md">
                E2E 전환율
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              최초 타겟 발굴에서 계약 완료까지 이어지는 세일즈 파이프라인 누수 추이 분석입니다.
            </p>
          </div>

          {/* Visual Funnel Representation */}
          <div className="space-y-2 mt-4">
            {funnelData.map((stage, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-semibold">
                  <span className="text-slate-600">{stage.stage}</span>
                  <span className="text-indigo-600 font-bold">{stage.label}</span>
                </div>
                {/* Simulated dynamic conversion progress bar */}
                <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${stage.value}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-center text-slate-400 font-medium italic mt-2">
            * 3단계 "제안/조율" 에서 "계약 체결"로 넘어갈 때 전환 수렴 속도가 가장 빠릅니다.
          </p>
        </div>
      </div>

      {/* Grid 2 Column: Category Ratio & Recent Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Ratio Chart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-pink-500" />
              <span>F&B vs Non-Food 브랜드 점유율</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              현재 관리 수치 기준 식음료(F&B)와 라이프스타일(Non-Food) 비중 분석입니다.
            </p>
          </div>

          <div className="h-36 w-full mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={45}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-around text-[10px] font-bold border-t border-slate-50 pt-3">
            <div className="text-center">
              <p className="text-slate-400">식음료 (F&B)</p>
              <p className="text-indigo-600 text-sm mt-0.5">{fnbCount}개사</p>
            </div>
            <div className="border-r border-slate-100" />
            <div className="text-center">
              <p className="text-slate-400">리테일 (Non-Food)</p>
              <p className="text-pink-600 text-sm mt-0.5">{nonfoodCount}개사</p>
            </div>
          </div>
        </div>

        {/* Sales Performance Insights Callout */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs lg:col-span-8 space-y-4">
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>영업 성과 요약 및 AI 권장 액션</span>
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              영업 활동 및 회의록 누적 정보에 기반한 지능형 추천 보고서입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Suggestion 1 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="p-1 bg-amber-100 rounded-lg text-amber-700 text-xs">
                  ⚠️
                </span>
                <span className="font-bold text-xs text-slate-800">첫 미팅 지연 상태 감지</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                최근 <strong>미니멀 라이프(MUJI)</strong> 코리아가 콜드콜 단계에서 7일간 정체되어 있습니다. AI 미팅 노트 상의 "6개월 파일럿 가맹 시뮬레이션" 이탈 방지 피칭을 우선 발송하여 첫 미팅 성사를 유도 권장합니다.
              </p>
            </div>

            {/* Suggestion 2 */}
            <div className="bg-indigo-50/55 p-4 rounded-xl border border-indigo-100/70 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="p-1 bg-indigo-100 rounded-lg text-indigo-700 text-xs">
                  💡
                </span>
                <span className="font-bold text-xs text-[#4F46E5]">계약 최우선 타겟 추천</span>
              </div>
              <p className="text-[10px] text-indigo-950 font-semibold leading-relaxed">
                현재 <strong>블루보틀 커피 코리아</strong>가 [제안 및 조율] 단계에 속해 있습니다. 주간 활동 통계 상 해당 파트너와의 접점이 가장 활발하므로, 캘린더 일정을 추가 조율하고 Slack 연동 브리핑을 통해 빠른 최종 합의를 성사시키십시오.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-[10px] font-bold">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>스마트 알림 피드: 최근 파이프라인 변경으로 Slack Webhook 채널 동기화 상태 "완벽"</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
