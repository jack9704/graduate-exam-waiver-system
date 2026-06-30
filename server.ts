/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { Status, Application, EmailLog } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Database Directory & File
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

if (!existsSync(DB_PATH)) {
  writeFileSync(
    DB_PATH,
    JSON.stringify({ applications: [], emailLogs: [] }, null, 2),
    'utf-8'
  );
}

// Whitelist Configuration
const WHITELIST_PATH = path.join(DATA_DIR, 'whitelist.json');
interface Whitelist {
  emailDomains: string[];
  studentIds: string[];
}

let whitelist: Whitelist = { emailDomains: [], studentIds: [] };

function loadWhitelist(): void {
  try {
    if (existsSync(WHITELIST_PATH)) {
      const raw = readFileSync(WHITELIST_PATH, 'utf-8');
      whitelist = JSON.parse(raw);
      console.log(`[WHITELIST] 화이트리스트 파일 로드 완료: ${whitelist.emailDomains.length}개 도메인, ${whitelist.studentIds.length}개 학번`);
    } else {
      console.log('[WHITELIST] 화이트리스트 파일이 없습니다. data/whitelist.json 을 생성하세요.');
    }
  } catch (error) {
    console.error('[WHITELIST] 화이트리스트 로드 중 오류:', error);
  }
}

loadWhitelist();

// Database Helpers
async function readDb(): Promise<{ applications: Application[]; emailLogs: EmailLog[] }> {
  try {
    const content = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading database file:', error);
    return { applications: [], emailLogs: [] };
  }
}

async function writeDb(data: { applications: Application[]; emailLogs: EmailLog[] }): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// SMTP Email Configuration
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@university.edu';

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    console.log('Nodemailer SMTP Transporter configured.');
  } catch (err) {
    console.error('Failed to configure SMTP Transporter:', err);
  }
} else {
  console.log('No SMTP configuration found. Emails will be logged locally to data/db.json');
}

// Helper: Send and Log Email
async function sendNotificationEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  const db = await readDb();
  const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const textContent = htmlContent.replace(/<[^>]*>/g, '\n').replace(/\n\s*\n/g, '\n');

  let sent = false;
  let errorMsg: string | undefined;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html: htmlContent,
        text: textContent,
      });
      sent = true;
    } catch (err: any) {
      console.error('Failed to send real SMTP email:', err);
      errorMsg = err?.message || String(err);
    }
  } else {
    // Simulated sending
    sent = true;
  }

  const newLog: EmailLog = {
    id: logId,
    to,
    subject,
    body: htmlContent,
    timestamp: new Date().toISOString(),
    sent,
    error: errorMsg,
  };

  db.emailLogs.unshift(newLog);
  await writeDb(db);
  return sent;
}

// Authentication Middleware (Simple Admin Token / Password Check)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }

  const password = authHeader.replace('Bearer ', '');
  if (password !== ADMIN_PASSWORD) {
    res.status(403).json({ error: '비밀번호가 올바르지 않습니다.' });
    return;
  }

  next();
}

// API Routes

// Admin Login Route
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    return;
  }

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: password });
  } else {
    res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
  }
});

// Admin Checks: Verify if configuration has default password
app.get('/api/admin/config-status', (req, res) => {
  res.json({
    isDefaultPassword: ADMIN_PASSWORD === 'admin123',
    hasRealSmtp: transporter !== null,
  });
});

