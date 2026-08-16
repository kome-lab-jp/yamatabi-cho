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

  // クリップボードへコピーする。
  // navigator.clipboard は localhost/https でのみ使えるため、
  // 使えない環境では非表示のtextarea経由の旧方式にフォールバックする。
  async copyToClipboard(text) {
    const value = String(text ?? '');
    if (!value) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch { /* フォールバックへ */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  },

  async publish(slug, html) {
    let res;
    try {
      res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, html }),
      });
    } catch {
      return { ok: false, error: 'サーバーに接続できません。「山旅帖を起動.command」からアプリを起動し直してください。' };
    }
    try {
      return await res.json();
    } catch {
      return { ok: false, error: `サーバーエラー（${res.status}）` };
    }
  },

  showPublishModal(plan, onConfirm) {
    const { html, slug, publicUrl } = Template.generate(plan, true);
    // 既に公開済みの計画は同じURLを上書き更新する（新しいURLは作らない）
    const isUpdate = Boolean(plan.slug || Template._slugFromPublicUrl(plan.publicUrl));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="pub-title">
        <h2 class="modal-title" id="pub-title">🚀 計画書を${isUpdate ? '更新' : '公開'}する</h2>
        <p style="font-size:14px;color:var(--mist);margin-bottom:16px;">
          ${isUpdate
            ? '「更新する」を押すと、<strong>これまでと同じURLの内容を上書き</strong>し、Gitへの反映（コミット＆プッシュ）まで自動で行います。共有済みのURLはそのまま使えます。'
            : '「公開する」を押すと、計画書HTMLの保存とGitへの反映（コミット＆プッシュ）まで自動で行います。'}
        </p>

        <div style="background:var(--cream);border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <div style="font-size:12px;color:var(--mist);margin-bottom:4px;">${isUpdate ? '更新するURL' : '公開後のURL（予定）'}</div>
          <div style="font-size:13px;word-break:break-all;color:var(--forest2);" id="pub-url">${Template.esc(publicUrl)}</div>
        </div>

        <p style="font-size:12px;color:var(--mist);margin-bottom:16px;">
          push後、Cloudflare Pagesが自動でデプロイします（約1〜2分）。
        </p>

        <div id="pub-status" style="font-size:13px;margin-bottom:16px;display:none;"></div>

        <div class="modal-actions">
          <button class="btn btn-outline" id="pub-cancel">キャンセル</button>
          <button class="btn btn-gold" id="pub-run">🚀 ${isUpdate ? '更新する' : '公開する'}</button>
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

    const runBtn = overlay.querySelector('#pub-run');
    const statusEl = overlay.querySelector('#pub-status');

    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      statusEl.style.display = 'block';
      statusEl.style.color = 'var(--mist)';
      statusEl.textContent = `⏳ ${isUpdate ? '更新' : '公開'}中…（保存 → git add / commit / push）`;

      const result = await Publisher.publish(slug, html);

      if (result.ok) {
        statusEl.style.color = 'var(--forest2)';
        statusEl.innerHTML = `✓ ${isUpdate ? '更新' : '公開'}しました。1〜2分後に <a href="${Template.esc(publicUrl)}" target="_blank" rel="noopener">${Template.esc(publicUrl)}</a> で確認できます。`;
        overlay.querySelector('#pub-cancel').textContent = '閉じる';
        runBtn.style.display = 'none';
        if (typeof onConfirm === 'function') onConfirm(slug, publicUrl);
      } else {
        statusEl.style.color = '#c0392b';
        statusEl.textContent = `⚠️ ${isUpdate ? '更新' : '公開'}に失敗しました: ${result.error || '不明なエラー'}`;
        runBtn.disabled = false;
      }
    });
  }
};
