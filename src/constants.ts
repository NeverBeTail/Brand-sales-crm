// ──────────────────────────────────────────────
// B2B CRM 전역 상수 정의
// 중복 하드코딩 방지 및 유지보수 단일 소스 보장
// ──────────────────────────────────────────────

import type { PipelineStatus, BrandCategory, NewBrandFormData } from './types';

/** 파이프라인 단계 정의 (순서 보장) */
export const PIPELINE_STAGES: { name: string; label: PipelineStatus }[] = [
  { name: '콜드콜', label: 'Cold Call' },
  { name: '첫 미팅', label: 'First Meeting' },
  { name: '도입 제안', label: 'Proposal & Negotiation' },
  { name: '계약 완료', label: 'Deal Completed' },
];

/** 파이프라인 진행률 시각화 헬퍼 */
export const PIPELINE_PROGRESS: Record<PipelineStatus, { text: string; color: string }> = {
  'Cold Call': { text: '콜드콜', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'First Meeting': { text: '첫 대면 미팅', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Proposal & Negotiation': { text: '도입 제안 및 조율', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  'Deal Completed': { text: '계약 완료 🏆', color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

/** 파이프라인 순서 인덱스 */
export const PIPELINE_ORDER: PipelineStatus[] = [
  'Cold Call',
  'First Meeting',
  'Proposal & Negotiation',
  'Deal Completed',
];

/** 제안/조율 하위 단계 라벨 매핑 */
export const PROPOSAL_SUB_STAGE_LABELS: Record<string, string> = {
  Draft: '제안서 구성 및 송부 📄',
  Tech: '기술 정합성 검토 ⚙️',
  Negotiation: '제휴 요금 조건 조율 🤝',
  Approval: '최종 내부 기안 승인 ✍️',
};

/** 솔루션 이름 매핑 (하드코딩 중복 제거) */
export const SOLUTION_NAMES: Record<string, string> = {
  'sol-1': '도도포인트 (Dodo Point)',
  'sol-2': '나우웨이팅 (Now Waiting)',
  'sol-3': '네이버예약 (Naver Booking)',
  'sol-4': '네이버커넥트 (Naver Connect)',
};

/** 브랜드 카테고리 목록 */
export const BRAND_CATEGORIES: BrandCategory[] = [
  'F&B Brand',
  'Non-food Brand',
  'Retail/Store',
  'Franchise Partner',
];

/** 뷰모드별 헤더 라벨 매핑 */
export const VIEW_MODE_LABELS: Record<string, string> = {
  profile: '⏳ 실시간 프랜차이즈 거래 정합 피드',
  guide: '📚 B2B CRM 통합 사용 설명 가이드',
  'property-detail': '🏢 B2B 가맹 자산 상세 포트폴리오',
  pipeline: '📋 CRM 영업 진행 칸반 보드',
  analytics: '📊 파이프라인 실적 계측기',
  chatbot: '💬 RAG AI 영업 컨설팅 센터',
  audit: '🔒 엔터프라이즈 보안 감사 기록',
  admin: '🛠️ 최고 관리자 설정 및 권한 통제',
  backlog: '📬 릴리즈 대기 백로그 & 개발 시뮬레이터',
};

/** 새 브랜드 폼 초기값 */
export const INITIAL_BRAND_FORM: NewBrandFormData = {
  name: '',
  category: 'F&B Brand',
  headquarters: '',
  description: '',
  targetStoresCount: 5,
  monthlyRevenueEst: '월 평균 1억원 규모 예상',
  pipelineStatus: 'Cold Call',
  contactName: '',
  contactRole: '브랜드 본사 담당자',
  contactPosition: '담당 바이어',
  contactPhone: '',
  contactEmail: '',
};

/** 슈퍼 관리자 이메일 */
export const SUPER_ADMIN_EMAIL = 'rudals5569@gmail.com';

/** Firestore 타임아웃(ms) */
export const FIRESTORE_TIMEOUT_MS = 1500;

/** 알림 폴링 간격(ms) */
export const NOTIFICATION_POLL_INTERVAL_MS = 5000;
