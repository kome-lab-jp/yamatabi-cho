'use strict';

const Template = {
  esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  nl2br(str) {
    return this.esc(str).replace(/\n/g, '<br>');
  },

  link(url, label) {
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) return this.esc(label || url);
    const safeUrl = this.esc(url);
    const safeLabel = this.esc(label || url);
    return `<a href="${safeUrl}" target="_blank" rel="noopener">${safeLabel}</a>`;
  },

  slug(plan) {
    const title = (plan.data.basic?.title || 'plan')
      .replace(/[^\w぀-ヿ一-鿿]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    const ts = Math.floor(Date.now() / 1000);
    return `${title}-${ts}`.toLowerCase();
  },

  _fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    const days = ['日','月','火','水','木','金','土'];
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${days[d.getDay()]})`;
  },

  _fmtDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    const days = ['日','月','火','水','木','金','土'];
    return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${days[d.getDay()]})`;
  },

  _fmtDatetime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const days = ['日','月','火','水','木','金','土'];
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${days[d.getDay()]}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  foldable(text) {
    if (!text) return '';
    const rendered = this.nl2br(text);
    if (text.length <= 100) return `<p>${rendered}</p>`;
    const preview = this.esc([...text.replace(/\n+/g, ' ')].slice(0, 60).join(''));
    return `<details class="fold-text"><summary>${preview}…</summary><p style="margin-top:6px;">${rendered}</p></details>`;
  },

  foldableList(text) {
    if (!text) return '';
    const items = text.split('\n').filter(l => l.trim());
    if (!items.length) return '';
    const listHtml = `<ul class="rule-list">${items.map(l => `<li>${this.esc(l.trim())}</li>`).join('')}</ul>`;
    if (items.length <= 5) return listHtml;
    const preview = this.esc(items[0]) + `（他${items.length - 1}項目）`;
    return `<details class="fold-text"><summary>${preview}</summary>${listHtml}</details>`;
  },

  costRows(calc, d) {
    const rows = [];
    if (calc.carCost)  rows.push(['車両消耗コスト', `¥${Calculator.format(calc.carCost)}`]);
    if (d.highway)     rows.push(['高速代（往復）', `¥${Calculator.format(Math.round(parseFloat(d.highway)||0))}`]);
    if (calc.fuelCost) rows.push(['燃料代', `¥${Calculator.format(calc.fuelCost)}`]);
    if (d.parking)     rows.push(['駐車場代', `¥${Calculator.format(Math.round(parseFloat(d.parking)||0))}`]);
    if (d.other)       rows.push(['その他', `¥${Calculator.format(Math.round(parseFloat(d.other)||0))}`]);
    return rows.map(([k,v]) => `
      <tr><td>${this.esc(k)}</td><td>${v}</td></tr>`).join('');
  },

  generate(plan, forPublish = false) {
    const d  = plan.data;
    const bi = d.basic    || {};
    const mv = d.move     || {};
    const fd = d.food     || {};
    const st = d.stay     || {};
    const on = d.onsen    || {};
    const gr = d.gourmet  || {};
    const co = d.cost     || {};
    const rg = d.reg      || {};
    const sf = d.safety   || {};

    const calc = Calculator.compute(co);
    const slug = forPublish ? this.slug(plan) : (plan.slug || 'preview');

    const siteUrl = (window.YAMATABI_SITE_URL || '').replace(/\/$/, '');
    const publicUrl = siteUrl ? `${siteUrl}/plans/${slug}.html` : `plans/${slug}.html`;

    const sections = [];

    // 基本情報
    if (bi.tripType || bi.purpose || bi.routeMemo || bi.yamapUrl) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-move">
            <span aria-hidden="true">🏔</span> 基本情報
          </div>
          <div class="section-card-body">
            ${bi.tripType   ? `<p><strong>種別：</strong>${this.esc(bi.tripType)}</p>` : ''}
            ${bi.purpose    ? `<p><strong>目的：</strong>${this.esc(bi.purpose)}</p>` : ''}
            ${bi.routeMemo  ? this.foldable(bi.routeMemo) : ''}
            ${bi.yamapUrl   ? `<p>登山コース・CT：${this.link(bi.yamapUrl, 'YAMAPで確認する')}</p>` : ''}
          </div>
        </div>`);
    }

    // 集合・移動
    if (mv.place || mv.destination || mv.datetime || mv.car || mv.note) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-move">
            <span aria-hidden="true">🚗</span> 集合・移動
          </div>
          <div class="section-card-body">
            ${mv.datetime    ? `<p><strong>集合日時：</strong>${this.esc(this._fmtDatetime(mv.datetime))}</p>` : ''}
            ${mv.place       ? `<p><strong>集合場所：</strong>${this.esc(mv.place)}</p>` : ''}
            ${mv.destination ? `<p><strong>行き先：</strong>${this.esc(mv.destination)}</p>` : ''}
            ${mv.car         ? `<p><span aria-hidden="true">🚘</span> ${this.esc(mv.car)}</p>` : ''}
            ${mv.note        ? this.foldable(mv.note) : ''}
          </div>
        </div>`);
    }

    // 食事計画
    const foodDays = fd.days || [];
    let foodHtml = '';
    if (foodDays.length > 0) {
      foodHtml = foodDays.filter(Boolean).map((memo, i) => {
        return `<div${i > 0 ? ' class="mt-12"' : ''}><p><strong>${i + 1}日目</strong></p>${this.foldable(memo)}</div>`;
      }).join('');
    } else {
      // backward compat with old format
      if (fd.day1lunch)     foodHtml += `<p><strong>1日目 昼：</strong>${this.esc(fd.day1lunch)}</p>`;
      if (fd.day1dinner)    foodHtml += `<p><strong>1日目 夜：</strong>${this.esc(fd.day1dinner)}</p>`;
      if (fd.shopName)      foodHtml += `<p><span aria-hidden="true">🛒</span> 食材調達：${fd.shopUrl ? this.link(fd.shopUrl, fd.shopName) : this.esc(fd.shopName)}</p>`;
      if (fd.day2breakfast) foodHtml += `<p><strong>2日目 朝：</strong>${this.esc(fd.day2breakfast)}</p>`;
      if (fd.day2lunch)     foodHtml += `<p><strong>2日目 昼：</strong>${this.esc(fd.day2lunch)}</p>`;
    }
    if (foodHtml.trim()) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-food">
            <span aria-hidden="true">🍳</span> 食事計画
          </div>
          <div class="section-card-body">
            ${foodHtml}
          </div>
        </div>`);
    }

    // 宿泊
    const stayDays = st.days || [];
    let stayHtml = '';
    if (stayDays.length > 0) {
      stayHtml = stayDays.map((day, i) => {
        if (!day?.name && !day?.note) return '';
        return `
          ${i > 0 ? '<hr style="border:none;border-top:1px solid var(--border);margin:12px 0;">' : ''}
          ${stayDays.length > 1 ? `<p><strong>${i + 1}泊目</strong></p>` : ''}
          ${day.name ? `<p><strong>${day.url ? this.link(day.url, day.name) : this.esc(day.name)}</strong></p>` : ''}
          ${day.note ? this.foldable(day.note) : ''}`;
      }).join('');
    } else {
      // backward compat
      if (st.name) stayHtml += `<p><strong>${st.url ? this.link(st.url, st.name) : this.esc(st.name)}</strong></p>`;
      if (st.note) stayHtml += this.foldable(st.note);
    }
    if (stayHtml.trim()) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-stay">
            <span aria-hidden="true">🏕</span> 宿泊
          </div>
          <div class="section-card-body">
            ${stayHtml}
          </div>
        </div>`);
    }

    // 下山後の温泉
    if (on.name || on.note) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-onsen">
            <span aria-hidden="true">♨️</span> 下山後の温泉
          </div>
          <div class="section-card-body">
            ${on.name   ? `<p><strong>${on.url ? this.link(on.url, on.name) : this.esc(on.name)}</strong></p>` : ''}
            ${on.fee    ? `<p><span aria-hidden="true">💴</span> 料金：${this.esc(on.fee)}</p>` : ''}
            ${on.access ? `<p><span aria-hidden="true">🚗</span> アクセス：${this.esc(on.access)}</p>` : ''}
            ${on.mapUrl ? `<p><span aria-hidden="true">📍</span> ${this.link(on.mapUrl, 'Google Mapで見る')}</p>` : ''}
            ${on.note   ? this.foldable(on.note) : ''}
          </div>
        </div>`);
    }

    // 下山後グルメ
    if (gr.name || gr.note) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-gourmet">
            <span aria-hidden="true">🍖</span> 下山後グルメ
          </div>
          <div class="section-card-body">
            ${gr.name   ? `<p><strong>${gr.url ? this.link(gr.url, gr.name) : this.esc(gr.name)}</strong></p>` : ''}
            ${gr.mapUrl ? `<p><span aria-hidden="true">📍</span> ${this.link(gr.mapUrl, 'Google Mapで見る')}</p>` : ''}
            ${gr.note   ? this.foldable(gr.note) : ''}
          </div>
        </div>`);
    }

    // 共通経費
    if (calc.total > 0 || co.members) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-cost">
            <span aria-hidden="true">💰</span> 共通経費（概算）
          </div>
          <div class="section-card-body">
            <table class="cost-table">
              ${this.costRows(calc, co)}
              <tr class="total-row">
                <td><strong>合計</strong></td>
                <td><strong>¥${Calculator.format(calc.total)}</strong></td>
              </tr>
            </table>
            <div class="cost-summary">
              <div>
                <div class="cost-total-label">参加人数</div>
                <div class="cost-total-value">${this.esc(co.members || '—')} 名</div>
              </div>
              <div style="text-align:right">
                <div class="cost-per-label">1人あたり負担</div>
                <div class="cost-per-value">¥${Calculator.format(calc.perPerson)}</div>
              </div>
            </div>
            ${co.payment ? `<p class="mt-12 text-sm"><span aria-hidden="true">💳</span> 精算方法：${this.esc(co.payment)}</p>` : ''}
          </div>
        </div>`);
    }

    // 登山届・保険
    if (rg.yamap || rg.insurance || rg.note) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-reg">
            <span aria-hidden="true">📝</span> 登山届・保険
          </div>
          <div class="section-card-body">
            ${rg.note      ? this.foldable(rg.note) : ''}
            ${rg.yamap     ? `<p><span aria-hidden="true">🔗</span> YAMAP登山届：${this.link(rg.yamap, 'YAMAPで確認')}</p>` : ''}
            ${rg.insurance ? `<p><span aria-hidden="true">🛡</span> 保険：</p>${this.foldable(rg.insurance)}` : ''}
          </div>
        </div>`);
    }

    // 安全ルール
    if (sf.initial || sf.response) {
      sections.push(`
        <div class="section-card">
          <div class="section-card-header accent-safety">
            <span aria-hidden="true">🐻</span> クマ遭遇時の対応ルール
          </div>
          <div class="section-card-body">
            ${sf.initial  ? `<p><strong>[初動]</strong></p>${this.foldableList(sf.initial)}` : ''}
            ${sf.response ? `<p class="mt-12"><strong>[対応]</strong></p>${this.foldableList(sf.response)}` : ''}
          </div>
        </div>`);
    }

    const title   = this.esc(bi.title || '登山計画書');
    const dateStr = bi.dateFrom
      ? (bi.dateTo && bi.dateTo !== bi.dateFrom
          ? `${this.esc(this._fmtDate(bi.dateFrom))}〜${this.esc(this._fmtDateShort(bi.dateTo))}`
          : this.esc(this._fmtDate(bi.dateFrom)))
      : '';

    return { html: this._wrap(title, dateStr, sections.join('\n'), slug), slug, publicUrl };
  },

  _wrap(title, dateStr, body, slug) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 山旅帖</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500&family=Noto+Serif+JP:wght@600&display=swap" rel="stylesheet">
