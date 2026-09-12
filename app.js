(() => {
  const LAYERS = [
    { id: "white", name: "White noise", icon: "\u25CC", type: "noise", kind: "white" },
    { id: "pink",  name: "Pink noise",  icon: "\u25CD", type: "noise", kind: "pink" },
    { id: "brown", name: "Brown noise", icon: "\u25CF", type: "noise", kind: "brown" },
    { id: "rain",  name: "Rainfall",    icon: "\u2614", type: "rain" },
    { id: "storm", name: "Distant thunder", icon: "\u26C8", type: "thunder" },
    { id: "ocean", name: "Ocean swell", icon: "\uD83C\uDF0A", type: "ocean" },
    { id: "wind",  name: "Wind",        icon: "\uD83C\uDF2C", type: "wind" },
    { id: "fire",  name: "Hearth",      icon: "\uD83D\uDD25", type: "fire" },
    { id: "night", name: "Night air",   icon: "\uD83C\uDF19", type: "night" },
  ];

  const PRESETS = [
    { name: "Focus hiss", set: { white: 18, pink: 42, brown: 0, rain: 0, storm: 0, ocean: 0, wind: 0, fire: 0, night: 0 } },
    { name: "Soft rain", set: { white: 0, pink: 8, brown: 10, rain: 62, storm: 8, ocean: 0, wind: 12, fire: 0, night: 0 } },
    { name: "Storm window", set: { white: 0, pink: 6, brown: 16, rain: 70, storm: 36, ocean: 0, wind: 28, fire: 0, night: 0 } },
    { name: "Coast", set: { white: 0, pink: 0, brown: 22, rain: 0, storm: 0, ocean: 70, wind: 24, fire: 0, night: 8 } },
    { name: "Cabin", set: { white: 0, pink: 10, brown: 18, rain: 22, storm: 0, ocean: 0, wind: 10, fire: 48, night: 12 } },
    { name: "Deep sleep", set: { white: 0, pink: 16, brown: 55, rain: 18, storm: 0, ocean: 10, wind: 0, fire: 0, night: 8 } },
  ];

  const STATIONS = [
    { name: "SomaFM \u2014 Drone Zone", sub: "Atmospheric textures", url: "https://ice4.somafm.com/dronezone-128-mp3" },
    { name: "SomaFM \u2014 Deep Space One", sub: "Inner / outer space ambient", url: "https://ice4.somafm.com/deepspaceone-128-mp3" },
    { name: "SomaFM \u2014 Groove Salad", sub: "Chill downtempo", url: "https://ice4.somafm.com/groovesalad-128-mp3" },
    { name: "SomaFM \u2014 Groove Salad Classic", sub: "Early-2000s chill", url: "https://ice4.somafm.com/gsclassic-128-mp3" },
    { name: "SomaFM \u2014 Space Station", sub: "Spaced-out electronica", url: "https://ice4.somafm.com/spacestation-128-mp3" },
    { name: "SomaFM \u2014 Synphaera", sub: "Cinematic space ambient", url: "https://ice4.somafm.com/synphaera-128-mp3" },
    { name: "SomaFM \u2014 Dark Zone", sub: "Deep dark ambient", url: "https://ice4.somafm.com/darkzone-128-mp3" },
    { name: "SomaFM \u2014 Lush", sub: "Mellow vocals & hush", url: "https://ice4.somafm.com/lush-128-mp3" },
    { name: "RadioArt \u2014 Meditation", sub: "Mindfulness channel", url: "https://live.radioart.com/fMeditation.mp3" },
    { name: "RadioArt \u2014 Yoga", sub: "Gentle practice music", url: "https://live.radioart.com/fYoga.mp3" },
    { name: "Positively Meditation", sub: "positivity.radio", url: "https://streaming.positivity.radio/pr/posimeditation/icecast.audio" },
    { name: "Positively Zen", sub: "positivity.radio", url: "https://streaming.positivity.radio/pr/zen/icecast.audio" },
    { name: "Positively Ocean", sub: "Sea + calm music", url: "https://streaming.positivity.radio/pr/posiocean/icecast.audio" },
    { name: "Positively Calm", sub: "Soft instrumental", url: "https://streaming.positivity.radio/pr/calm/icecast.audio" },
  ];

  const levels = Object.fromEntries(LAYERS.map(l => [l.id, 0]));
  levels.pink = 35;
  const enabled = Object.fromEntries(LAYERS.map(l => [l.id, l.id === "pink"]));

  let ctx, masterGain, analyser, started = false, sleepTimer = null, rainDropTimer = null, thunderTimer = null, fireTimer = null, nightTimer = null;
  const nodes = {};

  const $ = (id) => document.getElementById(id);
  const radioEl = $("radio");

  function fillNoise(data, kind) {
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") data[i] = w;
      else if (kind === "brown") {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
  }

  function makeLoop(seconds, fill) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    fill(buf.getChannelData(0));
    fill(buf.getChannelData(1));
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  function ensureCtx() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = $("master").value / 100;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    buildGraph();
  }

  function buildGraph() {
    LAYERS.forEach(layer => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(masterGain);
      const pack = { gain };
      if (layer.type === "noise") {
        const src = makeLoop(4, (d) => fillNoise(d, layer.kind));
        const filter = ctx.createBiquadFilter();
        filter.type = layer.kind === "white" ? "highshelf" : "lowshelf";
        filter.frequency.value = layer.kind === "brown" ? 200 : 1200;
        filter.gain.value = layer.kind === "white" ? -2 : 2;
        src.connect(filter);
        filter.connect(gain);
        src.start();
        pack.src = src;
      } else if (layer.type === "rain") {
        const src = makeLoop(6, (d) => fillNoise(d, "white"));
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 2400;
        bp.Q.value = 0.55;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 400;
        src.connect(hp); hp.connect(bp); bp.connect(gain);
        src.start();
        pack.src = src;
      } else if (layer.type === "ocean") {
        const src = makeLoop(8, (d) => fillNoise(d, "brown"));
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 480;
        lp.Q.value = 0.7;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = "sine";
        lfo.frequency.value = 0.07;
        lfoGain.gain.value = 280;
        lfo.connect(lfoGain);
        lfoGain.connect(lp.frequency);
        src.connect(lp); lp.connect(gain);
        src.start(); lfo.start();
        pack.src = src; pack.lfo = lfo;
      } else if (layer.type === "wind") {
        const src = makeLoop(7, (d) => fillNoise(d, "pink"));
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 700;
        bp.Q.value = 0.8;
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 0.11;
        lfoG.gain.value = 220;
        lfo.connect(lfoG); lfoG.connect(bp.frequency);
        src.connect(bp); bp.connect(gain);
        src.start(); lfo.start();
        pack.src = src;
      }
      nodes[layer.id] = pack;
    });
  }

  function setLayerGain(id) {
    const pack = nodes[id];
    if (!pack) return;
    const v = enabled[id] ? levels[id] / 100 : 0;
    const scale = id === "white" ? 0.22 : id === "pink" ? 0.38 : id === "brown" ? 0.55
      : id === "rain" ? 0.42 : id === "ocean" ? 0.7 : id === "wind" ? 0.45 : 0.4;
    pack.gain.gain.setTargetAtTime(v * scale, ctx.currentTime, 0.04);
  }

  function dropBurst() {
    if (!started || !enabled.rain || !ctx) return;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = ctx.currentTime + Math.random() * 0.18;
      const src = makeLoop(0.35, (d) => {
        for (let k = 0; k < d.length; k++) d[k] = (Math.random() * 2 - 1) * Math.exp(-k / (d.length * 0.18));
      });
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800 + Math.random() * 3200;
      bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12 + Math.random() * 0.1);
      src.connect(bp); bp.connect(g); g.connect(nodes.rain.gain);
      src.start(t); src.stop(t + 0.25);
    }
    const next = 80 + Math.random() * (enabled.rain && levels.rain > 40 ? 220 : 420);
    rainDropTimer = setTimeout(dropBurst, next);
  }

  function thunderBurst() {
    if (!started || !enabled.storm || !ctx) return;
    const t = ctx.currentTime + 0.02;
    const src = makeLoop(2.2, (d) => fillNoise(d, "brown"));
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(120, t);
    lp.frequency.exponentialRampToValueAtTime(80, t + 1.6);
    const g = ctx.createGain();
    const amp = 0.35 + (levels.storm / 100) * 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    src.connect(lp); lp.connect(g); g.connect(masterGain);
    src.start(t); src.stop(t + 2.1);
    thunderTimer = setTimeout(thunderBurst, 8000 + Math.random() * 18000);
  }

  function firePop() {
    if (!started || !enabled.fire || !ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.25));
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 600 + Math.random() * 2500;
    bp.Q.value = 2.4;
    const g = ctx.createGain();
    g.gain.value = 0.04 + (levels.fire / 100) * 0.08;
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start(t);
    fireTimer = setTimeout(firePop, 60 + Math.random() * 280);
  }

  let fireBed;
  function startFireBed() {
    if (fireBed || !ctx) return;
    const src = makeLoop(3, (d) => fillNoise(d, "pink"));
    const bp = ctx.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(bp); bp.connect(g); g.connect(masterGain);
    src.start();
    fireBed = { src, g };
  }

  function nightChirp() {
    if (!started || !enabled.night || !ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 2800 + Math.random() * 1800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.012 + (levels.night / 100) * 0.02, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g); g.connect(masterGain);
    osc.start(t); osc.stop(t + 0.06);
    nightTimer = setTimeout(nightChirp, 400 + Math.random() * 1400);
  }

  function applyLevels() {
    if (!ctx) return;
    LAYERS.forEach(l => setLayerGain(l.id));
    if (fireBed) {
      const on = started && enabled.fire;
      fireBed.g.gain.setTargetAtTime(on ? (levels.fire / 100) * 0.12 : 0, ctx.currentTime, 0.05);
    }
  }

  function startGen() {
    ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    started = true;
    applyLevels();
    startFireBed();
    applyLevels();
    clearTimeout(rainDropTimer); dropBurst();
    clearTimeout(thunderTimer);
    if (enabled.storm) thunderTimer = setTimeout(thunderBurst, 2500);
    clearTimeout(fireTimer);
    if (enabled.fire) firePop();
    clearTimeout(nightTimer);
    if (enabled.night) nightChirp();
    $("playBtn").textContent = "Pause";
    $("playBtn").classList.add("playing");
    updateState();
    draw();
  }

  function pauseGen() {
    started = false;
    clearTimeout(rainDropTimer); clearTimeout(thunderTimer);
    clearTimeout(fireTimer); clearTimeout(nightTimer);
    if (ctx) {
      LAYERS.forEach(l => {
        if (nodes[l.id]) nodes[l.id].gain.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      });
      if (fireBed) fireBed.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    }
    $("playBtn").textContent = "Play";
    $("playBtn").classList.remove("playing");
    updateState();
  }

  function toggleGen() { started ? pauseGen() : startGen(); }

  function stopAll() {
    pauseGen();
    radioEl.pause();
    radioEl.removeAttribute("src");
    radioEl.load();
    document.querySelectorAll(".station").forEach(b => b.classList.remove("live"));
    $("nowPlaying").textContent = "";
    if (sleepTimer) { clearTimeout(sleepTimer); sleepTimer = null; }
    document.querySelectorAll("[data-sleep]").forEach(b => b.classList.toggle("active", b.dataset.sleep === "0"));
    updateState();
  }

  function updateState() {
    const radioOn = !radioEl.paused && !!radioEl.src;
    const on = started || radioOn;
    $("dot").classList.toggle("on", on);
    $("stateLabel").textContent = started && radioOn ? "Generator + station"
      : started ? "Generator running"
      : radioOn ? "Station playing"
      : "Idle \u2014 press Play";
  }

  const layersEl = $("layers");
  LAYERS.forEach(l => {
    const row = document.createElement("div");
    row.className = "layer" + (enabled[l.id] ? " on" : "");
    row.innerHTML = '<div class="ico">' + l.icon + '</div><div class="name">' + l.name + '</div><input type="range" min="0" max="100" value="' + levels[l.id] + '" data-id="' + l.id + '" /><button class="toggle' + (enabled[l.id] ? ' on' : '') + '" data-tog="' + l.id + '" aria-label="toggle"></button>';
    layersEl.appendChild(row);
  });

  layersEl.addEventListener("input", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    levels[id] = +e.target.value;
    if (levels[id] > 0 && !enabled[id]) {
      enabled[id] = true;
      e.target.closest(".layer").classList.add("on");
      e.target.closest(".layer").querySelector(".toggle").classList.add("on");
    }
    if (ctx) setLayerGain(id);
  });
  layersEl.addEventListener("click", (e) => {
    const id = e.target.dataset.tog;
    if (!id) return;
    enabled[id] = !enabled[id];
    e.target.classList.toggle("on", enabled[id]);
    e.target.closest(".layer").classList.toggle("on", enabled[id]);
    if (enabled[id] && !started) startGen();
    if (ctx) setLayerGain(id);
    if (started && enabled.storm && !thunderTimer) thunderTimer = setTimeout(thunderBurst, 400);
    if (started && enabled.fire && !fireTimer) firePop();
    if (started && enabled.night && !nightTimer) nightChirp();
  });

  const presetsEl = $("presets");
  PRESETS.forEach(p => {
    const b = document.createElement("button");
    b.className = "tiny";
    b.textContent = p.name;
    b.addEventListener("click", () => {
      LAYERS.forEach(l => {
        levels[l.id] = p.set[l.id] || 0;
        enabled[l.id] = levels[l.id] > 0;
      });
      layersEl.querySelectorAll(".layer").forEach((row, i) => {
        const l = LAYERS[i];
        row.classList.toggle("on", enabled[l.id]);
        row.querySelector("input").value = levels[l.id];
        row.querySelector(".toggle").classList.toggle("on", enabled[l.id]);
      });
      if (!started) startGen();
      else applyLevels();
    });
    presetsEl.appendChild(b);
  });

  $("playBtn").addEventListener("click", toggleGen);
  $("stopBtn").addEventListener("click", stopAll);
  $("master").addEventListener("input", (e) => {
    $("masterVal").textContent = e.target.value + "%";
    if (masterGain) masterGain.gain.setTargetAtTime(e.target.value / 100, ctx.currentTime, 0.03);
  });
  $("radioVol").addEventListener("input", (e) => {
    $("radioVal").textContent = e.target.value + "%";
    radioEl.volume = e.target.value / 100;
  });
  radioEl.volume = 0.8;

  document.querySelectorAll("[data-sleep]").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-sleep]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      if (sleepTimer) clearTimeout(sleepTimer);
      const m = +b.dataset.sleep;
      if (!m) { sleepTimer = null; return; }
      sleepTimer = setTimeout(() => fadeOutThenStop(12), m * 60 * 1000);
    });
  });
  document.querySelector('[data-sleep="0"]').classList.add("active");

  function fadeOutThenStop(seconds) {
    const startM = masterGain ? masterGain.gain.value : 0.7;
    const startR = radioEl.volume;
    const t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / (seconds * 1000));
      if (masterGain) masterGain.gain.value = startM * (1 - p);
      radioEl.volume = startR * (1 - p);
      if (p < 1) requestAnimationFrame(step);
      else stopAll();
    })(t0);
  }

  const stationsEl = $("stations");
  STATIONS.forEach((s) => {
    const b = document.createElement("button");
    b.className = "station";
    b.innerHTML = "<b>" + s.name + "</b><small>" + s.sub + "</small>";
    b.addEventListener("click", () => playStation(s.url, s.name, b));
    stationsEl.appendChild(b);
  });

  async function playStation(url, name, btn) {
    document.querySelectorAll(".station").forEach(b => b.classList.remove("live"));
    if (btn) btn.classList.add("live");
    $("nowPlaying").textContent = "Tuning\u2026 " + name;
    try {
      if (/\.m3u8?(\?|$)/i.test(url)) {
        const text = await fetch(url).then(r => r.text());
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
        if (!lines.length) throw new Error("Empty playlist");
        url = lines[0];
      }
      radioEl.src = url;
      await radioEl.play();
      $("nowPlaying").textContent = "On air \u00b7 " + name;
    } catch (err) {
      $("nowPlaying").textContent = "Could not start that stream. Try another, or paste a direct MP3/AAC URL.";
      if (btn) btn.classList.remove("live");
    }
    updateState();
  }

  radioEl.addEventListener("error", () => {
    $("nowPlaying").textContent = "Stream error \u2014 pick a different station.";
    updateState();
  });
  radioEl.addEventListener("playing", updateState);
  radioEl.addEventListener("pause", updateState);

  $("customPlay").addEventListener("click", () => {
    const u = $("customUrl").value.trim();
    if (!u) return;
    playStation(u, "Custom stream", null);
  });
  $("customUrl").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("customPlay").click();
  });

  $("dlM3u").addEventListener("click", () => {
    const body = "#EXTM3U\n" + STATIONS.map(s => "#EXTINF:-1," + s.name + "\n" + s.url).join("\n");
    const blob = new Blob([body], { type: "audio/x-mpegurl" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "haven-relaxation.m3u";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" && e.target.tagName !== "INPUT") {
      e.preventDefault();
      toggleGen();
    }
  });

  const canvas = $("viz");
  const c = canvas.getContext("2d");
  const freq = new Uint8Array(512);
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
  }
  addEventListener("resize", resize); resize();

  let drops = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.2, l: 8 + Math.random() * 16
  }));

  function draw() {
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    if (analyser && started) analyser.getByteFrequencyData(freq);
    const rainAmt = started && enabled.rain ? levels.rain / 100 : 0.15;
    c.strokeStyle = "rgba(170,210,255," + (0.08 + rainAmt * 0.25) + ")";
    c.lineWidth = 1 * devicePixelRatio;
    drops.forEach(d => {
      d.y += d.s * 0.004 * (0.6 + rainAmt * 2);
      if (d.y > 1) { d.y = -0.05; d.x = Math.random(); }
      const x = d.x * w, y = d.y * h;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + d.l * devicePixelRatio); c.stroke();
    });
    if (analyser) {
      const bars = 64;
      const step = Math.floor(freq.length / bars);
      for (let i = 0; i < bars; i++) {
        const v = freq[i * step] / 255;
        const bh = v * h * 0.18;
        const x = (i / bars) * w;
        c.fillStyle = "rgba(126,182,255," + (0.05 + v * 0.18) + ")";
        c.fillRect(x, h - bh, w / bars - 2, bh);
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
})();
