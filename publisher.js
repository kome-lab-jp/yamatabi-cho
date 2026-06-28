'use strict';

const Publisher = {
  SITE_URL_KEY: 'yamatabi_site_url',

  getSiteUrl() {
    return localStorage.getItem(this.SITE_URL_KEY) || '';
  },

  setSiteUrl(url) {
    localStorage.setItem(this.SITE_URL_KEY, url.trim().replace(/\/$/, ''));
    window.YAMATABI_SITE_URL = url.trim().replace(/\/$/, '');
  },

  download(html, slug) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  },

  gitCommand(slug) {
    return `git add plans/ && git commit -m "山旅帖: 計画書を追加 (${slug})" && git push`;
  },

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  showPublishModal(plan, onConfirm) {
    const { html, slug, publicUrl } = Template.generate(plan, true);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pub-title">
        <h2 class="modal-title" id="pub-title">🚀 計画書を公開する</h2>
        <p style="font-size:14px;color:var(--mist);margin-bottom:16px;">
          以下の手順で計画書をインターネットに公開します。
        </p>

        <div style="background:var(--cream);border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <div style="font-size:12px;color:var(--mist);margin-bottom:4px;">公開後のURL（予定）</div>
          <div style="font-size:13px;word-break:break-all;color:var(--forest2);" id="pub-url">${Template.esc(publicUrl)}</div>
        </div>

        <ol style="font-size:14px;line-height:2;padding-left:20px;margin-bottom:16px;">
          <li>「HTMLをダウンロード」を押す</li>
          <li>ダウンロードした <code>${Template.esc(slug)}.html</code> をプロジェクトの <code>plans/</code> フォルダに移動する</li>
          <li>ターミナルを開き、<strong>プロジェクトフォルダに移動</strong>してから下のコマンドを実行する</li>
        </ol>

        <div style="font-size:12px;color:var(--mist);margin-bottom:4px;">⚠️ ターミナルでプロジェクトフォルダに移動してから実行してください：</div>
        <div class="code-block" style="margin-bottom:8px;">cd "/Users/kamimurakazunori/Project/Mountain Climbing Plan Creation Project"</div>

        <div style="font-size:12px;color:var(--mist);margin-bottom:4px;">その後、以下のコマンドを実行：</div>
        <div class="code-block" id="git-cmd">${Template.esc(Publisher.gitCommand(slug))}</div>
        <div style="display:flex;gap:8px;margin-bottom:16px;">
          <button class="copy-btn" id="copy-cmd-btn">📋 コマンドをコピー</button>
          <span id="copy-ok" style="font-size:12px;color:var(--forest2);display:none;align-items:center;">✓ コピーしました</span>
        </div>

        <p style="font-size:12px;color:var(--mist);">
          push後、Cloudflare Pagesが自動でデプロイします（約1〜2分）。
        </p>

        <div class="modal-actions">
          <button class="btn btn-outline" id="pub-cancel">キャンセル</button>
          <button class="btn btn-gold" id="pub-download">HTMLをダウンロード</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#pub-cancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#copy-cmd-btn').addEventListener('click', async () => {
      const ok = await Publisher.copyToClipboard(Publisher.gitCommand(slug));
      const okEl = overlay.querySelector('#copy-ok');
      okEl.style.display = ok ? 'inline-flex' : 'none';
      if (ok) setTimeout(() => { okEl.style.display = 'none'; }, 2500);
    });

    overlay.querySelector('#pub-download').addEventListener('click', () => {
      Publisher.download(html, slug);
      if (typeof onConfirm === 'function') onConfirm(slug, publicUrl);
    });
  }
};
