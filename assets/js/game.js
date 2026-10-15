/* Sound Boxes: hear a word, build it one sound at a time.
   One box per sound, so "ship" gets three boxes and "sh" is one tile.
   Nothing is saved except which levels this device has finished. */
(() => {
  // Flip these on as the recordings land in /assets/audio/.
  //   words: /assets/audio/words/<word>.mp3          (ElevenLabs)
  //   sounds: /assets/audio/sounds/<sound>.mp3       (Carly's voice memo: s, t, sh, a, e ...)
  //   voice: /assets/audio/voice/{build,yes,again}.mp3
  // Until then words use the browser's voice, and single sounds stay silent on purpose:
  // computer voices add "uh" to them, which teaches the wrong thing.
  const AUDIO = { words: false, sounds: false, voice: false };

  // "s:z" means the tile shows s and the sound is /z/.
  const LEVELS = [
    { name: "Short vowels", tag: "3 sounds", words: "sat:s a t|map:m a p|pig:p i g|sun:s u n|hot:h o t|bed:b e d|cup:c u p|log:l o g|fin:f i n|web:w e b|jam:j a m|rug:r u g" },
    { name: "sh, ch, th, ck", tag: "2 letters, 1 sound", words: "ship:sh i p|chop:ch o p|thin:th i n|duck:d u ck|fish:f i sh|bath:b a th|shut:sh u t|lock:l o ck|chin:ch i n|wish:w i sh" },
    { name: "Blends", tag: "4 sounds", words: "frog:f r o g|stop:s t o p|crab:c r a b|flag:f l a g|sled:s l e d|drum:d r u m|hand:h a n d|milk:m i l k|lamp:l a m p|best:b e s t|swim:s w i m|plum:p l u m" },
    { name: "Five sounds", tag: "5 sounds", words: "stamp:s t a m p|crust:c r u s t|blend:b l e n d|split:s p l i t|frost:f r o s t|lands:l a n d s:z" }
  ].map((lvl, i) => ({
    ...lvl,
    n: i + 1,
    words: lvl.words.split("|").map(entry => {
      const [word, spec] = entry.split(/:(.*)/s);
      return { word, parts: spec.split(" ").map(p => { const [g, s] = p.split(":"); return { g, s: s || soundOf(g) }; }) };
    })
  }));

  const VOWELS = ["a", "e", "i", "o", "u"];
  const LABEL = { a: "ă", e: "ĕ", i: "ĭ", o: "ŏ", u: "ŭ" };
  const CONFUSE = {
    b: ["d", "p"], d: ["b", "t"], p: ["b", "d"], m: ["n"], n: ["m"], t: ["d", "f"], g: ["j", "k"], j: ["g"],
    f: ["th", "v"], th: ["f", "t"], sh: ["ch", "s"], ch: ["sh", "j"], ck: ["k", "c"], c: ["k", "s"], k: ["c", "ck"],
    l: ["r"], r: ["w", "l"], w: ["r"], s: ["z", "c"], h: ["n"], z: ["s"]
  };
  const FILL = ["b", "d", "m", "n", "t", "p", "s", "f", "l", "r", "g", "h"];

  function soundOf(g) { return g === "c" || g === "ck" ? "k" : g; }
  const label = s => `/${LABEL[s] || s}/`;
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const $ = id => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const el = {
    start: $("sb-start"), play: $("sb-play"), done: $("sb-done"), levels: $("sb-levels"), chips: $("sb-chips"),
    home: $("sb-home"), full: $("sb-full"), progress: $("sb-progress"), count: $("sb-count"), hear: $("sb-hear"),
    boxes: $("sb-boxes"), note: $("sb-note"), bank: $("sb-bank"), clear: $("sb-clear"), next: $("sb-next"),
    doneKicker: $("sb-done-kicker"), doneTitle: $("sb-done-title"), nextLevel: $("sb-next-level"), again: $("sb-again"), levelsBtn: $("sb-levels-btn")
  };

  /* ---------- Finished levels (this device only) ---------- */
  const KEY = "sb-done-levels";
  const finished = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const markFinished = n => { try { const f = new Set(finished()); f.add(n); localStorage.setItem(KEY, JSON.stringify([...f])); } catch { /* fine */ } };

  /* ---------- Audio ---------- */
  let current = null;
  function playFile(src) {
    if (current) { current.pause(); current = null; }
    const a = new Audio(src);
    current = a;
    return a.play().then(() => new Promise(res => { a.onended = res; a.onerror = res; })).catch(() => {});
  }
  function speak(text) {
    if (!("speechSynthesis" in window)) return Promise.resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.78;
    const voices = speechSynthesis.getVoices().filter(v => v.lang && v.lang.startsWith("en"));
    u.voice = voices.find(v => /Samantha|Google US English|Aria|Jenny/i.test(v.name)) || voices[0] || null;
    return new Promise(res => { u.onend = res; u.onerror = res; speechSynthesis.speak(u); });
  }
  function sayWord(word) {
    el.hear.classList.add("is-playing");
    const p = AUDIO.words ? playFile(`/assets/audio/words/${word}.mp3`) : speak(word);
    return p.finally(() => el.hear.classList.remove("is-playing"));
  }
  const saySound = s => { if (AUDIO.sounds) playFile(`/assets/audio/sounds/${s}.mp3`); };
  const sayVoice = name => { if (AUDIO.voice) return playFile(`/assets/audio/voice/${name}.mp3`); return Promise.resolve(); };
  if ("speechSynthesis" in window) speechSynthesis.getVoices();

  /* ---------- State ---------- */
  let level = null, order = [], idx = 0, round = null;

  function distractors(parts, count = 3) {
    const used = new Set(parts.map(p => p.g));
    const out = [];
    const add = x => { if (x && !used.has(x) && !out.includes(x) && out.length < count) out.push(x); };
    parts.forEach(p => { if (p.s !== soundOf(p.g)) add(p.s); }); // lands: offer z for the s that says /z/
    add(shuffle(VOWELS.filter(v => !used.has(v)))[0]);
    shuffle(parts.filter(p => !VOWELS.includes(p.g))).forEach(p => shuffle(CONFUSE[p.g] || []).forEach(add));
    while (out.length < count) add(FILL[Math.floor(Math.random() * FILL.length)]);
    return out;
  }

  function newRound(entry) {
    const tiles = shuffle([
      ...entry.parts.map(p => ({ g: p.g, s: p.s })),
      ...distractors(entry.parts).map(g => ({ g, s: soundOf(g) }))
    ]).map((t, i) => ({ ...t, id: i }));
    return { entry, tiles, boxes: Array(entry.parts.length).fill(null), misses: 0, solved: false };
  }

  /* ---------- Screens ---------- */
  function show(which) {
    el.start.hidden = which !== "start";
    el.play.hidden = which !== "play";
    el.done.hidden = which !== "done";
    el.chips.hidden = which === "start";
    el.home.hidden = which === "start";
    window.scrollTo(0, 0);
  }

  function renderLevels() {
    const f = finished();
    el.levels.innerHTML = LEVELS.map(l => `
      <button class="sb-level${f.includes(l.n) ? " is-done" : ""}" type="button" data-level="${l.n}">
        <span class="sb-level-num">Level ${l.n}${f.includes(l.n) ? " <span class='sb-check' aria-label='finished'>✓</span>" : ""}</span>
        <strong>${l.name}</strong>
        <span class="sb-level-tag">${l.tag}</span>
        <span class="sb-level-ex">${l.words.slice(0, 3).map(w => w.word).join(", ")}</span>
      </button>`).join("");
    el.chips.innerHTML = LEVELS.map(l => `<button class="sb-chip" type="button" data-level="${l.n}">Level ${l.n}</button>`).join("");
  }

  function startLevel(n) {
    level = LEVELS[n - 1];
    order = shuffle(level.words);
    idx = 0;
    $$("[data-level]", el.chips).forEach(c => c.setAttribute("aria-current", String(Number(c.dataset.level) === n)));
    show("play");
    nextWord(true);
  }

  function nextWord(first) {
    round = newRound(order[idx]);
    el.next.hidden = true;
    el.clear.hidden = false;
    setNote("");
    render();
    el.count.textContent = `Word ${idx + 1} of ${order.length}. ${round.entry.parts.length} sounds.`;
    const go = () => sayWord(round.entry.word);
    if (first) sayVoice("build").then(go); else go();
  }

  function finishLevel() {
    markFinished(level.n);
    renderLevels();
    el.doneKicker.textContent = `Level ${level.n} done`;
    el.doneTitle.textContent = `You built ${order.length} words!`;
    el.nextLevel.hidden = level.n >= LEVELS.length;
    show("done");
    el.doneTitle.focus();
  }

  /* ---------- Rendering ---------- */
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const tileById = id => round.tiles.find(t => t.id === id);

  function tileHTML(t, i) {
    const cls = ["sb-tile", VOWELS.includes(t.g) ? "is-vowel" : "", t.g.length > 1 ? "is-pair" : ""].filter(Boolean).join(" ");
    return `<button class="${cls}" type="button" data-id="${t.id}" style="--i:${i}" aria-label="${t.g}">${t.g}</button>`;
  }

  function render() {
    const n = round.boxes.length;
    el.progress.innerHTML = order.map((_, i) => `<i class="${i < idx ? "is-done" : i === idx ? "is-now" : ""}"></i>`).join("");
    el.boxes.style.setProperty("--n", n);
    el.boxes.classList.toggle("is-solved", round.solved);
    el.boxes.innerHTML = round.boxes.map((id, i) => {
      const part = round.entry.parts[i];
      const t = id == null ? null : tileById(id);
      return `<div class="sb-box" data-box="${i}" data-sound="${label(part.s)}" aria-label="Box ${i + 1}${t ? `, ${t.g}` : ", empty"}">${t ? tileHTML(t, i) : ""}</div>`;
    }).join("");
    const placed = new Set(round.boxes.filter(id => id != null));
    el.bank.innerHTML = round.tiles.map(t => placed.has(t.id) ? `<span class="sb-slot" aria-hidden="true"></span>` : tileHTML(t, 0)).join("");
  }

  function setNote(text, kind = "") {
    el.note.textContent = text;
    el.note.className = `sb-note${kind ? ` is-${kind}` : ""}`;
  }

  /* ---------- Moves ---------- */
  function place(id, boxIndex) {
    if (round.solved) return;
    const from = round.boxes.indexOf(id);
    if (from > -1) round.boxes[from] = null;
    if (boxIndex == null) boxIndex = round.boxes.indexOf(null);
    if (boxIndex < 0) return render();
    const occupant = round.boxes[boxIndex];
    if (occupant != null && from > -1) round.boxes[from] = occupant; // swap two placed tiles
    round.boxes[boxIndex] = id;
    clearHint();
    saySound(tileById(id).s);
    render();
    pop(id);
    if (!round.boxes.includes(null)) setTimeout(check, 260);
  }

  function unplace(id) {
    if (round.solved) return;
    const from = round.boxes.indexOf(id);
    if (from > -1) round.boxes[from] = null;
    render();
  }

  function pop(id) {
    if (reduceMotion) return;
    const t = el.boxes.querySelector(`[data-id="${id}"]`);
    if (t) { t.classList.add("is-pop"); t.addEventListener("animationend", () => t.classList.remove("is-pop"), { once: true }); }
  }

  function check() {
    const parts = round.entry.parts;
    const wrong = round.boxes.map((id, i) => tileById(id).g !== parts[i].g ? i : -1).filter(i => i > -1);
    if (!wrong.length) return win();

    round.misses++;
    const zTrap = wrong.some(i => parts[i].s !== soundOf(parts[i].g) && tileById(round.boxes[i]).g === parts[i].s);
    setNote(zTrap ? `Good ears! It sounds like /${parts.find(p => p.s !== soundOf(p.g)).s}/, but this word spells it with ${parts.find(p => p.s !== soundOf(p.g)).g}.` : "So close. Try again.", "oops");
    sayVoice("again");
    wrong.forEach(i => el.boxes.querySelector(`[data-box="${i}"]`).classList.add("is-wrong"));
    setTimeout(() => {
      wrong.forEach(i => { round.boxes[i] = null; });
      render();
      if (round.misses >= 2) hint();
    }, reduceMotion ? 300 : 750);
  }

  function hint() {
    const i = round.boxes.indexOf(null);
    if (i < 0) return;
    const want = round.entry.parts[i].g;
    const t = round.tiles.find(t => t.g === want && !round.boxes.includes(t.id));
    const btn = t && el.bank.querySelector(`[data-id="${t.id}"]`);
    if (btn) btn.classList.add("is-hint");
  }
  const clearHint = () => $$(".is-hint", el.bank).forEach(b => b.classList.remove("is-hint"));

  function win() {
    round.solved = true;
    render();
    const special = round.entry.parts.find(p => p.s !== soundOf(p.g));
    setNote(special ? `You built it! Yes, that ${special.g} says /${special.s}/.` : "You built it!", "yay");
    el.clear.hidden = true;
    el.next.hidden = false;
    el.next.textContent = idx + 1 < order.length ? "Next word" : "Finish level";
    sayVoice("yes").then(() => sayWord(round.entry.word));
    setTimeout(() => el.next.focus({ preventScroll: true }), 400);
  }

  /* ---------- Pointer: tap or drag ---------- */
  let drag = null, justDragged = false;

  document.addEventListener("pointerdown", e => {
    const tile = e.target.closest(".sb-tile");
    if (!tile || !round || round.solved || e.button > 0) return;
    drag = { tile, id: Number(tile.dataset.id), x: e.clientX, y: e.clientY, moving: false, pointer: e.pointerId };
    tile.setPointerCapture(e.pointerId);
  });

  document.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moving && Math.hypot(dx, dy) > 6) { drag.moving = true; drag.tile.classList.add("is-dragging"); }
    if (!drag.moving) return;
    drag.tile.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-8, Math.min(8, dx * 0.04))}deg)`;
    $$(".sb-box.is-over").forEach(b => b.classList.remove("is-over"));
    const over = dropTarget(e.clientX, e.clientY);
    if (over && over.box) over.box.classList.add("is-over");
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag; drag = null;
    $$(".sb-box.is-over").forEach(b => b.classList.remove("is-over"));
    if (!d.moving) return; // a tap: the click handler takes it
    justDragged = true; setTimeout(() => { justDragged = false; }, 0);
    const target = dropTarget(e.clientX, e.clientY);
    d.tile.style.transform = "";
    d.tile.classList.remove("is-dragging");
    if (target && target.box) place(d.id, Number(target.box.dataset.box));
    else if (target && target.bank) unplace(d.id);
    else render();
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  function dropTarget(x, y) {
    const hit = document.elementsFromPoint(x, y).filter(n => !n.classList.contains("is-dragging"));
    for (const n of hit) {
      const box = n.closest && n.closest(".sb-box");
      if (box) return { box };
      if (n.closest && n.closest(".sb-bank")) return { bank: true };
    }
    // Forgiving drops: the nearest box within half a box of the finger.
    let best = null, bestD = Infinity;
    $$(".sb-box", el.boxes).forEach(b => {
      const r = b.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestD && d < r.width * 1.1) { best = b; bestD = d; }
    });
    return best ? { box: best } : null;
  }

  // Taps (and Enter/Space): bank tile -> first empty box, box tile -> back to the bank.
  el.play.addEventListener("click", e => {
    const tile = e.target.closest(".sb-tile");
    if (!tile || justDragged) return;
    const id = Number(tile.dataset.id);
    if (round.solved) { saySound(tileById(id).s); return; }
    if (tile.closest(".sb-box")) unplace(id); else place(id);
  });

  /* ---------- Buttons ---------- */
  el.levels.addEventListener("click", e => { const b = e.target.closest("[data-level]"); if (b) startLevel(Number(b.dataset.level)); });
  el.chips.addEventListener("click", e => { const b = e.target.closest("[data-level]"); if (b) startLevel(Number(b.dataset.level)); });
  el.hear.addEventListener("click", () => sayWord(round.entry.word));
  el.clear.addEventListener("click", () => { round.boxes.fill(null); clearHint(); setNote(""); render(); });
  el.next.addEventListener("click", () => { idx++; if (idx < order.length) nextWord(false); else finishLevel(); });
  el.nextLevel.addEventListener("click", () => startLevel(Math.min(level.n + 1, LEVELS.length)));
  el.again.addEventListener("click", () => startLevel(level.n));
  const toLevels = () => { if (current) current.pause(); if ("speechSynthesis" in window) speechSynthesis.cancel(); show("start"); };
  el.levelsBtn.addEventListener("click", toLevels);
  el.home.addEventListener("click", toLevels);

  if (document.fullscreenEnabled) {
    el.full.hidden = false;
    el.full.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}));
    document.addEventListener("fullscreenchange", () => { el.full.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"; });
  }

  renderLevels();
  show("start");
})();
