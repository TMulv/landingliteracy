/* Landing Literacy site script. No dependencies. */

/* ---------- Settings: fill these in before launch ---------- */
const CONFIG = {
  // Notion Worker webhook URL. Inquiries and resource downloads both post here and land in
  // the "Website Leads" database in Notion. See notion-worker/README.md.
  leadsEndpoint: "https://34716027454.webhook.notionusercontent.com/webhooks/worker/1728153c-8a3e-810c-95ae-000316248c6f/01a14117-0402-7ca8-ad52-1eca6521b018/zZLutYCCwnqwF6t0/websiteLead",
  // Carly's public email. Shown in the contact section and footer.
  email: "carly@landingliteracy.com",
  // Optional booking link (Calendly, etc.)
  bookingUrl: "",
  // Optional LinkedIn profile URL
  linkedinUrl: "",
  // Optional reply promise shown beside the form, e.g. "within two school days"
  replyTime: "",
  // When Carly has outcome data she's cleared to share, put one sentence here.
  // It appears under the case study and in fit check results. Leave empty until then.
  outcomes: ""
};

document.documentElement.classList.add("js");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------- Config-driven bits ---------- */
(function applyConfig() {
  const formsLive = Boolean(CONFIG.leadsEndpoint);
  if (!formsLive) $("#preview-bar").hidden = false;

  const alt = $("#contact-alt");
  const parts = [];
  if (CONFIG.email) parts.push(`Prefer email? <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>`);
  if (CONFIG.bookingUrl) parts.push(`Or <a href="${CONFIG.bookingUrl}" target="_blank" rel="noopener">book a time</a> directly.`);
  if (parts.length) { alt.innerHTML = parts.join(". "); alt.hidden = false; }

  if (CONFIG.replyTime) $("#reply-note").textContent = `You'll hear back from Carly ${CONFIG.replyTime}.`;

  const links = $("#footer-links");
  if (CONFIG.email) links.insertAdjacentHTML("beforeend", `<li><a href="mailto:${CONFIG.email}">${CONFIG.email}</a></li>`);
  if (CONFIG.linkedinUrl) links.insertAdjacentHTML("beforeend", `<li><a href="${CONFIG.linkedinUrl}" target="_blank" rel="noopener">LinkedIn</a></li>`);

  if (CONFIG.outcomes) { const o = $("#outcomes"); o.textContent = CONFIG.outcomes; o.hidden = false; }
  $("#year").textContent = new Date().getFullYear();
})();

/* ---------- Nav ---------- */
(function nav() {
  const header = $(".nav");
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const btn = $(".menu-btn");
  const menu = $("#site-menu");
  btn.addEventListener("click", () => {
    const open = menu.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Close" : "Menu";
  });
  $$("a", menu).forEach(a => a.addEventListener("click", () => {
    menu.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "Menu";
  }));
})();

/* ---------- Marker annotations ---------- */
function prepInk(root) {
  $$(".mk path", root).forEach(p => {
    const len = Math.ceil(p.getTotalLength()) + 2;
    p.style.transition = "none";
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = reduceMotion ? "0" : `${len}`;
    p.getBoundingClientRect();
    p.style.transition = "";
  });
}
function drawInk(root) {
  $$(".mk path", root).forEach(p => { p.style.strokeDashoffset = "0"; });
}

