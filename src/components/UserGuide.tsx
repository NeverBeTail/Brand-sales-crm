import React, { useState } from "react";
import { 
  BookOpen, Sparkles, Trello, BarChart3, Bot, ShieldCheck, 
  HelpCircle, Clock, Wrench, CheckCircle2, ChevronRight, 
  Layers, Lock, AlertTriangle, Lightbulb
} from "lucide-react";
import { motion } from "motion/react";

export default function UserGuide() {
  const [activeTab, setActiveTab] = useState<'intro' | 'kanban' | 'ai' | 'admin'>('intro');

  return (
    <div className="glass-panel rounded-[32px] border border-[#03C75A]/100 p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
      {/* Upper header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-indigo-50/60 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-650 rounded-xl border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              B2B 세일즈 CRM 통합 사용 가이드
            </h2>
          </div>
          <p className="text-xs text-slate-450 font-medium">
            영업 효율성을 극대화하기 위한 기능 해설과 CRM 시스템 조작 가이드입니다.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50/40 p-1 rounded-xl border border-indigo-100/30">
          <span className="text-[10px] font-black text-indigo-650 px-2.5 py-1 bg-white rounded-lg shadow-4xs font-mono">
            v1.2 ENTERPRISE
          </span>
        </div>
      </div>

      {/* Tabs navigation list with subtle glass glow */}
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
        <button
          onClick={() => setActiveTab('intro')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'intro'
              ? 'bg-white/70 text-white shadow-sm'
              : 'bg-white/65 hover:bg-slate-50 border border-slate-200/50 text-slate-600'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>기본 비전 & 워크플로우</span>
        </button>

        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'kanban'
              ? 'bg-white/70 text-white shadow-sm'
              : 'bg-white/65 hover:bg-slate-50 border border-slate-200/50 text-slate-600'
          }`}
        >
          <Trello className="w-3.5 h-3.5" />
          <span>세일즈 칸반 & 360° 상세 뷰</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-white/70 text-white shadow-sm'
              : 'bg-white/65 hover:bg-slate-50 border border-slate-200/50 text-slate-600'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>오디오 분석 & AI 어시스턴트</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-white/70 text-white shadow-sm'
              : 'bg-white/65 hover:bg-slate-50 border border-slate-200/50 text-slate-600'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>엔터프라이즈 보안 & RBAC</span>
        </button>
      </div>

      {/* Pane Content with beautifully textured glass styling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        {/* Left Side: Interactive Reading Column */}
        <div className="lg:col-span-8 space-y-5">
          {activeTab === 'intro' && (
            <div className="space-y-5">
              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-4">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2 border-b border-indigo-50 pb-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>우리 CRM이 해결하는 핵심 딜레마</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  우리는 가맹 브랜드별로 판매할 수 있는 독립 솔루션이 총 4개 (<strong className="text-indigo-600 font-bold">도도포인트, 나우웨이팅, 네이버예약, 네이버커넥트</strong>) 입니다.
                  과거에는 한 브랜드와 계약을 마치면 영업이 '종결'된 것으로 오해하는 문제가 있었습니다. 
                  하지만 당사의 핵심은 <strong className="text-slate-800">모든 솔루션을 유기적으로 도입하는 ‘브랜드의 전사 도입 종결’</strong>입니다.
                </p>
                
                <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl space-y-2">
                  <span className="text-[10px] font-black tracking-wider text-indigo-600 uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                    <span>최고 중요 비즈니스 규칙</span>
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pl-1 font-medium">
                    <li className="flex items-start gap-1">
                      <span className="text-indigo-500 shrink-0">•</span>
                      <span><strong>영업 마침표 없음 :</strong> 하나의 솔루션 도입이 끝나도, 세 개의 솔루션을 더 교차 세일즈할 기회가 여전히 투명하게 관리됩니다.</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-indigo-500 shrink-0">•</span>
                      <span><strong>교차 판매 알림 :</strong> 아직 도입하지 않은 미도입 솔루션이 있는 경우 시스템이 자동으로 <strong>'크로스셀(Cross-selling) 권장 경보'</strong>를 송출합니다.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-3.5">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>기본 가치 제안 전파 사이클</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 relative">
                    <span className="absolute top-2.5 right-2.5 text-xs font-black text-slate-350 font-mono">01</span>
                    <h4 className="font-bold text-[11px] text-slate-800">아웃바운드 발굴</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      미개척 프랜차이즈 및 가맹 브랜드를 발굴하여 초기 영업 타겟으로 우선 계정 등록합니다.
                    </p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 relative">
                    <span className="absolute top-2.5 right-2.5 text-xs font-black text-slate-350 font-mono">02</span>
                    <h4 className="font-bold text-[11px] text-slate-800">상담 내역 동기화</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      구글 캘린더와 실시간 동동기화 상태를 유지하며 가맹 미팅 및 키맨 상담 로그를 적재하고 관리합니다.
                    </p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 relative">
                    <span className="absolute top-2.5 right-2.5 text-xs font-black text-slate-350 font-mono">03</span>
                    <h4 className="font-bold text-[11px] text-slate-800">AI 세일즈 전환</h4>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      미팅 메모를 음성/텍스트로 입력하여 원클릭 AI 제안서 생성 및 피드백 지원을 입수합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kanban' && (
            <div className="space-y-5">
              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-4">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2 border-b border-indigo-50 pb-2">
                  <Trello className="w-4 h-4 text-indigo-500" />
                  <span>세일즈 칸반의 듀얼 모드 (브랜드 뷰 vs 상품 뷰)</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  상단의 <strong className="text-indigo-650 font-bold">'브랜드(Brand) 필터'</strong>와 <strong className="text-indigo-650 font-bold">'상품(Product) 필터'</strong> 스위치로 관점을 전면 상호 전환할 수 있습니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/50 space-y-1.5 shadow-4xs">
                    <span className="text-[10.5px] font-black text-indigo-600 uppercase font-mono">📦 브랜드(Brand) 뷰</span>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      한 가맹 브랜드의 전사적인 수주 단계를 한 눈에 트래킹합니다. 한 브랜드가 수집한 모든 계약 성숙도를 요약 형태로 일괄 모니터링하기 수월합니다.
                    </p>
                  </div>
                  <div className="bg-white/80 p-3.5 rounded-xl border border-slate-200/50 space-y-1.5 shadow-4xs">
                    <span className="text-[10.5px] font-black text-indigo-600 uppercase font-mono">✨ 상품(Product) 뷰</span>
                    <p className="text-[11px] text-slate-550 leading-relaxed">
                      4개 개별 솔루션(도도포인트, 네이버예약 등)을 선택하면, <strong>해당 솔루션이 어떤 성숙도로 계약 중인지</strong> 병렬로 추적합니다. 특정 단일 상품 세일즈 실적에 집중할 때 필수적입니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-3.5">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>360° 상세 분석 & 크로스셀링 워크플로우</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  CRM 보드나 타임라인에서 특정 가맹점을 선택하면 <strong>360° 종합 계측 대시보드</strong>가 팝업됩니다.
                </p>
                <ul className="text-[11px] text-slate-650 space-y-2 pl-4 list-decimal font-medium">
                  <li><strong>계약 상품 동향 :</strong> 4개 솔루션 각각의 도입 여부를 클릭 한 번으로 토글 갱신할 수 있습니다.</li>
                  <li><strong>AI 메일 추천 작성 :</strong> 미도입 상태인 솔루션을 신규 교차 도입할 수 있도록 제안서 맞춤형 이메일을 AI 피드 초안으로 생성합니다.</li>
                  <li><strong>중복 컨택 경고 장치 :</strong> 해당 브랜드 담당자의 이메일이나 유선 정보가 타 가맹본사 영업 reps와 7일 이내에 조율 중첩이 생길 경우, 상단 앰버 경고 바가 기류되어 분쟁을 조기에 사전 방지합니다.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-4">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2 border-b border-indigo-50 pb-2">
                  <Bot className="w-4 h-4 text-indigo-500" />
                  <span>음성 적재 녹취록 회약 엔진</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  전장 대면 미팅 및 유선 세일즈 내용을 통째로 녹취하여, 맞춤형 텍스트 스크립트화하고 스마트 회의 요약과 액션 아이템을 실시간 유도합니다.
                </p>

                <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/50 space-y-2">
                  <h4 className="font-bold text-[10.5px] text-slate-800">🛠️ 녹취 모의 분석 방법</h4>
                  <ul className="text-[11px] text-slate-600 space-y-1.5 pl-1">
                    <li className="flex items-start gap-1">
                      <span className="text-indigo-500">•</span>
                      <span>새 미팅 일정이나 히스토리 상에서 <strong>[일정 및 대화록 수정]</strong> 또는 마이크 아이콘을 검토합니다.</span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="text-indigo-500">•</span>
                      <span><strong>모의 스마트 요약 실행 :</strong> 실제 기기를 연동하지 않아도, 원클릭 시뮬레이션을 통해 상담 대화를 완벽 분석하여 핵심 마일스톤 액션 플랜을 일괄 수급합니다.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-3">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-500" />
                  <span>가망 가맹 인바운드 웹훅 샌드박스 연동</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  외부 광고 기류 광고 마케팅을 통해 자발적 가망 고객 제안서가 접수되었을 때의 흐름을 샌드박스 탭이나 단축키 컨트롤을 통해 바로 인입해서 검증할 수 있습니다.
                  정상적으로 전달된 인바운드 접수 데이터는 슬랙 연동 채널과 CRM 전산 기획 보드에 실시간 푸시 팝업으로 연동 동기화됩니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-5">
              <div className="glass-card rounded-2xl border border-white/60 p-5 space-y-4">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-2 border-b border-indigo-50 pb-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>엔터프라이즈 역할 권한 배분 및 제어</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  사내 보안 정체성 및 포렌식 보안을 위해, 최고 관리자는 어드민 도구를 활용하여 각 영업 리더와 실무 사원의 접근 수위를 일일이 변경 통제할 수 있습니다.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[11px] text-rose-900">권한 부족 시 접근 거부 시뮬레이션</h4>
                      <p className="text-[10px] text-rose-700 leading-relaxed">
                        실무 가맹 사원 권한일 경우 '어드민 백앤드', '보안 감사' 메뉴 접근 시 자동으로 403 인증 거부 알림창 및 잠금 장치가 발생하여 전산 유출을 차단합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <h4 className="font-extrabold text-[11px] text-emerald-950">개별 기능 제어 스위치 (Feature Switches)</h4>
                      <p className="text-[10px] text-emerald-700 leading-relaxed">
                        최고관리자는 '전사 CSV 추출 금지', 'AI 분석 사용량 단절', '감사 트랜잭션 기록 수급 제한' 스위치를 실시간으로 On/Off 하여 컴플라이언스 위험을 단번에 제어할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Quick FAQ & Dashboard Tips Bento box */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card rounded-2xl border border-white/60 p-4.5 space-y-3.5">
            <h4 className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
              <span>자주 묻는 핵심 질문 (FAQ)</span>
            </h4>
            
            <div className="space-y-3 divide-y divide-slate-100 text-[11px] font-medium text-slate-600">
              <div className="pt-2">
                <span className="font-black text-slate-800">Q. "브랜드 종결"의 정확한 정의가 뭔가요?</span>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  가맹 브랜드가 당사 솔루션 4종(도도포인트, 나우웨이팅, 네이버예약, 네이버커넥트)을 모두 도입하여 성공적으로 운영하는 유기적 상태를 의미합니다.
                </p>
              </div>

              <div className="pt-2.5">
                <span className="font-black text-slate-800">Q. 교차부서 업무 분란이 일어나면 어떻게 되나요?</span>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  도도포인트 영업 담당자와 네이버예약 영업 담당자가 실수로 동일 키맨에게 각각 접근하면, 중복 컨택 경고 배너가 나타나며 상호 영업 이력 동기를 권장합니다.
                </p>
              </div>

              <div className="pt-2.5">
                <span className="font-black text-slate-800">Q. 구글 캘린더 연동은 실시간인가요?</span>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  구글 Workspace OAuth 가입 승인 시, 작성 내역이 클라우드 계정과 연동되어 가용 미팅을 바로 백업하고 기안화합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-slate-800 p-4.5 rounded-2xl border border-indigo-950 space-y-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 rounded-full filter blur-2xl opacity-20 pointer-events-none" />
            <span className="text-[8px] font-black uppercase text-indigo-400 tracking-widest font-mono">단축 제어 관제센터</span>
            <h4 className="text-xs font-black text-white leading-tight">빠른 검색 대시보드 (Command Palette)</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              키보드의 <kbd className="bg-white/50 px-1 py-0.5 rounded text-white font-mono text-[9px]">⌘K</kbd> 또는 <kbd className="bg-white/50 px-1 py-0.5 rounded text-white font-mono text-[9px]">Ctrl+K</kbd> 단축키를 눌러 전사를 가시화하고 브랜드를 초고속 검색 및 제어할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
