/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GraduationCap, ShieldCheck, FileText, Globe, Clock } from 'lucide-react';

interface HeaderProps {
  isAdminMode: boolean;
  onToggleMode: (admin: boolean) => void;
}

export default function Header({ isAdminMode, onToggleMode }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + ' (KST)');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm" id="main_portal_header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-crimson-800 text-white rounded-lg">
              <GraduationCap size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-crimson-900 tracking-tight block leading-none">
                고려대학교 창업경영대학원
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block mt-1">
                KOREA UNIVERSITY GRADUATE SCHOOL OF BUSINESS AND ENTREPRENEURSHIP
              </span>
            </div>
          </div>

          {/* Center Info Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-mono text-xs font-semibold">
            <Clock size={12} />
            <span>{currentTime}</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2" id="header_nav_controls">
            <button
              id="nav_to_student_btn"
              onClick={() => onToggleMode(false)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                !isAdminMode
                  ? 'bg-crimson-800 text-white shadow-md shadow-crimson-800/10'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <FileText size={14} />
              학생 면제신청
            </button>
            <button
              id="nav_to_admin_btn"
              onClick={() => onToggleMode(true)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                isAdminMode
                  ? 'bg-crimson-950 text-white shadow-md shadow-crimson-950/10'
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <ShieldCheck size={14} />
              행정팀 검토
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
