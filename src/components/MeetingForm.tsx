import React, { useState } from 'react';
import { Calendar, MapPin, Users, Video, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { Brand, Contact, PipelineStatus } from '../types';

interface MeetingFormProps {
  brands: Brand[];
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function MeetingForm({ brands, contacts, onSubmit, onCancel, isSubmitting }: MeetingFormProps) {
  const [title, setTitle] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [type, setType] = useState<'Offline' | 'Online'>('Offline');
  const [location, setLocation] = useState('');
  const [brandId, setBrandId] = useState(brands[0]?.id || '');
  const [contactId, setContactId] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [isNewContact, setIsNewContact] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('First Meeting');
  const [notes, setNotes] = useState('');
  const [googleSync, setGoogleSync] = useState(true);
  const [solutionId, setSolutionId] = useState('sol-1');
  const [department, setDepartment] = useState('마케팅사업부');

  // Filter contacts by selected brandId to showcase dynamic relational integrity
  const filteredContacts = contacts.filter(c => c.brandId === brandId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    onSubmit({
      title,
      dateTime,
      type,
      location: type === 'Online' ? 'Google Meet 화상 세션' : location,
      brandId,
      contactId: isNewContact ? undefined : (contactId || undefined),
      newContactName: isNewContact ? newContactName : undefined,
      pipelineStatus,
      notes,
      googleSync,
      solutionId,
      department
    });
  };

  return (
    <form onSubmit={handleSubmit} id="crm-meeting-form" className="bg-white border border-blue-100 p-5 rounded-2xl shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2.5 border-b border-indigo-50/70">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">새로운 세일즈 일정 예약</h3>
          <p className="text-[10px] text-slate-450 leading-normal">CRM 로컬 통합 데이터베이스 보존 일정 등록</p>
        </div>
        <div className="flex items-center gap-1 bg-indigo-50/70 rounded-full px-2.5 py-1 text-[9px] font-extrabold text-indigo-700">
          <Calendar className="w-3 h-3 text-indigo-500" />
          <span>LOCAL SCHEDULE</span>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">미팅 제목 / 영업 아젠다</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: F&B 빌링 데이터 연동 및 정산 연수 미팅"
            className="w-full text-xs p-2.5 rounded-xl border border-blue-100 placeholder:text-slate-350 bg-slate-50/30 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>

        {/* Cross-selling Solution and Proposing Team dropdown selections */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">제안 제품 솔루션</label>
            <select
              value={solutionId}
              onChange={(e) => {
                setSolutionId(e.target.value);
                // Sync default department based on solution for convenience
                if (e.target.value === 'sol-1') setDepartment('마케팅사업부');
                else if (e.target.value === 'sol-2') setDepartment('대기전략파트');
                else if (e.target.value === 'sol-3') setDepartment('예약플랫폼팀');
                else if (e.target.value === 'sol-4') setDepartment('고객솔루션TF');
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="sol-1">도도포인트 (Dodo Point - 적립/마케팅)</option>
              <option value="sol-2">나우웨이팅 (Now Waiting - 대기 관리)</option>
              <option value="sol-3">네이버예약 (Naver Booking - 예약 관리)</option>
              <option value="sol-4">네이버커넥트 (Naver Connect - 고객 연동)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">업무 추진 부서 (팀)</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              <option value="마케팅사업부">마케팅사업부 (도도포인트)</option>
              <option value="대기전략파트">대기전략파트 (나우웨이팅)</option>
              <option value="예약플랫폼팀">예약플랫폼팀 (네이버예약)</option>
              <option value="고객솔루션TF">고객솔루션TF (네이버커넥트)</option>
            </select>
          </div>
        </div>

        {/* Brand & Related Contact */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">대상 브랜드(고객사)</label>
            <select
              required
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setContactId(''); // reset contact
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.category === 'F&B Brand' ? 'F&B' : '논푸드'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-500">담당 오너/대화 실무진</label>
              <button 
                type="button" 
                onClick={() => setIsNewContact(!isNewContact)}
                className="text-[9px] text-blue-600 font-bold border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-50"
              >
                {isNewContact ? '기존 담당자 선택' : '새 담당자 직접 입력'}
              </button>
            </div>
            {isNewContact ? (
              <input
                type="text"
                required
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="예: 최주희 대리"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            ) : (
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                <option value="">-- 브랜드 담당자 선택 (선택) --</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.position})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Date / Time & Online / Offline selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">날짜 및 시간</label>
            <input
              type="datetime-local"
              required
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">회의 대면 형태</label>
            <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('Offline')}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                  type === 'Offline' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                대면 (Offline)
              </button>
              <button
                type="button"
                onClick={() => setType('Online')}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                  type === 'Online' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                화상 (Online)
              </button>
            </div>
          </div>
        </div>

        {/* Location or Meet Link info */}
        {type === 'Offline' ? (
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">구체적 대면 현장 위치</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /></span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 성동구 아차산로 7 본사 사옥 3층 회의실"
                className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-start gap-2 text-[10px] text-slate-800">
            <Video className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">온라인 화상 회의용 링크 생성 안내</p>
              <p className="text-slate-500 mt-0.5">화상 미팅이 확정되면 참여 인원들에게 발송할 Zoom, Google Meet 등 고유 초대용 URL을 미팅 정보에 기록해 주십시오.</p>
            </div>
          </div>
        )}

        {/* Pipeline & Google Sync triggers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">세일즈 파이프라인 진행 상태</label>
            <select
              value={pipelineStatus}
              onChange={(e) => setPipelineStatus(e.target.value as PipelineStatus)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="Cold Call">콜드콜 (Cold Call)</option>
              <option value="First Meeting">첫 대면 미팅 (First Meeting)</option>
              <option value="Proposal & Negotiation">도입 제안 및 조율 (Proposal & Negotiation)</option>
              <option value="Deal Completed">계약 완료 (Deal Completed)</option>
            </select>
          </div>

          {/* Google Sync hidden from regular UI - managed in developer backlog */}
        </div>

        {/* Ref notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">미팅 사전 지참 서류 및 쟁점사항 (Notes)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="예: 마진 계산 엑셀 파일 지참, 기존 타사 솔루션 고전 요인 정리 파일럿 보고서 필수.."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4.5 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>일정 등록 진행 중...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>세일즈 일정 확정 및 저장</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
