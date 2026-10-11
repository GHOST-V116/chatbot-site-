// Small progressive enhancements. The page is fully usable without this file.
(() => {
  const masthead = document.querySelector('[data-masthead]');
  const toggle = document.querySelector('[data-navtoggle]');
  const nav = document.getElementById('site-nav');

  // Masthead gains a background once the page scrolls.
  const setSolid = () => masthead.classList.toggle('is-solid', window.scrollY > 24);
  setSolid();
  window.addEventListener('scroll', setSolid, { passive: true });

  // Mobile navigation.
  const closeNav = () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); toggle.focus(); }
  });

  // Stagger index for menu items within each course.
  document.querySelectorAll('.course').forEach((course) => {
    course.querySelectorAll('.dish').forEach((dish, i) => dish.style.setProperty('--d', Math.min(i, 10)));
  });

  // Reveal on scroll, once.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));

    // Highlight the menu section currently in view.
    const chips = [...document.querySelectorAll('[data-menunav] .chip')];
    const chipFor = new Map(chips.map((c) => [c.getAttribute('href').slice(1), c]));
    let current = null;
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const chip = chipFor.get(entry.target.id);
        if (!chip || chip === current) return;
        current?.removeAttribute('aria-current');
        chip.setAttribute('aria-current', 'true');
        current = chip;
        const bar = chip.parentElement;
        bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('.course').forEach((c) => spy.observe(c));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})();
