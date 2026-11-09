import { lazy } from 'react';

export const RecoveryKeyComponent = lazy(() => import('./RecoveryKeyComponent').then(module => ({ default: module.RecoveryKeyComponent })));
export const DeviceRecoveryComponent = lazy(() => import('./DeviceRecoveryComponent').then(module => ({ default: module.DeviceRecoveryComponent })));
export const EmailRecoveryComponent = lazy(() => import('./EmailRecoveryComponent').then(module => ({ default: module.EmailRecoveryComponent })));
export const RegisterComponent = lazy(() => import('./RegisterComponent'));
export const QrApprovalPage = lazy(() => import('./QrApprovalPage').then(module => ({ default: module.QrApprovalPage })));
