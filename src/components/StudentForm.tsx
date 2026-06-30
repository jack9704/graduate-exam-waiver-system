/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileCheck, GraduationCap, Mail, AlertCircle, Sparkles, CheckCircle2, User, BookOpen, Layers, Award, ClipboardCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { Application } from '../types';

interface StudentFormProps {
  onSuccess: (app: Application) => void;
}

const COMMON_MAJORS = [
  '경영학전공',
  '창업전공',
  '경영관리전공',
  '경영정보전공',
  '조직관리전공',
  '회계금융전공',
  '국제경영전공'
];

export default function StudentForm({ onSuccess }: StudentFormProps) {
  const [majorSelect, setMajorSelect] = useState(COMMON_MAJORS[0]);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [registrationCount, setRegistrationCount] = useState<number | ''>('');
  const [acquiredCredits, setAcquiredCredits] = useState<number | ''>('');
  const [gpa, setGpa] = useState<string>('');
  const [isSigned, setIsSigned] = useState(false);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successData, setSuccessData] = useState<Application | null>(null);

  // Academic criteria check variables
  const hasEnteredAcademicInfo = registrationCount !== '' || acquiredCredits !== '' || gpa !== '';
  const meetsCriteria = () => {
    const reg = registrationCount !== '' ? Number(registrationCount) : 0;
    const cred = acquiredCredits !== '' ? Number(acquiredCredits) : 0;
    const gpaVal = gpa !== '' ? parseFloat(gpa) : 0;
    return reg >= 2 && cred >= 12 && gpaVal >= 3.5;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name Validation
    if (!name.trim()) {
      newErrors.name = '성명을 입력해주세요.';
    } else if (name.trim().length < 2) {
      newErrors.name = '성명은 2자 이상 입력해 주세요.';
    }

    // Major Validation
    const selectedMajor = majorSelect;
    if (!selectedMajor) {
      newErrors.major = '전공을 선택해 주세요.';
    }

    // Student ID Validation (8 to 10 digits check)
    const idRegex = /^\d{8,10}$/;
    if (!studentId.trim()) {
      newErrors.studentId = '학번을 입력해주세요.';
    } else if (!idRegex.test(studentId)) {
      newErrors.studentId = '학번은 8자리에서 10자리의 숫자여야 합니다.';
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!studentEmail.trim()) {
      newErrors.studentEmail = '이메일을 입력해주세요.';
    } else if (!emailRegex.test(studentEmail)) {
      newErrors.studentEmail = '올바른 이메일 형식이 아닙니다.';
    }

    // Registration Count Validation (usually 1-8 semesters)
    if (registrationCount === '') {
      newErrors.registrationCount = '기 등록횟수를 입력해 주세요.';
    } else if (Number(registrationCount) < 1 || Number(registrationCount) > 12) {
      newErrors.registrationCount = '기 등록횟수는 1회에서 12회 사이여야 합니다.';
    }

    // Acquired Credits Validation (typically 0-100)
    if (acquiredCredits === '') {
      newErrors.acquiredCredits = '기 취득학점을 입력해 주세요.';
    } else if (Number(acquiredCredits) < 0 || Number(acquiredCredits) > 180) {
      newErrors.acquiredCredits = '올바른 취득학점을 입력해 주세요 (0 ~ 180).';
    }

    // GPA Validation (0.00 ~ 4.50)
    const parsedGpa = parseFloat(gpa);
    if (!gpa.trim()) {
      newErrors.gpa = '평균평점을 입력해주세요.';
    } else if (isNaN(parsedGpa) || parsedGpa < 0.0 || parsedGpa > 4.5) {
      newErrors.gpa = '평균평점은 0.00에서 4.50 사이여야 합니다.';
    } else {
      const parts = gpa.split('.');
      if (parts[1] && parts[1].length > 2) {
        newErrors.gpa = '평균평점은 소수점 둘째 자리까지만 지원합니다 (예: 4.15).';
      }
    }

    // Sign Consent Validation
    if (!isSigned) {
      newErrors.isSigned = '서약서 동의 및 서명 대체 확인 체크가 필수입니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const selectedMajor = majorSelect;

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          major: selectedMajor,
          name: name.trim(),
          studentId: studentId.trim(),
          studentEmail: studentEmail.trim(),
          registrationCount: Number(registrationCount),
          acquiredCredits: Number(acquiredCredits),
          gpa: parseFloat(gpa),
          isSigned,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '서버 오류가 발생했습니다.');
      }

      setSuccessData(data);
      setShowSuccessPopup(true);
    } catch (err: any) {
      setApiError(err.message || '인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <><div className="max-w-3xl mx-auto" id="student_form_container">
      <div className="bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-crimson-800 via-crimson-950 to-slate-900 p-8 text-white relative">
          <div className="absolute top-4 right-4 text-crimson-300 opacity-20">
            <GraduationCap size={120} />
          </div>
          <div className="relative z-10">
            <span className="px-3 py-1 bg-crimson-700/80 text-crimson-200 text-xs font-semibold rounded-full uppercase tracking-wider">
              Graduate School of Business and Entrepreneurship
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
              종합시험 면제 신청서
            </h1>
            <p className="text-slate-300 text-sm mt-2 max-w-xl leading-relaxed">
              본 시스템은 창업경영대학원 시행세칙 제20조에 의거하여, 평점 평균 및 학점 취득 요건을 만족한 학생을 대상으로 종합시험 면제를 간편하게 신청하고 행정팀의 온라인 검토 및 승인을 진행하는 학적 서비스입니다.
            </p>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8" id="exam_waiver_student_form">
          {apiError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3"
            >
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-sm font-semibold text-red-800">신청 오류</h4>
                <p className="text-xs text-red-700 mt-1">{apiError}</p>
              </div>
            </motion.div>
          )}

          {/* Section 1: Basic Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="text-crimson-800" size={20} />
              <h3 className="text-lg font-bold text-slate-800">1. 인적 사항</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="student_name">
                  성명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="student_name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    className={`w-full pl-3 pr-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                      errors.name ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              {/* Student ID */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="student_id">
                  학번 <span className="text-red-500">*</span>
                </label>
                <input
                  id="student_id"
                  type="text"
                  maxLength={10}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="202412345 (8~10자리)"
                  className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                    errors.studentId ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.studentId && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.studentId}
                  </p>
                )}
              </div>

              {/* Major */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="student_major">
                  전공 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="student_major_select"
                    value={majorSelect}
                    onChange={(e) => setMajorSelect(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all"
                  >
                    {COMMON_MAJORS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {errors.major && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.major}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="student_email">
                  안내 및 통보용 이메일 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="student_email"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@university.edu (접수/검토 결과 발송용)"
                    className={`w-full pl-10 pr-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                      errors.studentEmail ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  신청 완료 및 행정팀 심사 승인 결과가 상기 주소로 전달되오니 수신 가능한 이메일을 정확히 적어 주십시오.
                </p>
                {errors.studentEmail && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.studentEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Grades & Academic Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <BookOpen className="text-crimson-800" size={20} />
              <h3 className="text-lg font-bold text-slate-800">2. 취득 요건 검토 정보</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Registration count */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="registration_count">
                  기 등록횟수 <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-lg">
                  <input
                    id="registration_count"
                    type="number"
                    min={1}
                    max={12}
                    value={registrationCount}
                    onChange={(e) => setRegistrationCount(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="예: 2 (학기 수)"
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                      errors.registrationCount ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    회(학기)
                  </div>
                </div>
                {errors.registrationCount && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.registrationCount}
                  </p>
                )}
              </div>

              {/* Acquired credits */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="acquired_credits">
                  기 취득학점 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="acquired_credits"
                    type="number"
                    min={0}
                    max={180}
                    value={acquiredCredits}
                    onChange={(e) => setAcquiredCredits(e.target.value !== '' ? Number(e.target.value) : '')}
                    placeholder="예: 12"
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                      errors.acquiredCredits ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    학점
                  </div>
                </div>
                {errors.acquiredCredits && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.acquiredCredits}
                  </p>
                )}
              </div>

              {/* GPA */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="gpa">
                  누적 평균평점 (GPA) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="gpa"
                    type="text"
                    value={gpa}
                    onChange={(e) => {
                      // Allow only decimal numbers up to 2 decimal places
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setGpa(val);
                    }}
                    placeholder="예: 3.80"
                    className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 transition-all ${
                      errors.gpa ? 'border-red-400 focus:ring-red-300' : 'border-slate-300'
                    }`}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                    / 4.50
                  </div>
                </div>
                {errors.gpa && (
                  <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.gpa}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-crimson-50/50 border border-crimson-100 rounded-lg flex gap-3 text-xs text-slate-600 leading-relaxed">
              <Sparkles className="text-crimson-800 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-semibold text-slate-700 mb-1">💡 창업경영대학원 종합시험 면제 신청 자격 요건 안내</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>석사 과정: 2학기 이상 등록, 12학점 이상 취득, 누적 평균 평점 3.50 이상인 자</li>
                  <li>학적부 상 기록과 신청서 상 기록이 다를 경우 접수가 반려될 수 있습니다.</li>
                </ul>
              </div>
            </div>

            {hasEnteredAcademicInfo && (
              <div className={`p-4 border rounded-lg flex gap-3 text-xs leading-relaxed transition-all ${
                meetsCriteria() 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-amber-50/80 border-amber-100 text-amber-800'
              }`}>
                {meetsCriteria() ? (
                  <>
                    <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="font-semibold text-emerald-950 mb-0.5">✓ 면제 자격 요건 충족</p>
                      <p>입력하신 학적 정보는 종합시험 면제 신청 기준을 모두 만족합니다.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="font-semibold text-amber-950 mb-0.5">⚠️ 요건 미달 주의</p>
                      <p>입력하신 정보 중 일부가 면제 최저 요건(2학기 이상 등록, 12학점 이상 취득, 평점 3.50 이상)에 미달합니다. 기재 오류가 없는지 확인해 주세요. (제출 자체는 가능하나 반려될 가능성이 높습니다.)</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Signature Oath */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ClipboardCheck className="text-crimson-800" size={20} />
              <h3 className="text-lg font-bold text-slate-800">3. 서약 동의</h3>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="text-sm font-bold text-slate-800 text-center uppercase tracking-wider">종합시험 면제 신청 학생 서약서</h4>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed text-justify">
                본인은 대학원 종합시험 면제를 신청함에 있어서 상기 기재한 전공, 학번, 성명, 취득학점, 이수 학기수, 누적 평점평균 등 학적 인적 사항과 취득 요건 정보가 본인의 실제 학적부 내용과 일치함을 서약합니다. 
              </p>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed text-justify font-medium">
                향후 기재한 정보가 허위나 착오로 판명될 시 면제 승인 취소 및 이로 인한 학업 일정 불이익을 감수할 것을 동의하며, <strong>본 신청서 온라인 제출을 신청자 본인의 서명 또는 날인을 대체하는 것에 동의</strong>합니다.
              </p>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-center">
                <label className="inline-flex items-center gap-3 cursor-pointer select-none p-2 hover:bg-slate-100 rounded-lg transition-colors" htmlFor="is_signed">
                  <input
                    id="is_signed"
                    type="checkbox"
                    checked={isSigned}
                    onChange={(e) => setIsSigned(e.target.checked)}
                    className="w-5 h-5 text-crimson-800 rounded border-slate-300 focus:ring-crimson-800 focus:ring-offset-0"
                  />
                  <span className="text-sm font-bold text-slate-800">
                    위 서약 사항을 모두 확인하였으며, 이에 전적으로 동의합니다 (필수)
                  </span>
                </label>
              </div>
              {errors.isSigned && (
                <p className="text-center text-xs font-semibold text-red-500 flex items-center justify-center gap-1">
                  <AlertCircle size={12} /> {errors.isSigned}
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              id="student_submit_btn"
              type="submit"
              disabled={isSubmitting}
              className={`px-8 py-3.5 bg-gradient-to-r from-crimson-800 to-crimson-900 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  신청 정보를 전송하는 중...
                </>
              ) : (
                <>
                  <FileCheck size={18} />
                  종합시험 면제 신청서 제출하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

    {showSuccessPopup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4 text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-crimson-50 text-crimson-800 rounded-full">
            <CheckCircle2 size={40} className="stroke-[2.5]" />
          </div>
          <p className="text-xl font-black text-slate-800">정상적으로 제출되었습니다.</p>
          <button
            onClick={() => { setShowSuccessPopup(false); if (successData) onSuccess(successData); }}
            className="px-8 py-3 bg-crimson-800 text-white rounded-lg font-bold text-sm hover:bg-crimson-900 transition-all"
          >
            확인
          </button>
        </motion.div>
      </div>
    )}
  </>
  );
}

// Success Receipt Component
interface SubmissionSuccessProps {
  application: Application;
  onReset: () => void;
}

export function SubmissionSuccess({ application, onReset }: SubmissionSuccessProps) {
  const formattedDate = new Date(application.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden"
      id="submission_success_card"
    >
      <div className="bg-emerald-50 border-b border-emerald-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
          <CheckCircle2 size={40} className="stroke-[2.5]" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">종합시험 면제 신청 접수 완료</h2>
        <p className="text-slate-500 text-sm mt-1">
          작성하신 원서가 대학원 행정팀 전산망에 안전하게 등록되었습니다.
        </p>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-3.5">
          <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200 text-slate-400 font-mono">
            <span>RECEIPT ID: {application.id}</span>
            <span>{formattedDate} (KST)</span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-slate-500 font-semibold">신청자 성명</span>
            <span className="text-slate-800 text-right font-bold">{application.name}</span>

            <span className="text-slate-500 font-semibold">학번</span>
            <span className="text-slate-800 text-right font-mono">{application.studentId}</span>

            <span className="text-slate-500 font-semibold">전공</span>
            <span className="text-slate-800 text-right truncate pl-2">{application.major}</span>

            <span className="text-slate-500 font-semibold">기 등록학기수</span>
            <span className="text-slate-800 text-right">{application.registrationCount}회 등록</span>

            <span className="text-slate-500 font-semibold">기 취득학점</span>
            <span className="text-slate-800 text-right">{application.acquiredCredits}학점</span>

            <span className="text-slate-500 font-semibold">평균평점(GPA)</span>
            <span className="text-slate-800 text-right font-mono font-bold text-crimson-800">{application.gpa} / 4.50</span>

            <span className="text-slate-500 font-semibold">이메일 통보처</span>
            <span className="text-slate-800 text-right text-xs break-all font-mono">{application.studentEmail}</span>

            <span className="text-slate-500 font-semibold">심사 진행상태</span>
            <span className="text-right text-amber-600 font-bold flex items-center justify-end gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
              대기 (PENDING)
            </span>
          </div>
        </div>

        <div className="p-4 bg-crimson-50 border border-crimson-100 rounded-lg flex gap-3 text-xs md:text-sm text-crimson-800 leading-relaxed">
          <Mail className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold">📧 제출 확인 이메일 발송 안내</p>
            <p className="text-xs text-crimson-600 mt-1 leading-normal">
              작성하신 메일 주소(<strong>{application.studentEmail}</strong>)로 접수 확인 이메일이 발송되었습니다. 혹시 메일을 받지 못하셨다면 스팸메일함을 확인해 주세요.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            id="reset_form_btn"
            onClick={onReset}
            className="flex-1 py-3 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors border border-slate-300 active:scale-[0.99]"
          >
            새 신청서 작성
          </button>
        </div>
      </div>
    </motion.div>
  );
}
