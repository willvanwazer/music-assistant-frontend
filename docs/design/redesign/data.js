/* ==========================================================================
   Demo data + generative album covers for the "Liner Notes" prototype.
   Everything here is fictional. Artist photos are free-licence Unsplash
   images; album covers are drawn as SVG so no real artwork is used.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- seeded randomness ---------- */
  function rng(seed) {
    let a = 0;
    for (let i = 0; i < seed.length; i++) a = (a * 31 + seed.charCodeAt(i)) | 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  /* ---------- cover fonts (system fonts: SVG-as-image can't load web fonts) ---------- */
  const F = {
    didot: "Didot, 'Bodoni 72', 'Bodoni MT', Georgia, serif",
    serif: "'Iowan Old Style', Baskerville, Georgia, serif",
    helv: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    cond: "'Avenir Next Condensed', 'Helvetica Neue Condensed Bold', 'Arial Narrow', sans-serif",
    futura: "Futura, 'Century Gothic', 'Avenir Next', sans-serif",
    mono: "'SF Mono', Menlo, monospace",
  };

  const GRAIN = (o = 0.22) => `
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="${o}"/></feComponentTransfer>
    </filter>`;
  const grainRect =
    '<rect width="600" height="600" filter="url(#grain)" style="mix-blend-mode:overlay"/>';

  /* Each style draws a 600x600 cover. p = palette {a,b,c,d,ink}. */
  const STYLES = {
    /* sunset over water, horizontal sea lines */
    horizon(t, ar, p, r) {
      const sunY = 250 + r() * 60,
        sunX = 160 + r() * 280;
      let lines = "";
      for (let i = 0; i < 26; i++) {
        const y = 350 + i * i * 0.38 + i * 2;
        lines += `<rect x="0" y="${y.toFixed(1)}" width="600" height="${(1 + i * 0.12).toFixed(2)}" fill="${p.c}" opacity="${(0.18 + i * 0.012).toFixed(2)}"/>`;
      }
      return `<defs>${GRAIN(0.28)}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.d}"/><stop offset=".55" stop-color="${p.b}"/><stop offset="1" stop-color="${p.a}"/></linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.b}"/><stop offset="1" stop-color="${p.d}"/></linearGradient>
          <radialGradient id="sun"><stop offset="0" stop-color="${p.c}"/><stop offset=".6" stop-color="${p.c}" stop-opacity=".9"/><stop offset="1" stop-color="${p.c}" stop-opacity="0"/></radialGradient></defs>
        <rect width="600" height="600" fill="url(#sky)"/>
        <circle cx="${sunX}" cy="${sunY}" r="120" fill="url(#sun)" opacity=".55"/>
        <circle cx="${sunX}" cy="${sunY}" r="58" fill="${p.c}"/>
        <rect y="345" width="600" height="255" fill="url(#sea)"/>
        <ellipse cx="${sunX}" cy="420" rx="50" ry="90" fill="${p.c}" opacity=".18"/>
        ${lines}${grainRect}
        <text x="44" y="70" font-family="${F.serif}" font-size="26" font-style="italic" fill="${p.ink}" opacity=".92">${esc(ar)}</text>
        <text x="44" y="102" font-family="${F.helv}" font-size="15" letter-spacing="5" fill="${p.ink}" opacity=".75">${esc(t.toUpperCase())}</text>`;
    },
    /* a glowing ember on black */
    ember(t, ar, p, r) {
      const x = 260 + r() * 80,
        y = 260 + r() * 60;
      return `<defs>${GRAIN(0.3)}<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter></defs>
        <rect width="600" height="600" fill="${p.d}"/>
        <g filter="url(#bl)"><circle cx="${x}" cy="${y}" r="170" fill="${p.b}"/><circle cx="${x + 40}" cy="${y + 30}" r="110" fill="${p.a}"/><circle cx="${x - 20}" cy="${y - 10}" r="60" fill="${p.c}"/></g>
        ${grainRect}
        <text x="300" y="540" text-anchor="middle" font-family="${F.helv}" font-weight="300" font-size="20" letter-spacing="14" fill="${p.ink}">${esc(t.toUpperCase())}</text>
        <text x="300" y="566" text-anchor="middle" font-family="${F.helv}" font-size="11" letter-spacing="6" fill="${p.ink}" opacity=".55">${esc(ar.toUpperCase())}</text>`;
    },
    /* Swiss grid of dots */
    swiss(t, ar, p, r) {
      let dots = "";
      const n = 6,
        s = 600 / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const on = r() > 0.55;
          const rr = on ? s * 0.42 : s * (0.12 + r() * 0.12);
          dots += `<circle cx="${(i + 0.5) * s}" cy="${(j + 0.5) * s + 40}" r="${rr.toFixed(1)}" fill="${on ? p.b : p.c}"/>`;
        }
      return `<defs>${GRAIN(0.16)}</defs><rect width="600" height="600" fill="${p.a}"/>
        <g clip-path="inset(0)">${dots}</g>${grainRect}
        <rect width="600" height="96" fill="${p.a}"/>
        <text x="30" y="58" font-family="${F.helv}" font-weight="700" font-size="34" letter-spacing="-1" fill="${p.ink}">${esc(ar)}</text>
        <text x="570" y="58" text-anchor="end" font-family="${F.helv}" font-size="16" fill="${p.ink}" opacity=".8">${esc(t)}</text>`;
    },
    /* hard-bop typographic sleeve */
    bluenote(t, ar, p, r) {
      const words = t.toUpperCase().split(" ");
      let y = 120,
        txt = "";
      words.forEach((w, i) => {
        const fs = Math.min(150, (540 / Math.max(3, w.length)) * 1.55);
        txt += `<text x="34" y="${y}" font-family="${F.cond}" font-weight="800" font-size="${fs.toFixed(0)}" letter-spacing="-2" fill="${i % 2 ? p.c : p.ink}">${esc(w)}</text>`;
        y += fs * 0.86;
      });
      return `<defs>${GRAIN(0.3)}
          <linearGradient id="ph" x1="0" x2="1"><stop offset="0" stop-color="${p.d}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
          <filter id="tx"><feTurbulence type="fractalNoise" baseFrequency=".012 .2" numOctaves="2" seed="${Math.floor(r() * 99)}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.4 1.1"/></filter></defs>
        <rect width="600" height="600" fill="${p.a}"/>
        <rect x="0" y="390" width="600" height="210" fill="url(#ph)"/>
        <rect x="0" y="390" width="600" height="210" filter="url(#tx)" opacity=".5"/>
        ${txt}
        <rect x="34" y="${Math.min(y + 4, 372)}" width="532" height="2" fill="${p.ink}" opacity=".7"/>
        <text x="566" y="560" text-anchor="end" font-family="${F.helv}" font-weight="700" font-size="22" fill="${p.ink}">${esc(ar)}</text>`;
    },
    /* ECM-style quiet minimal */
    minimal(t, ar, p, r) {
      const cx = 200 + r() * 200,
        cy = 260 + r() * 120;
      return `<defs>${GRAIN(0.12)}</defs><rect width="600" height="600" fill="${p.a}"/>
        <path d="M 60 ${cy + 60} Q 300 ${cy - 40 - r() * 60} 540 ${cy + 40}" stroke="${p.c}" stroke-width="1.4" fill="none"/>
        <circle cx="${cx}" cy="${cy - 70}" r="${18 + r() * 16}" fill="${p.b}"/>
        ${grainRect}
        <text x="56" y="80" font-family="${F.helv}" font-size="15" letter-spacing="3" fill="${p.ink}">${esc(ar.toUpperCase())}</text>
        <text x="56" y="104" font-family="${F.helv}" font-size="15" letter-spacing="3" fill="${p.ink}" opacity=".6">${esc(t.toUpperCase())}</text>`;
    },
    /* topographic contour lines */
    topo(t, ar, p, r) {
      let rings = "";
      const cx = 220 + r() * 160,
        cy = 220 + r() * 160;
      for (let i = 1; i < 22; i++)
        rings += `<circle cx="${cx}" cy="${cy}" r="${i * 26}" fill="none" stroke="${i % 5 === 0 ? p.c : p.b}" stroke-width="${i % 5 === 0 ? 2.2 : 1.1}"/>`;
      return `<defs>${GRAIN(0.2)}<filter id="warp"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="2" seed="${Math.floor(r() * 99)}"/><feDisplacementMap in="SourceGraphic" scale="150"/></filter></defs>
        <rect width="600" height="600" fill="${p.d}"/>
        <g filter="url(#warp)">${rings}</g>${grainRect}
        <rect x="30" y="510" width="260" height="60" fill="${p.d}"/>
        <text x="44" y="538" font-family="${F.mono}" font-size="15" fill="${p.ink}">${esc(ar)}</text>
        <text x="44" y="558" font-family="${F.mono}" font-size="13" fill="${p.ink}" opacity=".6">${esc(t)}</text>`;
    },
    /* op-art bars */
    bars(t, ar, p, r) {
      let bars = "",
        x = 0,
        i = 0;
      while (x < 600) {
        const w = 8 + Math.abs(Math.sin(i * 0.35 + r())) * 34;
        bars += `<rect x="${x.toFixed(1)}" y="0" width="${(w * 0.55).toFixed(1)}" height="600" fill="${i % 3 === 0 ? p.c : p.b}"/>`;
        x += w;
        i++;
      }
      return `<defs>${GRAIN(0.22)}<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="${p.d}" stop-opacity="0"/><stop offset="1" stop-color="${p.d}"/></linearGradient></defs>
        <rect width="600" height="600" fill="${p.a}"/>${bars}<rect width="600" height="600" fill="url(#fade)"/>${grainRect}
        <text x="300" y="520" text-anchor="middle" font-family="${F.futura}" font-weight="700" font-size="${Math.min(54, 900 / Math.max(8, t.length)).toFixed(0)}" letter-spacing="2" fill="${p.ink}">${esc(t.toUpperCase())}</text>
        <text x="300" y="556" text-anchor="middle" font-family="${F.futura}" font-size="18" letter-spacing="8" fill="${p.ink}" opacity=".75">${esc(ar.toUpperCase())}</text>`;
    },
    /* soft glassy mesh */
    mesh(t, ar, p, r) {
      return `<defs>${GRAIN(0.18)}<filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter></defs>
        <rect width="600" height="600" fill="${p.a}"/>
        <g filter="url(#bl)"><circle cx="${120 + r() * 120}" cy="${140 + r() * 80}" r="210" fill="${p.b}"/><circle cx="${400 + r() * 100}" cy="${380 + r() * 100}" r="230" fill="${p.c}"/><circle cx="${420}" cy="${110}" r="140" fill="${p.d}" opacity=".6"/></g>
        <circle cx="300" cy="300" r="${130 + r() * 30}" fill="#fff" fill-opacity=".08" stroke="#fff" stroke-opacity=".55" stroke-width="1.5"/>
        ${grainRect}
        <text x="300" y="312" text-anchor="middle" font-family="${F.didot}" font-style="italic" font-size="40" fill="${p.ink}">${esc(t)}</text>
        <text x="300" y="560" text-anchor="middle" font-family="${F.helv}" font-size="13" letter-spacing="6" fill="${p.ink}" opacity=".8">${esc(ar.toUpperCase())}</text>`;
    },
    /* giant cropped glyph */
    glyph(t, ar, p, r) {
      const g = (t.match(/[A-Za-z]/) || ["A"])[0];
      return `<defs>${GRAIN(0.2)}</defs><rect width="600" height="600" fill="${p.a}"/>
        <text x="${-60 + r() * 60}" y="640" font-family="${F.didot}" font-size="820" fill="${p.b}">${esc(g)}</text>
        <rect x="0" y="0" width="600" height="600" fill="none" stroke="${p.c}" stroke-width="24"/>
        ${grainRect}
        <text x="560" y="70" text-anchor="end" font-family="${F.didot}" font-size="32" fill="${p.ink}">${esc(t)}</text>
        <text x="560" y="98" text-anchor="end" font-family="${F.helv}" font-size="13" letter-spacing="4" fill="${p.ink}" opacity=".7">${esc(ar.toUpperCase())}</text>`;
    },
    /* classical: framed quiet photo-ish field */
    recital(t, ar, p, r) {
      return `<defs>${GRAIN(0.3)}<radialGradient id="lt" cx=".35" cy=".4" r=".8"><stop offset="0" stop-color="${p.b}"/><stop offset="1" stop-color="${p.d}"/></radialGradient>
          <filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>
        <rect width="600" height="600" fill="${p.a}"/>
        <rect x="40" y="150" width="520" height="410" fill="url(#lt)"/>
        <g filter="url(#bl)"><ellipse cx="${260 + r() * 80}" cy="390" rx="70" ry="150" fill="${p.d}" opacity=".7"/><rect x="${330 + r() * 40}" y="250" width="14" height="300" fill="${p.c}" opacity=".5"/></g>
        ${grainRect}
        <text x="40" y="66" font-family="${F.serif}" font-size="30" fill="${p.ink}">${esc(ar)}</text>
        <text x="40" y="104" font-family="${F.serif}" font-style="italic" font-size="24" fill="${p.ink}" opacity=".85">${esc(t)}</text>
        <rect x="40" y="124" width="60" height="2" fill="${p.c}"/>`;
    },
    /* TV static / dot screen */
    static(t, ar, p, r) {
      return `<defs>${GRAIN(0.6)}<linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
          <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.2" fill="${p.d}" opacity=".35"/></pattern></defs>
        <rect width="600" height="600" fill="url(#gr)"/><rect width="600" height="600" fill="url(#dots)"/>${grainRect}
        <rect x="${80 + r() * 60}" y="${170 + r() * 60}" width="300" height="190" rx="28" fill="none" stroke="${p.ink}" stroke-width="6"/>
        <text x="40" y="560" font-family="${F.helv}" font-weight="700" font-size="44" letter-spacing="-1.5" fill="${p.ink}">${esc(t.toLowerCase())}</text>
        <text x="40" y="70" font-family="${F.helv}" font-size="16" fill="${p.ink}" opacity=".85">${esc(ar.toLowerCase())}</text>`;
    },
    /* lanterns on paper */
    lantern(t, ar, p, r) {
      let l = "";
      for (let i = 0; i < 4; i++) {
        const x = 90 + i * 120 + r() * 30,
          y = 150 + r() * 200,
          h = 90 + r() * 60;
        l += `<line x1="${x + 25}" y1="0" x2="${x + 25}" y2="${y}" stroke="${p.d}" stroke-width="1.2" opacity=".5"/>
              <rect x="${x}" y="${y}" width="50" height="${h}" rx="22" fill="${i % 2 ? p.b : p.c}"/>
              <rect x="${x + 6}" y="${y + 10}" width="38" height="${h - 20}" rx="18" fill="#fff" opacity=".18"/>`;
      }
      return `<defs>${GRAIN(0.2)}</defs><rect width="600" height="600" fill="${p.a}"/>${l}${grainRect}
        <text x="40" y="540" font-family="${F.serif}" font-style="italic" font-size="44" fill="${p.ink}">${esc(t)}</text>
        <text x="42" y="570" font-family="${F.helv}" font-size="13" letter-spacing="4" fill="${p.ink}" opacity=".7">${esc(ar.toUpperCase())}</text>`;
    },
  };

  const cache = {};
  function cover(album) {
    if (cache[album.id]) return cache[album.id];
    const r = rng(album.id + album.title);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">${STYLES[album.style](album.title, album.artist, album.pal, r)}</svg>`;
    return (cache[album.id] =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  }

  /* ---------- palettes: a,b,c,d + ink. "tint" = the colours the UI pulls from the art ---------- */
  const P = {
    dusk: {
      a: "#f1b38a",
      b: "#b0607a",
      c: "#ffe2b8",
      d: "#2a2140",
      ink: "#fff6ea",
    },
    ember: {
      a: "#ff7a2f",
      b: "#c2253d",
      c: "#ffd07a",
      d: "#120c0d",
      ink: "#f6e9df",
    },
    lantern: {
      a: "#efe6d4",
      b: "#d9472b",
      c: "#f0a033",
      d: "#3a2a20",
      ink: "#3a2a20",
    },
    north: {
      a: "#1d4e63",
      b: "#86c3c9",
      c: "#f2c14e",
      d: "#0b1f29",
      ink: "#eaf4f2",
    },
    velvet: {
      a: "#f2ece2",
      b: "#d93838",
      c: "#1b1b1b",
      d: "#1b1b1b",
      ink: "#1b1b1b",
    },
    orchard: {
      a: "#cfe8c2",
      b: "#6fb58a",
      c: "#f4f1b8",
      d: "#2f6d55",
      ink: "#123528",
    },
    sodium: {
      a: "#2a1340",
      b: "#ff9b2e",
      c: "#ffcf6b",
      d: "#14091f",
      ink: "#ffcf6b",
    },
    weather: {
      a: "#ece9e3",
      b: "#8c7f8f",
      c: "#b9b2a8",
      d: "#3c3540",
      ink: "#3c3540",
    },
    coastal: {
      a: "#0e2a3a",
      b: "#4f9fc4",
      c: "#c9f1ff",
      d: "#0b1f2c",
      ink: "#c9f1ff",
    },
    recital: {
      a: "#f4efe6",
      b: "#9aa7a3",
      c: "#c8a24a",
      d: "#28302f",
      ink: "#28302f",
    },
    holloway: {
      a: "#e9e6e1",
      b: "#ff4f8b",
      c: "#141414",
      d: "#141414",
      ink: "#141414",
    },
    sunday: {
      a: "#ffcfa8",
      b: "#ff8fb1",
      c: "#3d2c3e",
      d: "#3d2c3e",
      ink: "#3d2c3e",
    },
    moss: {
      a: "#2d3b2a",
      b: "#a3b86c",
      c: "#e8e2b0",
      d: "#151d14",
      ink: "#e8e2b0",
    },
    rust: {
      a: "#b5451b",
      b: "#f3d9b1",
      c: "#2b1b14",
      d: "#2b1b14",
      ink: "#f3d9b1",
    },
    ice: {
      a: "#dfe9f3",
      b: "#7aa2d6",
      c: "#1f3b63",
      d: "#1f3b63",
      ink: "#1f3b63",
    },
    plum: {
      a: "#3b1d3a",
      b: "#c36ea0",
      c: "#f2c6de",
      d: "#1d0d1c",
      ink: "#f2c6de",
    },
    citrus: {
      a: "#ffe066",
      b: "#ff6b35",
      c: "#1a535c",
      d: "#1a535c",
      ink: "#1a535c",
    },
    slate: {
      a: "#2f3640",
      b: "#718093",
      c: "#dcdde1",
      d: "#1e242b",
      ink: "#dcdde1",
    },
    rose: {
      a: "#f7d6d0",
      b: "#e26d5a",
      c: "#5b2a3a",
      d: "#5b2a3a",
      ink: "#5b2a3a",
    },
    teal: {
      a: "#0f3d3e",
      b: "#2ec4b6",
      c: "#ffbf69",
      d: "#08201f",
      ink: "#e8fffd",
    },
    sand: {
      a: "#e8d9b5",
      b: "#c08552",
      c: "#4b3832",
      d: "#4b3832",
      ink: "#4b3832",
    },
    night: {
      a: "#0d1b2a",
      b: "#415a77",
      c: "#e0e1dd",
      d: "#0d1b2a",
      ink: "#e0e1dd",
    },
  };

  /* ---------- artists ---------- */
  const U = (id, w = 1600, h) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}${h >= w ? "&crop=faces,entropy" : ""}` : ""}&q=70`;
  const ARTISTS = {
    marigold: {
      id: "marigold",
      name: "The Marigold Static",
      photo: "photo-1761957363340-102a996936e5",
      pos: "50% 40%",
      flip: true,
      tint: ["#c96a3a", "#5b3a6e", "#1a1418"],
      genres: ["Dream pop", "Indie rock", "Shoegaze"],
      origin: "Bristol, England",
      formed: "2011",
      members: ["Hannah Okafor", "Tom Reyes", "Priya Lund", "Sol Mendes"],
      bio: "Built around Hannah Okafor’s reverb-drenched voice and Tom Reyes’s baritone guitar, The Marigold Static spent their first years recording tape loops in a converted chapel outside Bristol. The patient, tidal songs of Low Tide Hymnal won them a cult following; 2023’s Ember Theory widened the frame with brass, choirs and a new appetite for noise.",
      monthly: "412K",
    },
    ines: {
      id: "ines",
      name: "Ines Calder",
      photo: "photo-1638397157669-97faf770dfc4",
      pos: "50% 30%",
      tint: ["#e46b8a", "#3d2c3e", "#120c12"],
      genres: ["Singer-songwriter", "Indie folk"],
      origin: "Lisbon, Portugal",
      formed: "2016",
    },
    halvard: {
      id: "halvard",
      name: "Halvard Quartet",
      photo: "photo-1730636106465-5bf686631564",
      pos: "50% 50%",
      tint: ["#c9a46a", "#3b3226", "#14110c"],
      genres: ["Nordic jazz", "Post-bop"],
      origin: "Bergen, Norway",
      formed: "1971",
    },
    okon: {
      id: "okon",
      name: "Okon & the Saints",
      photo: "photo-1719977507164-932fcb300317",
      pos: "50% 30%",
      tint: ["#d93838", "#3a1e1e", "#140c0c"],
      genres: ["Soul", "Funk"],
      origin: "Lagos / London",
      formed: "2009",
    },
    mira: {
      id: "mira",
      name: "Mira Solenne",
      photo: "photo-1517230878791-4d28214057c2",
      pos: "50% 30%",
      tint: ["#d8443a", "#40161a", "#14090a"],
      genres: ["Art pop"],
      origin: "Montréal, Canada",
      formed: "2018",
    },
    teo: {
      id: "teo",
      name: "Teo Varga Trio",
      photo: "photo-1503853585905-d53f628e46ac",
      pos: "50% 40%",
      tint: ["#ff9b2e", "#2a1340", "#0c0812"],
      genres: ["Hard bop", "Jazz"],
      origin: "Budapest, Hungary",
      formed: "1959",
    },
    juniper: {
      id: "juniper",
      name: "Juniper Ash",
      photo: "photo-1610160075067-1aca4d076650",
      pos: "50% 35%",
      tint: ["#8c7f8f", "#3c3540", "#141215"],
      genres: ["Folk", "Americana"],
      origin: "Asheville, USA",
      formed: "2014",
    },
    ferro: {
      id: "ferro",
      name: "Ferro Lune",
      photo: "photo-1777734448523-6b441c719d8d",
      pos: "50% 50%",
      tint: ["#4f9fc4", "#0e2a3a", "#081520"],
      genres: ["Electronic", "Ambient techno"],
      origin: "Berlin, Germany",
      formed: "2013",
    },
    lena: {
      id: "lena",
      name: "Lena Moravec",
      photo: "photo-1556831234-993b84e75a93",
      pos: "50% 35%",
      tint: ["#c8a24a", "#28302f", "#121614"],
      genres: ["Classical", "Contemporary"],
      origin: "Prague, Czechia",
      formed: "2006",
    },
    dunmore: {
      id: "dunmore",
      name: "Dunmore",
      photo: "photo-1544013360-983116d2a733",
      pos: "50% 35%",
      tint: ["#ff4f8b", "#2a2a2a", "#111"],
      genres: ["Post-punk", "Indie rock"],
      origin: "Glasgow, Scotland",
      formed: "2004",
    },
  };

  /* ---------- albums ---------- */
  let n = 0;
  const A = (title, artistId, year, style, pal, extra = {}) => ({
    id: "al" + n++,
    title,
    artistId,
    artist: ARTISTS[artistId] ? ARTISTS[artistId].name : artistId,
    year,
    style,
    pal: P[pal],
    palName: pal,
    tint: [P[pal].b, P[pal].a, P[pal].d],
    ...extra,
  });

  const ALBUMS = [
    A("Ember Theory", "marigold", 2023, "ember", "ember", {
      label: "Halfmoon Records",
      quality: "hires",
      fmt: "FLAC 24/96",
      src: ["local", "qobuz"],
      added: "3 days ago",
    }),
    A("Low Tide Hymnal", "marigold", 2019, "horizon", "dusk", {
      label: "Halfmoon Records",
      quality: "hires",
      fmt: "FLAC 24/96",
      src: ["local", "qobuz", "tidal"],
      added: "2 weeks ago",
    }),
    A("Paper Lanterns", "ines", 2022, "lantern", "lantern", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["tidal"],
      added: "Yesterday",
    }),
    A("Northbound", "halvard", 1978, "bluenote", "north", {
      quality: "hires",
      fmt: "FLAC 24/192",
      src: ["qobuz"],
      added: "5 days ago",
    }),
    A("Velvet Arithmetic", "okon", 2016, "swiss", "velvet", {
      quality: "cd",
      fmt: "ALAC 16/44.1",
      src: ["local"],
      added: "Last month",
    }),
    A("Glass Orchard", "mira", 2024, "mesh", "orchard", {
      quality: "hires",
      fmt: "FLAC 24/48",
      src: ["qobuz"],
      added: "Today",
    }),
    A("Sodium Nights", "teo", 1964, "bars", "sodium", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local"],
      added: "3 weeks ago",
    }),
    A("A Small Weather", "juniper", 2021, "minimal", "weather", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local", "tidal"],
      added: "Last week",
    }),
    A("Coastal Grammar", "ferro", 2018, "topo", "coastal", {
      quality: "lossy",
      fmt: "AAC 256",
      src: ["spotify"],
      added: "2 months ago",
    }),
    A("Concerto for Quiet Rooms", "lena", 2012, "recital", "recital", {
      quality: "hires",
      fmt: "FLAC 24/96",
      src: ["qobuz"],
      added: "4 days ago",
    }),
    A("Holloway", "dunmore", 2009, "glyph", "holloway", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local"],
      added: "Last year",
    }),
    A("Sunday Static", "ines", 2020, "static", "sunday", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["tidal"],
      added: "Last month",
    }),
    // marigold discography
    A("Satellite Choir", "marigold", 2016, "topo", "plum", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local"],
    }),
    A("Tin Roof Sermons", "marigold", 2014, "minimal", "sand", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local"],
    }),
    A("Harbour Lights (Live)", "marigold", 2021, "horizon", "night", {
      quality: "hires",
      fmt: "FLAC 24/48",
      src: ["qobuz"],
      type: "Live",
    }),
    A("Marigold", "marigold", 2012, "glyph", "citrus", {
      quality: "cd",
      fmt: "FLAC 16/44.1",
      src: ["local"],
      type: "EP",
    }),
    // fillers for library grid
    A("Moss & Mortar", "juniper", 2017, "lantern", "moss", { src: ["local"] }),
    A("Copper Wire Psalms", "okon", 2012, "bluenote", "rust", {
      src: ["local"],
    }),
    A("Cold Arithmetic", "ferro", 2021, "swiss", "ice", { src: ["qobuz"] }),
    A("Vesper Lines", "lena", 2019, "minimal", "slate", { src: ["qobuz"] }),
    A("Rosewater", "mira", 2021, "static", "rose", { src: ["tidal"] }),
    A("Undertow Sessions", "halvard", 1975, "bars", "teal", { src: ["qobuz"] }),
    A("Kiln", "dunmore", 2013, "ember", "rust", { src: ["local"] }),
    A("Night Ferry", "teo", 1966, "topo", "night", { src: ["local"] }),
    A("Saltmarsh", "juniper", 2023, "horizon", "ice", {
      src: ["local", "qobuz"],
    }),
    A("Plum Season", "ines", 2018, "mesh", "plum", { src: ["tidal"] }),
    A("Signal / Noise", "ferro", 2015, "bars", "slate", { src: ["spotify"] }),
    A("Lantern Choir", "okon", 2020, "lantern", "citrus", { src: ["local"] }),
    A("Ostinato", "lena", 2015, "glyph", "recital", { src: ["qobuz"] }),
    A("Brutal Summer", "dunmore", 2017, "swiss", "citrus", { src: ["local"] }),
    A("Teal Hour", "mira", 2019, "mesh", "teal", { src: ["qobuz"] }),
    A("Driftwood", "halvard", 1973, "minimal", "sand", { src: ["qobuz"] }),
  ];
  ALBUMS.forEach((al) => {
    al.quality = al.quality || (al.src[0] === "spotify" ? "lossy" : "cd");
    al.fmt = al.fmt || (al.quality === "lossy" ? "OGG 320" : "FLAC 16/44.1");
    al.type = al.type || "Album";
    al.cover = () => cover(al);
  });
  const byTitle = (t) => ALBUMS.find((a) => a.title === t);

  /* ---------- tracks ---------- */
  const TRACKS = {
    "Ember Theory": [
      ["Kindling", 221],
      ["Paper Moths", 224],
      ["Ash & Honey", 256],
      ["Slow Combustion", 271],
      ["Flint", 178],
      ["Coalface", 312],
      ["Afterglow", 287, "feat. Ines Calder"],
      ["What the Fire Keeps", 380],
      ["Cinders", 189],
      ["Ember Theory", 422],
    ],
    "Low Tide Hymnal": [
      ["Shoreline Static", 238],
      ["Low Tide Hymnal", 312],
      ["Glass Bottle Prayer", 247],
      ["Undertow", 271],
      ["Copper Light", 202],
      ["The Long Quiet", 405],
      ["Saltmarsh", 229],
      ["Anchors", 258],
      ["Pier Lights", 214],
      ["Hymn for the Ebb", 366],
    ],
  };
  const WORDS = [
    "Blue",
    "Hour",
    "Quiet",
    "Rooms",
    "Paper",
    "Weather",
    "Static",
    "Harbour",
    "Lantern",
    "Orchard",
    "Velvet",
    "North",
    "Copper",
    "Glass",
    "Signal",
    "Embers",
    "Tide",
    "Fern",
    "Silver",
    "Night",
    "Ferry",
    "Moth",
    "Kiln",
    "Arcade",
    "Choir",
  ];
  function tracksFor(al) {
    if (TRACKS[al.title]) return TRACKS[al.title];
    const r = rng(al.id + "tr");
    const out = [];
    const count = 8 + Math.floor(r() * 4);
    for (let i = 0; i < count; i++) {
      const w1 = WORDS[Math.floor(r() * WORDS.length)],
        w2 = WORDS[Math.floor(r() * WORDS.length)];
      const t =
        r() > 0.5
          ? `${w1} ${w2}`
          : r() > 0.5
            ? `The ${w1} ${w2}`
            : w1 === w2
              ? w1
              : `${w1} & ${w2}`;
      out.push([t, 150 + Math.floor(r() * 260)]);
    }
    return out;
  }

  /* ---------- rooms / players ---------- */
  const ROOMS = [
    {
      id: "living",
      name: "Living Room",
      device: "Sonos Arc",
      icon: "soundbar",
      proto: "Sonos",
      state: "playing",
      vol: 58,
      group: ["kitchen"],
      album: "Ember Theory",
      track: 3,
      pos: 102,
    },
    {
      id: "kitchen",
      name: "Kitchen",
      device: "HomePod mini",
      icon: "homepod",
      proto: "AirPlay",
      state: "grouped",
      vol: 44,
      leader: "living",
    },
    {
      id: "studio",
      name: "Studio",
      device: "WiiM Pro → Schiit Modi",
      icon: "dac",
      proto: "Squeezelite",
      state: "playing",
      vol: 34,
      album: "Concerto for Quiet Rooms",
      track: 1,
      pos: 311,
    },
    {
      id: "bedroom",
      name: "Bedroom",
      device: "Chromecast Audio",
      icon: "speaker",
      proto: "Chromecast",
      state: "paused",
      vol: 22,
      album: "Northbound",
      track: 2,
      pos: 64,
    },
    {
      id: "office",
      name: "Office",
      device: "This browser",
      icon: "laptop",
      proto: "Sendspin",
      state: "idle",
      vol: 70,
    },
    {
      id: "patio",
      name: "Patio",
      device: "AirPort Express",
      icon: "speaker",
      proto: "AirPlay",
      state: "off",
      vol: 30,
    },
  ];

  const LYRICS = [
    [0, "We kept the porch light burning"],
    [9, "long after the guests went home"],
    [17, "you said the house was learning"],
    [24, "the shape of being alone"],
    [33, ""],
    [36, "Slow combustion, quiet heat"],
    [44, "everything we never said"],
    [52, "smoulders underneath the street"],
    [60, "glowing where the wires are fed"],
    [70, ""],
    [74, "And I could light the whole sky orange"],
    [82, "with the letters that I kept"],
    [90, "but I fold them into paper moths"],
    [98, "and let them land where you have slept"],
    [108, ""],
    [112, "Slow combustion, quiet heat"],
    [120, "every ember has a name"],
    [128, "we were never built to meet"],
    [136, "only built to burn the same"],
  ];

  const GENRES = [
    {
      name: "Indie & Alternative",
      count: 812,
      photo: "photo-1544013231-143f705e952d",
      pos: "50% 30%",
    },
    {
      name: "Jazz",
      count: 431,
      photo: "photo-1725830071503-d705ef4a0975",
      pos: "50% 40%",
    },
    {
      name: "Classical",
      count: 377,
      photo: "photo-1790342023114-abd6609dfb28",
      pos: "50% 35%",
    },
    {
      name: "Electronic",
      count: 290,
      photo: "photo-1688591677634-58dfdc60d62d",
      pos: "50% 50%",
    },
    {
      name: "Folk",
      count: 244,
      photo: "photo-1556890042-262d9f7c712f",
      pos: "50% 30%",
    },
    {
      name: "Soul & R&B",
      count: 198,
      photo: "photo-1620398155783-00a7906bade5",
      pos: "50% 30%",
    },
    {
      name: "Pop",
      count: 176,
      photo: "photo-1563681543778-002ee8f3cd8a",
      pos: "50% 30%",
    },
    {
      name: "Live",
      count: 88,
      photo: "photo-1760092190035-c29f5b9d5531",
      pos: "50% 50%",
    },
  ];

  const PLAYLISTS = [
    {
      name: "Sunday Slow",
      count: 48,
      mins: "3 hr 12 min",
      covers: [
        "A Small Weather",
        "Glass Orchard",
        "Concerto for Quiet Rooms",
        "Low Tide Hymnal",
      ],
      smart: false,
    },
    {
      name: "Hi-Res Favourites",
      count: 212,
      mins: "14 hr",
      covers: [
        "Northbound",
        "Ember Theory",
        "Glass Orchard",
        "Concerto for Quiet Rooms",
      ],
      smart: true,
    },
    {
      name: "Kitchen Disco",
      count: 64,
      mins: "4 hr 2 min",
      covers: [
        "Velvet Arithmetic",
        "Sunday Static",
        "Lantern Choir",
        "Brutal Summer",
      ],
      smart: false,
    },
    {
      name: "Late Night Jazz",
      count: 37,
      mins: "2 hr 41 min",
      covers: [
        "Sodium Nights",
        "Northbound",
        "Night Ferry",
        "Undertow Sessions",
      ],
      smart: false,
    },
    {
      name: "Not Played in a Year",
      count: 503,
      mins: "33 hr",
      covers: ["Holloway", "Kiln", "Marigold", "Driftwood"],
      smart: true,
    },
  ];

  const RADIO = [
    { name: "NTS 1", sub: "London · Live", col: "#111", ink: "#fff" },
    { name: "FIP", sub: "Paris · Eclectic", col: "#e2007a", ink: "#fff" },
    { name: "KEXP", sub: "Seattle · Indie", col: "#f2f2f2", ink: "#111" },
    { name: "Radio Paradise", sub: "Mellow mix", col: "#2d6a4f", ink: "#fff" },
    { name: "WWOZ", sub: "New Orleans · Jazz", col: "#f4a261", ink: "#1d1d1d" },
  ];

  window.MA_DATA = {
    ARTISTS,
    ALBUMS,
    ROOMS,
    LYRICS,
    GENRES,
    PLAYLISTS,
    RADIO,
    byTitle,
    tracksFor,
    U,
    rng,
    cover,
  };
})();
