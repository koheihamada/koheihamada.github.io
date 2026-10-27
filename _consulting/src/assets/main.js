(function () {
  'use strict';
  var C = window.LP_CONFIG || {};

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  // 相談ボタンのクリック
  document.querySelectorAll('[data-cta]').forEach(function (a) {
    a.addEventListener('click', function () { track('cta_click', { cta_position: a.getAttribute('data-cta') }); });
  });

  // ヘッダーの下線
  var header = document.querySelector('.site-header');
  window.addEventListener('scroll', function () { header.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

  // モバイル固定CTA：本文のボタンやフォームが見えている間は隠す
  var sticky = document.getElementById('sticky-cta');
  if (sticky && 'IntersectionObserver' in window) {
    var visible = new Set();
    var targets = document.querySelectorAll('main [data-cta]:not([data-cta="header"]), #contact');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visible.add(en.target) : visible.delete(en.target); });
      sticky.classList.toggle('show', visible.size === 0 && window.scrollY > 300);
    }, { rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (t) { io.observe(t); });
    window.addEventListener('scroll', function () {
      sticky.classList.toggle('show', visible.size === 0 && window.scrollY > 300);
    }, { passive: true });
  }

  // FAQ
  document.querySelectorAll('.faq details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) track('faq_open', { question: d.querySelector('summary').textContent.trim().slice(0, 80) });
    });
  });

  // Google フォーム（埋め込み）
  // iframe 内の操作は直接取れないため、読み込み回数で推定する：
  //   1回目 = フォーム表示（form_view）、2回目以降 = 送信後の完了画面（form_success）
  var gform = document.getElementById('gform');
  if (gform) {
    var loads = 0;
    gform.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) { track('form_view'); return; }
      track('form_success');
      if (C.ads_conversion_send_to) track('conversion', { send_to: C.ads_conversion_send_to });
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (sticky) sticky.remove();
    });
  }
})();
