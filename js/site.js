// ─── SHELFSMART GAMING — PUBLIC SITE ─────────────────────────────────────────
// Mobile menu + the contact form (Formspree). No dependencies.

(function () {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
    });
  }

  const form = document.getElementById('contact-form');
  if (!form) return;

  // contact.html?topic=hosting preselects the hosting waitlist.
  const topic = new URLSearchParams(location.search).get('topic');
  const select = form.querySelector('select[name="topic"]');
  if (topic && select && select.querySelector(`option[value="${CSS.escape(topic)}"]`)) select.value = topic;

  const note = document.getElementById('form-note');
  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.className = 'form-note';
    note.textContent = 'Sending…';
    button.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error();
      form.reset();
      note.className = 'form-note ok';
      note.textContent = 'Message sent. We\'ll reply to the email you gave.';
    } catch (_) {
      note.className = 'form-note err';
      note.textContent = 'That didn\'t send. Check your connection and try again.';
    } finally {
      button.disabled = false;
    }
  });
})();
