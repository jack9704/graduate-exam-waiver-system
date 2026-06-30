/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StudentForm, { SubmissionSuccess } from './components/StudentForm';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import { Application } from './types';
import { GraduationCap, ShieldAlert, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

export default function App() {
  // Navigation Mode
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Administrative token
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('_admin_session_token');
  });

  // Successful submission receipt storage
  const [submittedApp, setSubmittedApp] = useState<Application | null>(null);

  // Monitor path changes if admin requested direct path (simulated routing)
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setIsAdminMode(true);
    }
  }, []);

  const handleToggleMode = (admin: boolean) => {
    setIsAdminMode(admin);
    // Push state so URL is updated cleanly to simulate full routing
    if (admin) {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('_admin_session_token', token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('_admin_session_token');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app_root_layout">
      {/* Universal Sticky Header */}
      <Header isAdminMode={isAdminMode} onToggleMode={handleToggleMode} />

      {/* Main Portal Body */}
      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {!isAdminMode ? (
          /* Student Portal */
          <div className="space-y-6">
            {!submittedApp ? (
              <StudentForm onSuccess={(app) => setSubmittedApp(app)} />
            ) : (
              <SubmissionSuccess 
                application={submittedApp} 
                onReset={() => setSubmittedApp(null)} 
              />
            )}
          </div>
        ) : (
          /* Administrator Review Dashboard Gate */
          <div className="space-y-6">
            {!adminToken ? (
              <AdminLogin onLoginSuccess={handleAdminLogin} />
            ) : (
              <AdminPanel token={adminToken} onLogout={handleAdminLogout} />
            )}
          </div>
        )}
      </main>

      {/* Footer Branding Section */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10" id="portal_footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex justify-center items-center gap-2">
            <div className="p-1 bg-slate-800 rounded text-crimson-300">
              <GraduationCap size={16} />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              KOREA UNIVERSITY GRADUATE SCHOOL SYSTEM
            </span>
          </div>
          <p className="text-[11px] leading-relaxed max-w-md mx-auto text-slate-500">
            본 웹 서비스는 대학원 종합시험 면제 원무 행정 업무 효율화를 위해 구축된 정식 정보 자산입니다. 비인가 사용자의 행정 시스템 도용이나 자료 왜곡 시 관계 학칙에 따라 제재를 받을 수 있습니다.
          </p>
          <div className="text-[10px] text-slate-600 font-mono pt-2 border-t border-slate-800/60 max-w-sm mx-auto">
            © 2026 한국대학교 대학원 교학처 정보화부. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
