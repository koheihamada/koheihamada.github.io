(function () {
  'use strict';
  var C = window.LP_CONFIG || {};

  // ---------- 計測 ----------
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  // UTM・流入元をセッション内で保持し、フォームと一緒に送る
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
  var attribution = {};
  try {
    var saved = JSON.parse(sessionStorage.getItem('lp_attr') || '{}');
    var qs = new URLSearchParams(location.search);
    UTM_KEYS.forEach(function (k) { attribution[k] = qs.get(k) || saved[k] || ''; });
    attribution.landing_page = saved.landing_page || location.href;
    attribution.referrer = saved.referrer || document.referrer || '';
    sessionStorage.setItem('lp_attr', JSON.stringify(attribution));
  } catch (e) {
    UTM_KEYS.forEach(function (k) { attribution[k] = ''; });
    attribution.landing_page = location.href;
    attribution.referrer = document.referrer || '';
  }

  document.querySelectorAll('[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () { track('cta_click', { cta_position: a.getAttribute('data-cta') }); });
  });

  // ---------- ヘッダー・固定CTA ----------
  var header = document.querySelector('.site-header');
  var sticky = document.getElementById('sticky-cta');
  var fv = document.querySelector('.fv-copy .cta-block');
  var contact = document.getElementById('contact');
  var fvVisible = true, contactVisible = false;
  function updateSticky() { if (sticky) sticky.classList.toggle('show', !fvVisible && !contactVisible); }
  if ('IntersectionObserver' in window) {
    if (fv) new IntersectionObserver(function (e) { fvVisible = e[0].isIntersecting; updateSticky(); }).observe(fv);
    if (contact) new IntersectionObserver(function (e) { contactVisible = e[0].isIntersecting; updateSticky(); }, { threshold: 0.05 }).observe(contact);

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.section .kicker, .section h2, .section .lead, .problem-grid li, .service, .reason, .flow li, .brand, .sim-grid > *, .fee-item, .fee-example, .compare-col')
      .forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }
  window.addEventListener('scroll', function () { header.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

  // ---------- FAQ ----------
  document.querySelectorAll('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('faq_open', { question: d.querySelector('summary').textContent.trim().slice(0, 80) }); });
  });

  // ---------- フォーム ----------
  var form = document.getElementById('contact-form');
  if (!form) return;
  var btn = document.getElementById('submit-btn');
  var status = document.getElementById('form-status');
  var thanks = document.getElementById('thanks');
  var startedAt = 0, started = false;
  var endpoint = (C.endpoint || '').trim();

  if (!endpoint) document.getElementById('form-config-warning').hidden = false;

  form.addEventListener('focusin', function () {
    if (!started) { started = true; startedAt = Date.now(); track('form_start'); }
  });

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var TEL_RE = /^[0-9０-９+\-‐－() ]{8,20}$/;

  function setErr(id, msg) {
    var el = document.getElementById('e-' + id);
    if (el) el.textContent = msg || '';
    var input = form.querySelector('[name="' + id + '"]');
    if (input && input.type !== 'checkbox') {
      input.classList.toggle('invalid', !!msg);
      if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'e-' + id); }
      else input.removeAttribute('aria-invalid');
    }
  }

  function validate() {
    var ok = true, first = null;
    function fail(id, msg) { setErr(id, msg); ok = false; if (!first) first = form.querySelector('[name="' + id + '"]'); }
    var v = function (n) { return (form.elements[n].value || '').trim(); };
    ['name', 'company', 'email', 'tel', 'stores', 'topics', 'agree'].forEach(function (k) { setErr(k, ''); });

    if (!v('name')) fail('name', '氏名を入力してください。');
    if (!v('company')) fail('company', '会社名・店舗名を入力してください。');
    if (!v('email')) fail('email', 'メールアドレスを入力してください。');
    else if (!EMAIL_RE.test(v('email'))) fail('email', 'メールアドレスの形式が正しくありません。');
    if (v('tel') && !TEL_RE.test(v('tel'))) fail('tel', '電話番号は数字とハイフンで入力してください。');
    if (!v('stores')) fail('stores', '運営店舗数を選択してください。');
    if (!form.querySelectorAll('input[name="topics"]:checked').length) fail('topics', '相談したい内容を1つ以上選択してください。');
    if (!form.elements.agree.checked) fail('agree', 'プライバシーポリシーへの同意が必要です。');
    if (first) first.focus();
    return ok;
  }

  function payload() {
    var topics = Array.prototype.map.call(form.querySelectorAll('input[name="topics"]:checked'), function (c) { return c.value; });
    var data = {
      name: form.elements.name.value.trim(),
      company: form.elements.company.value.trim(),
      email: form.elements.email.value.trim(),
      tel: form.elements.tel.value.trim(),
      stores: form.elements.stores.value,
      topics: topics.join('、'),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,          // honeypot
      elapsed_ms: startedAt ? Date.now() - startedAt : 0,
      page_url: location.href,
      user_agent: navigator.userAgent
    };
    Object.keys(attribution).forEach(function (k) { data[k] = attribution[k]; });
    return data;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = ''; status.className = 'form-status';
    if (!validate()) { track('form_error', { reason: 'validation' }); return; }
    if (!endpoint) {
      status.textContent = '送信先が未設定のため送信できません（管理者向け：config.json の endpoint を設定してください）。';
      status.className = 'form-status error';
      track('form_error', { reason: 'no_endpoint' });
      return;
    }
    var data = payload();
    track('form_submit', { stores: data.stores, topics: data.topics });
    btn.disabled = true; btn.textContent = '送信中…';

    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'server');
        track('form_success', { stores: data.stores, topics: data.topics });
        if (C.ads_conversion_send_to && typeof window.gtag === 'function') window.gtag('event', 'conversion', { send_to: C.ads_conversion_send_to });
        form.hidden = true; thanks.hidden = false; thanks.focus();
        if (sticky) sticky.remove();
      })
      .catch(function (err) {
        track('form_error', { reason: String(err && err.message || err).slice(0, 60) });
        status.textContent = '送信できませんでした。通信環境をご確認のうえ、もう一度お試しください。';
        status.className = 'form-status error';
        btn.disabled = false; btn.textContent = '無料相談を申し込む';
      });
  });
})();
