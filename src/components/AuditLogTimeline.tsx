import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, Search, Calendar, UserCheck, 
  Trash2, Download, RefreshCw, FileText, Filter, Eye,
  Database, AlertTriangle, Play, Server, CheckCircle, Clock, ExternalLink
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'Admin' | 'Sales_Rep';
  action: 'UPDATE_PIPELINE' | 'CREATE_MEETING' | 'UPDATE_MEETING' | 'SOFT_DELETE' | 'EXPORT_CSV';
  targetType: string;
  targetName: string;
  details: string;
  createdAt: string;
}

interface BackupItem {
  id: string;
  fileName: string;
  status: 'COMPLETED' | 'FAILED';
  databaseSize: string;
  recordsCount: number;
  details: string;
  createdAt: string;
}

interface SentryEvent {
  success: boolean;
  sentryEventId: string;
  capturedErrorMessage: string;
  stacktrace: string;
  dispatchedNotification: string;
  timestamp: string;
}

interface AuditLogTimelineProps {
  userRole: 'Admin' | 'Sales_Rep';
  auditLogs: AuditLog[];
  onRefresh: () => void;
}

export default function AuditLogTimeline({ userRole, auditLogs, onRefresh }: AuditLogTimelineProps) {
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'backups' | 'sentry'>('timeline');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchKey, setSearchKey] = useState<string>('');
  
  // Backup state
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  // Sentry state
  const [selectedErrorType, setSelectedErrorType] = useState<string>('NullPointerException');
  const [latestSentryEvent, setLatestSentryEvent] = useState<SentryEvent | null>(null);
  const [isTriggeringSentry, setIsTriggeringSentry] = useState(false);

  // Fetch backups from backend hook
  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error('Failed to fetch backup lists:', err);
    }
  };

  useEffect(() => {
    if (userRole !== 'Sales_Rep') {
      fetchBackups();
    }
  }, [userRole]);

  const handleManualBackup = async () => {
    setIsTriggeringBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/backups/trigger', {
        method: 'POST',
        headers: {
          'X-User-Role': userRole
        }
      });
      if (res.ok) {
        const data = await res.json();
        // pre-render updated files
        setBackups(prev => [data.backup, ...prev]);
        setBackupMessage(`🎉 PostgreSQL 이진 백업 스냅샷 [${data.backup.fileName}]이 정상 완결되었습니다.`);
        onRefresh();
      } else {
        const errData = await res.json();
        setBackupMessage(`🔒 오류: ${errData.error || '백업 구동 권한이 없습니다.'}`);
      }
    } catch (err) {
      console.error('Backup trigger failed:', err);
      setBackupMessage('❌ 백업 격발 과정 중 네트워크 예외가 감지되었습니다.');
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const handleSentrySimulation = async () => {
    setIsTriggeringSentry(true);
    try {
      const res = await fetch('/api/sentry/trigger-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ errorType: selectedErrorType })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestSentryEvent(data);
      }
    } catch (err) {
      console.error('Sentry exception simulator failed:', err);
    } finally {
      setIsTriggeringSentry(false);
    }
  };

  const getActionTheme = (action: string) => {
    switch (action) {
      case 'SOFT_DELETE':
        return {
          label: '논리 삭제 (보호)',
          bgColor: 'bg-rose-50 border-rose-100',
          textColor: 'text-rose-700',
          indicatorColor: 'bg-rose-400 ring-rose-100',
          icon: Trash2
        };
      case 'EXPORT_CSV':
        return {
          label: '대용량 CSV 백업',
          bgColor: 'bg-amber-50 border-amber-150',
          textColor: 'text-amber-700',
          indicatorColor: 'bg-amber-400 ring-amber-100',
          icon: Download
        };
      case 'CREATE_MEETING':
        return {
          label: '신규 가맹 조정',
          bgColor: 'bg-emerald-50 border-emerald-100',
          textColor: 'text-emerald-700',
          indicatorColor: 'bg-emerald-400 ring-emerald-100',
          icon: Calendar
        };
      case 'UPDATE_MEETING':
        return {
          label: '미팅 정보 보강',
          bgColor: 'bg-cyan-50 border-cyan-100',
          textColor: 'text-cyan-700',
          indicatorColor: 'bg-cyan-400 ring-cyan-100',
          icon: FileText
        };
      case 'UPDATE_PIPELINE':
      default:
        return {
          label: '파이프라인 이동',
          bgColor: 'bg-blue-50 border-blue-105',
          textColor: 'text-blue-700',
          indicatorColor: 'bg-blue-400 ring-blue-100',
          icon: UserCheck
        };
    }
  };

  if (userRole === 'Sales_Rep') {
    return (
      <div className="bg-white rounded-3xl border border-slate-150 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs my-8 animate-fadeIn">
        <div className="mx-auto w-16 h-16 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 shadow-3xs animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-black text-slate-900">🔒 기업 내부 보안 및 정보 감사 열람 통제</h3>
          <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">Access Level Required: [Super Admin] or [Active Permit Switch]</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
          본 감사 이력 타임라인(Audit Log)은 영업 기밀 유출 방지 및 파이프라인 무단 수정을 실시간 관제하는 내부 관리 화면입니다. 슈퍼 어드민 계정 또는 해당 기능 개방 허가를 얻은 일반 유저에 한해 대시보드가 오픈됩니다.
        </p>
        <div className="bg-slate-50 p-4 rounded-2xl text-[11px] font-medium text-slate-400 leading-relaxed border border-slate-100 text-left space-y-2">
          <p className="font-bold text-slate-700">💡 정보 획득 안내:</p>
          <p>화면 상단의 <span className="font-bold text-slate-800">일반 사용자 계정</span>이 탐색 권한을 가질 수 있도록, 슈퍼 어드민 대시보드 내 "어드민 & 마이그레이션 - 인사 및 구성원" 패널에서 본 계정에 대한 <strong>감사 로그 조회 권한 스위치</strong>를 활성화해 주시면 승인 즉시 열람이 인가됩니다.</p>
        </div>
      </div>
    );
  }

  // Filter audit logs
  const filteredLogs = auditLogs.filter(log => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (searchKey.trim() !== '') {
      const criteria = searchKey.toLowerCase();
      return (
        log.userName.toLowerCase().includes(criteria) ||
        log.details.toLowerCase().includes(criteria) ||
        log.targetName.toLowerCase().includes(criteria)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Search Header Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100/50">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">Enterprise Compliance Center</h3>
            <h1 className="text-sm font-black text-slate-850 mt-1">기업 데이터 무결성 감시 및 보안 관제</h1>
          </div>
        </div>

        {/* Sub Navigation Tabs for Admin */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'timeline' 
                ? 'bg-white text-slate-850 shadow-3xs' 
                : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            기밀 변경 타임라인
          </button>
          <button
            onClick={() => setActiveSubTab('backups')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'backups' 
                ? 'bg-white text-slate-850 shadow-3xs' 
                : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            PostgreSQL 새벽 백업
          </button>
          <button
            onClick={() => setActiveSubTab('sentry')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === 'sentry' 
                ? 'bg-white text-slate-850 shadow-3xs' 
                : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            Sentry 에러 디포그
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: Audit Log Timeline */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-4xs flex flex-col md:flex-row items-center justify-between gap-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global CRM Database Alteration Logs</h4>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              {/* Keyword Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="행위자, 대리점 키워드 검색..."
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  className="pl-8.5 pr-3 py-1.5 text-xs text-slate-705 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/15 w-full sm:w-60 transition-all font-medium"
                />
              </div>

              {/* Action Filter */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <span className="text-[9px] font-black text-slate-400 px-2 uppercase shrink-0">FILTER</span>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="bg-transparent text-[11px] font-extrabold text-slate-700 focus:outline-none pr-2 pl-0.5 cursor-pointer outline-none"
                >
                  <option value="ALL">전체 일지</option>
                  <option value="UPDATE_PIPELINE">파이프라인 변동</option>
                  <option value="CREATE_MEETING">신규 미팅</option>
                  <option value="UPDATE_MEETING">미팅 수정</option>
                  <option value="SOFT_DELETE">논리 삭제 이력</option>
                  <option value="EXPORT_CSV">CSV 다운로드</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={onRefresh}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center text-slate-400"
                title="감시 로그 새로고침"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-16 text-center text-slate-400 text-xs shadow-4xs">
              🔍 지정 필터에 해당되는 정보 이지 로그가 기록되어 있지 않습니다.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-5 sm:ml-6 pl-6 sm:pl-8 space-y-6">
              {filteredLogs.map((log) => {
                const theme = getActionTheme(log.action);
                const IconComponent = theme.icon;
                
                return (
                  <div key={log.id} className="relative group animate-fadeIn">
                    
                    {/* Timeline Node Point Indicator */}
                    <div className={`absolute -left-[35px] sm:-left-[43px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white shadow-3xs text-white shrink-0 transition-transform group-hover:scale-110 ${theme.indicatorColor}`}>
                      <IconComponent className="w-3" />
                    </div>

                    {/* Log Card Box */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 hover:shadow-xs hover:border-slate-200/80 transition-all">
                      
                      {/* Card Header metadata */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-rose-50/20 pb-2.5 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">{log.userName}</span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase font-mono ${
                            log.userRole === 'Admin' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100/50' 
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100/60'
                          }`}>
                            {log.userRole === 'Admin' ? 'Super Admin 최고관리자' : 'Normal User 일반사용자'}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="text-[10px] text-slate-400 font-bold font-mono">UUID: {log.userId}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border shadow-4xs ${theme.textColor} ${theme.bgColor}`}>
                            {theme.label}
                          </span>
                          <span className="text-[10.5px] text-slate-450 font-mono">
                            {new Date(log.createdAt).toLocaleString('ko-KR')}
                          </span>
                        </div>
                      </div>

                      {/* Log Body Details */}
                      <div className="space-y-1.5">
                        <p className="text-[11.5px] text-slate-400 font-bold leading-none flex items-center gap-1.5">
                          <span className="text-slate-400 font-sans uppercase text-[10px]">감사 타깃:</span>
                          <span className="text-slate-900 font-black">{log.targetName}</span>
                          {log.targetType && (
                            <span className="text-[9.5px] px-1 bg-slate-100 text-slate-400 rounded font-bold">{log.targetType}</span>
                          )}
                        </p>
                        <div className="bg-slate-55 p-3 rounded-xl border border-slate-100 mt-1">
                          <p className="text-[11.5px] text-slate-650 leading-relaxed font-sans font-medium">{log.details}</p>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 2: PostgreSQL Cron Backups panel */}
      {activeSubTab === 'backups' && (
        <div className="space-y-5">
          {/* Header Action Banner */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-3xs grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black text-emerald-600 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">POSIX CRON SCHEDULER ACTIVE</span>
              </div>
              <h2 className="text-base font-black text-slate-850">PostgreSQL 월간 가맹 데이터 및 CRM 무결성 자동 백업</h2>
              <p className="text-[11.5px] text-slate-450 leading-relaxed font-bold">
                본 대시보드는 리눅스 크론 서비스 데몬(<code className="bg-slate-100 px-1.5 py-0.5 rounded text-rose-500 font-mono text-[11px]">node-cron</code>)에 의해 매일 새벽 3:00 정각 정기 발효되는 데이터 덤프 프로세스 현황입니다. 압축과 더불어 무기명 AWS S3 이중화 저장이 수행됩니다.
              </p>
            </div>

            <div className="md:col-span-4 flex flex-col items-stretch gap-2.5">
              <button 
                onClick={handleManualBackup}
                disabled={isTriggeringBackup}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${
                  isTriggeringBackup 
                    ? 'bg-slate-300 border-none cursor-not-allowed' 
                    : 'bg-[#4F46E5] hover:bg-indigo-700 shadow-md border-b-[3px] border-indigo-800'
                }`}
              >
                <Database className={`w-4 h-4 ${isTriggeringBackup ? 'animate-spin' : ''}`} />
                <span>{isTriggeringBackup ? '데이터 덤프 진행중...' : 'PostgreSQL 즉시 수동 백업'}</span>
              </button>

              <button
                onClick={fetchBackups}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-extrabold text-slate-400 bg-slate-55 border border-slate-150 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-400" />
                <span>스토리지 입적 상태 갱신</span>
              </button>
            </div>
          </div>

          {backupMessage && (
            <div className={`p-3 px-4.5 rounded-2xl text-xs font-extrabold shadow-4xs animate-slideIn ${
              backupMessage.includes('오류') || backupMessage.includes('❌')
                ? 'bg-rose-50 border border-rose-100 text-rose-800' 
                : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
            }`}>
              {backupMessage}
            </div>
          )}

          {/* Backup Logs list */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-3xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>AWS S3 Glacier Archiving History (총 {backups.length}개 보관됨)</span>
            </h3>

            {backups.length === 0 ? (
              <div className="text-center p-12 text-slate-400 text-xs">
                🗂️ 아카이브된 백업 결과물이 전무합니다. 백업 동작을 실행시켜 주십시오.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {backups.map((bk) => (
                  <div key={bk.id} className="p-4 rounded-2xl border border-slate-105 bg-slate-50/15 hover:border-slate-200 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-850 font-mono tracking-wide">{bk.fileName}</p>
                          <p className="text-[10.5px] font-bold text-slate-450 mt-1 flex items-center gap-1.5">
                            <span>용량: <span className="text-slate-700 font-extrabold">{bk.databaseSize}</span></span>
                            <span>|</span>
                            <span>테이블 가맹 행 수: <span className="text-slate-700 font-extrabold">{bk.recordsCount} rows</span></span>
                            <span>|</span>
                            <span className="text-indigo-600">AWS S3 Glacier Deep Archive 저정 완료</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-100 font-black px-2 py-0.5 rounded-lg mr-2 uppercase">
                          {bk.status}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono">
                          {new Date(bk.createdAt).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 mt-3 text-[11px] text-slate-400 font-medium leading-relaxed">
                      {bk.details}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: Sentry Error simulation panel */}
      {activeSubTab === 'sentry' && (
        <div className="space-y-5">
          {/* Sentry controller banner */}
          <div className="bg-white border border-slate-105 rounded-3xl p-5 sm:p-6 shadow-3xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block p-1 px-2.5 text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-100 rounded-md uppercase tracking-wider font-mono">
                  SENTRY MONITORING INSTALLED
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-bold">SDK Version: Node/@sentry 7.82.0</span>
              </div>
              
              <h2 className="text-base font-black text-slate-850">실시간 예외 트래킹 분석기 (Proactive Exception Logging)</h2>
              <p className="text-[11.5px] text-slate-450 leading-relaxed font-bold">
                프론트엔드 및 백엔드 미들웨어 전체에 결합된 <span className="text-rose-600 font-black">Sentry Exception Trap</span> 모듈의 모의 에러 격사기입니다. 비정상 접속 소실, 인자 누락, 커스트 캐스팅 실패 발생 시 즉시 감지하여 #dev-ops 슬랙 팀 채널 및 관제 센터 메일로 즉시 소산을 조율합니다.
              </p>
            </div>

            <div className="lg:col-span-5 bg-slate-50 p-4.5 rounded-2xl border border-slate-150 space-y-3">
              <label className="block text-[10.5px] font-black uppercase text-slate-400 tracking-wider">예외 처리 격발 타깃 형태 설정</label>
              
              <div className="flex flex-col gap-2">
                <select
                  value={selectedErrorType}
                  onChange={(e) => setSelectedErrorType(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold text-slate-700 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 cursor-pointer"
                >
                  <option value="NullPointerException">NullPointerException (인수 배당 사원 메일 누락 예외)</option>
                  <option value="RateLimitExceeded">RateLimitExceeded (분산 토큰 버킷 쿼리 초과 차단 예외)</option>
                  <option value="DatabaseConnectionTimeout">DatabaseConnectionTimeout (PostgreSQL 테이블 트랜잭션 풀 자원 정지 예외)</option>
                </select>

                <button
                  onClick={handleSentrySimulation}
                  disabled={isTriggeringSentry}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white p-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-md cursor-pointer border-b-[3px] border-rose-850"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{isTriggeringSentry ? '예외 포집 분석 진행 중...' : 'Sentry 크래시 유발 시뮬레이션'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Simulated Sentry incident board */}
          {latestSentryEvent && (
            <div className="bg-[#1E1E2E] text-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-rose-950 space-y-4 font-mono animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-[#03C75A]/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <div>
                    <h3 className="text-xs font-black text-rose-450 uppercase tracking-widest leading-none">Sentry Incident Captured</h3>
                    <p className="text-[10px] text-slate-400 mt-1">EVENT ID: <span className="text-yellow-400 font-extrabold uppercase">{latestSentryEvent.sentryEventId}</span></p>
                  </div>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-lg">
                  🚨 DISPATCH: SENT_TO_SLACK_AND_EMAIL
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-450 uppercase tracking-wide">Captured Error Message:</span>
                  <p className="text-rose-400 font-bold bg-rose-950/20 p-2.5 rounded-xl border border-rose-950/30 font-sans leading-relaxed">
                    {latestSentryEvent.capturedErrorMessage}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 uppercase tracking-wide">Incident Telemetry Stacktrace:</span>
                  <pre className="p-3 bg-black/40 border border-slate-850/50 rounded-xl text-[11px] text-slate-350 overflow-x-auto leading-relaxed font-mono whitespace-pre-wrap">
                    {latestSentryEvent.stacktrace}
                  </pre>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-[11px]">
                  <div className="bg-white/70/50 p-2.5 rounded-xl border border-[#03C75A]/10">
                    <span className="text-slate-450 block text-[9px] uppercase tracking-wide">Alert Notification Status:</span>
                    <span className="text-emerald-400 font-black flex items-center gap-1.5 mt-1">
                      <CheckCircle className="w-3.5 h-3.5 inline text-emerald-400" />
                      <span>#dev-ops 슬랙 채널 및 수용자 이메일 발송 완료</span>
                    </span>
                  </div>

                  <div className="bg-white/70/50 p-2.5 rounded-xl border border-[#03C75A]/10">
                    <span className="text-slate-450 block text-[9px] uppercase tracking-wide">Local Time Recorded:</span>
                    <span className="text-slate-600 font-black mt-1 block">
                      {new Date(latestSentryEvent.timestamp).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
