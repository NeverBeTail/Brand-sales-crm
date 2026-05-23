import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, MessageSquare, MapPin, 
  Search, SlidersHorizontal, CheckCircle2, 
  Sparkles, ListCollapse, ChevronDown, ChevronUp,
  FileText, Bot, PhoneCall, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Brand, Meeting } from '../types';

interface BrandHistoryTimelineProps {
  brands: Brand[];
  selectedBrandId?: string;
  meetings: Meeting[];
  onSelectBrand: (id: string) => void;
}

export default function BrandHistoryTimeline({ 
  brands, 
  selectedBrandId, 
  meetings, 
  onSelectBrand 
}: BrandHistoryTimelineProps) {
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);

  const selectedBrand = useMemo(() => {
    return brands.find(b => b.id === selectedBrandId);
  }, [brands, selectedBrandId]);

  // Consolidate meetings & chronological logs
  const timelineEvents = useMemo(() => {
    let list = [...meetings];
    
    // Filter by Brand if in 'current' mode
    if (filterMode === 'current' && selectedBrandId) {
      list = list.filter(m => m.brandId === selectedBrandId);
    }

    // Sort by dateTime (newest first)
    list.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => 
        m.title.toLowerCase().includes(q) || 
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.summary && m.summary.toLowerCase().includes(q)) ||
        (m.location && m.location.toLowerCase().includes(q))
      );
    }

    return list;
  }, [meetings, filterMode, selectedBrandId, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedMeetingId(prev => prev === id ? null : id);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Deal Completed':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'Proposal & Negotiation':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'First Meeting':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/10';
    }
  };

  return (
    <div className="glass-card rounded-[32px] border border-[#03C75A]/100 p-5 sm:p-6 shadow-sm space-y-5 animate-fadeIn">
      {/* Header section with Naver Green identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 bg-[#03C75A]/10 text-[#01893d] rounded-2xl border border-[#03C75A]/20">
            <TrendingUp className="w-4 h-4 sm:w-5 h-5 text-[#03C75A]" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight flex items-center gap-1.5">
              실시간 영업 히스토리 타임라인
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">단말 연동 이력부터 현장 대외 파이프라인까지 한눈에 추적</p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl items-center self-start sm:self-auto text-[10px] font-bold border border-slate-200/50">
          <button
            onClick={() => setFilterMode('current')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterMode === 'current'
                ? 'bg-white text-[#01893d] shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            선택 브랜드 ({selectedBrand?.name || '미지정'})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white text-[#01893d] shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            전체 활동 스트림
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 relative">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="히스토리 내용, 미팅 주제, AI 분석 키워드 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100/60 hover:bg-slate-100 focus:bg-white rounded-xl border border-transparent focus:border-[#03C75A] focus:ring-1 focus:ring-[#03C75A] outline-none transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="relative max-h-[380px] overflow-y-auto pr-1 space-y-4 pt-1">
        
        {timelineEvents.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <AlertCircle className="w-5 h-5 text-slate-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-700">추적된 기록이 존재하지 않습니다</h4>
            <p className="text-[10px] text-slate-400 leading-normal max-w-sm mx-auto">선택된 가맹사의 세일즈 미팅, AI 원터치 결실, 계약 협상 이력을 실시간 주입하고 타임라인에 누적하세요.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-3.5 pr-2 pl-4 py-1.5 space-y-5">
            {timelineEvents.map((evt, idx) => {
              const brandOfEvent = brands.find(b => b.id === evt.brandId);
              const isExpanded = expandedMeetingId === evt.id;
              
              // Render timeline indicator line node
              return (
                <div key={evt.id} className="relative group">
                  {/* Outer glowing pulsing circle node */}
                  <div className={`absolute -left-[24px] top-1.5 w-[14px] h-[14px] rounded-full border-2 border-white transition-all bg-white flex items-center justify-center ${
                    evt.pipelineStatus === 'Deal Completed' 
                      ? 'bg-emerald-500 ring-2 ring-emerald-500/20' 
                      : evt.pipelineStatus === 'Proposal & Negotiation' 
                      ? 'bg-[#03C75A] ring-2 ring-[#03C75A]/20'
                      : 'bg-sky-400 ring-2 ring-sky-400/20'
                  }`} />

                  {/* Log Content Card */}
                  <div className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Brand badge if in 'all' view */}
                          {filterMode === 'all' && brandOfEvent && (
                            <button
                              onClick={() => onSelectBrand(brandOfEvent.id)}
                              className="text-[9px] font-black tracking-tight text-[#01893d] bg-[#dafbe4] border border-[#a2f2bd] px-1.5 py-0.5 rounded"
                            >
                              {brandOfEvent.logo} {brandOfEvent.name}
                            </button>
                          )}
                          
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${getStatusBadgeColor(evt.pipelineStatus)}`}>
                            {evt.pipelineStatus === 'Deal Completed' ? '계약 완료' : evt.pipelineStatus === 'Proposal & Negotiation' ? '제안 및 조율' : '초기 회의'}
                          </span>
                          
                          <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 font-bold">
                            <Clock className="w-3 h-3 text-slate-350" />
                            {new Date(evt.dateTime).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <h4 className="text-[12px] font-extrabold text-slate-800 leading-snug mt-1 flex items-center gap-1">
                          {evt.title}
                        </h4>
                      </div>
                      
                      <button 
                        onClick={() => toggleExpand(evt.id)}
                        className="text-[10px] text-slate-400 hover:text-[#01893d] font-bold flex items-center gap-0.5 self-start cursor-pointer select-none"
                      >
                        {isExpanded ? '접기' : '더보기'}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Brief snippet */}
                    {!isExpanded && evt.notes && (
                      <p className="text-[11px] text-slate-400 font-medium line-clamp-1 truncate bg-slate-50/50 p-1.5 rounded-lg border border-slate-100">
                        {evt.notes}
                      </p>
                    )}

                    {/* Rich Expandable detail area */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-white/80 border border-slate-200/50 p-3.5 rounded-2xl text-[11px] space-y-3 mt-1.5">
                            {/* Notes description */}
                            {evt.notes && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">회의 및 상세 기록</span>
                                <p className="text-slate-650 leading-relaxed font-sans">{evt.notes}</p>
                              </div>
                            )}

                            {/* Meeting Meta Details */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-100 pt-2 text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {evt.type === 'Online' ? '비대면 (화상)' : '대외 미팅'}
                              </span>
                              {evt.location && (
                                <span className="flex items-center gap-1 truncate" title={evt.location}>
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {evt.location}
                                </span>
                              )}
                            </div>

                            {/* AI Summary integration */}
                            {evt.summary && (
                              <div className="bg-[#f0fdf5] border border-[#a2f2bd] p-3 rounded-xl space-y-1.5">
                                <div className="flex items-center gap-1 text-[9px] font-black text-[#01893d] uppercase tracking-widest">
                                  <Sparkles className="w-3 h-3 text-[#03C75A] animate-spin-slow" />
                                  <span>AI 음성 기반 지능형 요약</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed font-medium">{evt.summary}</p>
                              </div>
                            )}

                            {/* AI Action Items integration */}
                            {evt.actionItems && evt.actionItems.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">AI 분설 실천 방안 (Action Items)</span>
                                <ul className="space-y-1">
                                  {evt.actionItems.map((item, key) => (
                                    <li key={key} className="flex items-start gap-1 text-slate-600 font-medium">
                                      <CheckCircle2 className="w-3 h-3 text-[#03C75A] shrink-0 mt-0.5" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
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

      {/* Footer statistics bar */}
      <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl flex items-center justify-between text-[11px] font-bold">
        <span className="text-slate-400 flex items-center gap-1">
          <Bot className="w-3.5 h-3.5 text-[#03C75A]" />
          AI 기반 자동 이력 동기화
        </span>
        <span className="text-[#01893d]">
          총 {timelineEvents.length}개 영업 데이터
        </span>
      </div>
    </div>
  );
}
