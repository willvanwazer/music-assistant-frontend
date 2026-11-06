/* ==========================================================================
   Music Assistant — "Liner Notes" interactive prototype
   Vanilla JS; renders HTML strings from a single state object.
   ========================================================================== */
(function () {
  "use strict";
  const D = window.MA_DATA;
  const {
    ARTISTS,
    ALBUMS,
    LYRICS,
    GENRES,
    PLAYLISTS,
    RADIO,
    byTitle,
    tracksFor,
    U,
    rng,
  } = D;

  /* ------------------------------------------------------------------ icons */
  const F = 'fill="currentColor" stroke="none"';
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6.5 8-6.5s8 2.5 8 6.5"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M16.5 7.5a6 6 0 0 1 1.5 3"/>',
    music:
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    list: '<path d="M3 6h12M3 12h12M3 18h8"/><path d="M17 18V8l4-1"/><circle cx="15" cy="18" r="2"/>',
    shapes:
      '<path d="M8.3 10a.7.7 0 0 1-.6-1L11.4 3a.7.7 0 0 1 1.2 0L16.3 9a.7.7 0 0 1-.6 1z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
    radio:
      '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
    podcast:
      '<circle cx="12" cy="11" r="1.6"/><path d="M12 15v6"/><path d="M8 14a5 5 0 1 1 8 0M5.6 17.4a9 9 0 1 1 12.8 0"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    folder:
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    settings:
      '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    play: `<path d="M7 4.6v14.8a.8.8 0 0 0 1.2.7l12-7.4a.8.8 0 0 0 0-1.4l-12-7.4A.8.8 0 0 0 7 4.6z" ${F}/>`,
    pause: `<rect x="6" y="4.5" width="4" height="15" rx="1.2" ${F}/><rect x="14" y="4.5" width="4" height="15" rx="1.2" ${F}/>`,
    prev: `<path d="M18.5 19.2 9 12.6a.8.8 0 0 1 0-1.2l9.5-6.6a.8.8 0 0 1 1.3.6v13.2a.8.8 0 0 1-1.3.6z" ${F}/><rect x="4.5" y="4.5" width="2.6" height="15" rx="1.3" ${F}/>`,
    next: `<path d="M5.5 4.8 15 11.4a.8.8 0 0 1 0 1.2l-9.5 6.6a.8.8 0 0 1-1.3-.6V5.4a.8.8 0 0 1 1.3-.6z" ${F}/><rect x="16.9" y="4.5" width="2.6" height="15" rx="1.3" ${F}/>`,
    shuffle:
      '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    repeat:
      '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    heart:
      '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    heartf: `<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" ${F}/>`,
    more: `<circle cx="5" cy="12" r="1.6" ${F}/><circle cx="12" cy="12" r="1.6" ${F}/><circle cx="19" cy="12" r="1.6" ${F}/>`,
    queue:
      '<path d="M16 12H3M16 6H3M10 18H3"/><path d="M21 6v10a2 2 0 0 1-2 2h-5"/><path d="m16 16-2 2 2 2"/>',
    lyrics:
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    speaker:
      '<rect x="5" y="2" width="14" height="20" rx="2.5"/><circle cx="12" cy="14" r="4"/><path d="M12 6h.01"/>',
    soundbar:
      '<rect x="2" y="9" width="20" height="6" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>',
    homepod:
      '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M10 6.5h4"/>',
    laptop:
      '<rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    dac: '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="17" cy="12" r="2"/><path d="M6 12h6"/>',
    vol: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevU: '<path d="m18 15-6-6-6 6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    radioStart:
      '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19"/><circle cx="12" cy="12" r="2"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    listv: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    focus:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    sort: '<path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    grip: `<circle cx="9" cy="6" r="1.3" ${F}/><circle cx="15" cy="6" r="1.3" ${F}/><circle cx="9" cy="12" r="1.3" ${F}/><circle cx="15" cy="12" r="1.3" ${F}/><circle cx="9" cy="18" r="1.3" ${F}/><circle cx="15" cy="18" r="1.3" ${F}/>`,
    sparkles:
      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    quill:
      '<path d="M20 3C13 4 8 9 6 17l-1 4"/><path d="M7.5 13.5C11 13 15 11 17 7"/>',
    wave: '<path d="M2 12h2l2-6 3 12 3-15 3 18 3-12 2 3h2"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    transfer: '<path d="M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    booklet:
      '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
    library: '<path d="M4 4v16M8 4v16M12 4l4 16M17 4v16"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
    battery: `<rect x="2" y="7" width="18" height="10" rx="3"/><rect x="4" y="9" width="12" height="6" rx="1.5" ${F}/><path d="M22 11v2"/>`,
    signal: `<rect x="3" y="14" width="3" height="6" rx="1" ${F}/><rect x="8.5" y="10" width="3" height="10" rx="1" ${F}/><rect x="14" y="6" width="3" height="14" rx="1" ${F}/><rect x="19.5" y="2" width="3" height="18" rx="1" ${F}/>`,
  };
  const I = (n, c = "") =>
    `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;
  const LOGO = `<svg viewBox="0 0 28 28" width="26" height="26"><rect width="28" height="28" rx="8" fill="currentColor"/><path d="M7 19a7 7 0 0 1 14 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M10.5 19a3.5 3.5 0 0 1 7 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".75"/><circle cx="14" cy="19" r="1.3" fill="#fff"/></svg>`;

  /* ---------------------------------------------------------------- helpers */
  const fmt = (s) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const mins = (s) => {
    const m = Math.round(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} min`;
  };
  const alb = (id) => ALBUMS.find((a) => a.id === id);
  const art = (id) => ARTISTS[id];
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const im = (src, alt = "") =>
    `<img src="${src}" alt="${esc(alt)}" decoding="async">`;
  const SRC = {
    local: ["local", I("library")],
    qobuz: ["qobuz", "Q"],
    tidal: ["tidal", "T"],
    spotify: ["spotify", "S"],
  };
  const SRCN = {
    local: "Local library",
    qobuz: "Qobuz",
    tidal: "Tidal",
    spotify: "Spotify",
  };
  const badges = (al) =>
    `<div class="badges">${al.src.map((s) => `<span class="sbadge ${SRC[s][0]}" title="${SRCN[s]}">${SRC[s][1]}</span>`).join("")}</div>`;
  const cvr = (al, cls = "", extra = "") =>
    `<div class="cv ${cls}">${im(al.cover(), al.title)}${extra}</div>`;
  const qcls = (al) => (al.quality === "lossy" ? "lq" : "lossless");
  const qlbl = (al) =>
    al.quality === "hires"
      ? "Hi-Res"
      : al.quality === "cd"
        ? "CD quality"
        : "Lossy";
  const total = (al) => tracksFor(al).reduce((s, t) => s + t[1], 0);
  const roomIcon = (r) =>
    I(
      r.icon === "soundbar"
        ? "soundbar"
        : r.icon === "homepod"
          ? "homepod"
          : r.icon === "laptop"
            ? "laptop"
            : r.icon === "dac"
              ? "dac"
              : "speaker",
    );
  const ART_PH = (a, w = 800, h) => U(a.photo, w, h);

  /* ------------------------------------------------------------------ state */
  const ROOMS = D.ROOMS.map((r) => ({
    ...r,
    albumId: r.album ? byTitle(r.album).id : null,
    pos: r.pos || 0,
    track: r.track || 0,
    shuffle: r.id === "living",
    repeat: false,
  }));
  const room = (id) => ROOMS.find((r) => r.id === id);
  const lead = (r) => (r.leader ? room(r.leader) : r);
  const members = (r) => (r.group || []).map(room);
  const rname = (r, short) =>
    r.group && r.group.length
      ? short
        ? `${r.name} +${r.group.length}`
        : `${r.name} + ${members(r)
            .map((m) => m.name)
            .join(" + ")}`
      : r.name;

  const S = {
    screen: "home",
    albumId: byTitle("Low Tide Hymnal").id,
    artistId: "marigold",
    theme: "dark",
    accent: "roon",
    font: "playfair",
    overlay: null,
    roomId: "living",
    npTab: "next",
    q: "mari",
    artistTab: "overview",
    recent: "played",
    facets: new Set(),
    libView: "grid",
    toast: null,
    hist: [],
    fut: [],
    roomSort: "playing",
  };
  const cur = () => lead(room(S.roomId));
  const nowAl = (r = cur()) => (r.albumId ? alb(r.albumId) : null);
  const nowTr = (r = cur()) => {
    const al = nowAl(r);
    return al ? tracksFor(al)[r.track] : null;
  };

  /* --------------------------------------------------------- signal paths */
  const SIG = {
    living: {
      cls: "hq",
      label: "High quality",
      short: "24/96 → 48",
      nodes: [
        [
          "lossless",
          "Source",
          "Local library · FLAC 24-bit / 96 kHz · stereo",
          "★ Lossless",
        ],
        [
          "enhanced",
          "Volume levelling",
          "Track loudness −14.2 LUFS · gain −2.1 dB",
          "Enhanced",
        ],
        [
          "enhanced",
          "DSP · Room correction",
          "Parametric EQ · 5 bands · −0.8 dB headroom",
          "Enhanced",
        ],
        [
          "hq",
          "Sonos Arc · Living Room",
          "Resampled to 24-bit / 48 kHz for Sonos",
          "High quality",
        ],
        [
          "hq",
          "HomePod mini · Kitchen",
          "AirPlay 2 · ALAC 16-bit / 44.1 kHz",
          "High quality",
        ],
      ],
    },
    studio: {
      cls: "lossless",
      label: "Lossless",
      short: "24/96",
      nodes: [
        [
          "lossless",
          "Source",
          "Qobuz · FLAC 24-bit / 96 kHz · stereo",
          "★ Lossless",
        ],
        [
          "lossless",
          "Squeezelite → WiiM Pro",
          "Bit-perfect · no volume or DSP applied",
          "★ Lossless",
        ],
        [
          "lossless",
          "Schiit Modi · USB DAC",
          "24-bit / 96 kHz · hardware volume",
          "★ Lossless",
        ],
      ],
    },
    bedroom: {
      cls: "hq",
      label: "High quality",
      short: "24/192 → 96",
      nodes: [
        ["lossless", "Source", "Qobuz · FLAC 24-bit / 192 kHz", "★ Lossless"],
        [
          "hq",
          "Chromecast Audio",
          "Resampled to 24-bit / 96 kHz",
          "High quality",
        ],
      ],
    },
  };
  const sig = (r) =>
    SIG[r.id] || {
      cls: "lossless",
      label: "Lossless",
      short: "16/44.1",
      nodes: [],
    };

  /* --------------------------------------------------------- waveform data */
  const waveCache = {};
  function waveHeights(seed, n) {
    const k = seed + n;
    if (waveCache[k]) return waveCache[k];
    const r = rng(seed);
    const out = [];
    let v = 0.5;
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const env =
        0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, x * 1.15 + 0.04)) ** 0.6;
      v = v * 0.55 + r() * 0.45;
      const sect = x > 0.38 && x < 0.62 ? 1.08 : x > 0.78 ? 0.85 : 1;
      out.push(Math.max(0.12, Math.min(1, env * (0.45 + v * 0.75) * sect)));
    }
    return (waveCache[k] = out);
  }
  function wave(r, n = 140, big = false) {
    const tr = nowTr(r);
    if (!tr) return `<div class="wave"></div>`;
    const frac = r.pos / tr[1];
    const hs = waveHeights(r.albumId + ":" + r.track, n);
    const cut = Math.floor(frac * n);
    return `<div class="wave" data-wave="${r.id}" data-a="seek" data-v="${r.id}">${hs.map((h, i) => `<i class="${i < cut ? "p" : ""}" style="height:${(h * 100).toFixed(0)}%"></i>`).join("")}${big ? "" : ""}</div>`;
  }

  /* ================================================================ SHELL */
  function sidebar(st) {
    const nav = (k, ic, label, ct = "") =>
      `<a class="nav ${st.screen === k ? "on" : ""}" data-a="go" data-v="${k}">${I(ic)}${label}${ct ? `<span class="ct">${ct}</span>` : ""}</a>`;
    const active = ROOMS.filter(
      (r) => !r.leader && (r.state === "playing" || r.state === "paused"),
    );
    return `<aside class="sb">
      <div class="wordmark"><span style="color:var(--accent);display:flex">${LOGO}</span>Music <span>Assistant</span></div>
      <a class="sb-search" data-a="search">${I("search", "s16")}Search<kbd>⌘K</kbd></a>
      ${nav("home", "home", "Home")}
      <div class="sb-label">Library</div>
      ${nav("artists", "user", "Artists", "1,284")}
      ${nav("albums", "disc", "Albums", "3,902")}
      ${nav("tracks", "music", "Tracks", "41.2k")}
      ${nav("playlists", "list", "Playlists", "112")}
      ${nav("genres", "shapes", "Genres")}
      <div class="sb-label">Listen</div>
      ${nav("radio", "radio", "Radio")}
      ${nav("podcasts", "podcast", "Podcasts")}
      ${nav("audiobooks", "book", "Audiobooks")}
      ${nav("browse", "folder", "Browse")}
      <div class="sb-label">Rooms <a data-a="rooms" class="acc">All 6</a></div>
      ${active
        .map((r) => {
          const tr = nowTr(r);
          const sel = lead(room(st.roomId)).id === r.id;
          return `<a class="nav room ${sel ? "sel" : ""} ${r.state === "paused" ? "paused" : ""}" data-a="room" data-v="${r.id}" title="Control ${esc(rname(r))}">${roomIcon(r)}<span class="rn">${esc(rname(r, true))}<small>${r.state === "paused" ? "Paused · " : ""}${tr ? esc(tr[0]) : ""}</small></span>${r.state === "playing" ? '<span class="eq" style="margin-left:auto"><i></i><i></i><i></i></span>' : `<span class="dot"></span>`}</a>`;
        })
        .join("")}
      <div class="grow"></div>
      ${nav("settings", "settings", "Settings")}
      <div class="sb-user"><div class="avatar">WV</div><div><b>Will</b><small>Admin · 2 profiles</small></div>${I("chevU", "s16")}</div>
    </aside>`;
  }

  function topbar(st, title) {
    return `<div class="topbar" data-topbar>
      <a class="cbtn ${st.hist.length ? "" : "dim"}" data-a="back" title="Back (⌘←)">${I("chevL")}</a>
      <a class="cbtn ${st.fut.length ? "" : "dim"}" data-a="fwd" title="Forward (⌘→)">${I("chevR")}</a>
      <span class="ttl disp">${esc(title || "")}</span>
      <div class="rt">
        <a class="searchpill" data-a="search">${I("search", "s16")}Search artists, albums, tracks…<kbd>⌘K</kbd></a>
        <a class="cbtn" title="Listen later">${I("bookmark", "s16")}</a>
      </div>
    </div>`;
  }

  function transport(st) {
    const r = cur();
    const al = nowAl(r);
    const tr = nowTr(r);
    const sg = sig(r);
    const vol = r.vol;
    const glass = st.overlay === "now";
    if (!al) {
      return `<footer class="tb ${glass ? "glass" : ""}"><div class="np"><div class="cv" style="width:62px;display:grid;place-items:center;color:var(--text-3)">${roomIcon(r)}</div><div class="meta"><div class="tt">Nothing playing</div><div class="ar">${esc(r.name)} is ready — pick something to play</div></div></div><div class="ctl"><div class="row"><span style="opacity:.4">${I("prev")}</span><a class="playbtn" style="opacity:.4">${I("play")}</a><span style="opacity:.4">${I("next")}</span></div></div>
      <div class="rt"><div class="vol">${I("vol")}<div class="sl" data-a="vol-set" data-v="${r.id}"><i style="width:${vol}%"></i><b style="left:${vol}%"></b></div><span class="v">${vol}</span></div><a class="roombtn ${st.overlay === "rooms" ? "on" : ""}" data-a="rooms">${roomIcon(r)}<span class="rnm">${esc(r.name)}</span>${I("chevU", "s14")}</a></div></footer>`;
    }
    return `<footer class="tb ${glass ? "glass" : ""}">
      <div class="np">
        <div class="cv" data-a="now" title="Open Now Playing (⌘E)">${im(al.cover(), al.title)}<span class="exp">${I("expand", "s20")}</span></div>
        <div class="meta"><div class="tt" data-a="now">${esc(tr[0])}</div><div class="ar"><a class="lnk" data-a="artist" data-v="${al.artistId}">${esc(al.artist)}</a> · <a data-a="album" data-v="${al.id}">${esc(al.title)}</a></div></div>
        <span class="heart">${I("heartf", "s16")}</span>
      </div>
      <div class="ctl">
        <div class="row">
          <a class="${r.shuffle ? "on" : ""}" data-a="shuffle" title="Shuffle">${I("shuffle", "s16")}</a>
          <a data-a="prev" title="Previous (⌘J)">${I("prev", "s20")}</a>
          <a class="playbtn" data-a="toggle" title="Play/Pause (Space)">${I(r.state === "playing" ? "pause" : "play", "s20")}</a>
          <a data-a="next" title="Next (⌘K)">${I("next", "s20")}</a>
          <a class="${r.repeat ? "on" : ""}" data-a="repeat" title="Repeat">${I("repeat", "s16")}</a>
        </div>
        <div class="seek"><span data-time="${r.id}">${fmt(r.pos)}</span>${wave(r, 150)}<span data-rem="${r.id}">−${fmt(tr[1] - r.pos)}</span></div>
      </div>
      <div class="rt">
        <a class="q pill ${sg.cls}" data-a="sig" title="Signal path">${'<span class="d"></span>'}${sg.short}</a>
        <a class="ib ${st.overlay === "now" && st.npTab === "lyrics" ? "on" : ""}" data-a="lyrics" title="Lyrics">${I("lyrics")}</a>
        <a class="ib ${st.overlay === "now" && st.npTab === "next" ? "on" : ""}" data-a="queue" title="Queue">${I("queue")}</a>
        <div class="vol"><a data-a="vol-step" data-v="-2" data-r="${r.id}" title="Volume down">${I("vol", "s16")}</a><div class="sl" data-a="vol-set" data-v="${r.id}"><i style="width:${vol}%"></i><b style="left:${vol}%"></b></div><span class="v" data-vol="${r.id}">${vol}</span></div>
        <a class="roombtn ${st.overlay === "rooms" ? "on" : ""}" data-a="rooms" title="Choose room">${roomIcon(r)}<span class="rnm">${esc(r.name)}</span>${r.group && r.group.length ? `<span class="plus">+${r.group.length}</span>` : ""}${I("chevU", "s14")}</a>
      </div>
    </footer>`;
  }

  /* ================================================================ CARDS */
  function card(al, opts = {}) {
    const playing =
      nowAl() && nowAl().id === al.id && cur().state === "playing";
    const sub =
      opts.sub !== undefined
        ? opts.sub
        : `<a data-a="artist" data-v="${al.artistId}">${esc(al.artist)}</a>`;
    return `<div class="card ${playing ? "playing" : ""}" data-a="album" data-v="${al.id}">
      <div style="position:relative">${cvr(al, "", (opts.badges !== false ? badges(al) : "") + (al.quality === "hires" && opts.hr !== false ? '<span class="hr">HI-RES</span>' : ""))}
        <div class="hov"><a class="mb" data-a="noop" title="More">${I("more", "s16")}</a><a class="pb" data-a="play" data-v="${al.id}" title="Play in ${esc(rname(cur(), true))}">${I("play", "s20")}</a></div></div>
      <div class="t">${playing ? '<span class="eq" style="margin-right:6px"><i></i><i></i><i></i></span>' : ""}${esc(al.title)}</div>
      <div class="s">${sub}</div>${opts.after || ""}
    </div>`;
  }

  /* ================================================================ HOME */
  function home(st) {
    const r0 = cur();
    const roomCards = ["living", "studio", "bedroom", "office"]
      .map((id) => {
        const r = room(id);
        const al = nowAl(r);
        const tr = nowTr(r);
        const sel = lead(room(st.roomId)).id === r.id;
        if (!al) {
          return `<div class="rcard idle ${sel ? "sel" : ""}" data-a="room" data-v="${r.id}"><div class="ico">${roomIcon(r)}</div><div class="ri"><div class="rn">${esc(r.name)} <span class="faint" style="font-weight:500">· ${esc(r.device)}</span></div><div class="tt" style="color:var(--text-2)">Ready to play</div><div class="ar">Pick something, or transfer a queue here</div></div></div>`;
        }
        return `<div class="rcard ${sel ? "sel" : ""} ${r.state === "paused" ? "paused" : ""}" data-a="room" data-v="${r.id}">
        <div class="tint" style="background:radial-gradient(circle at 20% 50%, ${al.tint[0]}, transparent 70%), radial-gradient(circle at 90% 30%, ${al.tint[1]}, transparent 60%)"></div>
        ${cvr(al)}
        <div class="ri"><div class="rn">${r.state === "playing" ? '<span class="eq"><i></i><i></i><i></i></span>' : I("pause", "s14")}${esc(rname(r, true))}</div>
          <div class="tt">${esc(tr[0])}</div><div class="ar">${esc(al.artist)}</div>
          <div class="mini"><i data-prog="${r.id}" style="width:${((r.pos / tr[1]) * 100).toFixed(1)}%"></i></div></div>
        <a class="rp" data-a="roomtoggle" data-v="${r.id}" title="${r.state === "playing" ? "Pause" : "Play"} ${esc(r.name)}">${I(r.state === "playing" ? "pause" : "play", "s16")}</a>
      </div>`;
      })
      .join("");

    const recentSets = {
      played: [
        ["Ember Theory", "2 hrs ago", "Living Room"],
        ["Concerto for Quiet Rooms", "3 hrs ago", "Studio"],
        ["Northbound", "Last night", "Bedroom"],
        ["Low Tide Hymnal", "Yesterday", "Kitchen"],
        ["Velvet Arithmetic", "Tuesday", "Living Room"],
        ["A Small Weather", "Monday", "Office"],
      ],
      added: [
        ["Glass Orchard", "Today"],
        ["Paper Lanterns", "Yesterday"],
        ["Ember Theory", "3 days ago"],
        ["Concerto for Quiet Rooms", "4 days ago"],
        ["Northbound", "5 days ago"],
        ["A Small Weather", "Last week"],
      ],
      favourites: [
        ["Low Tide Hymnal", "Favourited"],
        ["Sodium Nights", "Favourited"],
        ["Holloway", "Favourited"],
        ["Coastal Grammar", "Favourited"],
        ["Sunday Static", "Favourited"],
        ["Glass Orchard", "Favourited"],
      ],
    };
    const recent = recentSets[st.recent]
      .map(([t, when, where]) =>
        card(byTitle(t), {
          hr: false,
          after: `<div class="when">${I(where ? "speaker" : "clock")}${when}${where ? ` · ${where}` : ""}</div>`,
        }),
      )
      .join("");

    const nr = [
      ["Glass Orchard", "New album · Out today"],
      ["Saltmarsh", "New album · 31 October"],
      ["Teal Hour", "Deluxe edition · 24 October"],
    ]
      .map(([t, lab]) => {
        const al = byTitle(t);
        return `<div class="nr" data-a="album" data-v="${al.id}"><div style="flex:1;min-width:0"><div class="ar">${esc(al.artist)}</div><div class="al">${esc(al.title)}</div><div class="dt">${lab}</div><div class="nb"><a class="btn sm pri" data-a="play" data-v="${al.id}">${I("play", "s14")}Play</a><a class="btn sm icon" style="width:32px">${I("heart", "s14")}</a></div></div>${cvr(al)}</div>`;
      })
      .join("");

    const pls = PLAYLISTS.map(
      (p) =>
        `<div class="card"><div class="mosaic">${p.covers.map((t) => im(byTitle(t).cover())).join("")}${p.smart ? `<span class="smart">${I("sparkles")}Smart</span>` : ""}</div><div class="t">${esc(p.name)}</div><div class="s">${p.count} tracks · ${p.mins}</div></div>`,
    ).join("");
    const radio = RADIO.map(
      (s, i) =>
        `<div class="card"><div class="station" style="background:${s.col};color:${s.ink}">${esc(s.name)}${i < 2 ? '<span class="live">LIVE</span>' : ""}</div><div class="t" style="text-align:center">${esc(s.name)}</div><div class="s" style="text-align:center">${esc(s.sub)}</div></div>`,
    ).join("");
    const genres = GENRES.map(
      (g, i) =>
        `<div class="genre ${i === 0 ? "w2 h2" : i === 3 ? "w2" : ""}">${im(U(g.photo, i === 0 ? 900 : 600, i === 0 ? 620 : 400), g.name)}<div><b>${esc(g.name)}</b><small>${g.count} albums</small></div></div>`,
    ).join("");

    const stats = [
      ["user", "1,284", "Artists"],
      ["disc", "3,902", "Albums"],
      ["music", "41,220", "Tracks"],
      ["quill", "412", "Composers"],
      ["list", "112", "Playlists"],
    ]
      .map(
        ([ic, n, l]) =>
          `<a class="stat" data-a="go" data-v="${l === "Albums" ? "albums" : l.toLowerCase()}">${I(ic, "s22")}<div><b>${n}</b><span>${l}</span></div></a>`,
      )
      .join("");
    const playingCount = ROOMS.filter(
      (r) => r.state === "playing" && !r.leader,
    ).length;
    return `<div class="home-top"><div class="wash"></div>
        <div class="greet"><div class="eyebrow">Thursday 6 November · ${playingCount} rooms playing</div><h1 class="disp">Good evening, Will</h1></div>
        <div class="stats">${stats}</div>
      </div>
      <div class="pad">
        <div class="sect"><div class="sect-h"><h3 class="disp">Around the house</h3><span class="sub">Tap a room to control it</span><div class="rt"><a class="more" data-a="rooms">All rooms</a></div></div><div class="rooms-row">${roomCards}</div></div>
        <div class="sect"><div class="band"><div class="bh"><h3 class="disp">Recent activity</h3><div class="tabs2">${["played", "added", "favourites"].map((k) => `<a class="${st.recent === k ? "on" : ""}" data-a="recent" data-v="${k}">${k}</a>`).join("")}</div><div class="rt"><a class="arr">${I("chevL", "s16")}</a><a class="arr">${I("chevR", "s16")}</a><a class="more">MORE</a></div></div><div class="grid6">${recent}</div></div></div>
        <div class="sect"><div class="sect-h"><h3 class="disp">New releases for you</h3><span class="sub">From artists in your library</span><div class="rt"><a class="more">See all</a></div></div><div class="nr-grid">${nr}</div></div>
        <div class="sect"><div class="sect-h"><h3 class="disp">Your playlists</h3><div class="rt"><a class="more">See all 112</a></div></div><div class="pl-grid">${pls}</div></div>
        <div class="sect"><div class="sect-h"><h3 class="disp">Radio</h3><span class="sub">Stations you follow</span><div class="rt"><a class="more">Browse radio</a></div></div><div class="radio-grid">${radio}</div></div>
        <div class="sect"><div class="sect-h"><h3 class="disp">Genres</h3><span class="sub">Your library, by sound</span><div class="rt"><a class="more">All genres</a></div></div><div class="genre-mosaic">${genres}</div></div>
        <div style="height:30px"></div>
      </div>`;
  }

  /* ============================================================= LIBRARY */
  const FAVS = new Set([
    "Low Tide Hymnal",
    "Sodium Nights",
    "Holloway",
    "Coastal Grammar",
    "Sunday Static",
    "Glass Orchard",
    "Ember Theory",
    "Northbound",
  ]);
  const FACETS = [
    ["hires", "Hi-Res", (a) => a.quality === "hires"],
    ["local", "Local", (a) => a.src.includes("local")],
    ["qobuz", "Qobuz", (a) => a.src.includes("qobuz")],
    ["tidal", "Tidal", (a) => a.src.includes("tidal")],
    ["fav", "Favourites", (a) => FAVS.has(a.title)],
    ["jazz", "Jazz", (a) => ["halvard", "teo"].includes(a.artistId)],
  ];
  function library(st) {
    let list = ALBUMS.slice();
    st.facets.forEach((f) => {
      const fx = FACETS.find((x) => x[0] === f);
      if (fx) list = list.filter(fx[2]);
    });
    const sortName = (a) => a.artist.replace(/^The /, "");
    list.sort(
      (a, b) => sortName(a).localeCompare(sortName(b)) || a.year - b.year,
    );
    const groups = {};
    list.forEach((a) => {
      const L = sortName(a)[0].toUpperCase();
      (groups[L] = groups[L] || []).push(a);
    });
    const letters = Object.keys(groups);
    const body = letters
      .map(
        (L) =>
          `<div class="letter-sec" data-letter="${L}"><div class="letter">${L}<span class="faint" style="font:500 12px Inter">${groups[L].length} albums</span></div><div class="grid7">${groups[L].map((a) => card(a, { sub: `<a data-a="artist" data-v="${a.artistId}">${esc(a.artist)}</a><span class="faint">${a.year}</span>` })).join("")}</div></div>`,
      )
      .join("");
    const az = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#"
      .split("")
      .map(
        (L) =>
          `<a class="${groups[L] ? "has" : ""}" ${groups[L] ? `data-a="az" data-v="${L}"` : ""}>${L}</a>`,
      )
      .join("");
    const n = st.facets.size;
    const focusPop =
      st.overlay === "focus"
        ? `<div class="focus-pop" data-stop>
        <h4 class="disp">Focus</h4><p>Combine filters to narrow 3,902 albums. Click twice to exclude. Save any Focus as a smart playlist.</p>
        ${[
          [
            "Quality",
            [
              ["hires", "Hi-Res 24-bit", "1,204"],
              ["cd", "CD quality", "2,310"],
              ["lossy", "Lossy", "388"],
            ],
          ],
          [
            "Source",
            [
              ["local", "Local library", "2,871"],
              ["qobuz", "Qobuz", "812"],
              ["tidal", "Tidal", "166"],
              ["spotify", "Spotify", "53"],
            ],
          ],
          [
            "Genre",
            [
              ["jazz", "Jazz", "431"],
              ["indie", "Indie & Alternative", "812"],
              ["classical", "Classical", "377"],
              ["electronic", "Electronic", "290"],
              ["folk", "Folk", "244"],
            ],
          ],
          [
            "Decade",
            [
              ["60s", "1960s", "188"],
              ["70s", "1970s", "402"],
              ["10s", "2010s", "1,322"],
              ["20s", "2020s", "641"],
            ],
          ],
          [
            "Release type",
            [
              ["album", "Album", "3,310"],
              ["ep", "EP", "298"],
              ["live", "Live", "201"],
              ["comp", "Compilation", "93"],
            ],
          ],
        ]
          .map(
            ([g, items]) =>
              `<div class="fg"><b>${g}</b><div>${items.map(([k, l, c]) => `<a class="chip ${st.facets.has(k) ? "on" : ""}" data-a="facet" data-v="${k}">${l} <span class="c">${c}</span></a>`).join("")}</div></div>`,
          )
          .join("")}
        <div style="display:flex;gap:8px;margin-top:12px"><a class="btn sm pri">${I("sparkles", "s14")}Save as smart playlist</a><a class="btn sm" data-a="facet-clear">Clear</a><a class="btn sm ghost" style="margin-left:auto" data-a="close">Done</a></div>
      </div>`
        : "";
    return `<div class="lib-head"><div><div class="eyebrow">Library</div><h1 class="disp" style="margin-top:10px">Albums</h1><div class="ct">${n ? `${list.length} of 3,902 albums match your Focus` : "3,902 albums · 2,871 local · 1,031 from streaming"}</div></div>
        <div class="rt"><div class="split"><a class="btn pri" data-a="play" data-v="${list[0] ? list[0].id : ""}">${I("play", "s16")}Play now</a><a class="btn pri">${I("chevD", "s16")}</a></div><a class="btn">${I("shuffle", "s16")}Shuffle</a></div></div>
      <div class="toolbar">
        <a class="focusbtn" data-a="focus">${I("focus", "s16")}Focus${n ? `<span class="n">${n}</span>` : ""}</a>
        <span class="sep"></span>
        ${FACETS.map(([k, l]) => `<a class="chip ${st.facets.has(k) ? "on" : ""}" data-a="facet" data-v="${k}">${st.facets.has(k) ? I("check", "s14") : ""}${l}</a>`).join("")}
        <div class="rt"><a class="sortchip">${I("sort", "s14")}<span>Sort</span> Artist A–Z</a><div class="viewtog"><a class="on">${I("grid", "s16")}</a><a>${I("listv", "s16")}</a></div></div>
      </div>
      <div class="az-wrap"><div class="az">${az}</div>${focusPop}</div>
      <div class="lib-body">${body || `<div style="padding:60px 0;text-align:center" class="muted"><div class="disp" style="font-size:28px;color:var(--text)">Nothing matches that Focus</div><p style="margin-top:8px">Try removing a filter, or <a class="acc" data-a="search">search everywhere</a>.</p></div>`}</div>`;
  }

  /* ============================================================== ARTIST */
  function artistView(st) {
    const a = art(st.artistId);
    const albums = ALBUMS.filter((x) => x.artistId === a.id).sort(
      (x, y) => y.year - x.year,
    );
    const top = albums.length ? albums[0] : null;
    const isM = a.id === "marigold";
    const tops = isM
      ? [
          ["Slow Combustion", "Ember Theory", 271, 100],
          ["Low Tide Hymnal", "Low Tide Hymnal", 312, 92],
          ["Afterglow", "Ember Theory", 287, 81],
          ["Undertow", "Low Tide Hymnal", 271, 74],
          ["Satellite Choir", "Satellite Choir", 244, 60],
          ["Kindling", "Ember Theory", 221, 55],
          ["Pier Lights", "Low Tide Hymnal", 214, 41],
          ["Tin Roof Sermons", "Tin Roof Sermons", 233, 33],
        ]
      : albums.slice(0, 4).flatMap((al) =>
          tracksFor(al)
            .slice(0, 2)
            .map((t, i) => [t[0], al.title, t[1], 90 - i * 20]),
        );
    const nowT = nowTr();
    const ttRows = tops
      .slice(0, 8)
      .map(([t, alT, d, pc], i) => {
        const al = byTitle(alT) || albums[0];
        const playing = nowT && nowT[0] === t && nowAl().title === alT;
        return `<div class="tt-row ${playing ? "playing" : ""}" data-a="play" data-v="${al.id}" data-t="${Math.max(
          0,
          tracksFor(al).findIndex((x) => x[0] === t),
        )}"><span class="n">${playing ? '<span class="eq"><i></i><i></i><i></i></span>' : i + 1}</span>${cvr(al)}<span class="nm"><b>${esc(t)}</b><small>${esc(alT)}</small></span><span class="pc"><i style="width:${pc}%"></i></span><span class="d">${fmt(d)}</span></div>`;
      })
      .join("");
    const similar = Object.values(ARTISTS)
      .filter((x) => x.id !== a.id)
      .slice(0, 7)
      .map(
        (x) =>
          `<div class="person" data-a="artist" data-v="${x.id}"><div class="ph">${im(ART_PH(x, 300, 300), x.name)}</div><b>${esc(x.name)}</b><small>${esc(x.genres[0])}</small></div>`,
      )
      .join("");
    const av = (n, c) =>
      `<div><span class="av" style="background:${c}">${n
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)}</span>${esc(n)}</div>`;
    const bio = isM
      ? `<p>Built around <a class="lnk" data-a="noop">Hannah Okafor</a>’s reverb-drenched voice and <a class="lnk" data-a="noop">Tom Reyes</a>’s baritone guitar, The Marigold Static spent their first years recording tape loops in a converted chapel outside Bristol.</p><p>The patient, tidal songs of <a class="lnk" data-a="album" data-v="${byTitle("Low Tide Hymnal").id}"><i>Low Tide Hymnal</i></a> (2019) won them a cult following; <a class="lnk" data-a="album" data-v="${byTitle("Ember Theory").id}"><i>Ember Theory</i></a> widened the frame with brass, a children’s choir and a new appetite for noise, produced again by <a class="lnk" data-a="noop">Ada Linnell</a>. <a class="rm">Read more</a></p>`
      : `<p>${esc(a.name)} formed in ${esc(a.origin)} in ${a.formed}. Their records sit somewhere between ${esc(a.genres.join(" and ").toLowerCase())} — patient, detailed music that rewards a good pair of speakers. <a class="rm">Read more</a></p>`;
    const tabs = [
      "overview",
      "discography",
      "top tracks",
      "appears on",
      "similar artists",
    ];
    const ov = st.artistTab === "overview";
    return `<div class="a-hero"><div class="ph ${a.flip ? "flip" : ""}">${im(ART_PH(a, 1600, 1000), a.name)}</div>
        <div class="info"><div class="eyebrow">Artist · ${esc(a.genres.slice(0, 2).join(", "))}</div><h1 class="disp">${esc(a.name)}</h1>
          <div class="meta">${esc(a.origin)}<i></i>Formed ${a.formed}<i></i>${albums.length} albums in your library<i></i>148 plays this year</div>
          <div class="actions"><div class="split"><a class="btn pri" data-a="play" data-v="${top ? top.id : ""}" title="Play in ${esc(rname(cur(), true))}">${I("play", "s16")}Play now</a><a class="btn pri">${I("chevD", "s16")}</a></div><a class="btn">${I("shuffle", "s16")}Shuffle</a><a class="btn">${I("radioStart", "s16")}Start radio</a><a class="btn icon" style="color:var(--accent)">${I("heartf", "s16")}</a><a class="btn icon">${I("more", "s16")}</a></div>
        </div><span class="credit">Photo · Unsplash</span></div>
      <div class="tabs">${tabs.map((t) => `<a class="${st.artistTab === t ? "on" : ""}" data-a="atab" data-v="${t}" style="text-transform:capitalize">${t}</a>`).join("")}</div>
      <div style="height:30px"></div>
      <div class="pad">
        ${
          ov || st.artistTab === "discography"
            ? `<div class="sect"><div class="sect-h"><h3 class="disp">Discography</h3><div style="display:flex;gap:6px;margin-left:10px"><a class="chip on">All ${albums.length}</a><a class="chip">Albums ${albums.filter((x) => x.type === "Album").length}</a><a class="chip">Live ${albums.filter((x) => x.type === "Live").length}</a><a class="chip">EPs ${albums.filter((x) => x.type === "EP").length}</a></div><div class="rt"><a class="sortchip" style="font-size:12.5px;color:var(--text-2)">Newest first ${I("chevD", "s14")}</a></div></div><div class="grid6">${albums
                .slice(0, 6)
                .map((al) => card(al, { sub: `${al.year} · ${al.type}` }))
                .join("")}</div></div>`
            : ""
        }
        ${ov || st.artistTab === "top tracks" ? `<div class="sect"><div class="sect-h"><h3 class="disp">Top tracks</h3><span class="sub">By plays in your house</span><div class="rt"><a class="more">Play all</a></div></div><div class="toptracks">${ttRows}</div></div>` : ""}
      </div>
      ${
        ov
          ? `<div class="a-over" style="padding-top:0"><div><div class="sect-h"><h3 class="disp">About</h3></div><div class="bio">${bio}</div></div>
        <div class="facts"><div class="sect-h"><h3 class="disp" style="font-size:22px">Facts</h3></div><dl>
          <dt>Formed</dt><dd>${a.formed} · ${esc(a.origin)}</dd>
          ${a.members ? `<dt>Members</dt><dd>${a.members.map((m) => `<a class="lnk">${esc(m)}</a>`).join(", ")}</dd>` : ""}
          <dt>Genres</dt><dd class="tags">${a.genres.map((g) => `<span class="tag">${esc(g)}</span>`).join("")}</dd>
          <dt>Labels</dt><dd>Halfmoon Records, Saltwater</dd>
          <dt>Sources</dt><dd style="display:flex;gap:6px;align-items:center"><span class="sbadge local" style="position:static">${I("library")}</span><span class="sbadge qobuz" style="position:static">Q</span><span class="sbadge tidal" style="position:static">T</span><span class="faint" style="font-size:12px">3 providers linked</span></dd>
        </dl></div></div>`
          : ""
      }
      <div class="pad" style="padding-top:34px">
        ${ov || st.artistTab === "similar artists" ? `<div class="sect"><div class="sect-h"><h3 class="disp">Similar artists</h3><div class="rt"><a class="more">See all</a></div></div><div class="people">${similar}</div></div>` : ""}
        ${ov ? `<div class="sect lineage"><div><h4>Influenced by</h4><div class="lp">${av("Velvet Harbour", "#6d5a8c")}${av("Mara Kessler", "#8c5a5a")}${av("Glasshouse Choir", "#5a7a8c")}</div></div><div><h4>Followed by</h4><div class="lp">${av("June Arcade", "#7a8c5a")}${av("Holy Coast", "#8c7a5a")}${av("Saltwater Static", "#5a8c7d")}</div></div></div>` : ""}
        ${st.artistTab === "appears on" ? `<div class="sect"><div class="grid6">${[byTitle("Paper Lanterns"), byTitle("Sunday Static"), byTitle("Glass Orchard")].map((al) => card(al, { sub: `${esc(al.artist)} · ${al.year}` })).join("")}</div></div>` : ""}
        <div style="height:20px"></div>
      </div>`;
  }

  /* =============================================================== ALBUM */
  const CREDITS = {
    "Low Tide Hymnal": [
      ["Producer", "Ada Linnell"],
      ["Recorded by", "Marco Petit"],
      ["Mixed by", "Ada Linnell, Tom Reyes"],
      ["Mastered by", "Kai Hara · Sun Room"],
      ["Vocals", "Hannah Okafor"],
      ["Guitars", "Tom Reyes, Priya Lund"],
      ["Drums", "Sol Mendes"],
      ["Artwork", "Priya Lund"],
    ],
    "Ember Theory": [
      ["Producer", "Ada Linnell"],
      ["Mixed by", "Joan Abara"],
      ["Vocals", "Hannah Okafor"],
      ["Baritone guitar", "Tom Reyes"],
      ["Brass", "The Severn Horns"],
      ["Choir", "St Agnes Youth Choir"],
      ["Drums", "Sol Mendes"],
    ],
  };
  const credits = (al) =>
    CREDITS[al.title] || [
      ["Producer", "Ada Linnell"],
      ["Engineer", "Marco Petit"],
      ["Mastered by", "Kai Hara"],
      ["Label", al.label || "Halfmoon Records"],
    ];
  function albumView(st) {
    const al = alb(st.albumId);
    const a = art(al.artistId);
    const trs = tracksFor(al);
    const r = cur();
    const playingHere = nowAl() && nowAl().id === al.id;
    const perf = a && a.members ? a.members.slice(0, 2).join(" · ") : al.artist;
    const rows = trs
      .map(([t, d, ft], i) => {
        const isP = playingHere && r.track === i;
        return `<div class="tl-r ${isP ? "playing" : ""}" data-a="play" data-v="${al.id}" data-t="${i}">
        <span class="n">${isP ? `<span class="eq ${r.state !== "playing" ? "stop" : ""}"><i></i><i></i><i></i></span>` : `<span class="num">${i + 1}</span><span class="pi">${I("play", "s14")}</span>`}</span>
        <span class="nm"><b>${esc(t)}${ft ? ` <span class="faint" style="font-weight:500">${esc(ft)}</span>` : ""}</b><small>${esc(i % 3 === 2 ? (a && a.members ? a.members[2] + " · " + a.members[0] : perf) : perf)}</small></span>
        <span class="x"><a class="${i === 1 || i === 3 ? "on" : ""}">${I(i === 1 || i === 3 ? "heartf" : "heart", "s16")}</a><a>${I("more", "s16")}</a></span>
        <span class="d">${fmt(d)}</span></div>`;
      })
      .join("");
    const more = ALBUMS.filter(
      (x) => x.artistId === al.artistId && x.id !== al.id,
    ).slice(0, 6);
    const playMenu =
      st.overlay === "playmenu"
        ? `<div class="menu" data-stop>
        ${[
          ["play", "Play now", "Replaces the queue"],
          ["shuffle", "Shuffle", ""],
          ["queue", "Play next", "After the current track"],
          ["list", "Add to queue", "At the end"],
          ["radioStart", "Start radio", "Endless mix from this album"],
        ]
          .map(
            ([ic, l, s]) =>
              `<a class="mi" data-a="${ic === "play" ? "play" : "close"}" data-v="${al.id}">${I(ic, "s16")}<span>${l}${s ? `<small>${s}</small>` : ""}</span></a>`,
          )
          .join("")}
        <div class="msep">Play in</div>
        ${ROOMS.filter((x) => !x.leader && x.state !== "off")
          .map(
            (x) =>
              `<a class="mi" data-a="playin" data-v="${x.id}">${roomIcon(x)}<span>${esc(rname(x, true))}<small>${x.state === "playing" ? "Playing · will replace" : x.state === "paused" ? "Paused" : "Ready"}</small></span>${lead(room(st.roomId)).id === x.id ? `<span class="ck">${I("check", "s16")}</span>` : ""}</a>`,
          )
          .join("")}
      </div>`
        : "";
    const versions = [
      [al, `${al.year} · Original`, al.fmt, true],
      [
        { ...al, cover: al.cover },
        `${al.year + 5} · Remaster`,
        "FLAC 24/192",
        false,
      ],
      [
        { ...al },
        `${al.year + 1} · Deluxe edition`,
        "FLAC 16/44.1 · 14 tracks",
        false,
      ],
    ];
    return `<div class="al-hero" style="--h1:${al.tint[0]};--h2:${al.tint[1]};--h3:${al.tint[2]}"><div class="bgw"></div>
        ${cvr(al)}
        <div style="min-width:0;position:relative">
          <div class="eyebrow">${al.type} · ${al.year}</div>
          <h1 class="disp">${esc(al.title)}</h1>
          <div class="by">${a ? `<span class="av">${im(ART_PH(a, 80, 80))}</span>` : ""}<a class="lnk" data-a="artist" data-v="${al.artistId}">${esc(al.artist)}</a></div>
          <div class="line">${trs.length} tracks · ${mins(total(al))}<i></i><span class="q ${qcls(al)}"><span class="d"></span>${qlbl(al)} · ${al.fmt}</span><i></i>${esc(al.label || "Halfmoon Records")}<i></i>Added ${esc(al.added || "last year")}</div>
          <div class="actions">
            <div class="split"><a class="btn pri" data-a="play" data-v="${al.id}" title="Play in ${esc(rname(cur(), true))}">${I("play", "s16")}Play now</a><a class="btn pri" data-a="playmenu" title="More play options">${I("chevD", "s16")}</a></div>
            <a class="btn">${I("shuffle", "s16")}Shuffle</a><a class="btn">${I("radioStart", "s16")}Start radio</a>
            <a class="btn icon" title="Add to queue">${I("queue", "s16")}</a><a class="btn icon" style="color:var(--accent)" title="Favourite">${I("heartf", "s16")}</a><a class="btn icon">${I("more", "s16")}</a>
            ${playMenu}
          </div>
        </div>
      </div>
      <div class="al-body">
        <div>
          <div class="tl-h"><span style="text-align:right">#</span><span>Title</span><span></span><span style="text-align:right">${I("clock", "s14")}</span></div>
          ${rows}
          <div class="tl-foot">Released 14 June ${al.year} · ${esc(al.label || "Halfmoon Records")}<br>Playing from <b style="color:var(--text-2)">${SRCN[al.src[0]]}</b> · ${al.fmt} · <a class="acc">Change source</a></div>
        </div>
        <div class="rail">
          <section><h4>About this album</h4><blockquote class="disp rq">“A record that sounds as if it were recorded underwater and mixed at dawn — patient, luminous, and quietly the band’s high-water mark.”</blockquote><a class="acc" style="font-size:12.5px;font-weight:600">Read the full review</a></section>
          <section><h4>Credits</h4><dl class="credits">${credits(al)
            .map(
              ([k, v]) =>
                `<dt>${k}</dt><dd>${v
                  .split(", ")
                  .map((n) => `<a class="lnk">${esc(n)}</a>`)
                  .join(", ")}</dd>`,
            )
            .join("")}</dl></section>
          <section><h4>Available from</h4>${["local", "qobuz", "tidal"]
            .filter((s) => al.src.includes(s) || s === "qobuz")
            .map(
              (s, i) =>
                `<div class="prov ${i === 0 ? "on" : ""}"><span class="pi sbadge ${s}" style="width:30px;height:30px;border-radius:8px;font-size:12px">${SRC[s][1]}</span><span><b>${SRCN[s]}</b><small>${s === "tidal" ? "FLAC 16/44.1" : al.fmt}${s === "local" ? " · /music/flac" : ""}</small></span>${i === 0 ? `<span class="ck">${I("check", "s16")}</span>` : ""}</div>`,
            )
            .join("")}</section>
          <section><h4>Versions</h4>${versions.map(([v, l, f, on]) => `<div class="ver ${on ? "on" : ""}">${cvr(v)}<span><b>${l}</b><small>${f}</small></span>${on ? `<span class="ck">${I("check", "s16")}</span>` : ""}</div>`).join("")}</section>
          <section><h4>Tags</h4><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag">Dream pop</span><span class="tag">Shoegaze</span><span class="tag">Rainy Sunday</span><span class="tag">Vinyl owned</span><a class="tag" style="color:var(--accent)">+ Add tag</a></div></section>
        </div>
      </div>
      ${more.length ? `<div class="pad"><div class="sect"><div class="sect-h"><h3 class="disp">More by ${esc(al.artist)}</h3><div class="rt"><a class="more" data-a="artist" data-v="${al.artistId}">Go to artist</a></div></div><div class="grid6">${more.map((x) => card(x, { sub: `${x.year} · ${x.type}` })).join("")}</div></div></div>` : ""}`;
  }

  /* ========================================================= NOW PLAYING */
  function nowPlaying(st) {
    const r = cur();
    const al = nowAl(r);
    if (!al) return "";
    const tr = nowTr(r);
    const trs = tracksFor(al);
    const a = art(al.artistId);
    const sg = sig(r);
    const remaining =
      trs.slice(r.track + 1).reduce((s, t) => s + t[1], 0) + (tr[1] - r.pos);
    let panel = "";
    if (st.npTab === "next") {
      panel = `<div class="np-scroll">
        <div class="q-lbl">Now playing<span>${mins(remaining)} left in queue</span></div>
        <div class="q-row cur">${cvr(al)}<span style="min-width:0"><b>${esc(tr[0])}</b><small>${esc(al.artist)}</small></span><span class="eq ${r.state !== "playing" ? "stop" : ""}"><i></i><i></i><i></i></span></div>
        <div class="q-lbl">Up next<span>from ${esc(al.title)}</span></div>
        ${trs
          .slice(r.track + 1)
          .map(
            (t, i) =>
              `<div class="q-row" data-a="play" data-v="${al.id}" data-t="${r.track + 1 + i}">${cvr(al)}<span style="min-width:0"><b>${esc(t[0])}</b><small>${esc(al.artist)}</small></span><span style="display:flex;gap:10px;align-items:center"><span class="d">${fmt(t[1])}</span><span class="grip">${I("grip", "s16")}</span></span></div>`,
          )
          .join("")}
        <div class="autoplay">${I("sparkles", "s16")}<span><b style="color:var(--text);font-weight:600">Autoplay</b> · similar music keeps going after the queue</span><span class="toggle on tg"></span></div>
        <div class="q-lbl">Then, from Autoplay</div>
        ${["Paper Lanterns", "Glass Orchard", "A Small Weather"]
          .map((t) => {
            const x = byTitle(t);
            return `<div class="q-row" style="opacity:.7">${cvr(x)}<span style="min-width:0"><b>${esc(tracksFor(x)[0][0])}</b><small>${esc(x.artist)}</small></span><span class="d">${fmt(tracksFor(x)[0][1])}</span></div>`;
          })
          .join("")}
      </div>`;
    } else if (st.npTab === "lyrics") {
      panel = `<div class="np-scroll" data-lyrics-box><div class="lyrics">${LYRICS.map(([t, l]) => (l ? `<p data-a="lyric" data-v="${t}" data-lt="${t}">${esc(l)}</p>` : `<p class="gap" data-lt="${t}"></p>`)).join("")}</div><div class="lyr-src">Synced lyrics · LRCLIB · Click a line to jump to it</div></div>`;
    } else if (st.npTab === "credits") {
      panel = `<div class="np-scroll np-credits"><div class="q-lbl" style="padding-left:0">${esc(tr[0])}</div><dl class="credits">${[
        ["Written by", "Hannah Okafor, Tom Reyes"],
        ...credits(al),
      ]
        .map(
          ([k, v]) =>
            `<dt>${k}</dt><dd>${v
              .split(", ")
              .map((n) => `<a class="lnk">${esc(n)}</a>`)
              .join(", ")}</dd>`,
        )
        .join("")}</dl></div>`;
    } else {
      panel = `<div class="np-scroll np-about"><div class="ph">${a ? im(ART_PH(a, 800, 500)) : ""}</div><div class="q-lbl" style="padding-left:0">About the artist</div><p class="disp" style="font-weight:400">${a && a.bio ? esc(a.bio) : esc(al.artist) + " — biography from your library metadata."}</p><a class="btn sm" style="margin-top:14px" data-a="artist" data-v="${al.artistId}">Go to artist</a></div>`;
    }
    const tabs = [
      ["next", "Up next"],
      ["lyrics", "Lyrics"],
      ["credits", "Credits"],
      ["about", "Artist"],
    ];
    return `<div class="np-ov" data-np>
      <div class="ub"><i></i><i></i><i></i></div><div class="veil"></div><div class="grain"></div>
      <div class="np-top"><a class="cbtn" data-a="close" title="Close (Esc)">${I("chevD")}</a>
        <a class="where" data-a="rooms">${roomIcon(r)}${esc(rname(r))}<span>· ${esc(r.device)}</span>${I("chevD", "s14")}</a>
        <a class="cbtn" title="Full screen">${I("expand", "s16")}</a><a class="cbtn">${I("more", "s16")}</a></div>
      <div class="np-body">
        <div class="np-left">
          ${cvr(al)}
          <div class="np-info">
            <div class="eyebrow">Track ${r.track + 1} of ${trs.length}</div>
            <h1 class="disp">${esc(tr[0])}</h1>
            <div class="ar"><a class="lnk" data-a="artist" data-v="${al.artistId}">${esc(al.artist)}</a></div>
            <div class="al"><a data-a="album" data-v="${al.id}">${esc(al.title)}</a> · ${al.year}</div>
            <div class="chips"><a class="gchip" data-a="sig"><span class="q ${sg.cls}" style="gap:0"><span class="d"></span></span>${sg.label} · ${sg.short}</a><span class="gchip">${I("wave")}−2.1 dB levelling</span><span class="gchip">${I("sparkles")}Autoplay on</span></div>
            <div class="seek2">${wave(r, 120, true)}<div class="times"><span data-time="${r.id}">${fmt(r.pos)}</span><span data-rem="${r.id}">−${fmt(tr[1] - r.pos)}</span></div></div>
            <div class="bigctl"><a class="dim ${r.shuffle ? "acc" : ""}" data-a="shuffle">${I("shuffle", "s20")}</a><a data-a="prev">${I("prev", "s26")}</a><a class="playbtn" data-a="toggle">${I(r.state === "playing" ? "pause" : "play", "s26")}</a><a data-a="next">${I("next", "s26")}</a><a class="dim" data-a="repeat">${I("repeat", "s20")}</a><span style="margin-left:auto;color:var(--accent)">${I("heartf", "s22")}</span></div>
          </div>
        </div>
        <div class="np-panel"><div class="np-tabs">${tabs.map(([k, l]) => `<a class="${st.npTab === k ? "on" : ""}" data-a="nptab" data-v="${k}">${l}</a>`).join("")}</div>${panel}</div>
      </div>
    </div>`;
  }

  /* =============================================================== ROOMS */
  function roomsDrawer(st) {
    const selId = lead(room(st.roomId)).id;
    let list = ROOMS.filter((r) => !r.leader);
    const order = { playing: 0, paused: 1, idle: 2, off: 3 };
    list.sort((a, b) =>
      a.id === selId
        ? -1
        : b.id === selId
          ? 1
          : st.roomSort === "az"
            ? a.name.localeCompare(b.name)
            : order[a.state] - order[b.state],
    );
    const playing = ROOMS.filter(
      (r) => r.state === "playing" && !r.leader,
    ).length;
    const zone = (r) => {
      const al = nowAl(r);
      const tr = nowTr(r);
      const sel = r.id === selId;
      const sg = sig(r);
      const head = al ? cvr(al) : `<div class="ico">${roomIcon(r)}</div>`;
      const status =
        r.state === "off"
          ? '<span class="badge-off">Off</span>'
          : al
            ? `${r.state === "paused" ? "Paused · " : ""}<b>${esc(tr[0])}</b> · ${esc(al.artist)}`
            : "Ready · nothing queued";
      const mem = members(r);
      return `<div class="zone ${sel ? "sel" : ""}" data-a="room" data-v="${r.id}">
        <div class="zt">${head}<div class="zi"><div class="zn">${esc(r.name)}${mem.length ? `<span class="grp">+ ${mem.map((m) => esc(m.name)).join(", ")}</span>` : ""}</div><div class="zs">${status}</div><div class="zd">${roomIcon(r).replace('class="i ', 'class="i s14 ')} ${esc(r.device)} · ${esc(r.proto)}${al ? ` · <span class="q ${sg.cls}" style="font-size:11px"><span class="d" style="width:6px;height:6px"></span>${sg.short}</span>` : ""}</div></div>
          ${r.state === "off" ? `<a class="zp" data-a="power" data-v="${r.id}" title="Turn on">${I("power", "s16")}</a>` : `<a class="zp" data-a="roomtoggle" data-v="${r.id}">${I(r.state === "playing" ? "pause" : "play", "s16")}</a>`}</div>
        ${r.state !== "off" ? `<div class="zv"><span class="stepper"><a class="stb" data-a="vol-step" data-v="-2" data-r="${r.id}">${I("minus", "s14")}</a></span><div class="sl ${sel ? "acc" : ""}" data-a="vol-set" data-v="${r.id}"><i style="width:${r.vol}%"></i><b style="left:${r.vol}%"></b></div><span class="stepper"><a class="stb" data-a="vol-step" data-v="2" data-r="${r.id}">${I("plus", "s14")}</a><span class="val" data-vol="${r.id}">${r.vol}</span></span></div>` : ""}
        ${sel && mem.length ? `<div class="members">${[r, ...mem].map((m) => `<div class="mem">${roomIcon(m)}<span><b>${esc(m.name)}</b><small>${esc(m.device)}</small></span><div class="sl" data-a="vol-set" data-v="${m.id}"><i style="width:${m.vol}%"></i><b style="left:${m.vol}%"></b></div><span style="display:flex;gap:8px;align-items:center"><span class="val tnum" style="font:600 11.5px Inter;color:var(--text-2);width:18px;text-align:right" data-vol="${m.id}">${m.vol}</span>${m.id !== r.id ? `<a class="rm" data-a="ungroup" data-v="${m.id}" title="Remove from group">${I("x", "s14")}</a>` : '<span style="width:14px"></span>'}</span></div>`).join("")}</div>` : ""}
        ${
          sel && al
            ? `<div class="addto">${ROOMS.filter(
                (x) =>
                  x.id !== r.id &&
                  !x.leader &&
                  !(r.group || []).includes(x.id) &&
                  x.state !== "playing",
              )
                .map(
                  (x) =>
                    `<a class="chip" data-a="group" data-v="${x.id}">${I("plus", "s14")}${esc(x.name)}</a>`,
                )
                .join(
                  "",
                )}<a class="chip" data-a="noop">${I("transfer", "s14")}Transfer queue…</a></div>`
            : ""
        }
      </div>`;
    };
    return `<div class="scrim main-only" data-a="close"></div><div class="drawer" data-stop>
      <div class="dr-h"><div><h3 class="disp">Rooms</h3><div class="sub">${playing} playing · ${ROOMS.length} players · grouped rooms play in sync</div></div>
        <a class="cbtn x" data-a="close">${I("x", "s16")}</a></div>
      <div class="dr-sort"><span class="faint">Sort</span><div class="seg"><button class="${st.roomSort === "playing" ? "on" : ""}" data-a="rsort" data-v="playing">Playing first</button><button class="${st.roomSort === "az" ? "on" : ""}" data-a="rsort" data-v="az">A–Z</button></div><span class="faint" style="margin-left:auto">${I("check", "s14")} Remembered on this device</span></div>
      <div class="dr-body">${list.map(zone).join("")}</div>
      <div class="dr-foot"><a class="btn">${I("link", "s16")}Group rooms…</a><a class="btn">${I("settings", "s16")}Manage players</a></div>
    </div>`;
  }

  /* ============================================================== SEARCH */
  function searchResults(q) {
    const ql = q.trim().toLowerCase();
    const hl = (s) =>
      ql
        ? esc(s).replace(
            new RegExp(`(${ql.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"),
            "<mark>$1</mark>",
          )
        : esc(s);
    if (!ql) {
      return `<div><h5>Recent searches</h5>${["marigold", "halvard quartet", "lena moravec cello", "sunday slow"].map((s) => `<div class="s-row" data-a="sq" data-v="${s}" style="grid-template-columns:24px 1fr"><span class="faint">${I("clock", "s16")}</span><b style="font-weight:500">${s}</b></div>`).join("")}</div>
        <div><h5>Jump back in</h5><div class="s-alb">${["Ember Theory", "Concerto for Quiet Rooms", "Northbound", "Low Tide Hymnal"].map((t) => card(byTitle(t), { badges: false, hr: false })).join("")}</div></div>`;
    }
    const artists = Object.values(ARTISTS).filter((a) =>
      a.name.toLowerCase().includes(ql),
    );
    const albums = ALBUMS.filter(
      (a) =>
        a.title.toLowerCase().includes(ql) ||
        a.artist.toLowerCase().includes(ql),
    ).slice(0, 8);
    const tracks = [];
    ALBUMS.forEach((al) =>
      tracksFor(al).forEach((t, i) => {
        if (
          tracks.length < 6 &&
          (t[0].toLowerCase().includes(ql) ||
            al.artist.toLowerCase().includes(ql))
        )
          tracks.push([al, t, i]);
      }),
    );
    const pls = PLAYLISTS.filter((p) => p.name.toLowerCase().includes(ql));
    const topA = artists[0];
    const topAl = !topA && albums[0];
    const top = topA
      ? `<div class="top-res" data-a="artist" data-v="${topA.id}"><div class="ph">${im(ART_PH(topA, 300, 300))}</div><h4 class="disp">${hl(topA.name)}</h4><div class="ty">Artist · ${esc(topA.genres[0])} · in your library</div><a class="btn pri sm" data-a="play" data-v="${(ALBUMS.find((x) => x.artistId === topA.id) || ALBUMS[0]).id}">${I("play", "s14")}Play</a></div>`
      : topAl
        ? `<div class="top-res" data-a="album" data-v="${topAl.id}">${cvr(topAl)}<h4 class="disp">${hl(topAl.title)}</h4><div class="ty">Album · ${esc(topAl.artist)} · ${topAl.year}</div><a class="btn pri sm" data-a="play" data-v="${topAl.id}">${I("play", "s14")}Play</a></div>`
        : `<div class="top-res"><h4 class="disp" style="margin:0">No library matches</h4><div class="ty">Try Qobuz or Tidal, or check spelling.</div></div>`;
    return `<div><h5>Top result</h5>${top}
        ${artists.length > 1 || (artists.length && albums.length) ? `<h5 style="margin-top:22px">Artists</h5>${artists.map((a) => `<div class="s-row" data-a="artist" data-v="${a.id}"><span class="rd">${im(ART_PH(a, 120, 120))}</span><span><b>${hl(a.name)}</b><small>Artist</small></span></div>`).join("")}` : ""}
        ${pls.length ? `<h5 style="margin-top:22px">Playlists</h5>${pls.map((p) => `<div class="s-row"><span class="cv">${im(byTitle(p.covers[0]).cover())}</span><span><b>${hl(p.name)}</b><small>Playlist · ${p.count} tracks</small></span></div>`).join("")}` : ""}
      </div>
      <div>${
        albums.length
          ? `<h5>Albums</h5><div class="s-alb">${albums
              .slice(0, 4)
              .map((a) =>
                card(a, {
                  badges: true,
                  hr: false,
                  sub: `${esc(a.artist)} · ${a.year}`,
                }),
              )
              .join("")}</div>`
          : ""
      }
        ${tracks.length ? `<h5>Tracks</h5>${tracks.map(([al, t, i], k) => `<div class="s-row ${k === 0 ? "kb" : ""}" data-a="play" data-v="${al.id}" data-t="${i}">${cvr(al)}<span><b>${hl(t[0])}</b><small>${hl(al.artist)} · ${esc(al.title)}</small></span><span class="faint tnum" style="font-size:12px">${fmt(t[1])}</span></div>`).join("")}` : ""}
        ${!albums.length && !tracks.length ? `<div class="muted" style="padding:20px 0">Nothing in your library. <a class="acc">Search Qobuz for “${esc(q)}”</a></div>` : ""}
      </div>`;
  }
  function searchOv(st) {
    return `<div class="scrim" data-a="close"></div><div class="search-ov" data-stop>
      <div class="s-in">${I("search", "s22")}<input data-search value="${esc(st.q)}" placeholder="Search artists, albums, tracks, radio…" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div>
      <div class="s-scope">${["All", "Library", "Qobuz", "Tidal", "Radio", "Podcasts", "Audiobooks"].map((s, i) => `<a class="chip ${i === 0 ? "on" : ""}">${s}</a>`).join("")}<span class="faint" style="margin-left:auto;font-size:12px;align-self:center">Paste a Qobuz, Tidal or Spotify link to open it</span></div>
      <div class="s-body" data-sres>${searchResults(st.q)}</div>
      <div class="s-foot"><span><kbd>↑</kbd><kbd>↓</kbd>Move</span><span><kbd>↵</kbd>Play in ${esc(rname(cur(), true))}</span><span><kbd>⇧↵</kbd>Add to queue</span><span><kbd>⌘↵</kbd>Open</span></div>
    </div>`;
  }

  /* ========================================================= SIGNAL PATH */
  function sigPop() {
    const r = cur();
    const sg = sig(r);
    return `<div class="scrim" style="background:transparent" data-a="close"></div><div class="sig" data-stop>
      <h4 class="disp"><span class="q ${sg.cls}"><span class="d"></span></span>${sg.label}</h4>
      <div class="sum">What ${esc(rname(r))} is actually receiving, step by step.</div>
      <div class="chain">${sg.nodes.map(([c, t, d, l]) => `<div class="node" style="--c:var(--sig-${c})"><b>${esc(t)}<span>${l}</span></b><small>${esc(d)}</small></div>`).join("")}</div>
      <div class="legend"><span class="q lossless"><span class="d"></span>Lossless · bit-perfect</span><span class="q enhanced"><span class="d"></span>Enhanced · your DSP</span><span class="q hq"><span class="d"></span>High quality · converted</span><span class="q lq"><span class="d"></span>Lossy source</span></div>
      <div class="ft"><a class="btn">${I("settings", "s16")}DSP for ${esc(r.name)}</a><a class="btn">${I("wave", "s16")}Loudness settings</a></div>
    </div>`;
  }

  /* ============================================================== RENDER */
  function viewFor(st) {
    switch (st.screen) {
      case "albums":
        return [library(st), "Albums"];
      case "artist":
        return [artistView(st), art(st.artistId).name];
      case "album":
        return [albumView(st), alb(st.albumId).title];
      default:
        return [home(st), "Home"];
    }
  }
  function inner(st) {
    const [view, title] = viewFor(st);
    let ov = "";
    if (st.overlay === "now") ov += nowPlaying(st);
    if (st.overlay === "rooms") ov += roomsDrawer(st);
    if (st.overlay === "search") ov += searchOv(st);
    if (st.overlay === "sig") ov += sigPop();
    const t = st.toast;
    const toast = t
      ? `<div class="toast">${t.al ? cvr(t.al) : ""}<span>${t.html}</span>${t.action ? `<a data-a="${t.action[1]}">${t.action[0]}</a>` : ""}</div>`
      : "";
    return `${sidebar(st)}<main class="main"><div class="view" data-view>${view}</div>${topbar(st, title)}</main>${transport(st)}${ov}${toast}`;
  }
  const appClass = (st) => `app t-${st.theme} a-${st.accent} f-${st.font}`;
  function tintVars() {
    const al = nowAl() || byTitle("Ember Theory");
    return `--t1:${al.tint[0]};--t2:${al.tint[1]};--t3:${al.tint[2]}`;
  }

  /* ===================================================== interactive mount */
  const appEl = document.getElementById("app");
  let lastScreenKey = "";
  function render() {
    const key =
      S.screen +
      (S.screen === "album"
        ? S.albumId
        : S.screen === "artist"
          ? S.artistId
          : "");
    const v = appEl.querySelector("[data-view]");
    const keep = v && key === lastScreenKey ? v.scrollTop : 0;
    appEl.className = appClass(S);
    appEl.setAttribute("style", tintVars());
    appEl.innerHTML = inner(S);
    const nv = appEl.querySelector("[data-view]");
    nv.scrollTop = keep;
    lastScreenKey = key;
    const tb = appEl.querySelector("[data-topbar]");
    const upd = () => tb.classList.toggle("solid", nv.scrollTop > 60);
    nv.addEventListener("scroll", upd, { passive: true });
    upd();
    const si = appEl.querySelector("[data-search]");
    if (si) {
      si.focus();
      si.setSelectionRange(si.value.length, si.value.length);
      si.addEventListener("input", () => {
        S.q = si.value;
        appEl.querySelector("[data-sres]").innerHTML = searchResults(S.q);
      });
    }
    syncLyrics(true);
    document
      .querySelectorAll(".jump button")
      .forEach((b) =>
        b.classList.toggle(
          "on",
          b.dataset.j ===
            (S.overlay === "now"
              ? "now"
              : S.overlay === "rooms"
                ? "rooms"
                : S.overlay === "search"
                  ? "search"
                  : S.screen),
        ),
      );
  }

  function nav(screen, extra = {}) {
    S.hist.push({ screen: S.screen, albumId: S.albumId, artistId: S.artistId });
    S.fut = [];
    Object.assign(S, { screen, overlay: null }, extra);
    render();
  }
  let toastTimer;
  function toast(html, al, action) {
    S.toast = { html, al, action };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      S.toast = null;
      const t = appEl.querySelector(".toast");
      if (t) t.remove();
    }, 3600);
  }
  function playAlbum(id, t = 0, roomId) {
    const al = alb(id);
    if (!al) return;
    const r = lead(room(roomId || S.roomId));
    if (r.state === "off") r.state = "idle";
    Object.assign(r, { albumId: id, track: t, pos: 0, state: "playing" });
    S.roomId = r.id;
    toast(
      `Playing <b>${esc(al.title)}</b> in <b>${esc(rname(r, true))}</b>`,
      al,
      ["Change room", "rooms"],
    );
  }

  const act = {
    go(v) {
      if (["home", "albums"].includes(v)) return nav(v);
      if (v === "artists") return nav("artist", { artistId: "marigold" });
      toast(
        `The <b>${v[0].toUpperCase() + v.slice(1)}</b> screen isn’t in this prototype — try Home, Albums, an artist or an album.`,
      );
      render();
    },
    album(v) {
      nav("album", { albumId: v });
    },
    artist(v) {
      nav("artist", { artistId: v, artistTab: "overview" });
    },
    play(v, el) {
      playAlbum(v, +(el.dataset.t || 0));
      if (S.overlay === "search" || S.overlay === "playmenu") S.overlay = null;
      render();
    },
    playin(v) {
      playAlbum(S.albumId, 0, v);
      S.overlay = null;
      render();
    },
    toggle() {
      const r = cur();
      if (!nowAl(r)) return;
      r.state = r.state === "playing" ? "paused" : "playing";
      render();
    },
    roomtoggle(v) {
      const r = room(v);
      if (!nowAl(r)) {
        S.roomId = v;
        return render();
      }
      r.state = r.state === "playing" ? "paused" : "playing";
      render();
    },
    next() {
      const r = cur();
      const al = nowAl(r);
      if (!al) return;
      r.track = (r.track + 1) % tracksFor(al).length;
      r.pos = 0;
      render();
    },
    prev() {
      const r = cur();
      const al = nowAl(r);
      if (!al) return;
      if (r.pos <= 3) r.track = Math.max(0, r.track - 1);
      r.pos = 0;
      render();
    },
    shuffle() {
      const r = cur();
      r.shuffle = !r.shuffle;
      render();
    },
    repeat() {
      const r = cur();
      r.repeat = !r.repeat;
      render();
    },
    seek(v, el, e) {
      const r = room(v);
      const tr = nowTr(r);
      if (!tr) return;
      const b = el.getBoundingClientRect();
      r.pos = Math.max(
        0,
        Math.min(tr[1] - 1, ((e.clientX - b.left) / b.width) * tr[1]),
      );
      tick(true);
    },
    lyric(v) {
      const r = cur();
      r.pos = +v + 0.2;
      tick(true);
    },
    now() {
      S.overlay = "now";
      render();
    },
    lyrics() {
      S.overlay = S.overlay === "now" && S.npTab === "lyrics" ? null : "now";
      S.npTab = "lyrics";
      render();
    },
    queue() {
      S.overlay = S.overlay === "now" && S.npTab === "next" ? null : "now";
      S.npTab = "next";
      render();
    },
    nptab(v) {
      S.npTab = v;
      render();
    },
    rooms() {
      S.overlay = S.overlay === "rooms" ? null : "rooms";
      render();
    },
    search() {
      S.overlay = "search";
      render();
    },
    sq(v) {
      S.q = v;
      render();
    },
    sig() {
      S.overlay = S.overlay === "sig" ? null : "sig";
      render();
    },
    focus() {
      S.overlay = S.overlay === "focus" ? null : "focus";
      render();
    },
    playmenu() {
      S.overlay = S.overlay === "playmenu" ? null : "playmenu";
      render();
    },
    close() {
      S.overlay = null;
      render();
    },
    room(v) {
      S.roomId = v;
      render();
    },
    rsort(v) {
      S.roomSort = v;
      render();
    },
    power(v) {
      room(v).state = "idle";
      render();
    },
    group(v) {
      const r = cur();
      r.group = [...(r.group || []), v];
      Object.assign(room(v), { leader: r.id, state: "grouped", albumId: null });
      toast(
        `<b>${esc(room(v).name)}</b> joined <b>${esc(r.name)}</b> · playing in sync`,
      );
      render();
    },
    ungroup(v) {
      const m = room(v);
      const r = room(m.leader);
      r.group = r.group.filter((x) => x !== v);
      delete m.leader;
      m.state = "idle";
      render();
    },
    "vol-step"(v, el) {
      const r = room(el.dataset.r);
      r.vol = Math.max(0, Math.min(100, r.vol + +v));
      render();
    },
    "vol-set"(v, el, e) {
      const r = room(v);
      const b = el.getBoundingClientRect();
      r.vol = Math.round(
        Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)) * 100,
      );
      render();
    },
    recent(v) {
      S.recent = v;
      render();
    },
    atab(v) {
      S.artistTab = v;
      render();
    },
    facet(v) {
      if (S.facets.has(v)) S.facets.delete(v);
      else S.facets.add(v);
      render();
    },
    "facet-clear"() {
      S.facets.clear();
      render();
    },
    az(v) {
      const sec = appEl.querySelector(`[data-letter="${v}"]`);
      const view = appEl.querySelector("[data-view]");
      if (sec) view.scrollTo({ top: sec.offsetTop - 120, behavior: "smooth" });
    },
    back() {
      const h = S.hist.pop();
      if (!h) return;
      S.fut.push({
        screen: S.screen,
        albumId: S.albumId,
        artistId: S.artistId,
      });
      Object.assign(S, h, { overlay: null });
      render();
    },
    fwd() {
      const h = S.fut.pop();
      if (!h) return;
      S.hist.push({
        screen: S.screen,
        albumId: S.albumId,
        artistId: S.artistId,
      });
      Object.assign(S, h, { overlay: null });
      render();
    },
    noop() {},
  };

  appEl.addEventListener("click", (e) => {
    const t = e.target.closest("[data-a]");
    if (!t || !appEl.contains(t)) {
      if (S.overlay === "focus" || S.overlay === "playmenu") {
        if (!e.target.closest("[data-stop]")) {
          S.overlay = null;
          render();
        }
      }
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const fn = act[t.dataset.a];
    if (fn) fn(t.dataset.v, t, e);
  });

  /* keyboard */
  let appActive = false;
  document.addEventListener("mousedown", (e) => {
    appActive = appEl.contains(e.target);
  });
  document.addEventListener("keydown", (e) => {
    const typing =
      e.target.matches && e.target.matches("input, textarea, select");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      act.search();
      return;
    }
    if (e.key === "Escape" && S.overlay) {
      act.close();
      return;
    }
    if (typing || !appActive) return;
    if (e.key === " ") {
      e.preventDefault();
      act.toggle();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
      e.preventDefault();
      if (S.overlay === "now") act.close();
      else act.now();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "ArrowLeft") {
      e.preventDefault();
      act.back();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "ArrowRight") {
      e.preventDefault();
      act.fwd();
    }
  });

  /* ======================================================= playback clock */
  let lastLyric = -1;
  function syncLyrics(force) {
    const box = appEl.querySelector("[data-lyrics-box]");
    if (!box) {
      lastLyric = -1;
      return;
    }
    const r = cur();
    const ps = box.querySelectorAll("[data-lt]");
    let idx = -1;
    ps.forEach((p, i) => {
      if (+p.dataset.lt <= r.pos) idx = i;
    });
    if (idx === lastLyric && !force) return;
    lastLyric = idx;
    ps.forEach((p, i) => {
      p.classList.toggle("cur", i === idx);
      p.classList.toggle("past", i < idx);
    });
    const c = ps[idx];
    if (c)
      box.scrollTo({
        top: c.offsetTop - box.clientHeight * 0.32,
        behavior: force ? "auto" : "smooth",
      });
  }
  function tick(force) {
    ROOMS.forEach((r) => {
      if (r.state !== "playing" || !r.albumId) return;
      if (!force) r.pos += 0.25;
      const trs = tracksFor(alb(r.albumId));
      if (r.pos >= trs[r.track][1]) {
        r.pos = 0;
        r.track = (r.track + 1) % trs.length;
        if (r.id === cur().id) render();
        return;
      }
    });
    ROOMS.forEach((r) => {
      const tr = nowTr(r);
      if (!tr) return;
      const frac = r.pos / tr[1];
      appEl.querySelectorAll(`[data-wave="${r.id}"]`).forEach((w) => {
        const bars = w.children;
        const cut = Math.floor(frac * bars.length);
        for (let i = 0; i < bars.length; i++)
          bars[i].classList.toggle("p", i < cut);
      });
      appEl
        .querySelectorAll(`[data-time="${r.id}"]`)
        .forEach((n) => (n.textContent = fmt(r.pos)));
      appEl
        .querySelectorAll(`[data-rem="${r.id}"]`)
        .forEach((n) => (n.textContent = "−" + fmt(tr[1] - r.pos)));
      appEl
        .querySelectorAll(`[data-prog="${r.id}"]`)
        .forEach((n) => (n.style.width = (frac * 100).toFixed(1) + "%"));
    });
    if (S.overlay === "now" && S.npTab === "lyrics") syncLyrics(force);
  }
  setInterval(() => tick(false), 250);

  /* ============================================================ document */
  function setTheme(t) {
    S.theme = t;
    applyDoc();
  }
  function applyDoc() {
    document.body.className = `doc t-${S.theme} a-${S.accent} f-${S.font}`;
    document
      .querySelectorAll("[data-theme]")
      .forEach((b) => b.classList.toggle("on", b.dataset.theme === S.theme));
    document
      .querySelectorAll("[data-accent]")
      .forEach((b) => b.classList.toggle("on", b.dataset.accent === S.accent));
    const fs = document.querySelector("[data-font]");
    if (fs) fs.value = S.font;
    render();
    renderPhones();
    renderSystem();
    renderGallery();
    fit();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme],[data-accent],[data-j]");
    if (!b) return;
    if (b.dataset.theme) setTheme(b.dataset.theme);
    if (b.dataset.accent) {
      S.accent = b.dataset.accent;
      applyDoc();
    }
    if (b.dataset.j) {
      const j = b.dataset.j;
      if (j === "now") {
        S.overlay = "now";
        S.npTab = "next";
        render();
      } else if (j === "lyricsj") {
        S.overlay = "now";
        S.npTab = "lyrics";
        render();
      } else if (j === "rooms") {
        S.overlay = "rooms";
        render();
      } else if (j === "search") {
        S.overlay = "search";
        render();
      } else if (j === "artist")
        nav("artist", { artistId: "marigold", artistTab: "overview" });
      else if (j === "album")
        nav("album", { albumId: byTitle("Low Tide Hymnal").id });
      else nav(j);
      document
        .getElementById("prototype")
        .scrollIntoView({ behavior: "smooth" });
    }
  });
  const fsel = document.querySelector("[data-font]");
  if (fsel)
    fsel.addEventListener("change", () => {
      S.font = fsel.value;
      applyDoc();
    });

  /* scale the 1440×900 artboard to fit */
  function fit() {
    document.querySelectorAll("[data-fit]").forEach((st) => {
      const el = st.firstElementChild;
      const w = st.clientWidth;
      const s = Math.min(1, w / 1440);
      el.style.transform = `scale(${s})`;
      el.style.transformOrigin = "top left";
      st.style.height = 900 * s + "px";
    });
  }
  addEventListener("resize", fit);

  /* ========================================================== static apps */
  function staticApp(over) {
    const st = {
      ...S,
      ...over,
      hist: [],
      fut: [],
      toast: null,
      facets: new Set(),
    };
    const html = `<div class="${appClass(st)}" style="${tintVars()}">${inner(st)}</div>`;
    return html;
  }
  function renderGallery() {
    const g = document.getElementById("gallery-pairs");
    if (!g) return;
    const shots = [
      ["home", null, "Home — greeting, library stats, rooms, recent activity"],
      ["album", null, "Album — art-tinted header, tracklist, credits, sources"],
      ["artist", null, "Artist — photo hero, discography first, linked bio"],
      [
        "home",
        "now",
        "Now Playing — ultrablur from the artwork, lyrics & queue panel",
      ],
      ["home", "rooms", "Rooms — every player, groups, per-room volume"],
      ["albums", null, "Albums — Focus chips, visible sort, A–Z jump"],
    ];
    g.innerHTML = shots
      .map(
        ([screen, overlay, cap]) =>
          `<figure class="pair">${["dark", "light"].map((t) => `<div><div class="thumb" data-fit>${staticApp({ screen, overlay, theme: t, npTab: overlay === "now" ? "lyrics" : "next" })}</div><figcaption><span>${cap}</span><span class="faint">${t === "dark" ? "Dark" : "Light"}</span></figcaption></div>`).join("")}</figure>`,
      )
      .join("");
    g.querySelectorAll(".thumb .app [data-view]").forEach(
      (v) => (v.scrollTop = 0),
    );
  }

  /* =============================================================== PHONES */
  function phone(cls, body) {
    return `<div class="phone t-${S.theme} a-${S.accent} f-${S.font} ${cls}" style="${tintVars()}">${body}</div>`;
  }
  const sbar = (light) =>
    `<div class="sbar"><span>7:42</span><span class="sig-ic">${I("signal", "s16")}${I("wifi", "s16")}${I("battery", "s22")}</span></div>`;
  function renderPhones() {
    const el = document.getElementById("phones");
    if (!el) return;
    const r = cur();
    const al = nowAl(r) || byTitle("Ember Theory");
    const tr = nowTr(r) || tracksFor(al)[0];
    const mini = `<div class="ph-mini">${cvr(al)}<div style="min-width:0"><div class="tt">${esc(tr[0])}</div><div class="rm">${roomIcon(r)}${esc(rname(r, true))}</div></div><div class="acts">${I(r.state === "playing" ? "pause" : "play", "s22")}${I("next", "s22")}</div><div class="pr" style="width:${((r.pos / tr[1]) * 100).toFixed(0)}%"></div></div>`;
    const tabs = (on) =>
      `<nav class="ph-tab">${[
        ["home", "Home"],
        ["disc", "Library"],
        ["search", "Search"],
        ["speaker", "Rooms"],
      ]
        .map(
          ([ic, l]) =>
            `<a class="${on === l ? "on" : ""}">${I(ic, "s22")}${l}</a>`,
        )
        .join("")}</nav>`;

    const homeP = phone(
      "",
      `${sbar()}<div class="mp" style="padding-top:6px"><div class="eyebrow">Thursday · 3 rooms playing</div><h1 class="disp m-h1">Good evening, Will</h1></div>
      <div class="m-stats">${[
        ["1,284", "Artists"],
        ["3,902", "Albums"],
        ["41,220", "Tracks"],
        ["412", "Composers"],
      ]
        .map(([n, l]) => `<div><b>${n}</b><span>${l}</span></div>`)
        .join("")}</div>
      <div class="mp"><div class="m-sec disp">Around the house <a>All</a></div></div>
      <div class="m-rooms">${["living", "studio"]
        .map((id) => {
          const x = room(id);
          const a2 = nowAl(x);
          const t2 = nowTr(x);
          return `<div class="rcard ${id === lead(room(S.roomId)).id ? "sel" : ""}"><div class="tint" style="background:radial-gradient(circle at 20% 50%, ${a2.tint[0]}, transparent 70%)"></div>${cvr(a2)}<div class="ri"><div class="rn">${x.state === "playing" ? '<span class="eq"><i></i><i></i><i></i></span>' : ""}${esc(rname(x, true))}</div><div class="tt">${esc(t2[0])}</div><div class="ar">${esc(a2.artist)}</div></div></div>`;
        })
        .join("")}</div>
      <div class="m-band"><h4 class="disp">Recent <small class="on">PLAYED</small><small>ADDED</small></h4><div class="row">${["Ember Theory", "Concerto for Quiet Rooms", "Northbound"].map((t) => card(byTitle(t), { badges: false, hr: false })).join("")}</div></div>
      ${mini}${tabs("Home")}`,
    );

    const la = byTitle("Low Tide Hymnal");
    const albumP = phone(
      "",
      `${sbar()}<div class="m-al-hero" style="--h1:${la.tint[0]};--h2:${la.tint[1]};padding-top:10px"><div class="bgw"></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:16px"><span class="cbtn">${I("chevL")}</span><span class="cbtn">${I("more", "s16")}</span></div>
        ${cvr(la)}<h2 class="disp">${esc(la.title)}</h2><div class="by">${esc(la.artist)}</div>
        <div class="ln">Album · ${la.year}<span class="q lossless"><span class="d"></span>Hi-Res 24/96</span></div>
        <div class="acts"><a class="btn pri">${I("play", "s16")}Play</a><a class="btn">${I("shuffle", "s16")}Shuffle</a><a class="btn icon">${I("heartf", "s16")}</a><a class="btn icon">${I("more", "s16")}</a></div></div>
      ${tracksFor(la)
        .slice(0, 6)
        .map(
          ([t, d], i) =>
            `<div class="m-tr ${i === 1 ? "playing" : ""}"><span class="n">${i === 1 ? '<span class="eq"><i></i><i></i><i></i></span>' : i + 1}</span><span><b>${esc(t)}</b><small>Hannah Okafor · Tom Reyes</small></span><span class="faint tnum" style="font-size:13px">${fmt(d)}</span></div>`,
        )
        .join("")}
      ${mini}${tabs("Library")}`,
    );

    const npP = phone(
      "m-np",
      `<div class="ub"><i></i><i></i></div><div class="veil"></div>${sbar()}
      <div class="hdr"><span class="cbtn" style="background:var(--glass)">${I("chevD")}</span><span class="gchip">${roomIcon(r)}${esc(rname(r, true))}${I("chevD", "s14")}</span><span class="cbtn" style="background:var(--glass)">${I("more", "s16")}</span></div>
      ${cvr(al, "art")}
      <div class="ti"><div><h2 class="disp">${esc(tr[0])}</h2><p>${esc(al.artist)}</p></div><span class="heart">${I("heartf", "s26")}</span></div>
      <div class="pg">${wave(r, 70)}<div class="times"><span>${fmt(r.pos)}</span><span>−${fmt(tr[1] - r.pos)}</span></div></div>
      <div class="cx"><span class="dim">${I("shuffle", "s22")}</span>${I("prev", "s26")}<span class="playbtn">${I(r.state === "playing" ? "pause" : "play", "s26")}</span>${I("next", "s26")}<span class="dim">${I("repeat", "s22")}</span></div>
      <div class="ft"><span class="q ${sig(r).cls}"><span class="d"></span>${sig(r).short}</span>${I("lyrics", "s22")}${I("queue", "s22")}${I("speaker", "s22")}</div>`,
    );

    const roomsP = phone(
      "",
      `${sbar()}<div class="mp"><div class="m-sec disp" style="margin-top:12px;font-size:34px">Good evening</div></div><div class="m-dim"></div>
      <div class="m-sheet"><div class="grab"></div><h3 class="disp">Rooms</h3><div class="sub">3 playing · 6 players</div>
        ${["living", "studio", "bedroom"]
          .map((id) => {
            const x = room(id);
            const a2 = nowAl(x);
            const t2 = nowTr(x);
            const sel = id === lead(room(S.roomId)).id;
            return `<div class="zone ${sel ? "sel" : ""}"><div class="zt">${cvr(a2)}<div class="zi"><div class="zn">${esc(x.name)}${x.group ? `<span class="grp">+ Kitchen</span>` : ""}</div><div class="zs">${x.state === "paused" ? "Paused · " : ""}<b>${esc(t2[0])}</b></div></div><span class="zp">${I(x.state === "playing" ? "pause" : "play", "s16")}</span></div>${sel ? `<div class="bigstep"><span class="stb">${I("minus", "s16")}</span><div class="vbar"><i style="width:${x.vol}%"></i><span>${I("vol", "s16")}${x.vol}</span></div><span class="stb">${I("plus", "s16")}</span></div>` : ""}</div>`;
          })
          .join("")}
        <div class="zone"><div class="zt"><div class="ico">${I("laptop")}</div><div class="zi"><div class="zn">Office</div><div class="zs">This phone · Sendspin · Ready</div></div><span class="zp">${I("plus", "s16")}</span></div></div>
      </div>`,
    );

    const libP = phone(
      "",
      `${sbar()}<div class="m-lib-h"><h1 class="disp">Albums</h1><div class="ct">3,902 albums · sorted by artist</div></div>
      <div class="m-chips"><a class="focusbtn">${I("focus", "s14")}Focus</a><a class="chip on">${I("check", "s14")}Hi-Res</a><a class="chip">Local</a><a class="chip">Qobuz</a><a class="chip">Favourites</a></div>
      <div class="mp" style="padding-right:40px"><div class="letter" style="font-size:26px;margin-bottom:12px">M</div></div>
      <div class="m-grid">${["Ember Theory", "Low Tide Hymnal", "Harbour Lights (Live)", "Glass Orchard"].map((t) => card(byTitle(t), { hr: true })).join("")}</div>
      <div class="m-az">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ#"
        .split("")
        .map(
          (L) =>
            `<a style="${"DHIJLMOT".includes(L) ? "" : "opacity:.35"}">${L}</a>`,
        )
        .join("")}<span class="bub">M</span></div>
      ${mini}${tabs("Library")}`,
    );

    const caps = [
      [
        "Home",
        "Serif greeting, stats you can swipe, live room cards, and a mini player that always names the room.",
      ],
      [
        "Album",
        "Art-tinted header, quality dot, big touch targets. The playing row is marked in the accent.",
      ],
      [
        "Now playing",
        "Ultrablur background from the artwork; tap the room pill to switch or group.",
      ],
      [
        "Rooms sheet",
        "− / + volume buttons beside a big drag bar, because sliders are imprecise on touch.",
      ],
      [
        "Library",
        "Focus chips, letter sections and an A–Z scrubber with a big letter bubble.",
      ],
    ];
    el.innerHTML = [homeP, albumP, npP, roomsP, libP]
      .map(
        (p, i) =>
          `<div>${p}<div class="phone-cap"><b>${caps[i][0]}</b>${caps[i][1]}</div></div>`,
      )
      .join("");
  }

  /* ========================================================= SYSTEM SECTION */
  function renderSystem() {
    const el = document.getElementById("system-live");
    if (!el) return;
    const al = byTitle("Low Tide Hymnal");
    el.className = `sys-grid t-${S.theme} a-${S.accent} f-${S.font}`;
    el.innerHTML = `
      <div class="sys-card"><h3 class="disp">Type</h3><div class="type-spec">
        <div><small>Display 84</small><span class="disp" style="font-size:52px;line-height:1">Marigold</span></div>
        <div><small>Title 64 / 56</small><span class="disp" style="font-size:36px;line-height:1.05">Low Tide Hymnal</span></div>
        <div><small>Section 26</small><span class="disp" style="font-size:26px">Recent activity</span></div>
        <div><small>Bio 21 serif</small><span class="disp" style="font-size:19px;font-weight:400">Built around a reverb-drenched voice…</span></div>
        <div><small>Body 14 Inter</small><span>10 tracks · 44 min · Halfmoon Records</span></div>
        <div><small>Label 11 caps</small><span class="eyebrow">Recent activity · Played</span></div>
        <div><small>Numerals</small><span class="disp tnum" style="font-size:28px">1,284 &nbsp;3,902 &nbsp;41,220</span></div>
      </div></div>
      <div class="sys-card"><h3 class="disp">Components</h3>
        <div class="comp-row"><small>Actions</small><div class="split"><a class="btn pri">${I("play", "s16")}Play now</a><a class="btn pri">${I("chevD", "s16")}</a></div><a class="btn">${I("shuffle", "s16")}Shuffle</a><a class="btn">${I("radioStart", "s16")}Start radio</a><a class="btn icon" style="color:var(--accent)">${I("heartf", "s16")}</a><a class="btn sm ghost">See all</a></div>
        <div class="comp-row"><small>Filters & sort</small><a class="focusbtn">${I("focus", "s16")}Focus<span class="n">2</span></a><a class="chip on">${I("check", "s14")}Hi-Res</a><a class="chip">Local</a><a class="chip">Qobuz</a><a class="sortchip" style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;padding:0 12px;height:30px;border-radius:999px;background:var(--active)">${I("sort", "s14")}<span class="faint">Sort</span> Artist A–Z</a></div>
        <div class="comp-row"><small>Signal quality (what the speaker receives)</small><span class="q pill lossless"><span class="d"></span>Lossless 24/96</span><span class="q pill enhanced"><span class="d"></span>Enhanced</span><span class="q pill hq"><span class="d"></span>High quality</span><span class="q pill lq"><span class="d"></span>Lossy 320</span></div>
        <div class="comp-row"><small>Sources</small>${["local", "qobuz", "tidal", "spotify"].map((s) => `<span style="display:inline-flex;gap:6px;align-items:center;font-size:12.5px" class="muted"><span class="sbadge ${s}">${SRC[s][1]}</span>${SRCN[s]}</span>`).join("")}</div>
        <div class="comp-row"><small>Volume — always a number, always with steps</small><div class="stepper" style="width:100%"><a class="stb">${I("minus", "s14")}</a><div class="sl acc show" style="flex:1"><i style="width:58%"></i><b style="left:58%"></b></div><a class="stb">${I("plus", "s14")}</a><span class="val">58</span></div></div>
        <div class="comp-row" style="border:0"><small>Track row</small><div style="width:100%">${`<div class="tl-r playing"><span class="n"><span class="eq"><i></i><i></i><i></i></span></span><span class="nm"><b>Undertow</b><small>Hannah Okafor · Tom Reyes</small></span><span class="x" style="opacity:1"><a class="on">${I("heartf", "s16")}</a><a>${I("more", "s16")}</a></span><span class="d">4:31</span></div>`}</div></div>
      </div>`;
    const tok = document.getElementById("tok");
    if (tok) {
      const rows = [
        ["--bg", "Canvas", "#181818", "#ffffff", "--background"],
        ["--chrome", "Sidebar, player bar", "#222222", "#f7f8f9", "--sidebar"],
        ["--raised", "Tiles, cards", "#242424", "#f3f3f5", "--card"],
        [
          "--raised-2",
          "Hover, fills",
          "#2c2c2e",
          "#eaeaed",
          "--muted / --secondary",
        ],
        ["--overlay", "Popovers, drawers", "#262628", "#ffffff", "--popover"],
        ["--text", "Primary text", "#f5f5f5", "#1c1c1e", "--foreground"],
        [
          "--text-2",
          "Secondary text",
          "#a8a8a8",
          "#636368",
          "--muted-foreground",
        ],
        ["--text-3", "Tertiary, numbers", "#727276", "#98989e", "new"],
        [
          "--accent",
          "Accent (Roon violet)",
          "#7c7fe6",
          "#6462ea",
          "--primary, --ring",
        ],
        [
          "--line",
          "Hairlines",
          "rgba(255,255,255,.075)",
          "rgba(10,10,20,.08)",
          "--border",
        ],
        ["--sig-lossless", "Signal: lossless", "#9797f6", "#9797f6", "new"],
        ["--sig-enhanced", "Signal: enhanced", "#4f9cf0", "#4f9cf0", "new"],
        ["--sig-hq", "Signal: high quality", "#57c6b9", "#57c6b9", "new"],
        ["--sig-lq", "Signal: lossy", "#e6bb72", "#e6bb72", "new"],
      ];
      tok.innerHTML =
        `<tr><td class="faint" style="font:600 10.5px Inter;letter-spacing:.12em">TOKEN</td><td class="faint" style="font:600 10.5px Inter;letter-spacing:.12em">ROLE</td><td class="faint" style="font:600 10.5px Inter;letter-spacing:.12em">DARK</td><td class="faint" style="font:600 10.5px Inter;letter-spacing:.12em">LIGHT</td><td class="faint" style="font:600 10.5px Inter;letter-spacing:.12em">MAPS TO</td></tr>` +
        rows
          .map(
            ([t, r2, d, l, m]) =>
              `<tr><td><code>${t}</code></td><td>${r2}</td><td><span class="sw" style="background:${d}"></span><code>${d}</code></td><td><span class="sw" style="background:${l}"></span><code>${l}</code></td><td><code>${m}</code></td></tr>`,
          )
          .join("");
    }
  }

  /* ================================================================= boot */
  applyDoc();
  setTimeout(fit, 300);
  if (document.fonts) document.fonts.ready.then(fit);
  window.__MA = { S, render, ROOMS };
})();
