/* ===================================================================
   Growth Clarity Co. — Shared header/footer partial
   Flat 9-page architecture. root param lets legal/ subfolder pages
   reference root-level files with "../".
   =================================================================== */

function gccHeaderHTML(active, root) {
  root = root || '';
  const link = (href, label, key) =>
    `<a href="${root}${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  return `
  <nav id="nav">
    <a href="${root}index.html" class="gcc-logo">
      <span class="star">&#10022;</span>
      <span class="w-growth">Growth</span><span class="w-clarity">Clarity</span><span class="w-co">Co.</span>
    </a>
    <div class="nav-links">
      ${link('index.html', 'Home', 'home')}
      ${link('how-we-work.html', 'How we work', 'how')}
      ${link('industries.html', 'Industries', 'industries')}
      ${link('services.html', 'Services', 'services')}
      ${link('pricing.html', 'Pricing', 'pricing')}
      ${link('proof.html', 'Proof', 'proof')}
      ${link('start-diagnostic.html', 'Take the diagnostic', 'diagnostic')}
      <a href="${root}contact.html" class="nav-cta">Book a call</a>
    </div>
    <div class="nav-hamburger" id="navHamburger" aria-label="Menu"><span></span><span></span><span></span></div>
  </nav>
  <div class="nav-mobile-panel" id="navMobilePanel">
    <div class="mobile-section">
      <div class="mobile-section-title">Navigate</div>
      <a href="${root}index.html" class="mobile-link">Home</a>
      <a href="${root}how-we-work.html" class="mobile-link">How we work</a>
      <a href="${root}industries.html" class="mobile-link">Industries</a>
      <a href="${root}services.html" class="mobile-link">Services</a>
      <a href="${root}pricing.html" class="mobile-link">Pricing</a>
      <a href="${root}proof.html" class="mobile-link">Proof</a>
      <a href="${root}contact.html" class="mobile-link">Contact</a>
    </div>
    <a href="${root}start-diagnostic.html" class="mobile-cta-btn">Take the GTM diagnostic &rarr;</a>
  </div>`;
}

function gccFooterHTML(root) {
  root = root || '';
  return `
  <footer>
    <div class="footer-authority-strip">
      <div class="fas-text">
        <div class="fas-title">Building GTM systems for B2B SaaS, in public.</div>
        <div class="fas-sub">Jithin shares frameworks, teardowns, and what's actually working in revenue architecture &mdash; weekly, on LinkedIn and via newsletter.</div>
      </div>
      <div class="fas-ctas">
        <a href="https://www.linkedin.com/in/jithingeorge-marketing-strategist/" target="_blank" rel="noopener" class="btn btn-outline-white btn-md">Connect on LinkedIn</a>
        <a href="https://www.linkedin.com/newsletters/marketingled-newsletter-7415340728588926976/" target="_blank" rel="noopener" class="btn btn-green btn-md btn-arrow">Subscribe to the newsletter</a>
      </div>
    </div>
    <div class="footer-top">
      <div>
        <div class="footer-brand-name">Growth<span>Clarity</span> Co.</div>
        <div class="footer-brand-blurb">The revenue architecture partner for Series A&ndash;C B2B SaaS founders building predictable pipeline, not one-off campaigns.</div>
        <div class="footer-social-row">
          <a href="https://www.linkedin.com/in/jithingeorge-marketing-strategist/" target="_blank" rel="noopener" aria-label="Jithin George on LinkedIn" class="footer-social-icon">in</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Services</div>
        <div class="footer-col-links">
          <a href="${root}services.html#positioning">Positioning</a>
          <a href="${root}services.html#pipeline">Pipeline</a>
          <a href="${root}services.html#scale">Scale</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Company</div>
        <div class="footer-col-links">
          <a href="${root}how-we-work.html">How we work</a>
          <a href="${root}industries.html">Industries</a>
          <a href="${root}pricing.html">Pricing</a>
          <a href="${root}proof.html">Proof</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Start here</div>
        <div class="footer-col-links">
          <a href="${root}start-diagnostic.html">GTM diagnostic</a>
          <a href="${root}contact.html">Book a call</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Legal</div>
        <div class="footer-col-links">
          <a href="${root}legal-privacy-policy.html">Privacy policy</a>
          <a href="${root}legal-terms.html">Terms of service</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Growth Clarity Co. &middot; Founded by Jithin George</span>
      <span><a href="${root}legal-privacy-policy.html" style="color:rgba(255,255,255,.3)">Privacy</a> &middot; <a href="${root}legal-terms.html" style="color:rgba(255,255,255,.3)">Terms</a></span>
    </div>
  </footer>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const headerMount = document.getElementById('gcc-header');
  const footerMount = document.getElementById('gcc-footer');
  const root = (headerMount && headerMount.dataset.root) || (footerMount && footerMount.dataset.root) || '';
  if (headerMount) headerMount.outerHTML = gccHeaderHTML(headerMount.dataset.active || '', root);
  if (footerMount) footerMount.outerHTML = gccFooterHTML(root);

  const hamburger = document.getElementById('navHamburger');
  const mobilePanel = document.getElementById('navMobilePanel');
  if (hamburger && mobilePanel) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobilePanel.classList.toggle('open');
    });
  }

  document.querySelectorAll('.reveal').forEach(el => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    io.observe(el);
  });
});
