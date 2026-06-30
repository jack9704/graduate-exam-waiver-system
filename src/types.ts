/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum Status {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED' // Optional but useful addition, we will support PENDING and APPROVED as main ones
}

export interface Application {
  id: number;
  major: string;             // 전공
  name: string;              // 성명
  studentId: string;         // 학번
  registrationCount: number; // 기 등록횟수
  acquiredCredits: number;   // 기 취득학점
  gpa: number;               // 평균평점
  isSigned: boolean;         // 서약 동의 여부 (서명 대체)
  studentEmail: string;      // 학생 이메일 (메일 발송용)
  status: Status;            // 검토 상태
  createdAt: string;         // 신청 날짜 및 시각 (ISO string)
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  sent: boolean;
  error?: string;
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}
