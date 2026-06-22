import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

const supabaseUrl = "https://vbgqcdosupkdlwopvgff.supabase.co";
const apiKey = "sb_publishable_2aIOg5iuieUKJlXSyN5B3A_IRXqaxGv";

// Function to check if reactions column exists in Supabase messages table
async function checkReactionsColumn(): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/messages?select=reactions&limit=1`, {
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return res.status === 200;
  } catch (error) {
    return false;
  }
}

// GET: Render the beautiful premium setup/migration page or show success
export async function GET(request: NextRequest) {
  const isUpToDate = await checkReactionsColumn();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HAKA Database Migration Tool</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        :root {
          --bg-dark: #0a0e17;
          --bg-card: rgba(18, 26, 47, 0.6);
          --accent-primary: #6366f1;
          --accent-secondary: #a855f7;
          --accent-success: #10b981;
          --text-main: #f3f4f6;
          --text-muted: #9ca3af;
          --border: rgba(255, 255, 255, 0.08);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg-dark) 70%);
          color: var(--text-main);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          overflow-x: hidden;
        }

        .container {
          width: 100%;
          max-width: 680px;
          position: relative;
        }

        /* Decorative glowing circles */
        .glow-1 {
          position: absolute;
          top: -100px;
          left: -100px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%);
          pointer-events: none;
          z-index: 0;
        }
        .glow-2 {
          position: absolute;
          bottom: -100px;
          right: -100px;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(0,0,0,0) 70%);
          pointer-events: none;
          z-index: 0;
        }

        .card {
          background: var(--bg-card);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          letter-spacing: -0.5px;
        }

        .title {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .subtitle {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0;
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-badge.warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .divider {
          height: 1px;
          background: var(--border);
          margin: 32px 0;
        }

        .section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }

        label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        input {
          width: 100%;
          background: rgba(10, 14, 23, 0.8);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px 16px;
          color: #ffffff;
          font-size: 15px;
          font-family: inherit;
          transition: all 0.2s;
        }

        input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        button {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        }

        button:active {
          transform: translateY(0);
        }

        button:disabled {
          background: var(--border);
          color: var(--text-muted);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .code-container {
          background: rgba(10, 14, 23, 0.8);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
          color: #38bdf8;
          text-align: left;
          position: relative;
          margin-bottom: 16px;
        }

        .copy-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          width: auto;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          box-shadow: none;
          transform: none;
        }

        .step-list {
          list-style: none;
          text-align: left;
        }

        .step-item {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          font-size: 14px;
          line-height: 1.5;
        }

        .step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary);
          border-radius: 50%;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }

        .step-content a {
          color: var(--accent-primary);
          text-decoration: none;
          font-weight: 600;
        }
        .step-content a:hover {
          text-decoration: underline;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: rgba(10, 14, 23, 0.95);
          border: 1px solid var(--border);
          color: #ffffff;
          padding: 12px 24px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .toast.show {
          transform: translateX(-50%) translateY(0);
        }

        .toast.success {
          border-left: 4px solid var(--accent-success);
        }

        .toast.error {
          border-left: 4px solid #ef4444;
        }

        .loading-spinner {
          border: 2px solid rgba(255,255,255,0.1);
          border-top: 2px solid #ffffff;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="glow-1"></div>
        <div class="glow-2"></div>
        
        <div class="card">
          <div class="header">
            <div class="logo">HAKA CHAT</div>
            <h1 class="title">Database Migration Tool</h1>
            <p class="subtitle">Ensuring message reactions are stored and persisted permanently in your Supabase database.</p>
            
            ${isUpToDate ? `
              <div class="status-badge success">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
                Database Up to Date
              </div>
            ` : `
              <div class="status-badge warning">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                Reactions Column Missing
              </div>
            `}
          </div>

          ${isUpToDate ? `
            <div style="text-align: center; color: var(--text-muted); font-size: 15px; line-height: 1.6; margin-top: 16px;">
              <p>🎉 Excellent! The <code>reactions</code> column is successfully configured and active in your database.</p>
              <p style="margin-top: 12px;">You can close this tab and return to the HAKA chat application. Your emoji reactions will now persist and be visible to everyone forever.</p>
              <div style="margin-top: 32px;">
                <button onclick="window.location.href='/chat'" style="max-width: 200px; margin: 0 auto;">Go to Chat</button>
              </div>
            </div>
          ` : `
            <div>
              <div class="section-title">
                <span>Option A: Run Automatically (Recommended)</span>
              </div>
              <p class="subtitle" style="margin-bottom: 20px;">Enter your Supabase database password to connect and execute the migration automatically.</p>
              
              <form id="migrationForm">
                <div class="form-group">
                  <label for="dbPassword">Supabase Database Password</label>
                  <input type="password" id="dbPassword" placeholder="Enter your project database password" required>
                </div>
                <button type="submit" id="submitBtn">
                  <span>Run Migration</span>
                </button>
              </form>

              <div class="divider"></div>

              <div class="section-title">
                <span>Option B: Manual Migration</span>
              </div>
              <p class="subtitle" style="margin-bottom: 16px;">Paste the SQL script manually into your Supabase project dashboard.</p>
              
              <div class="code-container">
                <button class="copy-btn" onclick="copySQL()">Copy SQL</button>
                <pre id="sqlCode">ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);</pre>
              </div>

              <ul class="step-list">
                <li class="step-item">
                  <div class="step-num">1</div>
                  <div class="step-content">Open the <a href="https://supabase.com/dashboard/project/vbgqcdosupkdlwopvgff/sql/new" target="_blank">Supabase SQL Editor</a>.</div>
                </li>
                <li class="step-item">
                  <div class="step-num">2</div>
                  <div class="step-content">Paste the copied SQL code into the editor area.</div>
                </li>
                <li class="step-item">
                  <div class="step-num">3</div>
                  <div class="step-content">Click the <strong>Run</strong> button at the bottom right.</div>
                </li>
                <li class="step-item">
                  <div class="step-num">4</div>
                  <div class="step-content">Refresh this page to verify success!</div>
                </li>
              </ul>
            </div>
          `}
        </div>
      </div>

      <div id="toast" class="toast"></div>

      <script>
        function showToast(message, type = 'success') {
          const toast = document.getElementById('toast');
          toast.textContent = message;
          toast.className = 'toast show ' + type;
          setTimeout(() => {
            toast.className = 'toast';
          }, 4000);
        }

        function copySQL() {
          const code = document.getElementById('sqlCode').innerText;
          navigator.clipboard.writeText(code);
          showToast('SQL copied to clipboard!', 'success');
        }

        const form = document.getElementById('migrationForm');
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('dbPassword').value;
            const submitBtn = document.getElementById('submitBtn');
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span><span>Migrating...</span>';

            try {
              const response = await fetch(window.location.pathname, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
              });
              
              const result = await response.json();
              if (result.success) {
                showToast('✅ Migration successful! Refreshing page...', 'success');
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              } else {
                showToast('❌ ' + result.message, 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Run Migration</span>';
              }
            } catch (err) {
              showToast('❌ Failed to connect to local server.', 'error');
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<span>Run Migration</span>';
            }
          });
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

// POST: Run the PostgreSQL migration with the provided password
export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password) {
      return NextResponse.json({ success: false, message: 'Password is required' });
    }

    // 1. Ensure pg is installed
    try {
      await import('pg');
    } catch (err) {
      console.log('[Migrate API] Dynamic pg install triggered from client...');
      await execAsync('npm install pg');
    }

    // 2. Dynamic import
    const { Client } = await import('pg');

    // 3. Connect to database using provided password
    const connectionString = `postgresql://postgres.vbgqcdosupkdlwopvgff:${encodeURIComponent(password)}@db.vbgqcdosupkdlwopvgff.supabase.co:5432/postgres`;
    const client = new Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();

    // 4. Run database queries
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin(reactions);
    `);

    await client.end();

    return NextResponse.json({
      success: true,
      message: 'Migration applied successfully.'
    });
  } catch (error: any) {
    console.error('[Migrate API] POST migration error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Database connection failed'
    });
  }
}
