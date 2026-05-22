// B2B Sales Brand CRM Types and Metadata Model Definition
export type BrandCategory = 'F&B Brand' | 'Non-food Brand' | 'Retail/Store' | 'Franchise Partner';
export type PipelineStatus = 'Cold Call' | 'First Meeting' | 'Proposal & Negotiation' | 'Deal Completed';
export type ProposalSubStage = 'Draft' | 'Tech' | 'Negotiation' | 'Approval';

export interface Brand {
  id: string;
  name: string;
  category: BrandCategory;
  logo: string; // Pastel colors or initial letter representation
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
  solutionId?: string; // 어떤 솔루션을 제안/논의하기 위한 세션 지향인가?
  department?: string; // 제안 주제 부서명
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

export interface Notification {
  id: string;
  type: 'pipeline' | 'action_item' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
