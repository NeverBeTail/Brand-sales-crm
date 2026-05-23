// ──────────────────────────────────────────────
// B2B CRM 공통 유틸리티 함수
// ──────────────────────────────────────────────

import { auth } from './firebase';
import type { PipelineStatus } from '../types';
import { PIPELINE_PROGRESS, PIPELINE_ORDER } from '../constants';

// ──────────────────────────────────────────────
// Promise 타임아웃 래퍼
// ──────────────────────────────────────────────

/**
 * Promise에 타임아웃을 적용합니다.
 * Firestore 호출 등에서 네트워크 지연 시 fallback으로 전환하기 위해 사용합니다.
 */
export const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 1800): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
};

// ──────────────────────────────────────────────
// Firestore 에러 핸들링
// ──────────────────────────────────────────────

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Firestore 작업 실패 시 구조화된 에러 정보를 로깅하고 throw합니다.
 */
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[FIRESTORE COMPLIANCE ERROR] ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ──────────────────────────────────────────────
// 파이프라인 헬퍼
// ──────────────────────────────────────────────

/** 파이프라인 상태에 따른 표시 정보를 반환합니다. */
export function getPipelineProgress(status: PipelineStatus) {
  return PIPELINE_PROGRESS[status];
}

/** 파이프라인 상태의 순서 인덱스를 반환합니다. */
export function getPipelineIndex(status: PipelineStatus): number {
  return PIPELINE_ORDER.indexOf(status);
}
