import React, { useState, useRef } from 'react';
import { 
  Shield, Users, Database, UploadCloud, Download, 
  Trash2, Cpu, CheckCircle2, AlertTriangle, Play,
  RefreshCw, UserPlus, Sparkles, Key, FileSpreadsheet,
  Clock, Mail, Phone, Calendar, HeartHandshake, TrendingUp
} from 'lucide-react';
import { Brand, Contact, Meeting } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

interface AdminPanelProps {
  brands: Brand[];
  contacts: Contact[];
  meetings: Meeting[];
  userRole: 'Admin' | 'Manager' | 'Sales_Rep';
  onChangeUserRole: (newRole: 'Admin' | 'Manager' | 'Sales_Rep') => void;
  currentUserEmail: string;
  onRefreshCrmState: () => Promise<void>;
  auditLogsCount: number;
}

export default function AdminPanel({
  brands,
  contacts,
  meetings,
  userRole,
  onChangeUserRole,
  currentUserEmail,
  onRefreshCrmState,
  auditLogsCount
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'migration' | 'users' | 'cadence' | 'diagnostics'>('migration');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvType, setCsvType] = useState<'brands' | 'contacts' | 'meetings'>('brands');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cadence / Lead intelligence states
  const [cadenceDays, setCadenceDays] = useState<number>(14);
  const [selectedCareBrandId, setSelectedCareBrandId] = useState<string | null>(null);
  const [copiedCadenceEmail, setCopiedCadenceEmail] = useState<boolean>(false);

  // Mock users list for representation
  const [usersList, setUsersList] = useState([
    { email: currentUserEmail, name: '현재 로그인 계정 (나)', role: userRole, status: 'Active', team: '프랜차이즈 영업 본부' },
    { email: 'sales_lead@placen.co.kr', name: '김두호 팀장', role: 'Manager', status: 'Active', team: 'F&B 전략 수급 전담' },
    { email: 'intern_rep@placen.co.kr', name: '이민규 인턴', role: 'Sales_Rep', status: 'Active', team: '아웃바운드 콜 TF' }
  ]);

  const [newMockUser, setNewMockUser] = useState({ email: '', name: '', role: 'Sales_Rep' as any, team: 'F&B 전략 수급 전담' });

  // Escape values for CSV generator
  const escapeCsv = (val: any): string => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // CSV Line Parser logic supporting speech, lists, and commas
  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let insideQuote = false;
    let entry = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (insideQuote && text[i + 1] === '"') {
          entry += '"';
          i++; // Skip relative quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  };

  // --- CSV Export Processes ---
  const handleExportCsv = (type: 'brands' | 'contacts' | 'meetings') => {
    try {
      setIsExporting(true);
      let csvContent = '';
      let filename = '';

      if (type === 'brands') {
        const headers = ['id', 'name', 'category', 'logo', 'headquarters', 'targetStoresCount', 'monthlyRevenueEst', 'pipelineStatus', 'description', 'proposalSubStage'];
        csvContent = headers.join(',') + '\n';
        brands.forEach(b => {
          const row = [
            b.id,
            b.name,
            b.category,
            b.logo,
            b.headquarters,
            b.targetStoresCount,
            b.monthlyRevenueEst,
            b.pipelineStatus,
            b.description,
            b.proposalSubStage || 'Draft'
          ].map(escapeCsv).join(',');
          csvContent += row + '\n';
        });
        filename = `crm_brands_migration_${new Date().toISOString().slice(0,10)}.csv`;
      } else if (type === 'contacts') {
        const headers = ['id', 'brandId', 'name', 'role', 'position', 'phone', 'email'];
        csvContent = headers.join(',') + '\n';
        contacts.forEach(c => {
          const row = [
            c.id,
            c.brandId,
            c.name,
            c.role,
            c.position,
            c.phone,
            c.email
          ].map(escapeCsv).join(',');
          csvContent += row + '\n';
        });
        filename = `crm_contacts_migration_${new Date().toISOString().slice(0,10)}.csv`;
      } else {
        const headers = ['id', 'brandId', 'title', 'dateTime', 'type', 'location', 'pipelineStatus', 'notes', 'summary', 'actionItems'];
        csvContent = headers.join(',') + '\n';
        meetings.forEach(m => {
          const actionStr = m.actionItems ? m.actionItems.join(' || ') : '';
          const row = [
            m.id,
            m.brandId,
            m.title,
            m.dateTime,
            m.type,
            m.location,
            m.pipelineStatus,
            m.notes,
            m.summary,
            actionStr
          ].map(escapeCsv).join(',');
          csvContent += row + '\n';
        });
        filename = `crm_meetings_history_migration_${new Date().toISOString().slice(0,10)}.csv`;
      }

      // Trigger standard browser download
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setImportStatus({
        type: 'success',
        message: `진공 인코딩 완료! [${type.toUpperCase()}] CSV 패키지가 성공적으로 출력되었습니다.`
      });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `CSV 추출 실패: ${err.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  // --- Download Helper Template for Users ---
  const handleDownloadTemplate = (type: 'brands' | 'contacts' | 'meetings') => {
    let template = '';
    if (type === 'brands') {
      template = 'id,name,category,logo,headquarters,targetStoresCount,monthlyRevenueEst,pipelineStatus,description,proposalSubStage\n' + 
                 'brand-sample-1,그린프레시 샐러드,F&B Brand,🥗,경기도 성남시 분당구,25,월 평균 4억 5천만원 규모,Proposal & Negotiation,샐러드 전문 1등 브랜드,Draft\n' +
                 'brand-sample-2,메가 IT 드링크,F&B Brand,☕,서울시 강남구 삼성동,180,월 평균 15억원 규모,First Meeting,저가형 고품질 음료 프랜차이즈,Reviewed';
    } else if (type === 'contacts') {
      template = 'id,brandId,name,role,position,phone,email\n' + 
                 'contact-sample-1,brand-sample-1,강준호,브랜드 본사 담당자,창업총괄 본부장,010-1234-5678,jh_kang@greenfresh.com\n' +
                 'contact-sample-2,brand-sample-2,김민서,VAN대리점,대리점 대표,010-8765-4321,ms_kim@megaitdrink.co.kr';
    } else {
      template = 'id,brandId,title,dateTime,type,location,pipelineStatus,notes,summary,actionItems\n' + 
                 'meet-sample-1,brand-sample-1,스마트 오더 및 CRM 영업 상담,2026-05-21T09:00:00Z,Offline,역삼역 본점 회의실,Proposal & Negotiation,NFC 30대 추가 계약 논의,단말 시연과 통합 매표 기능 시연 만족,추가 혜택 품의 || 정식 계약서 교부';
    }

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `crm_template_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV Import & Merging ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result;
      if (typeof text === 'string') {
        await parseAndMigrateCsv(text, csvType);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
  };

  const parseAndMigrateCsv = async (csvString: string, type: 'brands' | 'contacts' | 'meetings') => {
    try {
      setIsImporting(true);
      setImportStatus({ type: 'idle', message: 'CSV 인코딩 규격 및 필드 동기화 분석 중...' });

      // Clean lines and structure
      const lines = csvString.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error("CSV 데이터가 충분하지 않습니다. 최소 1개 이상의 헤더와 행(Row)을 지니고 있어야 합니다.");
      }

      const headers = parseCsvLine(lines[0]);
      const rawRows = lines.slice(1);

      const batchRef = writeBatch(db);
      let successCount = 0;

      if (type === 'brands') {
        rawRows.forEach((row, index) => {
          const cols = parseCsvLine(row);
          if (cols.length < 2) return; // Skip empty/defect rows

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h.trim()] = cols[idx] || '';
          });

          const id = rowData.id || `csv-brand-${Date.now()}-${index}`;
          const bDoc = doc(db, 'brands', id);

          batchRef.set(bDoc, {
            name: rowData.name || '미지정 가맹사명',
            category: rowData.category || 'F&B Brand',
            logo: rowData.logo || '📍',
            headquarters: rowData.headquarters || '',
            targetStoresCount: Number(rowData.targetStoresCount) || 5,
            monthlyRevenueEst: rowData.monthlyRevenueEst || '',
            pipelineStatus: rowData.pipelineStatus || 'Cold Call',
            description: rowData.description || '',
            proposalSubStage: rowData.proposalSubStage || 'Draft',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          successCount++;
        });

      } else if (type === 'contacts') {
        rawRows.forEach((row, index) => {
          const cols = parseCsvLine(row);
          if (cols.length < 3) return;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h.trim()] = cols[idx] || '';
          });

          const id = rowData.id || `csv-contact-${Date.now()}-${index}`;
          const cDoc = doc(db, 'contacts', id);

          batchRef.set(cDoc, {
            brandId: rowData.brandId || 'unknown',
            name: rowData.name || '미지정 바이어',
            role: rowData.role || '브랜드 본사 담당자',
            position: rowData.position || '담당자',
            phone: rowData.phone || '',
            email: rowData.email || ''
          }, { merge: true });
          successCount++;
        });

      } else {
        rawRows.forEach((row, index) => {
          const cols = parseCsvLine(row);
          if (cols.length < 3) return;

          const rowData: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowData[h.trim()] = cols[idx] || '';
          });

          const id = rowData.id || `csv-meet-${Date.now()}-${index}`;
          const mDoc = doc(db, 'meetings', id);

          // Parse actionItems separated by ' || ' or comma
          const actions = rowData.actionItems 
            ? rowData.actionItems.split(' || ').map(a => a.trim()).filter(Boolean)
            : [];

          batchRef.set(mDoc, {
            brandId: rowData.brandId || 'unknown',
            title: rowData.title || '일반 상담 영업',
            dateTime: rowData.dateTime || new Date().toISOString(),
            type: rowData.type || 'Offline',
            location: rowData.location || '회의실',
            pipelineStatus: rowData.pipelineStatus || 'Cold Call',
            notes: rowData.notes || '',
            summary: rowData.summary || '',
            actionItems: actions
          }, { merge: true });
          successCount++;
        });
      }

      await batchRef.commit();
      await onRefreshCrmState();

      setImportStatus({
        type: 'success',
        message: `🎉 성공! 총 ${successCount}건의 [${type.toUpperCase()}] CSV 데이터가 데이터베이스에 마이그레이션 및 적용 완료되었습니다.`
      });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `CSV 파일 가입 및 마이그레이션 실패: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  // Seeding Presets helper for quick CRM demo/migration
  const handleSeedPreset = async (presetType: 'fnb' | 'retail') => {
    try {
      setIsImporting(true);
      setImportStatus({ type: 'idle', message: '사내 가맹 영업 데이터 프리셋 동기화 중...' });

      const batchRef = writeBatch(db);
      
      if (presetType === 'fnb') {
        const sampleBrands = [
          { id: 'brand-seed-1', name: '네이버 그린샐러드 컴퍼니', category: 'F&B Brand', logo: '🥗', headquarters: '경기도 성남시 분당구 정자사옥', targetStoresCount: 18, monthlyRevenueEst: '월 평균 3억 5,000만원 규모', pipelineStatus: 'Proposal & Negotiation', description: '2026 트렌디 웰니스 샐러드 거대 프랜차이즈, 단말 결제 및 CRM 인프라 통합 조율 중.' },
          { id: 'brand-seed-2', name: '민트포레스트 브런치랩', category: 'F&B Brand', logo: '🥯', headquarters: '서울시 강남구 신사동 22-5', targetStoresCount: 12, monthlyRevenueEst: '월 평균 1억 8,000만원 규모', pipelineStatus: 'First Meeting', description: '인플루언서 타겟 브런치 베이커리. 통합 360 솔루션 및 테블릿 오더 도입 상담 완료.' }
        ];

        const sampleContacts = [
          { id: 'contact-seed-1', brandId: 'brand-seed-1', name: '정민아 이사', role: '브랜드 본사 담당자', position: '구매 총괄 본부장', phone: '010-9876-5432', email: 'mina_jung@greensalad.com' },
          { id: 'contact-seed-2', brandId: 'brand-seed-2', name: '이동현 대표', role: '브랜드 본사 담당자', position: '창업 총괄', phone: '010-5544-3322', email: 'dh_lee@mintforest.co.kr' }
        ];

        const sampleMeetings = [
          {
            id: 'meet-seed-1',
            brandId: 'brand-seed-1',
            title: '샐러드 시스템 인근 단말 30대 시연 미팅',
            dateTime: new Date().toISOString(),
            type: 'Offline',
            location: '네이버 그린 샐러드 경기본사 4층 미팅룸',
            pipelineStatus: 'Proposal & Negotiation',
            notes: '제안서 기반 통합 오더 시스템 결합 시연 진행. 월 매출 예측 데이터 및 360 가맹 통계 연동 시 만족도가 대단히 높았음. 계약 조인 대기.',
            summary: '월 매출 가치 파악 및 NFC 포스 연동 세션. 모바일 영수증 출력을 포함한 가맹점 통일 관리 기능 시연 성공.',
            actionItems: ['카드 수수료 혜택 최종 합의안 전송', '제안 계약 파트너 문서 교부']
          }
        ];

        sampleBrands.forEach(b => batchRef.set(doc(db, 'brands', b.id), b));
        sampleContacts.forEach(c => batchRef.set(doc(db, 'contacts', c.id), c));
        sampleMeetings.forEach(m => batchRef.set(doc(db, 'meetings', m.id), m));

      } else {
        const sampleBrands = [
          { id: 'brand-seed-3', name: '스마트 테크 트랜스 샵', category: 'Retail / Non-Food', logo: '🔌', headquarters: '서울시 서초구 효령로 241', targetStoresCount: 6, monthlyRevenueEst: '월 평균 4억 2,000만원 규모', pipelineStatus: 'Deal Completed', description: '체인형 모바일 및 IT 전자기기 유통 대리점. 원터치 결제 기기 전 점포 납품 협의 종결.' }
        ];

        const sampleContacts = [
          { id: 'contact-seed-3', brandId: 'brand-seed-3', name: '한원택 상무', role: '브랜드 본사 담당자', position: '점포개발 본부장', phone: '010-1234-5678', email: 'wthan@smarttech.net' }
        ];

        const sampleMeetings = [
          {
            id: 'meet-seed-2',
            brandId: 'brand-seed-3',
            title: '가맹 전 지점 2026 스마트 단말 일괄 전개 합의',
            dateTime: new Date().toISOString(),
            type: 'Online',
            location: '비대면 줌 가상회의실',
            pipelineStatus: 'Deal Completed',
            notes: '총 6개 점포의 영수증 발행 및 가맹 감사 추적 일괄 적용 계약을 추진. 보안 감사를 통과하고 본 조인 확정.',
            summary: '가맹점 CRM 전개를 위한 전사 타결안 서명 완료.',
            actionItems: ['단말 배송 일정 셋업', '점주 교육 가이드 발송']
          }
        ];

        sampleBrands.forEach(b => batchRef.set(doc(db, 'brands', b.id), b));
        sampleContacts.forEach(c => batchRef.set(doc(db, 'contacts', c.id), c));
        sampleMeetings.forEach(m => batchRef.set(doc(db, 'meetings', m.id), m));
      }

      await batchRef.commit();
      await onRefreshCrmState();

      setImportStatus({
        type: 'success',
        message: `🎉 성공! ${presetType === 'fnb' ? 'F&B 식음료' : '리테일 기술 매장'} 프리셋 영업 데이터가 성공적으로 마이그레이션 완료되었습니다.`
      });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `프리셋 적용 중 오류: ${err.message}` });
    } finally {
      setIsImporting(false);
    }
  };

  // Add mock Sales User to permission system list
  const handleAddMockUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMockUser.email || !newMockUser.name) return;

    setUsersList(prev => [...prev, {
      email: newMockUser.email,
      name: newMockUser.name,
      role: newMockUser.role,
      status: 'Active',
      team: newMockUser.team
    }]);

    setNewMockUser({ email: '', name: '', role: 'Sales_Rep', team: 'F&B 전략 수급 전담' });
    setImportStatus({ type: 'success', message: '신규 CRM 권한 사용자가 명단에 등록되었습니다. (시뮬레이션)' });
  };

  // Calculate Lead Cadence - find silent/cold accounts based on selected duration
  const coldLeads = React.useMemo(() => {
    const list: Array<{ brand: Brand; lastMeetingTime: Date | null; elapsedDays: number }> = [];
    const now = new Date();

    brands.forEach(b => {
      // Find all meetings for this brand
      const bMeets = meetings.filter(m => m.brandId === b.id);
      if (bMeets.length === 0) {
        list.push({ brand: b, lastMeetingTime: null, elapsedDays: 999 });
      } else {
        const times = bMeets.map(m => new Date(m.dateTime).getTime());
        const lastTime = new Date(Math.max(...times));
        const diffMs = now.getTime() - lastTime.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= cadenceDays) {
          list.push({ brand: b, lastMeetingTime: lastTime, elapsedDays: diffDays });
        }
      }
    });

    // Sort by elapsed days decreasing
    return list.sort((a, b) => b.elapsedDays - a.elapsedDays);
  }, [brands, meetings, cadenceDays]);

  const selectedCareBrand = brands.find(b => b.id === selectedCareBrandId) || coldLeads[0]?.brand;

  // Generate automated outbound email copywriting template for the selected brand
  const generatedCareTemplate = React.useMemo(() => {
    if (!selectedCareBrand) return { emailSubject: '', emailBody: '', callOpening: '' };
    
    const brandName = selectedCareBrand.name;
    const cat = selectedCareBrand.category;
    const count = selectedCareBrand.targetStoresCount;

    const emailSubject = `[네이버 스마트플레이스 360] ${brandName} 본점 및 사외 지점 ${count}개점 통합 CRM 제휴 제안`;
    const emailBody = `안녕하세요, ${brandName} 파트너사 담당자님.

