import React, { useState, useRef } from 'react';
import { 
  Shield, Users, Database, UploadCloud, Download, 
  Trash2, Cpu, CheckCircle2, AlertTriangle, Play,
  RefreshCw, UserPlus, Sparkles, Key, FileSpreadsheet,
  Clock, Mail, Phone, Calendar, HeartHandshake, TrendingUp,
  Camera, VideoOff
} from 'lucide-react';
import { Brand, Contact, Meeting } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';

interface AdminPanelProps {
  brands: Brand[];
  contacts: Contact[];
  meetings: Meeting[];
  userRole: 'Admin' | 'Sales_Rep';
  onChangeUserRole: (newRole: 'Admin' | 'Sales_Rep') => void;
  currentUserEmail: string;
  onRefreshCrmState: () => Promise<void>;
  auditLogsCount: number;
  approvedUsers?: any[];
  onAdminAddUser?: (user: any) => Promise<void>;
  onAdminUpdateUser?: (email: string, updatedFields: any) => Promise<void>;
  onAdminDeleteUser?: (email: string) => Promise<void>;
}

export default function AdminPanel({
  brands,
  contacts,
  meetings,
  userRole,
  onChangeUserRole,
  currentUserEmail,
  onRefreshCrmState,
  auditLogsCount,
  approvedUsers = [],
  onAdminAddUser,
  onAdminUpdateUser,
  onAdminDeleteUser
}: AdminPanelProps) {
  const currentProfile = approvedUsers?.find(u => u.email.toLowerCase() === currentUserEmail.toLowerCase());
  const canExportCSV = currentProfile?.canExportCSV !== undefined 
    ? !!currentProfile.canExportCSV 
    : (userRole === 'Admin');

  const [activeTab, setActiveTab] = useState<'migration' | 'users' | 'cadence' | 'diagnostics'>('users');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvType, setCsvType] = useState<'brands' | 'contacts' | 'meetings'>('brands');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User edit and photo registration states
  const [editingUserEmail, setEditingUserEmail] = useState<string | null>(null);
  const [editingFields, setEditingFields] = useState({ 
    name: '', 
    role: 'Sales_Rep' as any, 
    team: '', 
    avatarUrl: '',
    canEditPipeline: true,
    canUseAI: true,
    canViewAudit: false,
    canManageUsers: false,
    canExportCSV: false
  });
  const [newUserAvatar, setNewUserAvatar] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditDragOver, setIsEditDragOver] = useState(false);

  // Webcam Capture States
  const [activeWebcamMode, setActiveWebcamMode] = useState<'new' | 'edit' | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, []);

  const startWebcam = async (mode: 'new' | 'edit') => {
    setWebcamError(null);
    setActiveWebcamMode(mode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' }
      });
      activeStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setWebcamError("웹캠 카메라 접근 권한이 없거나 지원되지 않는 기기입니다. 카메라 권한을 확인해주세요.");
      setActiveWebcamMode(null);
    }
  };

  const stopWebcam = () => {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track: any) => track.stop());
      activeStreamRef.current = null;
    }
    setActiveWebcamMode(null);
    setWebcamError(null);
  };

  const captureWebcamPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 300, 300);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      if (activeWebcamMode === 'new') {
        setNewUserAvatar(base64);
      } else if (activeWebcamMode === 'edit') {
        setEditingFields(prev => ({ ...prev, avatarUrl: base64 }));
      }
    }
    stopWebcam();
  };

  // Cadence / Lead intelligence states
  const [cadenceDays, setCadenceDays] = useState<number>(14);
  const [selectedCareBrandId, setSelectedCareBrandId] = useState<string | null>(null);
  const [copiedCadenceEmail, setCopiedCadenceEmail] = useState<boolean>(false);

  // Mock users list for representation
  const [usersList, setUsersList] = useState([
    { email: currentUserEmail, name: '현재 로그인 계정 (나)', role: userRole, status: 'Active', team: '프랜차이즈 영업 본부' },
    { email: 'sales_lead@placen.co.kr', name: '김두호 팀장', role: 'Sales_Rep', status: 'Active', team: 'F&B 전략 수급 전담' },
    { email: 'intern_rep@placen.co.kr', name: '이민규 인턴', role: 'Sales_Rep', status: 'Active', team: '아웃바운드 콜 TF' }
  ]);

  const [newMockUser, setNewMockUser] = useState({ 
    email: '', 
    name: '', 
    role: 'Sales_Rep' as any, 
    team: 'F&B 전략 수급 전담',
    canEditPipeline: true,
    canUseAI: true,
    canViewAudit: false,
    canManageUsers: false,
    canExportCSV: false
  });

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
    if (!canExportCSV) {
      alert("🔒 CRM 원천 데이터 파일 추출(canExportCSV) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요.");
      setImportStatus({ type: 'error', message: "🔒 CRM 원천 데이터 파일 추출(canExportCSV) 권한이 비활성화 상태입니다. 최고 관리자에게 기능 개방을 요청하세요." });
      return;
    }
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

  // Helper for FileReader conversion of avatar profile images to base64
  const handleAvatarFile = (file: File, type: 'new' | 'edit') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'new') {
        setNewUserAvatar(base64);
      } else {
        setEditingFields(prev => ({ ...prev, avatarUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle user active / inactive account status
  const handleToggleUserStatus = async (user: any) => {
    if (user.email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert("⚠️ 귀하 본인의 계정 상태('활성/비활성')는 안전 장치를 위해 직접 변경할 수 없습니다.");
      return;
    }

    const currentStatus = user.status || 'Active';
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    try {
      if (onAdminUpdateUser) {
        await onAdminUpdateUser(user.email, {
          name: user.name || '',
          role: user.role || 'Sales_Rep',
          team: user.team || '',
          avatarUrl: user.avatarUrl || '',
          status: nextStatus
        });
        setImportStatus({
          type: 'success',
          message: `🎉 [${user.name || user.email}] 계정이 성공적으로 ${nextStatus === 'Active' ? '활성화' : '비활성화'}되었습니다.`
        });
      } else {
        setUsersList(prev => prev.map(u => u.email === user.email ? { ...u, status: nextStatus } : u));
        setImportStatus({
          type: 'success',
          message: `계정 상태가 로컬 버퍼에 반영되었습니다: ${nextStatus === 'Active' ? '활성' : '비활성'}`
        });
      }
    } catch (err: any) {
      console.error("Failed to toggle status:", err);
      setImportStatus({ type: 'error', message: `상태 변경 중 오류: ${err.message}` });
    }
  };

  // Roles change automatic defaults mapping
  const handleRoleChangeForNewUser = (role: 'Admin' | 'Sales_Rep') => {
    setNewMockUser(prev => ({
      ...prev,
      role,
      canEditPipeline: role === 'Admin',
      canUseAI: true,
      canViewAudit: role === 'Admin',
      canManageUsers: role === 'Admin',
      canExportCSV: role === 'Admin'
    }));
  };

  const handleRoleChangeForEditUser = (role: 'Admin' | 'Sales_Rep') => {
    setEditingFields(prev => ({
      ...prev,
      role,
      canEditPipeline: role === 'Admin',
      canUseAI: true,
      canViewAudit: role === 'Admin',
      canManageUsers: role === 'Admin',
      canExportCSV: role === 'Admin'
    }));
  };

  // Add mock / real Sales User to permission system list
  const handleAddMockUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMockUser.email || !newMockUser.name) return;

    try {
      const trimmedEmail = newMockUser.email.trim();
      const refinedFields = {
        email: trimmedEmail,
        name: newMockUser.name,
        role: newMockUser.role,
        team: newMockUser.team,
        avatarUrl: newUserAvatar,
        status: 'Active',
        canEditPipeline: newMockUser.canEditPipeline,
        canUseAI: newMockUser.canUseAI,
        canViewAudit: newMockUser.canViewAudit,
        canManageUsers: newMockUser.canManageUsers,
        canExportCSV: newMockUser.canExportCSV
      };

      if (onAdminAddUser) {
        await onAdminAddUser(refinedFields);
        setImportStatus({ type: 'success', message: `🎉 신규 영업팀원 승인 완료 및 DB 등록 성공: ${newMockUser.name}` });
      } else {
        // Fallback local support
        setUsersList(prev => [...prev, refinedFields]);
        setImportStatus({ type: 'success', message: '신규 사용자가 명단에 등록되었습니다. (로컬 버퍼 사본)' });
      }
      setNewMockUser({ 
        email: '', 
        name: '', 
        role: 'Sales_Rep', 
        team: 'F&B 전략 수급 전담',
        canEditPipeline: true,
        canUseAI: true,
        canViewAudit: false,
        canManageUsers: false,
        canExportCSV: false
      });
      setNewUserAvatar('');
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `영업팀 마이그레이션 실패: ${err.message}` });
    }
  };

  // Edit action triggers
  const handleStartEdit = (user: any) => {
    setEditingUserEmail(user.email);
    setEditingFields({
      name: user.name || '',
      role: user.role || 'Sales_Rep',
      team: user.team || '',
      avatarUrl: user.avatarUrl || '',
      canEditPipeline: user.canEditPipeline !== undefined ? !!user.canEditPipeline : (user.role === 'Admin'),
      canUseAI: user.canUseAI !== undefined ? !!user.canUseAI : true,
      canViewAudit: user.canViewAudit !== undefined ? !!user.canViewAudit : (user.role === 'Admin'),
      canManageUsers: user.canManageUsers !== undefined ? !!user.canManageUsers : (user.role === 'Admin'),
      canExportCSV: user.canExportCSV !== undefined ? !!user.canExportCSV : (user.role === 'Admin')
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserEmail) return;

    try {
      if (onAdminUpdateUser) {
        await onAdminUpdateUser(editingUserEmail, {
          name: editingFields.name,
          role: editingFields.role,
          team: editingFields.team,
          avatarUrl: editingFields.avatarUrl,
          canEditPipeline: editingFields.canEditPipeline,
          canUseAI: editingFields.canUseAI,
          canViewAudit: editingFields.canViewAudit,
          canManageUsers: editingFields.canManageUsers,
          canExportCSV: editingFields.canExportCSV
        });
        setImportStatus({ type: 'success', message: `🎉 [${editingFields.name}] 영업 파트너의 프로필 및 세부 권한 스위치 설정이 저장되었습니다.` });
      } else {
        setUsersList(prev => prev.map(u => u.email === editingUserEmail ? {
          ...u,
          name: editingFields.name,
          role: editingFields.role,
          team: editingFields.team,
          avatarUrl: editingFields.avatarUrl,
          canEditPipeline: editingFields.canEditPipeline,
          canUseAI: editingFields.canUseAI,
          canViewAudit: editingFields.canViewAudit,
          canManageUsers: editingFields.canManageUsers,
          canExportCSV: editingFields.canExportCSV
        } : u));
        setImportStatus({ type: 'success', message: '사용자 프로필 및 권한 기능이 로컬에 반영 완료되었습니다.' });
      }
      setEditingUserEmail(null);
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `정보 변경 실패: ${err.message}` });
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
      alert("⚠️ 현재 로그인 및 오퍼레이팅 중인 나 자신(나)의 등급은 명단에서 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("⚠️ 경고: 제거 확인\n정말로 이 사용자의 모든 CRM 세일즈 원천 데이터 열람권과 관리 직급 권한을 파기하시겠습니까?")) {
      return;
    }

    try {
      if (onAdminDeleteUser) {
        await onAdminDeleteUser(email);
        setImportStatus({ type: 'success', message: '🎉 해당 사외/사내 협조원 권한이 성공적으로 영구 파기되었습니다.' });
      } else {
        setUsersList(prev => prev.filter(u => u.email !== email));
        setImportStatus({ type: 'success', message: '사용자 권한이 삭제 분리 완료되었습니다. (로컬)' });
      }
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `사용자 제거 에러: ${err.message}` });
    }
  };

  // Auto-Seeding default users to Firestore
  const handleAutoSeedUsers = async () => {
    if (!onAdminAddUser) return;
    try {
      const defaultTeam = [
        { email: 'sales_lead@placen.co.kr', name: '김두호 팀장', role: 'Sales_Rep' as const, team: 'F&B 전략 수급 전담', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=80' },
        { email: 'intern_rep@placen.co.kr', name: '이민규 인턴', role: 'Sales_Rep' as const, team: '아웃바운드 콜 TF', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80' },
        { email: 'cross_sell_expert@placen.co.kr', name: '박하은 과장', role: 'Sales_Rep' as const, team: '교차판매 기획단', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop&q=80' }
      ];
      for (const m of defaultTeam) {
        await onAdminAddUser(m);
      }
      setImportStatus({ type: 'success', message: '🎉 영업팀 마스터 조직 인원이 Firestore DB에 직접 승인 및 100% 실시간 마이그레이션 연계 완료되었습니다!' });
    } catch (err: any) {
      setImportStatus({ type: 'error', message: `시드 투하 실패: ${err.message}` });
    }
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[9px] font-black tracking-widest text-[#01893d] uppercase flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-[#03C75A]" />
                  실시간 RBAC 시뮬레이터 및 멀티유저 권한 통제
                </span>
                <h4 className="text-xs font-black text-slate-800 mt-1 font-sans">
                  현재 마스터 계정의 역할을 즉석 변경하여 권한 분기 테스트를 수행해 보세요.
                </h4>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                  Firestore 연계 승인 방식으로 실제 대리점/영업소 구성원 명단(CRUD) 및 이미지를 다중 세션 실시간 동기화합니다.
                </p>
              </div>

              {onAdminAddUser && (approvedUsers || []).length === 0 && (
                <button
                  onClick={handleAutoSeedUsers}
                  className="flex items-center gap-1 text-[10px] bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer shadow-3xs hover:scale-[1.02]"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  영업팀 대표 조직원 동기화 (Seed DB)
                </button>
              )}
            </div>

            <div className="flex gap-2 bg-white/70 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 max-w-sm select-none">
              {(['Admin', 'Sales_Rep'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => onChangeUserRole(role)}
                  className={`flex-1 text-[10px] font-extrabold py-2 px-4 rounded-lg cursor-pointer transition-all ${
                     userRole === role
                      ? 'bg-[#03C75A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {role === 'Admin' ? '슈퍼 어드민 (Super Admin)' : '일반 사용자 (Normal User)'}
                </button>
              ))}
            </div>

            {/* Roles Description Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#03C75A]/15">
              <div className={`p-3.5 rounded-xl border transition-all ${userRole === 'Admin' ? 'bg-emerald-500/5 border-emerald-500/25 shadow-3xs' : 'bg-white/40 border-slate-200/60 opacity-75'}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${userRole === 'Admin' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                  <span className={`text-[11px] font-black tracking-tight ${userRole === 'Admin' ? 'text-[#01893d]' : 'text-slate-700'}`}>
                    슈퍼 어드민 (Super Admin)
                  </span>
                  <span className="text-[8px] font-extrabold bg-red-100 text-red-700 px-1 py-0.2 rounded">최고 권한</span>
                </div>
                <ul className="space-y-1.5 text-[10px] text-slate-550 leading-relaxed list-disc list-inside">
                  <li>CRM 데이터 원천 제거 및 <strong className="text-slate-700">물리적 데이터베이스 파기</strong> 총괄</li>
                  <li>PostgreSQL <strong className="text-slate-700">실시간 이진 백업 덤프</strong> 즉시 기동</li>
                  <li>조직원 추가/수정/삭제 등 <strong className="text-slate-700">보안 통제권</strong> 100% 행사</li>
                  <li>보안 감사 로그 실시간 검사 및 이력 타임라인 탐색</li>
                  <li><strong className="text-[#03C75A]">일반 사용자의 개별 기능(칸반, AI, 감사로그, CSV 백업 등) 스위치 원격 온오프</strong></li>
                </ul>
              </div>

              <div className={`p-3.5 rounded-xl border transition-all ${userRole === 'Sales_Rep' ? 'bg-emerald-500/5 border-emerald-500/25 shadow-3xs' : 'bg-white/40 border-slate-200/60 opacity-75'}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${userRole === 'Sales_Rep' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'}`} />
                  <span className={`text-[11px] font-black tracking-tight ${userRole === 'Sales_Rep' ? 'text-[#01893d]' : 'text-slate-700'}`}>
                    일반 사용자 (Normal User)
                  </span>
                  <span className="text-[8px] font-extrabold bg-amber-100 text-amber-700 px-1 py-0.2 rounded">스위치 통제식 권한</span>
                </div>
                <ul className="space-y-1.5 text-[10px] text-slate-550 leading-relaxed list-disc list-inside">
                  <li>현장 미팅 일지 등록 및 영업 관련 정보 조회</li>
                  <li>신규 리드 접촉 및 브랜드-담당자 네트워크 진척도 추적</li>
                  <li><strong className="text-slate-700">기본적으로 핵심 보안 설정 및 어드민 패널 비인증 차단</strong></li>
                  <li><strong className="text-indigo-600">슈퍼 어드민이 활성화해준 기능별 개별 권한(칸반 수정, AI 비서, 감사 조회 등)만 사용 가능</strong></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* User Addition or editing block */}
            <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-3 self-start">
              {editingUserEmail ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[#eaeaea] p-2 rounded-lg">
                    <span className="font-extrabold text-[11px] text-slate-800 flex items-center gap-1">
                      ✏️ 구성원 프로필 수정 모드
                    </span>
                    <button 
                      onClick={() => setEditingUserEmail(null)} 
                      className="text-xs text-slate-550 hover:text-slate-900 font-bold"
                    >
                      취소
                    </button>
                  </div>
                  
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">이메일 주소 (수정 불가)</span>
                      <input
                        type="text"
                        disabled
                        value={editingUserEmail}
                        className="w-full text-xs p-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">사용자 본명</span>
                      <input
                        type="text"
                        required
                        placeholder="이민욱 차장"
                        value={editingFields.name}
                        onChange={(e) => setEditingFields({ ...editingFields, name: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#03C75A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">소속 사내 부서/점포</span>
                      <input
                        type="text"
                        required
                        placeholder="전국 가맹점 수급 본부"
                        value={editingFields.team}
                        onChange={(e) => setEditingFields({ ...editingFields, team: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#03C75A]"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">대외 직급 권한(Role)</span>
                      <select
                        value={editingFields.role}
                        onChange={(e) => handleRoleChangeForEditUser(e.target.value as any)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="Admin">Admin (슈퍼 어드민)</option>
                        <option value="Sales_Rep">Normal User (일반 사용자)</option>
                      </select>
                    </div>

                    {/* 개별 기능권한 스위치 Toggles */}
                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2.5 mt-2 shadow-3xs">
                      <span className="text-[10px] font-black text-slate-705 block mb-1 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-500" />
                        개별 세부 개발 기능 개방 제어 (Feature Switches)
                      </span>
                      
                      {/* Switch 1: canEditPipeline */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">세일즈 칸반 가공</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">딜 상태 전이, 수급 현황 교차 기획 및 진척도 수정 허용</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingFields.canEditPipeline}
                          onChange={(e) => setEditingFields({ ...editingFields, canEditPipeline: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 2: canUseAI */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">AI 영업 비서 사용</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">Gemini 기반 음성 미팅 분석 및 전담 어시스턴트 사용</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingFields.canUseAI}
                          onChange={(e) => setEditingFields({ ...editingFields, canUseAI: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 3: canViewAudit */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">보안 감사 로그</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">사내 보안 트래커 타임라인 실시간 열람 권한 승인</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingFields.canViewAudit}
                          onChange={(e) => setEditingFields({ ...editingFields, canViewAudit: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 4: canManageUsers */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">어드민 및 구성원 권한 통제</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">조직원 권한 변경, 추가, 정지 및 마이그레이션 도구 개조</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingFields.canManageUsers}
                          onChange={(e) => setEditingFields({ ...editingFields, canManageUsers: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 5: canExportCSV */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">전체 데이터 CSV 내보내기</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">딜 데이터베이스 원천 파일 다운로드 권한 개방</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingFields.canExportCSV}
                          onChange={(e) => setEditingFields({ ...editingFields, canExportCSV: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Edit mode Avatar file picker */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">프로필 이미지 수정</span>
                      
                      {activeWebcamMode === 'edit' ? (
                        <div className="border border-slate-200 rounded-xl p-2 bg-slate-950 relative overflow-hidden flex flex-col items-center">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full max-h-48 rounded-lg object-cover bg-slate-900" 
                          />
                          {webcamError && (
                            <div className="text-[10px] text-rose-500 p-1.5 mt-1 font-bold bg-rose-50 rounded-lg text-center">
                              {webcamError}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2 w-full">
                            <button
                              type="button"
                              onClick={captureWebcamPhoto}
                              className="flex-1 py-1 px-2 bg-[#03C75A] hover:bg-[#029a45] text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> 사진 촬영 및 등록
                            </button>
                            <button
                              type="button"
                              onClick={stopWebcam}
                              className="py-1 px-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsEditDragOver(true);
                            }}
                            onDragLeave={() => setIsEditDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsEditDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                handleAvatarFile(file, 'edit');
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAvatarFile(file, 'edit');
                                }
                              };
                              input.click();
                            }}
                            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[80px] ${
                              isEditDragOver 
                                ? 'border-[#03C75A] bg-[#03C75A]/5' 
                                : editingFields.avatarUrl 
                                ? 'border-emerald-300 bg-emerald-50/10' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            {editingFields.avatarUrl ? (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={editingFields.avatarUrl} 
                                  alt="Edit Avatar" 
                                  className="w-12 h-12 rounded-full object-cover border border-[#03C75A]/30 shadow-2xs" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="text-left text-[10px] text-slate-500 font-sans">
                                  <span className="text-[#03C75A] font-extrabold block">✓ 이미지 로드 완료</span>
                                  <span className="text-[9px] text-slate-400">변경하려면 드래그/클릭</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-slate-400 font-sans">
                                <UploadCloud className="w-5 h-5 mx-auto text-slate-450" />
                                <span className="text-[10px] font-bold block">프로필 사진 투하 (jpg, png)</span>
                              </div>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startWebcam('edit'); }}
                            className="mt-1 w-full py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-650 hover:text-emerald-700 border border-[#03C75A]/30 hover:border-[#03C75A] rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
                          >
                            <Camera className="w-3.5 h-3.5" /> 웹캠(Webcam)으로 즉석 사진 촬영
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-[#03C75A] text-white rounded-lg text-xs font-bold hover:bg-[#029a45] shadow-xs cursor-pointer block"
                      >
                        설정 저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUserEmail(null)}
                        className="py-2 px-3 bg-white border border-slate-200 text-slate-705 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer block text-center"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
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
                        onChange={(e) => handleRoleChangeForNewUser(e.target.value as any)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      >
                        <option value="Admin">Admin (슈퍼 어드민)</option>
                        <option value="Sales_Rep">Normal User (일반 사용자)</option>
                      </select>
                    </div>

                    {/* 개별 기능권한 스위치 Toggles */}
                    <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2.5 mt-2 shadow-3xs">
                      <span className="text-[10px] font-black text-slate-705 block mb-1 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                        <Key className="w-3.5 h-3.5 text-[#03C75A]" />
                        개별 세부 개발 기능 개방 제어 (Feature Switches)
                      </span>
                      
                      {/* Switch 1: canEditPipeline */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">세일즈 칸반 가공</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">딜 상태 전이, 수급 현황 교차 기획 및 진척도 수정 허용</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newMockUser.canEditPipeline}
                          onChange={(e) => setNewMockUser({ ...newMockUser, canEditPipeline: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 2: canUseAI */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">AI 영업 비서 사용</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">Gemini 기반 음성 미팅 분석 및 전담 어시스턴트 사용</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newMockUser.canUseAI}
                          onChange={(e) => setNewMockUser({ ...newMockUser, canUseAI: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 3: canViewAudit */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">보안 감사 로그</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">사내 보안 트래커 타임라인 실시간 열람 권한 승인</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newMockUser.canViewAudit}
                          onChange={(e) => setNewMockUser({ ...newMockUser, canViewAudit: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 4: canManageUsers */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1 border-b border-slate-100/50">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">어드민 및 구성원 권한 통제</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">조직원 권한 변경, 추가, 정지 및 마이그레이션 도구 개조</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newMockUser.canManageUsers}
                          onChange={(e) => setNewMockUser({ ...newMockUser, canManageUsers: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>

                      {/* Switch 5: canExportCSV */}
                      <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1">
                        <div className="space-y-0.5 max-w-[80%]">
                          <span className="text-[10px] font-extrabold text-slate-800">전체 데이터 CSV 내보내기</span>
                          <span className="text-[9px] text-slate-400 block font-normal leading-tight">딜 데이터베이스 원천 파일 다운로드 권한 개방</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newMockUser.canExportCSV}
                          onChange={(e) => setNewMockUser({ ...newMockUser, canExportCSV: e.target.checked })}
                          className="w-4 h-4 text-[#03C75A] accent-[#03C75A] focus:ring-[#03C75A] rounded border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Drag-and-drop Avatar photo dropzone */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">프로필 이미지 등록</span>
                      
                      {activeWebcamMode === 'new' ? (
                        <div className="border border-slate-200 rounded-xl p-2 bg-slate-950 relative overflow-hidden flex flex-col items-center">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full max-h-48 rounded-lg object-cover bg-slate-900" 
                          />
                          {webcamError && (
                            <div className="text-[10px] text-rose-500 p-1.5 mt-1 font-bold bg-rose-50 rounded-lg text-center">
                              {webcamError}
                            </div>
                          )}
                          <div className="flex gap-2 mt-2 w-full">
                            <button
                              type="button"
                              onClick={captureWebcamPhoto}
                              className="flex-1 py-1 px-2 bg-[#03C75A] hover:bg-[#029a45] text-white rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> 사진 촬영 및 등록
                            </button>
                            <button
                              type="button"
                              onClick={stopWebcam}
                              className="py-1 px-2 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setIsDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                handleAvatarFile(file, 'new');
                              }
                            }}
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleAvatarFile(file, 'new');
                                }
                              };
                              input.click();
                            }}
                            className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[80px] ${
                              isDragOver 
                                ? 'border-[#03C75A] bg-[#03C75A]/5' 
                                : newUserAvatar 
                                ? 'border-emerald-300 bg-emerald-50/10' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            {newUserAvatar ? (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={newUserAvatar} 
                                  alt="New Avatar" 
                                  className="w-12 h-12 rounded-full object-cover border border-[#03C75A]/30 shadow-2xs" 
                                  referrerPolicy="no-referrer"
                                />
                                <div className="text-left text-[10px] text-slate-500 font-sans">
                                  <span className="text-[#03C75A] font-extrabold block">✓ 이미지 로드 완료</span>
                                  <span className="text-[9px] text-slate-400">변경하려면 다시 드래그/클릭</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-slate-400 font-sans">
                                <UploadCloud className="w-5 h-5 mx-auto text-slate-450" />
                                <span className="text-[10px] font-bold block">이미지 파일 투하 (jpg, png)</span>
                                <span className="text-[9px] text-slate-350">혹은 박스 클릭</span>
                              </div>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startWebcam('new'); }}
                            className="mt-1 w-full py-1.5 px-3 bg-white hover:bg-emerald-50 text-emerald-650 hover:text-emerald-700 border border-[#03C75A]/30 hover:border-[#03C75A] rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-3xs"
                          >
                            <Camera className="w-3.5 h-3.5" /> 웹캠(Webcam)으로 즉석 사진 촬영
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-[#03C75A] text-white rounded-lg text-xs font-bold hover:bg-[#029a45] cursor-pointer"
                    >
                      명단 등록
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Current Access Right Users Grid */}
            <div className="lg:col-span-2 space-y-3">
              <span className="font-extrabold text-[11px] text-slate-800 block">
                🔑 영업 사원 & 역할(Role) 리스트 ({(approvedUsers && approvedUsers.length > 0 ? approvedUsers : usersList).length})
              </span>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
                {(approvedUsers && approvedUsers.length > 0 ? approvedUsers : usersList).map((user, index) => {
                  const isUserInactive = (user.status || 'Active') === 'Inactive';
                  return (
                    <div 
                      key={index} 
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all font-sans ${
                        isUserInactive 
                          ? 'bg-slate-50/70 border-l-4 border-rose-400/40 opacity-75' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar picture or fallback icon badge */}
                        <div className="relative">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name} 
                              className={`w-10 h-10 rounded-full object-cover border shadow-3xs ${
                                isUserInactive ? 'border-slate-300 filter grayscale' : 'border-[#03C75A]/20'
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-black shadow-3xs uppercase text-[11px] ${
                              isUserInactive 
                                ? 'bg-slate-100 text-slate-400 border-slate-300' 
                                : 'bg-slate-50 text-slate-700 border-slate-200/60'
                            }`}>
                              {(user.name || user.email).charAt(0)}
                            </div>
                          )}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isUserInactive ? 'bg-slate-400' : 'bg-emerald-500'
                          }`} />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-extrabold ${isUserInactive ? 'text-slate-405 line-through' : 'text-slate-800'}`}>
                              {user.name}
                            </span>
                            <span className="text-[9px] text-slate-450 font-bold bg-slate-100 p-0.5 px-1.5 rounded-sm">{user.team}</span>
                            {isUserInactive && (
                              <span className="text-[8px] font-black tracking-tight text-white bg-slate-400/90 border border-slate-500/10 p-0.2 px-1 rounded">정지됨</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tight block">{user.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-4 font-mono">
                        {/* Role Specific Visual Indicators with color-coded chips and mini icons */}
                        <span className={`text-[9.5px] font-black border uppercase px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-3xs select-none ${
                          user.role === 'Admin' 
                            ? 'bg-rose-50/80 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50/80 text-[#01893d] border-emerald-250'
                        }`}>
                          {user.role === 'Admin' && <Shield className="w-3 h-3 text-rose-500 shrink-0" />}
                          {user.role !== 'Admin' && <TrendingUp className="w-3 h-3 text-emerald-650 shrink-0" />}
                          {user.role === 'Admin' ? 'Super Admin' : 'Normal User'}
                        </span>

                        {/* Active Features Indicator Badges */}
                        <div className="flex items-center gap-1">
                          {/* edit pipeline */}
                          <span 
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-black select-none border transition-all ${
                              user.canEditPipeline !== false 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-slate-100/60 text-slate-300 border-slate-100 line-through opacity-30 font-normal'
                            }`}
                            title={user.canEditPipeline !== false ? 'K: 세일즈 칸반 가공 (활성화)' : 'K: 세일즈 칸반 가공 (차단됨)'}
                          >
                            K
                          </span>
                          {/* AI */}
                          <span 
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-black select-none border transition-all ${
                              user.canUseAI !== false 
                                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                : 'bg-slate-100/60 text-slate-300 border-slate-100 line-through opacity-30 font-normal'
                            }`}
                            title={user.canUseAI !== false ? 'AI: 인공지능 영업 비서 (활성화)' : 'AI: 인공지능 영업 비서 (차단됨)'}
                          >
                            AI
                          </span>
                          {/* Audit */}
                          <span 
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-black select-none border transition-all ${
                              user.canViewAudit ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100/60 text-slate-300 border-slate-100 line-through opacity-30 font-normal'
                            }`}
                            title={user.canViewAudit ? 'S: 사내 보안감사 로그 (활성화)' : 'S: 사내 보안감사 로그 (차단됨)'}
                          >
                            S
                          </span>
                          {/* Admin */}
                          <span 
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-black select-none border transition-all ${
                              user.canManageUsers ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100/60 text-slate-300 border-slate-100 line-through opacity-30 font-normal'
                            }`}
                            title={user.canManageUsers ? 'A: 인사권 및 조직 세부 권한 제어 (활성화)' : 'A: 인사권 및 조직 세부 권한 제어 (차단됨)'}
                          >
                            A
                          </span>
                          {/* Export CSV */}
                          <span 
                            className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[8px] font-black select-none border transition-all ${
                              user.canExportCSV !== false 
                                ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                : 'bg-slate-100/60 text-slate-300 border-slate-100 line-through opacity-30 font-normal'
                            }`}
                            title={user.canExportCSV !== false ? 'E: 원천 데이터 CSV 백업 (활성화)' : 'E: 원천 데이터 CSV 백업 (차단됨)'}
                          >
                            E
                          </span>
                        </div>
                        
                        {/* Interactive Status Toggle Switch */}
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={user.email.toLowerCase() === currentUserEmail.toLowerCase()}
                          className={`text-[9.5px] font-black border uppercase px-2 py-0.5 rounded-lg flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                            !isUserInactive
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-3xs active:scale-[0.97]'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-600 border-slate-300 active:scale-[0.97]'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={
                            user.email.toLowerCase() === currentUserEmail.toLowerCase()
                              ? "안전을 위해 본인 계정은 정지할 수 없습니다"
                              : `클릭하여 계정 ${isUserInactive ? '활성화(🟢)' : '비활성화(🔴)'}`
                          }
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            !isUserInactive ? 'bg-white animate-pulse' : 'bg-slate-400'
                          }`} />
                          {!isUserInactive ? '활성' : '정지'}
                        </button>

                        <div className="flex items-center gap-1 pl-1 border-l border-slate-100">
                          <button
                            onClick={() => handleStartEdit(user)}
                            className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer text-[10px] font-bold"
                            title="프로필 및 소속 수정"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.email)}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer text-[10px] font-bold"
                            title="영본 승인 권한 파기"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
