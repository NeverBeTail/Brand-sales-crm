// B2B Sales Brand CRM Types and Metadata Model Definition

// ──────────────────────────────────────────────
// 공통 타입 별칭
// ──────────────────────────────────────────────
export type BrandCategory = 'F&B Brand' | 'Non-food Brand' | 'Retail/Store' | 'Franchise Partner';
export type PipelineStatus = 'Cold Call' | 'First Meeting' | 'Proposal & Negotiation' | 'Deal Completed';
export type ProposalSubStage = 'Draft' | 'Tech' | 'Negotiation' | 'Approval';
export type UserRole = 'Admin' | 'Sales_Rep';
export type ViewMode = 'profile' | 'pipeline' | 'analytics' | 'audit' | 'chatbot' | 'admin' | 'backlog' | 'guide' | 'property-detail';
export type AuditAction = 'CREATE_BRAND' | 'UPDATE_PIPELINE' | 'CREATE_MEETING' | 'DELETE_MEETING' | 'EXPORT_CSV' | 'LOGIN' | 'LOGOUT';
export type NotificationType = 'pipeline' | 'action_item' | 'system';

// ──────────────────────────────────────────────
// 핵심 도메인 인터페이스
// ──────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
  category: BrandCategory;
  logo: string;
  headquarters: string;
  lat: number;
  lng: number;
  description: string;
  targetStoresCount: number;
  monthlyRevenueEst: string;
  pipelineStatus: PipelineStatus;
  proposalSubStage?: ProposalSubStage;
}

export interface Contact {
  id: string;
  brandId: string;
  name: string;
  role: '브랜드 본사 담당자' | 'VAN대리점' | '그 외';
  position: string;
  phone: string;
  email: string;
}

export interface Meeting {
  id: string;
  brandId: string;
  contactId?: string;
  solutionId?: string;
  department?: string;
  title: string;
  dateTime: string;
  type: 'Online' | 'Offline';
  location?: string;
  googleMeetLink?: string;
  pipelineStatus: PipelineStatus;
  notes?: string;
  summary?: string;
  actionItems?: string[];
  reminderSet?: boolean;
  reminderSent?: boolean;
  googleEventId?: string;
  googleCalendarHtmlLink?: string;
}

export interface Solution {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
}

export interface BrandSolution {
  brandId: string;
  solutionId: string;
  pipelineStatus: PipelineStatus;
  department?: string;
  updatedAt?: string;
}

export interface SyncStatus {
  lastSynced: string | null;
  syncedEventsCount: number;
  isSyncing: boolean;
}

// ──────────────────────────────────────────────
// 알림 / 감사 / 사용자 관리
// ──────────────────────────────────────────────
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  targetType: string;
  targetName: string;
  details: string;
  createdAt: string;
}

export interface ApprovedUser {
  email: string;
  name: string;
  role: UserRole;
  team: string;
  avatarUrl: string;
  status: 'Active' | 'Inactive';
  approvedAt: string;
  canEditPipeline: boolean;
  canUseAI: boolean;
  canViewAudit: boolean;
  canManageUsers: boolean;
  canExportCSV: boolean;
}

// ──────────────────────────────────────────────
// 폼 인터페이스
// ──────────────────────────────────────────────
export interface NewBrandFormData {
  name: string;
  category: BrandCategory;
  headquarters: string;
  description: string;
  targetStoresCount: number;
  monthlyRevenueEst: string;
  pipelineStatus: PipelineStatus;
  contactName: string;
  contactRole: '브랜드 본사 담당자' | 'VAN대리점' | '그 외';
  contactPosition: string;
  contactPhone: string;
  contactEmail: string;
}

export interface AIAnalysisResult {
  transcript: string;
  summary: string;
  actionItems: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
}