(function annotations() {
  const targets = $$("[data-draw]").filter(el => !el.closest(".hero"));
  targets.forEach(prepInk);
  if (reduceMotion || !("IntersectionObserver" in window)) { targets.forEach(drawInk); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { drawInk(e.target); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -18% 0px", threshold: 0.2 });
  targets.forEach(t => io.observe(t));
})();

/* ---------- Hero: letter tiles in sound boxes ---------- */
(function heroTiles() {
  const tiles = $("#tiles");
  const hero = $(".hero");
  const note = $("#hero-note");
  const tileEls = $$(".tile", tiles);
  tileEls.forEach((t, i) => {
    t.style.setProperty("--i", i);
    t.parentElement.dataset.sound = t.dataset.sound;
    t.tabIndex = 0;
    t.setAttribute("aria-label", `Letter ${t.textContent}, sound ${t.dataset.sound}`);
  });
  tiles.removeAttribute("aria-hidden");
  tiles.setAttribute("role", "group");
  tiles.setAttribute("aria-label", "The word lands in five sound boxes, one box per sound.");

  prepInk(hero);

  function land() {
    tiles.classList.add("is-landed");
    tiles.classList.remove("is-dropping");
    note.classList.add("is-on");
    drawInk(hero);
  }

  function drop() {
    note.classList.remove("is-on");
    tiles.classList.remove("is-landed");
    tileEls.forEach(t => { t.style.transform = ""; });
    prepInk(hero);
    if (reduceMotion) { land(); return; }
    void tiles.offsetWidth;
    tiles.classList.add("is-dropping");
    const last = tileEls[tileEls.length - 1];
    last.addEventListener("animationend", function done() {
      last.removeEventListener("animationend", done);
      land();
    });
  }

  drop();
  $("#replay").addEventListener("click", drop);

  // Drag and snap back
  tileEls.forEach(tile => {
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false, moved = false;

    tile.addEventListener("pointerdown", e => {
      if (!tiles.classList.contains("is-landed")) return;
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
      tile.setPointerCapture(e.pointerId);
      tile.classList.remove("is-returning", "is-hop");
      tile.classList.add("is-dragging");
    });
    tile.addEventListener("pointermove", e => {
      if (!dragging) return;
      dx = e.clientX - startX; dy = e.clientY - startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      tile.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-14, Math.min(14, dx * 0.06))}deg)`;
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      tile.classList.remove("is-dragging");
      tile.classList.add("is-returning");
      tile.style.transform = "";
      if (!moved) hop(tile);
    };
    tile.addEventListener("pointerup", release);
    tile.addEventListener("pointercancel", release);
    tile.addEventListener("transitionend", () => tile.classList.remove("is-returning"));

    // Keyboard: arrows nudge, Enter/Space hops, Escape snaps back
    let kx = 0, ky = 0, snapTimer;
    tile.addEventListener("keydown", e => {
      const step = 14;
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (map[e.key]) {
        e.preventDefault();
        kx += map[e.key][0]; ky += map[e.key][1];
        tile.classList.remove("is-returning");
        tile.style.transform = `translate(${kx}px, ${ky}px)`;
        clearTimeout(snapTimer);
        snapTimer = setTimeout(snap, 900);
      } else if (e.key === "Escape") {
        snap();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hop(tile);
      }
    });
    function snap() { kx = 0; ky = 0; tile.classList.add("is-returning"); tile.style.transform = ""; }
  });

  function hop(tile) {
    if (reduceMotion) return;
    tile.classList.remove("is-hop");
    void tile.offsetWidth;
    tile.classList.add("is-hop");
    tile.addEventListener("animationend", () => tile.classList.remove("is-hop"), { once: true });
  }
})();

/* ---------- Fit check ---------- */
const AREAS = {
  screen: {
    title: "Universal screening", service: "Assessment & Intervention",
    work: "A universal screener three times a year, plus a diagnostic for students below benchmark, so every decision starts from the same data.",
    track: ["Share of students at or above benchmark on your screener, fall to spring", "Share of below-benchmark students with a diagnostic on file"]
  },
  groups: {
    title: "Intervention groups", service: "Assessment & Intervention",
    work: "Groups built from diagnostic data around one skill each, regrouped every 6 to 8 weeks as students move.",
    track: ["Intervention students making typical or better growth", "Students moving up a tier between benchmark windows"]
  },
  phonics: {
    title: "K-2 phonics and phonemic awareness", service: "Foundational Reading PD",
    work: "Daily, systematic phonemic awareness and phonics in every K-2 room, with demo lessons so the program is taught the way it was designed.",
    track: ["Phonemic awareness and decoding subtests, such as segmentation and nonsense word fluency", "Accuracy on your program's unit assessments"],
    research: "The What Works Clearinghouse rates teaching sound segmentation, letter-sound links and decoding as strong-evidence practices for K-3."
  },
  block: {
    title: "Literacy block structure", service: "Curriculum Design",
    work: "One block structure across classrooms, with protected time for foundational skills, knowledge-building and intervention, plus pacing guides that match.",
    track: ["Protected foundational skills minutes each day", "Consistency of the block across classrooms on walkthroughs"]
  },
  upper: {
    title: "Grades 3-5 word study", service: "Foundational Reading PD",
    work: "Explicit syllable and morphology instruction in grades 3-5, so older students can read and spell long words.",
    track: ["Oral reading fluency accuracy in grades 3-5", "Spelling of multisyllable words on program assessments"],
    research: "The What Works Clearinghouse rates teaching students to decode and analyze word parts as a strong-evidence practice."
  },
  coaching: {
    title: "Support after PD", service: "Instructional Coaching",
    work: "Plan, model and debrief cycles in teachers' own classrooms, so training turns into daily practice.",
    track: ["Look-fors observed on walkthroughs, fall to spring", "Teacher confidence before and after coaching cycles"]
  },
  data: {
    title: "Team data routines", service: "Assessment & Intervention",
    work: "A data chat after every benchmark window, using a protocol that ends with new groups and dates.",
    track: ["Days from benchmark window to new groups", "At-risk students with a plan within two weeks"]
  },
  program: {
    title: "Choosing or launching a program", service: "Program Selection & Rollout",
    work: "Review options against research-based criteria, run a pilot, then launch with training, demo lessons and year-one check-ins.",
    track: ["Implementation checks by unit", "Student progress on the program's own assessments"]
  }
};

const QUESTIONS = [
  { id: "state", q: "Where is your district?", options: [
    { label: "New Jersey", v: "NJ" }, { label: "New York", v: "NY" }, { label: "Connecticut", v: "CT" },
    { label: "Pennsylvania", v: "PA" }, { label: "Somewhere else", v: "Other" } ] },
  { id: "grades", q: "Which grades are you focused on?", options: [
    { label: "K-2", v: "K-2" }, { label: "Grades 3-5", v: "3-5" }, { label: "All of K-5", v: "K-5" },
    { label: "Middle or high school only", v: "6-12" } ] },
  { id: "screen", area: "screen", q: "How do you screen K-5 readers today?", options: [
    { label: "A universal screener like Acadience or DIBELS, three times a year, and teams use the results", p: 0 },
    { label: "We screen, but the results mostly sit in a spreadsheet", p: 2 },
    { label: "Reading levels or running records", p: 3 },
    { label: "Not sure", p: 2 } ] },
  { id: "groups", area: "groups", q: "How are intervention groups formed?", options: [
    { label: "From diagnostic data, and we regroup every 6 to 8 weeks", p: 0 },
    { label: "From screener scores, but groups rarely change", p: 2 },
    { label: "By reading level or teacher judgment", p: 3 },
    { label: "Not sure", p: 2 } ] },
  { id: "phonics", area: "phonics", q: "How do K-2 teachers teach phonics?", skip: a => a.grades && a.grades.v === "3-5", options: [
    { label: "A systematic program, taught every day the way it was designed", p: 0 },
    { label: "We have a program, but how it's used varies by classroom", p: 2 },
    { label: "Teachers pull from many sources, or students are taught to guess from pictures and context", p: 3 },
    { label: "Not sure", p: 2 } ] },
  { id: "block", area: "block", q: "How is your literacy block structured?", options: [
    { label: "The same structure in every classroom, with protected time for foundational skills, knowledge and intervention", p: 0 },
    { label: "There's a structure, but it varies by teacher", p: 2 },
    { label: "It's built on a balanced literacy or workshop schedule", p: 3 } ] },
  { id: "upper", area: "upper", q: "Do grades 3-5 explicitly teach syllables and morphology, like prefixes, suffixes and roots?", skip: a => a.grades && a.grades.v === "K-2", options: [
    { label: "Yes, with a scope and sequence", p: 0 },
    { label: "Some teachers do", p: 2 },
    { label: "Not really", p: 3 } ] },
  { id: "coaching", area: "coaching", q: "After a training, what support do teachers get?", options: [
    { label: "Demo lessons and coaching cycles in their own classrooms", p: 0 },
    { label: "Occasional check-ins", p: 2 },
    { label: "They're mostly on their own", p: 3 } ] },
  { id: "data", area: "data", q: "How often do grade-level teams look at reading data together?", options: [
    { label: "After every benchmark window, with a protocol", p: 0 },
    { label: "Once or twice a year, informally", p: 2 },
    { label: "Rarely", p: 3 } ] },
  { id: "program", area: "program", q: "Are you choosing or rolling out a new ELA program?", options: [
    { label: "Yes, this year or next", p: 3 },
    { label: "We're considering it", p: 2 },
    { label: "No, we're keeping what we have", p: 0 } ] }
];

const VERDICTS = {
  strong: { title: "Strong fit", copy: "There's real room to grow, and it's the kind of work Carly does every week. A first conversation would start with your top opportunity below." },
  good: { title: "Good fit", copy: "You have a solid base. Focused support in a couple of areas could make it stick in every classroom." },
  light: { title: "Light-touch fit", copy: "You've built a lot already. A data review or a short coaching cycle may be all you need, and that's a fine place to start." },
  notfit: { title: "Probably not the right fit", copy: "Carly focuses on K-5 reading. The free resources below are still yours, and she's happy to point you toward people who specialize in secondary literacy." }
};

(function fitCheck() {
  const start = $("#fit-start"), qWrap = $("#fit-q"), result = $("#fit-result");
  const legend = $("#fit-question"), opts = $("#fit-options"), count = $("#fit-count"), bar = $("#fit-bar-fill"), back = $("#fit-back");
  let answers = {}, history = [], index = 0;

  const active = () => QUESTIONS.filter(q => !(q.skip && q.skip(answers)));

  function render() {
    const list = active();
    const q = list[index];
    legend.textContent = q.q;
    count.textContent = `${index + 1} of ${list.length}`;
    bar.style.width = `${(index / list.length) * 100}%`;
    opts.innerHTML = "";
    q.options.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "fit-option";
      const picked = answers[q.id] !== undefined && answers[q.id].label === o.label;
      b.setAttribute("aria-pressed", String(picked));
      b.innerHTML = `<span class="key" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span></span>`;
      b.lastChild.textContent = o.label;
      b.addEventListener("click", () => choose(q, o));
      opts.appendChild(b);
    });
    back.hidden = index === 0;
  }

  function choose(q, o) {
    answers[q.id] = o;
    if (q.id === "grades" && o.v === "6-12") { finish(); return; }
    const list = active();
    if (index < list.length - 1) {
      history.push(index);
      index += 1;
      render();
      opts.querySelector("button")?.focus({ preventScroll: true });
    } else {
      finish();
    }
  }

  back.addEventListener("click", () => {
    if (index > 0) { index -= 1; render(); }
  });

  $("#fit-begin").addEventListener("click", () => {
    answers = {}; history = []; index = 0;
    start.hidden = true; result.hidden = true; qWrap.hidden = false;
    render();
    opts.querySelector("button")?.focus({ preventScroll: true });
  });

  // Keyboard shortcut: A, B, C... picks an option
  qWrap.addEventListener("keydown", e => {
    if (e.target.tagName === "BUTTON" && e.key.length === 1) {
      const i = e.key.toUpperCase().charCodeAt(0) - 65;
      const btn = opts.querySelectorAll(".fit-option")[i];
      if (btn) { e.preventDefault(); btn.click(); }
    }
  });

  function finish() {
    const list = active();
    const scored = list.filter(q => q.area);
    let points = 0, max = 0;
    const ranked = [];
    scored.forEach((q, order) => {
      const a = answers[q.id];
      const top = Math.max(...q.options.map(o => o.p));
      max += top;
      if (a) { points += a.p; if (a.p > 0) ranked.push({ area: q.area, p: a.p, order }); }
    });
    const pct = max ? points / max : 0;
    let key = pct >= 0.5 ? "strong" : pct >= 0.25 ? "good" : "light";
    if (answers.grades && answers.grades.v === "6-12") key = "notfit";
    ranked.sort((a, b) => b.p - a.p || a.order - b.order);
    const top = ranked.slice(0, 3).map(r => r.area);
    if (key === "light" && top.length === 0) top.push("data");
    showResult(key, pct, top);
  }

  function showResult(key, pct, top) {
    const v = VERDICTS[key];
    const state = answers.state ? answers.state.v : "";
    const region = state === "Other" ? `<p class="region-note">Carly mainly works in New Jersey, New York, Connecticut and Pennsylvania. Virtual support may still work, so ask.</p>` : "";
    const meter = key === "notfit" ? "" : `<div class="verdict-meter"><span>Fit score</span><span class="meter" aria-hidden="true"><span style="width:${Math.max(6, Math.round(pct * 100))}%"></span></span><span>${Math.round(pct * 100)}%</span></div>`;

    const oppsHtml = key === "notfit" ? "" : `
      <h4 class="opps-title">${top.length > 1 ? "Your biggest opportunities" : "Where to start"}</h4>
      <ol class="opps">
        ${top.map((k, i) => {
          const a = AREAS[k];
          return `<li class="opp">
            <span class="opp-rank">${["first", "second", "third"][i]}</span>
            <h4>${a.title}</h4>
            <span class="opp-service">${a.service}</span>
            <p>${a.work}</p>
            <div class="opp-track"><strong>What we'd track together</strong><ul>${a.track.map(t => `<li>${t}</li>`).join("")}</ul></div>
            ${a.research ? `<p class="opp-research">${a.research}</p>` : ""}
          </li>`;
        }).join("")}
      </ol>`;

    const outcomes = CONFIG.outcomes ? `<p class="fit-honest"><strong>${CONFIG.outcomes}</strong></p>` : "";

    result.innerHTML = `
      <div class="verdict">
        <h3>${v.title}<svg class="mk mk-circle" viewBox="0 0 240 90" preserveAspectRatio="none" aria-hidden="true"><path d="M34 16 C 84 4, 192 6, 226 30 C 244 48, 222 78, 150 83 C 80 88, 14 76, 9 50 C 6 30, 40 13, 84 9"/></svg></h3>
        ${meter}
      </div>
      <p class="verdict-copy">${v.copy}</p>
      ${region}
      ${oppsHtml}
      ${outcomes}
      <p class="fit-honest">This is a conversation starter, not a diagnosis. The real picture comes from looking at your data together, and every district starts somewhere different.</p>
      <div class="fit-actions">
        ${key === "notfit" ? `<a class="btn" href="#resources">See the free resources</a>` : `<button class="btn" type="button" id="fit-send">Send my results to Carly</button>`}
        <button class="linklike" type="button" id="fit-restart">Start over</button>
      </div>`;

    qWrap.hidden = true;
    result.hidden = false;
    prepInk(result);
    requestAnimationFrame(() => setTimeout(() => drawInk(result), 60));
    result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    $("#fit-restart").addEventListener("click", () => $("#fit-begin").click());
    const send = $("#fit-send");
    if (send) send.addEventListener("click", () => prefill(key, pct, top));
  }

  function prefill(key, pct, top) {
    const form = $("#inquiry");
    const state = answers.state ? answers.state.v : "";
    if (state) form.state.value = state;
    const g = answers.grades ? answers.grades.v : "";
    $$('input[name="grades"]', form).forEach(cb => {
      cb.checked = (g === "K-5" && cb.value !== "Not sure yet") || cb.value === g;
    });
    const services = new Set(top.map(k => AREAS[k].service));
    $$('input[name="services"]', form).forEach(cb => { cb.checked = services.has(cb.value); });

    const lines = active().filter(q => answers[q.id]).map(q => `${q.q} ${answers[q.id].label}`);
    const summary = `${VERDICTS[key].title} (fit score ${Math.round(pct * 100)}%). Top opportunities: ${top.map(k => AREAS[k].title).join(", ")}.`;
    $("#fit-field").value = `${summary}\n\n${lines.join("\n")}`;
    if (!form.message.value) form.message.value = `From the fit check: ${summary}`;
    $("#contact").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(() => form.name.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
  }
})();

/* ---------- Form helpers ---------- */
function validate(form) {
  let first = null;
  $$("[required]", form).forEach(el => {
    const ok = el.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : el.value.trim() !== "";
    el.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok && !first) first = el;
  });
  return first;
}

// Sends a submission to the Notion Worker webhook. The webhook doesn't send CORS headers,
// so the request goes out as a simple "no-cors" POST: it arrives, but the browser can't read
// the reply. A network failure still throws, which the forms report.
async function post(endpoint, data) {
  const payload = {};
  data.forEach((value, key) => { payload[key] = value; });
  if (!endpoint) {
    console.warn("[Landing Literacy] leadsEndpoint not set in CONFIG. Submission not sent:", payload);
    return { ok: true, preview: true };
  }
  await fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload)
  });
  return { ok: true };
}

/* ---------- Inquiry form ---------- */
(function inquiry() {
  const form = $("#inquiry");
  const err = $("#inquiry-error");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    err.hidden = true;
    const bad = validate(form);
    if (bad) {
      err.textContent = "Please fill in your name, email, role, district and state.";
      err.hidden = false;
      bad.focus();
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Sending...";
    const data = new FormData(form);
    data.append("_subject", `New inquiry: ${form.district.value} (${form.state.value})`);
    data.set("grades", $$('input[name="grades"]:checked', form).map(c => c.value).join(", "));
    data.set("services", $$('input[name="services"]:checked', form).map(c => c.value).join(", "));
    try {
      data.append("source", "inquiry");
      const r = await post(CONFIG.leadsEndpoint, data);
      if (!r.ok) throw new Error("bad response");
      form.hidden = true;
      const sent = $("#inquiry-sent");
      sent.hidden = false;
      sent.focus();
    } catch {
      err.innerHTML = CONFIG.email
        ? `That didn't send. Please try again, or email Carly at <a href="mailto:${CONFIG.email}">${CONFIG.email}</a>.`
        : "That didn't send. Please check your connection and try again.";
      err.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Send to Carly";
    }
  });
  form.addEventListener("input", e => { if (e.target.hasAttribute("aria-invalid")) e.target.setAttribute("aria-invalid", "false"); });
})();