// Submit Application (Public)
app.post('/api/applications', async (req, res) => {
  try {
    const { major, name, studentId, registrationCount, acquiredCredits, gpa, isSigned, studentEmail } = req.body;

    // Validation
    if (!major || !name || !studentId || !studentEmail) {
      res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
      return;
    }

    if (registrationCount === undefined || acquiredCredits === undefined || gpa === undefined) {
      res.status(400).json({ error: '성적 및 등록정보가 누락되었습니다.' });
      return;
    }

    if (!isSigned) {
      res.status(400).json({ error: '서명 대체 서약 동의가 필요합니다.' });
      return;
    }

    if (gpa < 0 || gpa > 4.5) {
      res.status(400).json({ error: '평균평점은 0.00에서 4.50 사이여야 합니다.' });
      return;
    }

    const db = await readDb();

    // Check for duplicate submission
    const duplicate = db.applications.find(app => app.studentId === studentId);
    if (duplicate) {
      res.status(409).json({ error: '이미 해당 학번으로 접수된 신청서가 존재합니다.' });
      return;
    }

    const newApp: Application = {
      id: Date.now(),
      major,
      name,
      studentId,
      registrationCount: Number(registrationCount),
      acquiredCredits: Number(acquiredCredits),
      gpa: Number(gpa),
      isSigned: !!isSigned,
      studentEmail,
      status: Status.PENDING,
      createdAt: new Date().toISOString(),
    };

    db.applications.unshift(newApp);
    await writeDb(db);

    // Send confirmation email
    const subject = `[대학원 행정팀] 종합시험 면제 신청 접수 완료 안내`;
    const formattedDate = new Date(newApp.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const emailHtml = `
      <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #A1001D; border-bottom: 2px solid #C92A49; padding-bottom: 10px;">대학원 종합시험 면제 신청 접수 완료</h2>
        <p>안녕하세요, <strong>${name}</strong> 학생님.</p>
        <p>대학원 행정팀입니다. 귀하께서 제출하신 <strong>종합시험 면제 신청서</strong>가 정상적으로 접수되었습니다.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">■ 접수 및 신청 정보</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #4b5563; width: 120px;"><strong>성명</strong></td>
              <td style="padding: 6px 0; color: #111827;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>학번</strong></td>
              <td style="padding: 6px 0; color: #111827;">${studentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>전공</strong></td>
              <td style="padding: 6px 0; color: #111827;">${major}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>기 등록횟수</strong></td>
              <td style="padding: 6px 0; color: #111827;">${registrationCount}회</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>기 취득학점</strong></td>
              <td style="padding: 6px 0; color: #111827;">${acquiredCredits}학점</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>평균평점</strong></td>
              <td style="padding: 6px 0; color: #111827;">${gpa} / 4.50</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>접수일시</strong></td>
              <td style="padding: 6px 0; color: #111827;">${formattedDate} (KST)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #4b5563;"><strong>심사 상태</strong></td>
              <td style="padding: 6px 0; color: ${newApp.status === Status.APPROVED ? '#16a34a' : '#d97706'}; font-weight: bold;">${newApp.status === Status.APPROVED ? '승인 완료 (APPROVED)' : '대기 (PENDING)'}</td>
            </tr>
          </table>
        </div>
        
        ${newApp.status === Status.APPROVED 
          ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; color: #16a34a; font-weight: bold; font-size: 1em;">귀하의 신청이 화이트리스트 자동 승인 처리되었습니다.</p>
              <p style="margin: 8px 0 0 0; color: #4b5563; font-size: 0.9em;">별도의 검토 없이 최종 승인되었으니, 학업에 차질 없으시기 바랍니다.</p>
            </div>`
          : `<p style="color: #4b5563; font-size: 0.95em; line-height: 1.6;">
              대학원 행정팀에서 학적부 세부 요건 대조 검토 후 최종 승인을 진행할 예정입니다.<br/>
              승인 처리가 완료되면 기재하신 이메일로 검토 완료 메일이 추가 발송됩니다.
            </p>`
        }
        <p style="color: #9ca3af; font-size: 0.85em; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
          본 메일은 발송전용 메일이므로 회신되지 않습니다. 문의 사항은 대학원 행정팀으로 연락 바랍니다.
        </p>
      </div>
    `;

    await sendNotificationEmail(studentEmail, subject, emailHtml);

    res.status(201).json(newApp);
  } catch (error: any) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: '서버 오류로 인해 신청서를 제출하지 못했습니다.' });
  }
});

// Get Applications List (Admin Only)
app.get('/api/applications', authenticateAdmin, async (req, res) => {
  try {
    const db = await readDb();
    res.json(db.applications);
  } catch (error) {
    res.status(500).json({ error: '데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});

// Update Application Status (Admin Only)
app.patch('/api/applications/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status || !Object.values(Status).includes(status)) {
      res.status(400).json({ error: '올바르지 않은 상태값입니다.' });
      return;
    }

    const db = await readDb();
    const appIndex = db.applications.findIndex(item => item.id === id);

    if (appIndex === -1) {
      res.status(404).json({ error: '해당 신청서를 찾을 수 없습니다.' });
      return;
    }

    const targetApp = db.applications[appIndex];
    const prevStatus = targetApp.status;
    targetApp.status = status;

    await writeDb(db);

    // If status changed to APPROVED or REJECTED, send outcome email
    if (prevStatus !== status) {
      const statusKorean = status === Status.APPROVED ? '승인 (APPROVED)' : '반려 (REJECTED)';
      const statusColor = status === Status.APPROVED ? '#16a34a' : '#dc2626';
      const statusMessage = status === Status.APPROVED 
        ? '축하합니다! 귀하의 대학원 종합시험 면제 신청서가 검토 결과 <strong>승인</strong>되었습니다.'
        : '안타깝게도 귀하의 대학원 종합시험 면제 신청서가 학적 검토 요건 미달로 <strong>반려</strong>되었습니다. 상세 사유는 대학원 행정팀에 문의하시기 바랍니다.';

      const subject = `[대학원 행정팀] 종합시험 면제 신청 결과 안내 (${statusKorean})`;
      const emailHtml = `
        <div style="font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #A1001D; border-bottom: 2px solid #C92A49; padding-bottom: 10px;">대학원 종합시험 면제 신청 심사 완료</h2>
          <p>안녕하세요, <strong>${targetApp.name}</strong> 학생님.</p>
          <p>대학원 행정팀입니다. 귀하께서 제출하신 종합시험 면제 신청서의 최종 심사 결과를 알려드립니다.</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 1.1em; color: ${statusColor}; font-weight: bold;">심사 결과: ${statusKorean}</p>
            <p style="margin: 10px 0 0 0; color: #4b5563; font-size: 0.95em; line-height: 1.5;">
              ${statusMessage}
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">■ 신청서 요약 정보</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; color: #4b5563; width: 120px;"><strong>성명</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.name}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;"><strong>학번</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.studentId}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;"><strong>전공</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.major}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;"><strong>기 등록횟수</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.registrationCount}회</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;"><strong>기 취득학점</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.acquiredCredits}학점</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #4b5563;"><strong>평균평점</strong></td>
                <td style="padding: 4px 0; color: #111827;">${targetApp.gpa} / 4.50</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #9ca3af; font-size: 0.85em; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
            본 메일은 발송전용 메일이므로 회신되지 않습니다. 문의 사항은 대학원 행정팀으로 연락 바랍니다.
          </p>
        </div>
      `;

      await sendNotificationEmail(targetApp.studentEmail, subject, emailHtml);
    }

    res.json(targetApp);
  } catch (error) {
    res.status(500).json({ error: '상태 변경 중 오류가 발생했습니다.' });
  }
});

// Delete Application (Admin Only)
app.delete('/api/applications/:id', authenticateAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const db = await readDb();
    const beforeCount = db.applications.length;
    db.applications = db.applications.filter(item => item.id !== id);

    if (db.applications.length === beforeCount) {
      res.status(404).json({ error: '해당 신청서를 찾을 수 없습니다.' });
      return;
    }

    await writeDb(db);
    res.json({ success: true, message: '성공적으로 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

// Get Email Logs (Admin Only)
app.get('/api/email-logs', authenticateAdmin, async (req, res) => {
  try {
    const db = await readDb();
    res.json(db.emailLogs);
  } catch (error) {
    res.status(500).json({ error: '메일 로그를 가져오는 중 오류가 발생했습니다.' });
  }
});

// Admin Stats Endpoint (Admin Only)
app.get('/api/stats', authenticateAdmin, async (req, res) => {
  try {
    const db = await readDb();
    const stats = db.applications.reduce(
      (acc, app) => {
        acc.total++;
        if (app.status === Status.PENDING) acc.pending++;
        else if (app.status === Status.APPROVED) acc.approved++;
        else if (app.status === Status.REJECTED) acc.rejected++;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '통계 산출 중 오류가 발생했습니다.' });
  }
});

// Vite & Static assets integration helper function
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Vercel serverless export
export default app;

// Run as standalone when not on Vercel
if (process.env.VERCEL !== '1') {
  startServer();
}
