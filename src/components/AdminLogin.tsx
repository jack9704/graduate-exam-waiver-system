/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<{ isDefaultPassword: boolean; hasRealSmtp: boolean } | null>(null);

  useEffect(() => {
    // Check config status to help developer/reviewer understand password details
    fetch('/api/admin/config-status')
      .then((res) => res.json())
      .then((data) => setConfigStatus(data))
      .catch((err) => console.error('Error fetching config status:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      onLoginSuccess(data.token);
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12" id="admin_login_container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-8 space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-crimson-800 via-crimson-700 to-crimson-950"></div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-crimson-50 text-crimson-800 rounded-full mb-2">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800">행정팀 담당자 로그인</h2>
          <p className="text-slate-400 text-xs">
            종합시험 면제 신청서를 검토 및 심사하기 위한 관리자 페이지입니다.
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2.5 text-xs text-red-600"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" id="admin_login_form">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider" htmlFor="admin_password">
              관리자 비밀번호 (Admin Passcode)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <KeyRound size={16} />
              </span>
              <input
                id="admin_password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="관리자 인증 비밀번호 입력"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-800 focus:bg-white text-slate-900 text-sm transition-all"
              />
              <button
                id="toggle_password_btn"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="admin_login_submit"
            type="submit"
            disabled={isLoggingIn}
            className={`w-full py-2.5 bg-gradient-to-r from-crimson-800 to-crimson-950 text-white rounded-lg font-bold text-sm shadow hover:shadow-lg transition-all flex items-center justify-center gap-2 ${
              isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isLoggingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                인증을 확인하는 중...
              </>
            ) : (
              <>
                로그인 및 대시보드 진입
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {configStatus && configStatus.isDefaultPassword && (
          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
              <ShieldAlert size={14} className="shrink-0" />
              <span>개발/체험용 기본 관리자 비밀번호 안내</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              현재 서버가 기본 비밀번호 환경으로 구성되어 있습니다. 아래 임시 패스코드를 복사하여 입력해 주십시오:
            </p>
            <div className="bg-white/80 px-2 py-1 border border-amber-200 rounded font-mono text-xs font-bold text-slate-700 select-all flex justify-between items-center mt-1">
              <span>admin123</span>
              <span className="text-[10px] text-slate-400 font-sans font-normal">(환경변수: ADMIN_PASSWORD)</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
