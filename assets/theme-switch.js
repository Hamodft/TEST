/* ========================================================================
   Portfolio theme controller and enhanced interactions.
   Keeps presentation state independent from language and portfolio data.
   ======================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var storageKey = 'aa_portfolio_theme';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var observed = new WeakSet();
  var revealObserver = null;

  function activeTheme() {
    return html.getAttribute('data-portfolio-theme') === 'classic' ? 'classic' : 'new';
  }

  function saveTheme(theme) {
    try { localStorage.setItem(storageKey, theme); } catch (error) {}
  }

  function syncPicker() {
    document.querySelectorAll('.theme-choice').forEach(function (button) {
      var selected = button.getAttribute('data-theme-value') === activeTheme();
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      button.setAttribute('tabindex', selected ? '0' : '-1');
    });
  }

  function setTheme(theme, persist) {
    theme = theme === 'classic' ? 'classic' : 'new';
    html.setAttribute('data-portfolio-theme', theme);
    if (persist !== false) saveTheme(theme);
    syncPicker();

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'new' ? '#07121d' : '#08131f');

    if (theme === 'new') {
      decorateDynamicContent();
    } else {
      document.querySelectorAll('[data-magnetic-active]').forEach(function (node) {
        node.style.removeProperty('transform');
      });
    }

    window.dispatchEvent(new CustomEvent('portfolio-theme-change', { detail: { theme: theme } }));
  }

  function changeTheme(theme) {
    if (theme === activeTheme()) return;
    var wipe = document.querySelector('.theme-wipe');
    if (!wipe || reduceMotion.matches) {
      setTheme(theme, true);
      return;
    }
    wipe.classList.remove('is-changing');
    void wipe.offsetWidth;
    wipe.classList.add('is-changing');
    window.setTimeout(function () { setTheme(theme, true); }, 320);
    window.setTimeout(function () { wipe.classList.remove('is-changing'); }, 760);
  }

  function buildPicker() {
    var actions = document.querySelector('.head-actions');
    if (!actions || actions.querySelector('.theme-picker')) return;

    var picker = document.createElement('div');
    picker.className = 'theme-picker';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Portfolio theme');
    picker.innerHTML =
      '<button class="theme-choice" type="button" data-theme-value="classic" aria-pressed="false">' +
        '<span class="en">Classic</span><span class="ar">القديم</span>' +
      '</button>' +
      '<button class="theme-choice" type="button" data-theme-value="new" aria-pressed="false">' +
        '<span class="en">New</span><span class="ar">الجديد</span>' +
      '</button>';

    actions.insertBefore(picker, actions.firstChild);
    picker.addEventListener('click', function (event) {
      var button = event.target.closest('.theme-choice');
      if (button) changeTheme(button.getAttribute('data-theme-value'));
    });
    picker.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var theme = activeTheme() === 'new' ? 'classic' : 'new';
      changeTheme(theme);
      window.setTimeout(function () {
        var next = picker.querySelector('[data-theme-value="' + theme + '"]');
        if (next) next.focus();
      }, reduceMotion.matches ? 0 : 360);
    });
    syncPicker();
  }

  function buildThemeLayers() {
    if (!document.querySelector('.theme-wipe')) {
      var wipe = document.createElement('div');
      wipe.className = 'theme-wipe';
      wipe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(wipe);
    }

    var role = document.querySelector('.hero-role');
    if (role && !document.querySelector('.new-theme-intro')) {
      var intro = document.createElement('p');
      intro.className = 'new-theme-intro';
      intro.innerHTML =
        '<span class="en">I build stronger sales teams through practical training, clear field execution and measurable follow-up.</span>' +
        '<span class="ar">أطوّر فرق المبيعات من خلال تدريب عملي، وتنفيذ ميداني واضح، ومتابعة تُقاس بالنتائج.</span>';
      role.insertAdjacentElement('afterend', intro);
    }
  }

  function setupHeader() {
    var header = document.querySelector('.site-head');
    if (!header) return;
    function update() { header.classList.toggle('is-scrolled', window.scrollY > 50); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function setupPointerGlow() {
    if (reduceMotion.matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var pending = false;
    var x = window.innerWidth / 2;
    var y = window.innerHeight / 3;
    window.addEventListener('pointermove', function (event) {
      x = event.clientX;
      y = event.clientY;
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(function () {
        html.style.setProperty('--pointer-x', x + 'px');
        html.style.setProperty('--pointer-y', y + 'px');
        pending = false;
      });
    }, { passive: true });
  }

  function setupMagnetic(node) {
    if (node.hasAttribute('data-magnetic-active')) return;
    node.setAttribute('data-magnetic-active', 'true');
    node.addEventListener('pointermove', function (event) {
      if (activeTheme() !== 'new' || reduceMotion.matches) return;
      var rect = node.getBoundingClientRect();
      var dx = (event.clientX - rect.left - rect.width / 2) * .1;
      var dy = (event.clientY - rect.top - rect.height / 2) * .14;
      node.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    });
    node.addEventListener('pointerleave', function () {
      node.style.removeProperty('transform');
    });
  }

  function ensureRevealObserver() {
    if (revealObserver || reduceMotion.matches || !('IntersectionObserver' in window)) return;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: .07 });
  }

  function decorateDynamicContent() {
    ensureRevealObserver();

    var selectors = [
      '.career-brands .brand-head', '.brand-tile', '.hl',
      '.section > .wrap > .eyebrow', '.section > .wrap > .sec-title', '.section > .wrap > .sec-note',
      '.profile-grid', '.rail-step', '.role', '.pcard', '.titem', '.comp',
      '.cert-group', '.edu-card', '.langs', '.contact-grid'
    ];
    var items = document.querySelectorAll(selectors.join(','));
    items.forEach(function (node, index) {
      if (observed.has(node)) return;
      observed.add(node);
      node.classList.add('new-reveal');
      node.style.setProperty('--reveal-delay', ((index % 5) * 55) + 'ms');
      if (reduceMotion.matches || !revealObserver) node.classList.add('is-visible');
      else revealObserver.observe(node);
    });

    document.querySelectorAll('.hero .btn, .brand-tile').forEach(setupMagnetic);
  }

  function watchRenderer() {
    var main = document.getElementById('main');
    if (!main || !('MutationObserver' in window)) return;
    var queued = false;
    var observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        buildThemeLayers();
        decorateDynamicContent();
        queued = false;
      });
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  function init() {
    buildPicker();
    buildThemeLayers();
    setupHeader();
    setupPointerGlow();
    decorateDynamicContent();
    watchRenderer();
    setTheme(activeTheme(), false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