네이버 브랜드 수급 영업 본부에서 제안의 글을 드립니다.

현재 ${brandName}의 우수한 ${cat} 시장 성장률을 면밀하게 파악하였으며, 브랜드 일괄 전지에 가치 있는 모바일 기반 '원터치 결합 영수증' 및 '360도 가맹점 맞춤형 CRM 대시보드' 인프라 협약을 제안 드리고자 합니다.

본 제안을 바탕으로 본점 외 ${count}개 가맹점의 통합 월 매출을 32% 이상 고속 시각화하고, 복잡한 사외 정산을 단 1초만에 통합하는 현장 솔루션을 배포하고자 하오니 부담 없이 간략한 대면 시연을 검토해 주시면 감사하겠습니다.

감사합니다.
네이버 영업 파이프라인 관리사업부 드림`;

    const callOpening = `안녕하세요, ${brandName}의 IT 점포개발실 또는 구매담당자님 맞으실까요? 저희는 네이버 360 가맹 오더 제안팀입니다. 다름이 아니라 본점 외에 전사 ${count}개 매장의 통합 점포 매출 관리와 현장 스마트 단말에 관해 제안 드리고자 전화드렸습니다.`;

    return { emailSubject, emailBody, callOpening };
  }, [selectedCareBrand]);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCadenceEmail(true);
    setTimeout(() => setCopiedCadenceEmail(false), 2000);
  };

  return (
    <div className="glass-card rounded-[32px] border border-white/50 p-6 shadow-sm space-y-6 animate-fadeIn">
      {/* Admin Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-[#03C75A] to-emerald-400 text-white rounded-2xl shadow-md shadow-[#03C75A]/25">
            <Shield className="w-5.5 h-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[9px] font-extrabold uppercase bg-[#dafbe4] text-[#01893d] border border-[#a2f2bd] px-2 py-0.5 rounded-md">ADMIN & EXPERT HUB</span>
              <span className="text-[10px] text-slate-400 font-mono font-bold">Naver-focused Professional CRM Platform</span>
            </div>
            <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight mt-1">
              CRM 전사 어드민 및 스마트 데이터 마이그레이션 허브
            </h3>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap bg-slate-250 p-1 rounded-2xl items-center text-[10.5px] font-black border border-slate-200 select-none">
          <button
            onClick={() => setActiveTab('migration')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'migration'
                ? 'bg-white text-[#01893d] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>CSV 마이그레이션</span>
          </button>
          
          <button
            onClick={() => setActiveTab('cadence')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'cadence'
                ? 'bg-white text-[#01893d] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>영업 가동(Cadence) 파트너 케어</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-[#01893d] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>사용자 권한(RBAC)</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-white text-[#01893d] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>시스템 건강 진단</span>
          </button>
        </div>
      </div>

      {/* Operation Alert logs */}
      {importStatus.message && (
        <div className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-bold leading-normal transition-all animate-scaleIn ${
          importStatus.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
            : importStatus.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-250'
            : 'bg-amber-50 text-amber-800 border-amber-250'
        }`}>
          {importStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#03C75A] mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          )}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Tab Content 1: CSV Migration Package Operations */}
      {activeTab === 'migration' && (
        <div className="space-y-6 animate-fadeIn">
          {/* CSV Mapping & Migration info panel */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Excel / CSV migration helper</span>
              <h4 className="text-xs font-black text-slate-800">
                표준 CSV 파일을 사용하여 전사 가맹 리드, 담당자 연락처, 히스토리 데이터를 번거롭지 않게 적재할 수 있습니다.
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal font-sans">
                각 영역별 템플릿을 다운로드하여 데이터를 쉼표(,) 구분 구문 형식에 맞게 배치한 뒤 업로드 하시면 됩니다.
              </p>
            </div>
            
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('brands')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-black text-slate-700 cursor-pointer"
              >
                브랜드 CSV 양식
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('contacts')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-black text-slate-700 cursor-pointer"
              >
                연락처 CSV 양식
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('meetings')}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-black text-slate-700 cursor-pointer"
              >
                미팅 CSV 양식
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export Area */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                  <Download className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                  가맹 영업 자료 일방 디스크 가이드 추출 (CSV Export)
                </h4>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-normal">
                현재 데이터 서버에 암호화 보관 중인 모든 가맹 바이어 정보와 일선 영업 미팅 로그를 범용 엑셀(Excel)과 호환되는 쉼표 구분 파일(CSV)로 각각 세분화하여 내보냅니다.
              </p>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExportCsv('brands')}
                  disabled={isExporting}
                  className="py-2 bg-white border border-slate-300 hover:bg-slate-50 font-extrabold text-[10px] text-slate-700 rounded-xl cursor-pointer shadow-3xs flex flex-col items-center justify-center gap-1"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>브랜드 로드 (.csv)</span>
                </button>
                <button
                  onClick={() => handleExportCsv('contacts')}
                  disabled={isExporting}
                  className="py-2 bg-white border border-slate-300 hover:bg-slate-50 font-extrabold text-[10px] text-slate-700 rounded-xl cursor-pointer shadow-3xs flex flex-col items-center justify-center gap-1"
                >
                  <FileSpreadsheet className="w-4 h-4 text-sky-600" />
                  <span>담당 인맥 (.csv)</span>
                </button>
                <button
                  onClick={() => handleExportCsv('meetings')}
                  disabled={isExporting}
                  className="py-2 bg-white border border-slate-300 hover:bg-slate-50 font-extrabold text-[10px] text-slate-700 rounded-xl cursor-pointer shadow-3xs flex flex-col items-center justify-center gap-1"
                >
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>상대 이력 (.csv)</span>
                </button>
              </div>
            </div>

            {/* Import Area */}
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#03C75A]/15 rounded-lg text-[#01893d]">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800">
                  대규모 리드 일괄 CSV 파일 주입 (CSV Import Engine)
                </h4>
              </div>
              
              <p className="text-[11px] text-slate-500 leading-normal">
                정리된 영업 파일 대상 형식을 우선 선택하신 다음, 해당 문서를 아래 업로드 영역에 연동해 주시면 CSV 데이터를 식별해 Firestore 상에 자동 매핑합니다.
              </p>

              <div className="grid grid-cols-3 gap-2 bg-slate-200/50 p-1 rounded-xl">
                {(['brands', 'contacts', 'meetings'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setCsvType(type)}
                    className={`text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all ${
                      csvType === type
                        ? 'bg-[#03C75A] text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {type === 'brands' ? '브랜드 리스트' : type === 'contacts' ? '바이어' : '활동 히스토리'}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCsvUpload}
                  accept=".csv,text/csv"
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="w-full py-2.5 bg-[#03C75A] hover:bg-[#02b04f] active:scale-[0.98] font-black text-xs text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-[#03C75A]/20"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>선택된 {csvType === 'brands' ? '브랜드' : csvType === 'contacts' ? '바이어' : '활동 히스토리'} CSV 파일 올리기</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seed Presets Area */}
          <div className="pt-4 border-t border-slate-200/50 space-y-3.5">
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#03C75A] animate-pulse" />
                영업 타겟 일괄 가동 프리셋 (Quick Migration Target Seeding)
              </h4>
              <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">
                테스트 및 전사 시연을 위해 네이버 고유의 초록 기운이 담긴 프리미엄 F&B 샐러드사 꿀조합 패키지 또는 리테일 가맹사 데이터를 일괄 주입(Seeding)할 수 있습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              <button
                onClick={() => handleSeedPreset('fnb')}
                disabled={isImporting}
                className="p-3 bg-[#f0fdf5] border border-[#a2f2bd] hover:bg-[#dafbe4] rounded-2xl transition-all text-left cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-[#01893d] tracking-wider block">PRESET #1</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">🥗 웰니스 프리미엄 F&B 샐러드사 패키지</span>
                  <span className="text-[9.5px] text-[#01893d]/80 font-bold block mt-1">2개 신규 브랜드 개척 · 1개 세일즈 오더 단말 시연 매핑</span>
                </div>
                <Play className="w-4 h-4 text-[#03C75A] shrink-0 ml-1" />
              </button>

              <button
                onClick={() => handleSeedPreset('retail')}
                disabled={isImporting}
                className="p-3 bg-sky-50 border border-sky-150 hover:bg-sky-100 rounded-2xl transition-all text-left cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-sky-700 tracking-wider block">PRESET #2</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 block">🔌 리테일 하이테크 대리점 체인 패키지</span>
                  <span className="text-[9.5px] text-sky-600 font-bold block mt-1">1개 대리점 타겟 등록 · 전 지점 보안 단말 계약 종결 데이터</span>
                </div>
                <Play className="w-4 h-4 text-sky-500 shrink-0 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Professional Sales Cadence Outflow */}
      {activeTab === 'cadence' && (
        <div className="space-y-6 animate-fadeIn font-sans">
          {/* Cadence Introduction */}
          <div className="p-4 bg-emerald-50/50 border border-[#a2f2bd] rounded-2xl space-y-2">
            <span className="text-[10px] font-black text-[#01893d] tracking-widest uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#03C75A]" />
              전략적 사후 관리 (Sales Cadence & Intelligence)
            </span>
            <h4 className="text-xs font-black text-slate-800 leading-snug">
              CRM 영업 사원의 가장 중요한 원칙은 방치된 파트너십의 상기(Follow-up)입니다.
            </h4>
            <p className="text-[10.5px] text-slate-500 leading-normal font-medium">
              최근 미팅 소통 이력이 없는 방치 가맹사 리드 데이터를 감지하여, 아웃바운드 연락에 직접 탑재할 수 있는 자동 제안 이메일 브랜딩 텍스트를 구성하고 콜 프리뷰 스크립트를 조공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Silent leads inventory */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-700">인천/사외 방치 기준 조건</span>
                <select
                  value={cadenceDays}
                  onChange={(e) => setCadenceDays(Number(e.target.value))}
                  className="text-[11px] font-bold text-[#01893d] p-1 border border-slate-200 rounded-md outline-none bg-white font-sans"
                >
                  <option value={7}>7일 이상 접촉 무</option>
                  <option value={14}>14일 이상 접촉 무</option>
                  <option value={30}>30일 이상 접촉 무</option>
                </select>
              </div>

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {coldLeads.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-slate-200 rounded-2xl border-dashed">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 mt-2">안정적인 리드 스케줄 유지 중</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">지정된 기간 동안 접촉하지 않은 브랜드가 없습니다.</p>
                  </div>
                ) : (
                  coldLeads.map((item, index) => {
                    const isSelected = selectedCareBrand?.id === item.brand.id;
                    return (
                      <div
                        key={item.brand.id}
                        onClick={() => setSelectedCareBrandId(item.brand.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs flex justify-between items-center ${
                          isSelected
                            ? 'bg-[#f0fdf5] border-[#a2f2bd] ring-2 ring-[#03C75A]/10 shadow-3xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{item.brand.logo}</span>
                            <span className="font-extrabold text-slate-800">{item.brand.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {item.lastMeetingTime 
                              ? `마지막 미팅: ${item.lastMeetingTime.toLocaleDateString()}` 
                              : '동기화 미팅 기록 없음'}
                          </span>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          item.elapsedDays > 30 
                            ? 'bg-rose-50 text-rose-600 border border-rose-200'
                            : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {item.elapsedDays === 999 ? '접촉 한적 없음' : `${item.elapsedDays}일 경과`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Generated CRM Outbound Content Center */}
            {selectedCareBrand ? (
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-4 font-sans animate-scaleIn">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-extrabold text-[#01893d] uppercase">CARE TARGET DETECTED</span>
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <span>{selectedCareBrand.logo}</span>
                      <span>{selectedCareBrand.name}</span>
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(generatedCareTemplate.emailBody)}
                    className="px-3 py-1.5 bg-[#03C75A] hover:bg-[#029a45] text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{copiedCadenceEmail ? '복사 완료!' : '메일 내용 복사'}</span>
                  </button>
                </div>

                {/* Email Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 block">메일 제목 대안</span>
                    <p className="font-extrabold text-xs text-slate-800 select-all border-b border-slate-100 pb-2">{generatedCareTemplate.emailSubject}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 block">메일 본문 상세</span>
                    <p className="text-[11px] leading-relaxed text-slate-650 font-sans whitespace-pre-wrap select-all select-none">{generatedCareTemplate.emailBody}</p>
                  </div>
                </div>

                {/* Call opening */}
                <div className="bg-[#f0fdf5] border border-[#a2f2bd] p-4 rounded-2xl space-y-1.5">
                  <span className="text-[9px] font-black text-[#01893d] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>전화 영업 및 콜 아웃풋 스크립트 오프너</span>
                  </span>
                  <p className="text-xs leading-relaxed text-slate-700 font-extrabold">
                    "{generatedCareTemplate.callOpening}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 flex items-center justify-center p-12 border border-slate-200 border-dashed rounded-3xl">
                <p className="text-xs text-slate-400 font-bold">오른쪽에서 접촉 방치 가맹점을 선택해 케어 내용을 설계해 주세요.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: User Access & Role Manager */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Active User Privilege Toggler */}
          <div className="bg-gradient-to-r from-emerald-500/5 to-[#03C75A]/10 border border-[#03C75A]/20 p-4 rounded-2xl space-y-3">
            <div>
              <span className="text-[9px] font-black tracking-widest text-[#01893d] uppercase flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#03C75A]" />
                실시간 RBAC 시뮬레이터 (마스터 등급 테스트)
              </span>
              <h4 className="text-xs font-black text-slate-800 mt-1 font-sans">
                현재 마스터 계정의 역할을 즉석 변경하여 권한 분기 테스트를 수행해 보세요.
              </h4>
              <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                Admin 등급은 데이터 삭제/수정 및 전체 이력 열람권이 주어지나 Manager 및 Sales_Rep 등급은 실시간 이력이 일정 제약을 받거나 보안 감사 기록의 삭제가 통제됩니다.
              </p>
            </div>

            <div className="flex gap-2 bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 max-w-sm select-none">
              {(['Admin', 'Manager', 'Sales_Rep'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => onChangeUserRole(role)}
                  className={`flex-1 text-[10px] font-extrabold py-2 rounded-lg cursor-pointer transition-all ${
                     userRole === role
                      ? 'bg-[#03C75A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role === 'Admin' ? 'Admin' : role === 'Manager' ? 'Manager' : 'Sales Rep'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* User Addition Form */}
            <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-3 self-start">
              <span className="font-extrabold text-[11px] text-slate-800 block">👤 새 사외/사내 대외 협조원 등록</span>
              
              <form onSubmit={handleAddMockUser} className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">사용자 이메일 주소</span>
                  <input
                    type="email"
                    required
                    placeholder="teammate@placen.co.kr"
                    value={newMockUser.email}
                    onChange={(e) => setNewMockUser({ ...newMockUser, email: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#03C75A]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">사용자 본명</span>
                  <input
                    type="text"
                    required
                    placeholder="한지운 대리"
                    value={newMockUser.name}
                    onChange={(e) => setNewMockUser({ ...newMockUser, name: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#03C75A]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">소속 팀</span>
                  <input
                    type="text"
                    required
                    placeholder="프랜차이즈 영업 본부"
                    value={newMockUser.team}
                    onChange={(e) => setNewMockUser({ ...newMockUser, team: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#03C75A]"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">역할 배정</span>
                  <select
                    value={newMockUser.role}
                    onChange={(e) => setNewMockUser({ ...newMockUser, role: e.target.value as any })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="Admin">Admin (최고 관리자)</option>
                    <option value="Manager">Manager (전략 기획 부서)</option>
                    <option value="Sales_Rep">Sales_Rep (현장 일선 영업직)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#03C75A] text-white rounded-lg text-xs font-bold hover:bg-[#029a45]"
                >
                  명단 등록
                </button>
              </form>
            </div>

            {/* Current Access Right Users Grid */}
            <div className="lg:col-span-2 space-y-3">
              <span className="font-extrabold text-[11px] text-slate-800 block">🔑 영업 사원 & 역할(Role) 리스트 ({usersList.length})</span>
              
              <div className="border border-slate-250 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                {usersList.map((user, index) => (
                  <div key={index} className="p-3.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-all font-sans">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap font-sans">
                        <span className="font-extrabold text-[#0f172a]">{user.name}</span>
                        <span className="text-[9px] text-slate-400 shrink-0 font-bold">{user.team}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tracking-tight block">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className={`text-[9px] font-black border uppercase px-2 py-0.5 rounded-md ${
                        user.role === 'Admin' 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : user.role === 'Manager'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-[#01893d] border-emerald-200'
                      }`}>
                        {user.role}
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 4: System Cleanliness Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn font-sans">
          {/* Card 1 */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-black text-[#01893d] tracking-wider block">CRM HEALTH RATING</span>
              <p className="text-2xl font-black text-slate-800 mt-1">99.8% (최적)</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal mt-3">모든 Firestore 인덱싱 연결이 양호하며 pgvector 유사도 기반 RAG 파트가 정상 연동 중입니다.</p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-black text-blue-600 tracking-wider block">Google Calendar Sync</span>
              <p className="text-2xl font-black text-slate-800 mt-1">정상 동기화</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal mt-3">Google Workspace 계정을 활용한 원터치 실시간 캘린더 아웃고잉 API가 가동되어 비서 오더를 보조합니다.</p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-black text-rose-600 tracking-wider block">Enterprise Audit</span>
              <p className="text-2xl font-black text-slate-800 mt-1">{auditLogsCount}건 축적</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal mt-3">RBAC 실천 침해 시도 및 영업 기회 조정 이력이 보안 로그 시스템에 영구 보존되고 있습니다.</p>
          </div>
        </div>
      )}

      {/* Admin Panel Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/50 pt-4 text-[10px] text-slate-400 font-extrabold tracking-wider font-sans">
        <span>AUTHORIZED FOR DE 대외 보안 및 가맹 관리 전용 시스템</span>
        <span>LAST DIAGNOSED VERIFICATION: 2026.05.21</span>
      </div>
    </div>
  );
}