<style>
:root{--forest:#1B4332;--forest2:#2D6A4F;--forest3:#40916C;--earth:#74512D;--sage:#52796F;--gold:#C9A84C;--cream:#F8F4EE;--card:#FFFFFF;--ink:#1A1A1A;--mist:#6B7B6B;--border:#E0D9CF;--red:#C0553A;}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:"Noto Sans JP","Hiragino Sans",sans-serif;background:var(--cream);color:var(--ink);font-size:15px;line-height:1.8;-webkit-font-smoothing:antialiased;}
a{color:var(--forest2);word-break:break-all;}
.app-header{background:var(--forest);color:#fff;padding:0 20px;height:48px;display:flex;align-items:center;justify-content:space-between;}
.logo{font-family:"Noto Serif JP",serif;font-size:16px;font-weight:600;letter-spacing:.05em;}
.subtitle{font-size:9px;letter-spacing:.18em;color:rgba(255,255,255,.5);display:block;margin-bottom:1px;}
.hero{background:var(--forest);padding:36px 24px 48px;text-align:center;position:relative;overflow:hidden;color:#fff;}
.hero svg{position:absolute;bottom:0;left:0;width:100%;opacity:.1;pointer-events:none;}
.hero-label{font-size:10px;letter-spacing:.2em;color:rgba(255,255,255,.5);margin-bottom:10px;}
.hero-title{font-size:28px;font-weight:500;line-height:1.4;margin-bottom:10px;}
.hero-date{font-size:20px;color:rgba(255,255,255,.75);}
.published-layout{max-width:800px;margin:0 auto;padding:28px 20px 48px;}
.section-card{background:var(--card);border-radius:12px;border:1px solid var(--border);overflow:hidden;margin-bottom:16px;}
.section-card-header{display:flex;align-items:center;gap:10px;padding:14px 20px;border-left:4px solid var(--forest2);font-size:15px;font-weight:500;color:var(--earth);}
.section-card-body{padding:16px 20px;font-size:15px;line-height:1.9;}
.section-card-body p{margin-bottom:6px;}
.section-card-body strong{font-weight:500;}
.accent-move{border-left-color:#2D6A4F;}.accent-food{border-left-color:#D4792A;}.accent-stay{border-left-color:#52796F;}.accent-onsen{border-left-color:#52796F;}.accent-gourmet{border-left-color:#A0522D;}.accent-cost{border-left-color:#C9A84C;}.accent-reg{border-left-color:#4A7BA0;}.accent-safety{border-left-color:#C0553A;}
.cost-table{width:100%;border-collapse:collapse;font-size:14px;}
.cost-table td{padding:6px 0;}
.cost-table td:last-child{text-align:right;font-weight:500;}
.cost-table .total-row td{border-top:1px solid var(--border);padding-top:10px;font-weight:500;}
.cost-summary{display:flex;justify-content:space-between;align-items:center;background:var(--cream);border-radius:8px;padding:14px 16px;margin-top:12px;}
.cost-per-label{font-size:12px;color:var(--mist);text-align:right;}
.cost-per-value{font-size:26px;font-weight:500;color:var(--forest2);}
.cost-total-label{font-size:12px;color:var(--mist);}
.cost-total-value{font-size:15px;font-weight:500;}
.rule-list{list-style:none;padding:0;}
.rule-list li{padding:6px 0 6px 8px;font-size:14px;border-bottom:1px solid #F5F0EA;}
.fold-text>summary{cursor:pointer;color:var(--forest2);list-style:none;padding:4px 0;font-size:14px;display:flex;align-items:baseline;gap:4px;}
.fold-text>summary::-webkit-details-marker{display:none;}
.fold-text>summary::after{content:"▼ 続きを読む";font-size:11px;white-space:nowrap;}
.fold-text[open]>summary::after{content:"▲ 閉じる";}
.fold-text[open]>summary{margin-bottom:6px;}
.mt-12{margin-top:12px;}.text-sm{font-size:13px;}
.app-footer{text-align:center;padding:24px;font-size:12px;color:var(--mist);border-top:1px solid var(--border);margin-top:24px;}
.ai-notice{max-width:800px;margin:0 auto;padding:0 16px 8px;font-size:11px;line-height:1.7;color:var(--mist);text-align:center;}
@media(max-width:768px){.hero-title{font-size:22px;}.cost-summary{flex-direction:column;gap:10px;align-items:flex-start;}.cost-per-label{text-align:left;}.published-layout{padding:16px 12px 40px;}}
</style>
</head>
<body>
<header class="app-header">
  <div>
    <span class="subtitle">YAMATABI-CHO</span>
    <span class="logo">山旅帖</span>
  </div>
</header>
<section class="hero">
  <svg viewBox="0 0 800 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polygon points="0,80 100,20 200,50 320,5 440,35 560,10 680,30 800,80" fill="white"/>
  </svg>
  <p class="hero-label">YAMATABI-CHO</p>
  <h1 class="hero-title">${title}</h1>
  ${dateStr ? `<p class="hero-date">${dateStr}</p>` : ''}
</section>
<main class="published-layout">
${body}
</main>
<footer class="app-footer">
  <p class="ai-notice">※ 本計画書の一部はAI（人工知能）を利用して作成しています。料金・営業時間・道路状況・施設の営業情報・クマの出没情報などは、実際と異なる場合があります。お出かけ前に必ず公式サイト等の最新情報をご確認ください。</p>
  山旅帖で作成
</footer>
</body>
</html>`;
  }
};
