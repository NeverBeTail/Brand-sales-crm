// ──────────────────────────────────────────────
// useAuth: Firebase 인증 및 RBAC 권한 관리 훅
// ──────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { loginWithGoogle, logout as firebaseLogout, auth, db } from '../lib/firebase';
import { withTimeout } from '../lib/utils';
import { SUPER_ADMIN_EMAIL, FIRESTORE_TIMEOUT_MS } from '../constants';
import type { UserRole, ApprovedUser } from '../types';

export interface AuthState {
  isLoggedIn: boolean;
  loginEmail: string;
  userRole: UserRole;
  googleAccessToken: string | null;
  rbacError: string | null;
  approvedUsers: ApprovedUser[];
  matchedProfile: ApprovedUser | undefined;
  canEditPipeline: boolean;
  canUseAI: boolean;
  canViewAudit: boolean;
  canManageUsers: boolean;
  canExportCSV: boolean;
}

export interface AuthActions {
  setGoogleAccessToken: (token: string | null) => void;
  setRbacError: (error: string | null) => void;
  setUserRole: (role: UserRole) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleDemoLogin: () => void;
  handleAdminAddUser: (userObj: Partial<ApprovedUser> & { email: string; name: string; role: string; team: string }) => Promise<void>;
  handleAdminUpdateUser: (email: string, updatedFields: Partial<ApprovedUser>) => Promise<void>;
  handleAdminDeleteUser: (email: string) => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('Admin');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [rbacError, setRbacError] = useState<string | null>(null);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);

  const matchedProfile = approvedUsers.find(
    (u) => u.email.toLowerCase() === loginEmail.toLowerCase()
  );

  // RBAC 권한 계산
  const canEditPipeline =
    userRole === 'Admin' ||
    (matchedProfile?.canEditPipeline !== undefined ? !!matchedProfile.canEditPipeline : false);
  const canUseAI =
    userRole === 'Admin' ||
    (matchedProfile?.canUseAI !== undefined ? !!matchedProfile.canUseAI : true);
  const canViewAudit =
    userRole === 'Admin' ||
    (matchedProfile?.canViewAudit !== undefined ? !!matchedProfile.canViewAudit : false);
  const canManageUsers =
    userRole === 'Admin' ||
    (matchedProfile?.canManageUsers !== undefined ? !!matchedProfile.canManageUsers : false);
  const canExportCSV =
    userRole === 'Admin' ||
    (matchedProfile?.canExportCSV !== undefined ? !!matchedProfile.canExportCSV : false);

  // Firebase Auth 상태 감시
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const email = user.email || 'unknown';
          const isSuperAdmin = email === SUPER_ADMIN_EMAIL;
          const userDocRef = doc(db, 'approved_users', email);

          let userRoleResult: string = 'Sales_Rep';
          try {
            const userDoc = await withTimeout(getDoc(userDocRef), FIRESTORE_TIMEOUT_MS);
            if (userDoc.exists()) {
              const uData = userDoc.data();
              if (uData?.status === 'Inactive') {
                setRbacError('🚫 비활성화된 계정입니다. 해당 서비스 로그인 권한이 제한되었습니다.');
                setIsLoggedIn(false);
                setLoginEmail('');
                await firebaseLogout();
                return;
              }
              userRoleResult = uData?.role || 'Sales_Rep';
            } else {
              const defaultRole = isSuperAdmin ? 'Admin' : 'Sales_Rep';
              setDoc(userDocRef, {
                approvedAt: new Date().toISOString(),
                role: defaultRole,
                status: 'Active',
              }).catch((err) => {
                console.warn('Background auto-approval user document write failed:', err);
              });
              userRoleResult = defaultRole;
            }
          } catch (fbErr) {
            console.warn('⚠️ Firestore direct auth document check failed/timed out:', fbErr);
            userRoleResult = isSuperAdmin ? 'Admin' : 'Sales_Rep';
          }

          setUserRole(userRoleResult as UserRole);
          setIsLoggedIn(true);
          setLoginEmail(email);
        } catch (err) {
          console.error('Auth verification failed:', err);
          alert('인증 확인 중 오류가 발생했습니다.');
          await firebaseLogout();
        }
      } else {
        setIsLoggedIn(false);
        setLoginEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  // 비활성화된 세션 실시간 감지 및 강제 로그아웃
  useEffect(() => {
    if (isLoggedIn && loginEmail && approvedUsers.length > 0) {
      const currentProfile = approvedUsers.find(
        (u) => u.email.toLowerCase() === loginEmail.toLowerCase()
      );
      if (currentProfile && currentProfile.status === 'Inactive') {
        alert('🚫 관리자에 의해 계정이 즉각 비활성화되었습니다.');
        setIsLoggedIn(false);
        setLoginEmail('');
        firebaseLogout();
      }
    }
  }, [approvedUsers, isLoggedIn, loginEmail]);

  // Google 로그인 핸들러
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loginRes = await loginWithGoogle();
      if (loginRes?.accessToken) {
        setGoogleAccessToken(loginRes.accessToken);
      }
    } catch (err) {
      console.error(err);
      alert('로그인에 실패했습니다.');
    }
  }, []);

  // 데모 로그인 핸들러
  const handleDemoLogin = useCallback(() => {
    setIsLoggedIn(true);
    setLoginEmail(SUPER_ADMIN_EMAIL);
    setUserRole('Admin');
  }, []);

  // 관리자 사용자 추가
  const handleAdminAddUser = useCallback(
    async (userObj: Partial<ApprovedUser> & { email: string; name: string; role: string; team: string }) => {
      try {
        const refinedFields = {
          name: userObj.name,
          role: userObj.role,
          team: userObj.team,
          avatarUrl: userObj.avatarUrl || '',
          status: userObj.status || 'Active',
          approvedAt: new Date().toISOString(),
          canEditPipeline: userObj.canEditPipeline ?? userObj.role === 'Admin',
          canUseAI: userObj.canUseAI ?? true,
          canViewAudit: userObj.canViewAudit ?? userObj.role === 'Admin',
          canManageUsers: userObj.canManageUsers ?? userObj.role === 'Admin',
          canExportCSV: userObj.canExportCSV ?? userObj.role === 'Admin',
        };
        await setDoc(doc(db, 'approved_users', userObj.email.trim().toLowerCase()), refinedFields);

        const newAudit = {
          id: `audit-user-add-${Date.now()}`,
          userId: loginEmail,
          userName: matchedProfile?.name || loginEmail,
          userRole: userRole,
          action: 'UPDATE_PIPELINE',
          targetType: 'USER_ROLE',
          targetName: userObj.email,
          details: `신규 영업팀 구성원 권한 승인 등록 완료: ${userObj.name} (${userObj.role}, ${userObj.team})`,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
      } catch (err) {
        console.error('Failed to register new coworker in Firestore:', err);
        throw err;
      }
    },
    [loginEmail, matchedProfile, userRole]
  );

  // 관리자 사용자 수정
  const handleAdminUpdateUser = useCallback(
    async (email: string, updatedFields: Partial<ApprovedUser>) => {
      try {
        const targetEmail = email.trim().toLowerCase();
        const fieldsToSave: Record<string, unknown> = {
          name: updatedFields.name,
          role: updatedFields.role,
          team: updatedFields.team,
          avatarUrl: updatedFields.avatarUrl || '',
        };
        if (updatedFields.status !== undefined) fieldsToSave.status = updatedFields.status;
        if (updatedFields.canEditPipeline !== undefined) fieldsToSave.canEditPipeline = updatedFields.canEditPipeline;
        if (updatedFields.canUseAI !== undefined) fieldsToSave.canUseAI = updatedFields.canUseAI;
        if (updatedFields.canViewAudit !== undefined) fieldsToSave.canViewAudit = updatedFields.canViewAudit;
        if (updatedFields.canManageUsers !== undefined) fieldsToSave.canManageUsers = updatedFields.canManageUsers;
        if (updatedFields.canExportCSV !== undefined) fieldsToSave.canExportCSV = updatedFields.canExportCSV;

        await updateDoc(doc(db, 'approved_users', targetEmail), fieldsToSave);

        if (targetEmail === loginEmail.toLowerCase() && updatedFields.role) {
          setUserRole(updatedFields.role);
        }

        const newAudit = {
          id: `audit-user-upd-${Date.now()}`,
          userId: loginEmail,
          userName: matchedProfile?.name || loginEmail,
          userRole: userRole,
          action: 'UPDATE_PIPELINE',
          targetType: 'USER_ROLE',
          targetName: email,
          details: `영업 구성원 프로필/역할/상태 설정 적용 완료: ${updatedFields.name} (상태: ${updatedFields.status || 'Active'})`,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
      } catch (err) {
        console.error('Failed to update coworker profiles in Firestore:', err);
        throw err;
      }
    },
    [loginEmail, matchedProfile, userRole]
  );

  // 관리자 사용자 삭제
  const handleAdminDeleteUser = useCallback(
    async (email: string) => {
      try {
        const targetEmail = email.trim().toLowerCase();
        await deleteDoc(doc(db, 'approved_users', targetEmail));

        const newAudit = {
          id: `audit-user-del-${Date.now()}`,
          userId: loginEmail,
          userName: matchedProfile?.name || loginEmail,
          userRole: userRole,
          action: 'UPDATE_PIPELINE',
          targetType: 'USER_ROLE',
          targetName: email,
          details: `영업 구성원 직급 권한 강제 파기 및 정지 완료: ${email}`,
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'audit_logs', newAudit.id), newAudit);
      } catch (err) {
        console.error('Failed to delete user mapping in Firestore:', err);
        throw err;
      }
    },
    [loginEmail, matchedProfile, userRole]
  );

  return {
    isLoggedIn,
    loginEmail,
    userRole,
    googleAccessToken,
    rbacError,
    approvedUsers,
    matchedProfile,
    canEditPipeline,
    canUseAI,
    canViewAudit,
    canManageUsers,
    canExportCSV,
    setGoogleAccessToken,
    setRbacError,
    setUserRole,
    handleLogin,
    handleDemoLogin,
    handleAdminAddUser,
    handleAdminUpdateUser,
    handleAdminDeleteUser,
  };
}
