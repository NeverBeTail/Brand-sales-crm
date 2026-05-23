import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Command, Building2, Users, Calendar, Trello, 
  BarChart3, Bot, FileText, ShieldCheck, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { Brand, Contact, Meeting } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  brands: Brand[];
  contacts: Contact[];
  meetings: Meeting[];
  setViewMode: (mode: 'profile' | 'pipeline' | 'analytics' | 'audit' | 'chatbot' | 'admin' | 'backlog') => void;
  onSelectBrand: (brandId: string) => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  brands = [],
  contacts = [],
  meetings = [],
  setViewMode,
  onSelectBrand
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // General click outside/escape listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter & classify results
  const matchingBrands = brands.filter(b => 
    b.name.toLowerCase().includes(query.toLowerCase()) || 
    b.category.toLowerCase().includes(query.toLowerCase()) ||
    b.description.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const matchingContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.position.toLowerCase().includes(query.toLowerCase()) ||
    c.email.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4);

  const matchingMeetings = meetings.filter(m => 
    m.title.toLowerCase().includes(query.toLowerCase()) || 
    (m.notes && m.notes.toLowerCase().includes(query.toLowerCase())) ||
    (m.summary && m.summary.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 4);

  // General View Jumps
  const viewJumps = [
    { label: '활동 타임라인 (Timeline Feed)', id: 'profile' as const, icon: Calendar, subtitle: '영업 내역 및 AI 요약' },
    { label: '세일즈 칸반 (Kanban Board)', id: 'pipeline' as const, icon: Trello, subtitle: '거래 및 다차원 현황 관리' },
    { label: '영업 통계 (Analytics Panel)', id: 'analytics' as const, icon: BarChart3, subtitle: '전환율 및 활동 실적' },
    { label: 'AI 영업 비서 (RAG Chatbot)', id: 'chatbot' as const, icon: Bot, subtitle: 'RAG 기반 지능형 응대 비서' },
    { label: '보안 감사 (Audit Logs)', id: 'audit' as const, icon: FileText, subtitle: '작업 내역 트래킹 및 감사' },
    { label: '어드민 통제 (Admin Panel)', id: 'admin' as const, icon: ShieldCheck, subtitle: '사용자 통제 및 DB 마이그레이션' },
  ].filter(v => v.label.toLowerCase().includes(query.toLowerCase()));

  // Flattened items for easy keyboard selection
  const flattenedItems: any[] = [
    ...viewJumps.map(v => ({ type: 'view', item: v, uniqueId: `view-${v.id}` })),
    ...matchingBrands.map(b => ({ type: 'brand', item: b, uniqueId: `brand-${b.id}` })),
    ...matchingContacts.map(c => ({ type: 'contact', item: c, uniqueId: `contact-${c.id}` })),
    ...matchingMeetings.map(m => ({ type: 'meeting', item: m, uniqueId: `meeting-${m.id}` }))
  ];

  const handleSelect = (idx: number) => {
    const active = flattenedItems[idx];
    if (!active) return;

    if (active.type === 'view') {
      setViewMode(active.item.id);
    } else if (active.type === 'brand') {
      onSelectBrand(active.item.id);
    } else if (active.type === 'contact') {
      onSelectBrand(active.item.brandId);
    } else if (active.type === 'meeting') {
      onSelectBrand(active.item.brandId);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flattenedItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flattenedItems.length) % flattenedItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-white/60/40 backdrop-blur-[2px]">
      {/* Click outside backdrop */}
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      {/* Main command palette widget */}
      <div 
        id="crm-command-palette"
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-scaleIn focus:outline-none"
      >
        {/* Command Search box input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="동작(칸반, 타임라인), 파트너 브랜드, 담당자, 회의록 검색..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 text-xs select-auto text-slate-800 placeholder-slate-400 outline-none w-full bg-transparent"
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-lg shadow-4xs shrink-0 select-none">
            <span className="text-[10px] font-black text-slate-400 font-mono">ESC</span>
            <span className="text-[9px] font-bold text-slate-350">닫기</span>
          </div>
        </div>

        {/* Dynamic Items Listing section */}
        <div 
          ref={listRef}
          className="flex-1 max-h-[350px] overflow-y-auto divide-y divide-slate-50 p-2 space-y-1"
        >
          {flattenedItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-sans">
              🔍 일치하는 검색어 또는 동작 단축 명령어가 없습니다.
            </div>
          ) : (
            <>
              {flattenedItems.map((flat, i) => {
                const isFocused = i === selectedIndex;
                const { type, item } = flat;

                return (
                  <button
                    key={flat.uniqueId}
                    type="button"
                    onClick={() => handleSelect(i)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isFocused 
                        ? 'bg-indigo-600 text-white shadow-xs' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Left icon resolver */}
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        isFocused 
                          ? 'bg-white/10 text-white' 
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {type === 'view' && <item.icon className="w-4 h-4" />}
                        {type === 'brand' && <Building2 className="w-4 h-4" />}
                        {type === 'contact' && <Users className="w-4 h-4" />}
                        {type === 'meeting' && <Calendar className="w-4 h-4" />}
                      </div>

                      {/* Info lines */}
                      <div className="min-w-0 flex flex-col text-left">
                        <span className={`text-xs font-bold truncate ${
                          isFocused ? 'text-white' : 'text-slate-805'
                        }`}>
                          {type === 'view' && item.label}
                          {type === 'brand' && item.name}
                          {type === 'contact' && `${item.name} (${item.position})`}
                          {type === 'meeting' && item.title}
                        </span>
                        <span className={`text-[10px] truncate leading-normal ${
                          isFocused ? 'text-indigo-100' : 'text-slate-400 font-semibold'
                        }`}>
                          {type === 'view' && item.subtitle}
                          {type === 'brand' && `${item.category} • ${item.headquarters}`}
                          {type === 'contact' && `${item.email}`}
                          {type === 'meeting' && `미팅 이력 상세 • ${new Date(item.dateTime).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>

                    {/* Right indicator code badges */}
                    <div className="flex items-center gap-2 shrink-0 select-none">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isFocused 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-150 text-slate-400'
                      }`}>
                        {type === 'view' ? '이동' : type === 'brand' ? '거래처 360' : type === 'contact' ? '바이어' : '일정'}
                      </span>
                      {isFocused && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-white shrink-0 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Command palette hint footer bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] font-bold text-slate-400 select-none font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">↑↓ <span className="font-sans">이동</span></span>
            <span className="flex items-center gap-1">Enter <span className="font-sans">선택/실행</span></span>
          </div>
          <span>B2B CRM Rocket Finder ⚡</span>
        </div>
      </div>
    </div>
  );
}
