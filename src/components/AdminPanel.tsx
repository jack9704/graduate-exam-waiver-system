/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, RefreshCw, CheckCircle2, XCircle, Clock, Trash2, 
  Mail, Download, ShieldCheck, Filter, Inbox, Eye, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Application, Status, EmailLog, AdminStats } from '../types';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [activeTab, setActiveTab] = useState<'applications' | 'emails'>('applications');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [majorFilter, setMajorFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'gpa-desc' | 'gpa-asc'>('date-desc');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingId, setIsUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected email for viewing details
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  // Stats
  const [stats, setStats] = useState<AdminStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch applications
      const appRes = await fetch('/api/applications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!appRes.ok) throw new Error('신청 내역을 가져오는데 실패했습니다.');
      const apps: Application[] = await appRes.json();
      setApplications(apps);

      // Fetch stats
      const statsRes = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch email logs
      const emailRes = await fetch('/api/email-logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (emailRes.ok) {
        const emails: EmailLog[] = await emailRes.json();
        setEmailLogs(emails);
      }

    } catch (err: any) {
      setError(err.message || '데이터를 가져오는 도중 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle status update
  const handleUpdateStatus = async (id: number, newStatus: Status) => {
    setIsUpdatingId(id);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '상태 업데이트 중 오류 발생');
      }

      const updatedApp: Application = await res.json();

      // Show success notification
      const koreanStatus = newStatus === Status.APPROVED ? '승인' : '반려';
      setSuccessMessage(`[${updatedApp.name}] 학생의 신청서가 성공적으로 [${koreanStatus}] 처리되었습니다.`);
      
      // Refresh local list
      await fetchData();

      // Clear success notification after 4s
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || '상태를 변경하지 못했습니다.');
    } finally {
      setIsUpdatingId(null);
    }
  };

  // Handle delete application
  const handleDeleteApplication = async (id: number, studentName: string) => {
    if (!window.confirm(`[${studentName}] 학생의 신청 내역을 영구히 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('삭제 처리 중 오류가 발생했습니다.');
      }

      setSuccessMessage(`[${studentName}] 학생의 신청 내역을 삭제했습니다.`);
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  // Get distinct majors for filter dropdown
  const distinctMajors: string[] = Array.from(new Set(applications.map(app => app.major)));

  // Filtered and Sorted Applications
  const filteredApplications = applications
    .filter(app => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const matchSearch = 
        app.name.toLowerCase().includes(query) || 
        app.studentId.includes(query) ||
        app.studentEmail.toLowerCase().includes(query);

      // Status
      const matchStatus = statusFilter === 'all' || app.status === statusFilter;

      // Major
      const matchMajor = majorFilter === 'all' || app.major === majorFilter;

      return matchSearch && matchStatus && matchMajor;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'gpa-desc') {
        return b.gpa - a.gpa;
      } else if (sortBy === 'gpa-asc') {
        return a.gpa - b.gpa;
      }
      return 0;
    });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredApplications.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    // CSV header
    const headers = ['ID', '신청일자', '성명', '학번', '전공', '등록횟수(회)', '취득학점', '평균평점', '이메일', '심사상태'];
    
    // CSV rows
    const rows = filteredApplications.map(app => [
      app.id,
      new Date(app.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      `"${app.name.replace(/"/g, '""')}"`,
      `'${app.studentId}`, // Add single quote to prevent Excel string formatting issues
      `"${app.major.replace(/"/g, '""')}"`,
      app.registrationCount,
      app.acquiredCredits,
      app.gpa,
      app.studentEmail,
      app.status
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `대학원_면제신청_검토목록_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" id="admin_panel_root">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-crimson-50 text-crimson-800 rounded-lg shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
              종합시험 면제 관리 대시보드
            </h1>
            <p className="text-xs text-slate-400">
              행정팀 심사 승인 및 학생 안내 메일 전송 통합 관리 시스템
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            id="refresh_data_btn"
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all"
            title="새로고침"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            id="export_csv_btn"
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Download size={14} />
            명단 다운로드 (CSV)
          </button>
          <button
            id="admin_logout_btn"
            onClick={onLogout}
            className="px-4 py-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-lg transition-all"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="admin_metrics_grid">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 접수 원서</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-slate-800">{stats.total}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">전체</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">검토 대기중</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-amber-600">{stats.pending}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full flex items-center gap-1">
              <Clock size={10} /> 대기
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">최종 승인됨</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-emerald-600">{stats.approved}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">승인</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">심사 반려됨</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl md:text-3xl font-black text-red-600">{stats.rejected}</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-600 rounded-full">반려</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200" id="admin_navigation_tabs">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'applications'
              ? 'border-crimson-800 text-crimson-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ShieldCheck size={16} />
          면제 신청서 검토 ({filteredApplications.length}건)
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-5 py-3 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'emails'
              ? 'border-crimson-800 text-crimson-800'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Mail size={16} />
          자동 발송 메일 로그 ({emailLogs.length}건)
        </button>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
          <XCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 font-medium flex items-center gap-2"
        >
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {/* Main Tab Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {activeTab === 'applications' ? (
          <div>
            {/* Search & Filter Controls */}
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="학생 성명, 학번, 이메일 검색"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-crimson-800"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">상태</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-crimson-800"
                  >
                    <option value="all">전체 상태</option>
                    <option value={Status.PENDING}>대기 (PENDING)</option>
                    <option value={Status.APPROVED}>승인 (APPROVED)</option>
                    <option value={Status.REJECTED}>반려 (REJECTED)</option>
                  </select>
                </div>

                {/* Major Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">전공</span>
                  <select
                    value={majorFilter}
                    onChange={(e) => setMajorFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 max-w-[180px] focus:outline-none focus:ring-2 focus:ring-crimson-800"
                  >
                    <option value="all">전체 전공</option>
                    {distinctMajors.map(m => (
                      <option key={m} value={m}>{m.split(' (')[0]}</option>
                    ))}
                  </select>
                </div>

                {/* Sorting */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">정렬</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-crimson-800"
                  >
                    <option value="date-desc">최신 신청순</option>
                    <option value="date-asc">오래된 신청순</option>
                    <option value="gpa-desc">GPA 높은순</option>
                    <option value="gpa-asc">GPA 낮은순</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Application Data Grid Table */}
            {isLoading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw size={32} className="animate-spin text-crimson-800 mx-auto" />
                <p className="text-slate-400 text-xs">서버에서 면제 신청 데이터를 불러오는 중...</p>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Inbox size={40} className="text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm font-semibold">검색 조건에 일치하는 신청 내역이 없습니다.</p>
                <p className="text-slate-400 text-xs">학생 신청서가 제출되면 실시간으로 이곳에 표시됩니다.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="admin_applications_table">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 text-center w-12">번호</th>
                      <th className="p-4">신청 정보</th>
                      <th className="p-4">학적 정보</th>
                      <th className="p-4 text-center">GPA</th>
                      <th className="p-4">서약</th>
                      <th className="p-4 text-center">심사 상태</th>
                      <th className="p-4 text-right">관리 처리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredApplications.map((app, index) => {
                      const dateStr = new Date(app.createdAt).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Row Index */}
                          <td className="p-4 text-center text-xs text-slate-400 font-mono">
                            {filteredApplications.length - index}
                          </td>

                          {/* Student Info */}
                          <td className="p-4 space-y-1">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {app.name}
                              <span className="text-xs font-normal text-slate-400 font-mono">({app.studentId})</span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono break-all max-w-[200px] truncate" title={app.studentEmail}>
                              {app.studentEmail}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              제출: {dateStr}
                            </div>
                          </td>

                          {/* Academic Details */}
                          <td className="p-4 space-y-1">
                            <div className="font-medium text-slate-700 text-xs truncate max-w-[180px]" title={app.major}>
                              {app.major}
                            </div>
                            <div className="text-xs text-slate-500">
                              등록 {app.registrationCount}회 · 취득 {app.acquiredCredits}학점
                            </div>
                          </td>

                          {/* GPA with threshold badge */}
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                              app.gpa >= 3.5 
                                ? 'bg-crimson-50 text-crimson-800 border border-crimson-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {app.gpa.toFixed(2)}
                            </span>
                            <div className="text-[9px] text-slate-400 mt-0.5">/ 4.50</div>
                          </td>

                          {/* Signature Consent Sign */}
                          <td className="p-4 text-xs">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold">
                              서명동의
                            </span>
                          </td>

                          {/* Verification Status */}
                          <td className="p-4 text-center">
                            {app.status === Status.PENDING && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold">
                                <Clock size={12} className="animate-spin" />
                                대기
                              </span>
                            )}
                            {app.status === Status.APPROVED && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold animate-pulse">
                                <CheckCircle2 size={12} />
                                승인됨
                              </span>
                            )}
                            {app.status === Status.REJECTED && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold">
                                <XCircle size={12} />
                                반려됨
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {app.status === Status.PENDING ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, Status.APPROVED)}
                                    disabled={isUpdatingId !== null}
                                    className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1"
                                    title="면제 승인"
                                  >
                                    승인
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(app.id, Status.REJECTED)}
                                    disabled={isUpdatingId !== null}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-sm transition-all"
                                    title="반려 처리"
                                  >
                                    반려
                                  </button>
                                </>
                              ) : (
                                <div className="relative group inline-block">
                                  <button 
                                    className="px-2.5 py-1.5 border border-slate-200 text-slate-500 rounded text-xs font-bold flex items-center gap-1 group-hover:bg-slate-50 transition-all"
                                  >
                                    상태 변경 <ChevronDown size={10} />
                                  </button>
                                  <div className="hidden group-hover:block absolute right-0 mt-1 w-24 bg-white border border-slate-200 shadow-xl rounded-lg z-20 py-1 text-left">
                                    <button
                                      onClick={() => handleUpdateStatus(app.id, Status.PENDING)}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-amber-600 text-xs font-bold block"
                                    >
                                      대기 복원
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(app.id, Status.APPROVED)}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-emerald-600 text-xs font-bold block"
                                    >
                                      승인 변경
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(app.id, Status.REJECTED)}
                                      className="w-full px-3 py-1.5 hover:bg-slate-50 text-red-600 text-xs font-bold block"
                                    >
                                      반려 변경
                                    </button>
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleDeleteApplication(app.id, app.name)}
                                className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                title="신청 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Email Logs View */
          <div className="p-5 space-y-6">
            <div className="p-4 bg-crimson-50/50 border border-crimson-100 rounded-xl text-xs md:text-sm text-crimson-800 leading-relaxed">
              💡 <strong>Nodemailer SMTP 자동 안내 발송 현황 관리</strong><br/>
              <p className="text-xs text-crimson-600 mt-1">
                서버가 실시간으로 신청자에게 보낸 이메일 발송 로그입니다. SMTP 계정이 입력되지 않은 경우 가상 메일 발송 기록이 여기에 기록되어 실제 메일 발송과 동일하게 전송 결과를 시뮬레이션할 수 있습니다.
              </p>
            </div>

            {emailLogs.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <Mail size={40} className="text-slate-300 mx-auto" />
                <p className="text-slate-500 text-sm font-semibold">발송된 메일 기록이 존재하지 않습니다.</p>
                <p className="text-slate-400 text-xs">종합시험 면제 신청서 제출이나 상태 변경 시 자동으로 발송 및 로깅됩니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Email list */}
                <div className="lg:col-span-5 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {emailLogs.map((log) => {
                    const isSelected = selectedEmail?.id === log.id;
                    const dateStr = new Date(log.timestamp).toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <button
                        key={log.id}
                        onClick={() => setSelectedEmail(log)}
                        className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 focus:outline-none ${
                          isSelected ? 'bg-crimson-50/50 border-r-4 border-crimson-800' : 'hover:bg-slate-50/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider">
                            TO: {log.to.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{dateStr}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{log.subject}</h4>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-slate-500 font-mono break-all">{log.to}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            log.sent ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {log.sent ? '발송완료' : '실패'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Email Body Details Panel */}
                <div className="lg:col-span-7 border border-slate-200 rounded-xl p-5 bg-slate-50/30 min-h-[400px] flex flex-col justify-between">
                  {selectedEmail ? (
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="space-y-2 pb-3 border-b border-slate-200">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                          <span>LOG ID: {selectedEmail.id}</span>
                          <span>{new Date(selectedEmail.timestamp).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
                        </div>
                        <h3 className="text-base font-black text-slate-800">{selectedEmail.subject}</h3>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs">
                          <div>
                            <span className="font-bold text-slate-500">수신처: </span>
                            <span className="text-slate-800 font-mono select-all">{selectedEmail.to}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-500">상태: </span>
                            <span className={`font-bold ${selectedEmail.sent ? 'text-emerald-600' : 'text-red-600'}`}>
                              {selectedEmail.sent ? '정상 발송 성공 (Simulated/SMTP)' : '발송 실패'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Web View Simulator */}
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 overflow-y-auto max-h-[350px] shadow-inner text-slate-800">
                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                      </div>
                    </div>
                  ) : (
                    <div className="m-auto text-center space-y-2">
                      <Eye size={36} className="text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-slate-500">선택된 메일 로그가 없습니다.</p>
                      <p className="text-xs text-slate-400">좌측 목록에서 메일을 클릭하면 전송된 HTML 본문 템플릿을 미리볼 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