/* ---------- Resource downloads: email once, unlock all ---------- */
(function resourceGate() {
  const KEY = "ll-resources-unlocked";
  const gate = $("#gate"), gateForm = $("#gate-form"), err = $("#gate-error");
  let pending = null;

  const unlocked = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };
  const remember = () => { try { localStorage.setItem(KEY, "1"); } catch { /* private mode: fine */ } };

  function download(link) {
    const a = document.createElement("a");
    a.href = link.getAttribute("href");
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  $$("[data-resource]").forEach(link => {
    link.addEventListener("click", e => {
      if (unlocked()) return; // normal download
      e.preventDefault();
      pending = link;
      $("#gate-resource").value = link.dataset.resource;
      err.hidden = true;
      if (typeof gate.showModal === "function") gate.showModal(); else gate.setAttribute("open", "");
      gateForm.email.focus();
    });
  });

  $("#gate-close").addEventListener("click", () => gate.close());
  gate.addEventListener("click", e => { if (e.target === gate) gate.close(); });

  gateForm.addEventListener("submit", async e => {
    e.preventDefault();
    err.hidden = true;
    if (validate(gateForm)) {
      err.textContent = "Please enter a valid email address.";
      err.hidden = false;
      gateForm.email.focus();
      return;
    }
    const btn = gateForm.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = "Unlocking...";
    const data = new FormData(gateForm);
    data.append("_subject", `Resource download: ${data.get("resource")}`);
    data.append("source", "resource-download");
    try {
      const r = await post(CONFIG.leadsEndpoint, data);
      if (!r.ok) throw new Error("bad response");
      remember();
      gate.close();
      if (pending) download(pending);
    } catch {
      err.textContent = "Something went wrong. Please try again in a moment.";
      err.hidden = false;
    } finally {
      btn.disabled = false; btn.textContent = "Unlock and download";
    }
  });
})();
