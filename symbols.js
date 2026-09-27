/* =========================================================
   STORMBOUND — symboles.
   Les symboles utilisent les illustrations peintes de img/.
   Le sprite SVG ci-dessous reste en secours (et pour le
   symbole caché de l'Œil du cyclone).
   ========================================================= */
(function () {
  'use strict';

  const DEFS = `
  <defs>
    <linearGradient id="gLeaf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1f6b22"/><stop offset=".55" stop-color="#5fc23c"/><stop offset="1" stop-color="#d4ff8a"/></linearGradient>
    <radialGradient id="gDrop" cx=".38" cy=".62" r=".75"><stop offset="0" stop-color="#e9f8ff"/><stop offset=".35" stop-color="#58b6ff"/><stop offset="1" stop-color="#0a3f98"/></radialGradient>
    <linearGradient id="gRock" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9c2b4"/><stop offset=".5" stop-color="#8a8274"/><stop offset="1" stop-color="#4a443b"/></linearGradient>
    <linearGradient id="gIce" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#9ce9ff"/><stop offset="1" stop-color="#1f7fc4"/></linearGradient>
    <linearGradient id="gSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b3c0d8"/><stop offset="1" stop-color="#56627f"/></linearGradient>
    <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".45" stop-color="#f6c744"/><stop offset="1" stop-color="#9a5a12"/></linearGradient>
    <linearGradient id="gGoldRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#c98a1c"/><stop offset="1" stop-color="#6e3f0a"/></linearGradient>
    <linearGradient id="gSilverRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#8b9ab8"/><stop offset="1" stop-color="#3a4560"/></linearGradient>
    <radialGradient id="gMedal" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#34508c"/><stop offset="1" stop-color="#0a1330"/></radialGradient>
    <radialGradient id="gMedalRed" cx=".5" cy=".4" r=".65"><stop offset="0" stop-color="#7a1e44"/><stop offset="1" stop-color="#1a0510"/></radialGradient>
    <linearGradient id="gDragon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb0bf"/><stop offset=".45" stop-color="#e0385c"/><stop offset="1" stop-color="#5c0a22"/></linearGradient>
    <linearGradient id="gBolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffde6"/><stop offset=".45" stop-color="#ffd83d"/><stop offset="1" stop-color="#ff8a14"/></linearGradient>
    <radialGradient id="gBoltHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe98a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
    <radialGradient id="gWild" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#9fe3ff"/><stop offset=".75" stop-color="#2a6cf0"/><stop offset="1" stop-color="#0b1f6b"/></radialGradient>
    <radialGradient id="gMystery" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#4b3f7a"/><stop offset="1" stop-color="#140f2a"/></radialGradient>
    <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="fShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".55"/></filter>
    <linearGradient id="wxCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfdff"/><stop offset=".55" stop-color="#cdd6e4"/><stop offset="1" stop-color="#8c98ae"/></linearGradient>
    <linearGradient id="wxCloudDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa5b8"/><stop offset=".5" stop-color="#5b667b"/><stop offset="1" stop-color="#2c3444"/></linearGradient>
    <linearGradient id="wxCloudRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5566"/><stop offset=".55" stop-color="#3a2432"/><stop offset="1" stop-color="#1c0d16"/></linearGradient>
    <linearGradient id="wxDrop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f6ff"/><stop offset="1" stop-color="#3f95e6"/></linearGradient>
    <linearGradient id="wxWind" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fa6cf" stop-opacity=".2"/><stop offset=".35" stop-color="#d9ecff"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
    <linearGradient id="wxBolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe2"/><stop offset=".45" stop-color="#ffd44a"/><stop offset="1" stop-color="#f08a16"/></linearGradient>
    <linearGradient id="wxBoltRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f3"/><stop offset=".45" stop-color="#ff5577"/><stop offset="1" stop-color="#b3102f"/></linearGradient>
    <linearGradient id="wxFunnel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4c5f58"/><stop offset=".45" stop-color="#b9cbc3"/><stop offset="1" stop-color="#3e4f49"/></linearGradient>
    <linearGradient id="wxAnvil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c2b7"/><stop offset=".6" stop-color="#5f766d"/><stop offset="1" stop-color="#2d3b36"/></linearGradient>
    <filter id="wxGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <linearGradient id="icoMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c3cddd"/><stop offset="1" stop-color="#7d889c"/></linearGradient>
    <radialGradient id="icoEye" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="#fff6b0"/><stop offset=".35" stop-color="#ffb02e"/><stop offset=".75" stop-color="#d8341e"/><stop offset="1" stop-color="#5a0a12"/></radialGradient>
  </defs>`;

  const ART = {
    icoauto: `
      <g fill="none" stroke="url(#icoMetal)" stroke-width="5.5" stroke-linecap="round">
        <path d="M49 25 A19 19 0 0 0 16 20"/>
        <path d="M15 39 A19 19 0 0 0 48 44"/>
      </g>
      <path d="M8 14 L20 30 L26 12 Z" fill="url(#icoMetal)"/>
      <path d="M56 50 L44 34 L38 52 Z" fill="url(#icoMetal)"/>`,
    icosound: `
      <path d="M8 24 H19 L33 11 V53 L19 40 H8 Z" fill="url(#icoMetal)" stroke="#3a4558" stroke-width="1.5" stroke-linejoin="round"/>
      <g fill="none" stroke="url(#icoMetal)" stroke-width="4.5" stroke-linecap="round"><path d="M41 23 Q47 32 41 41"/><path d="M48 16 Q58 32 48 48"/></g>`,
    icomute: `
      <path d="M8 24 H19 L33 11 V53 L19 40 H8 Z" fill="url(#icoMetal)" stroke="#3a4558" stroke-width="1.5" stroke-linejoin="round" opacity=".7"/>
      <g stroke="#ff6b81" stroke-width="5" stroke-linecap="round"><path d="M42 24 L57 40"/><path d="M57 24 L42 40"/></g>`,
    icoeye: `
      <path d="M3 32 C15 13 49 13 61 32 C49 51 15 51 3 32 Z" fill="url(#icoEye)" stroke="#3a0508" stroke-width="2.2"/>
      <path d="M32 15 C27 24 27 40 32 49 C37 40 37 24 32 15 Z" fill="#120306"/>
      <ellipse cx="25" cy="25" rx="4" ry="2.5" fill="#fff" opacity=".75" transform="rotate(-25 25 25)"/>`,

    wx0: `
      <path d="M16 38 C8 38 6 28 13 25 C12 16 22 12 28 17 C31 9 45 9 47 19 C55 18 59 27 54 33 C57 37 53 40 49 40 L18 40 C17 40 16 39 16 38 Z" fill="url(#wxCloud)" stroke="#6f7b91" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M17 27 C18 22 23 19 28 21 M30 17 C34 12 42 12 45 19" stroke="#fff" stroke-width="1.6" fill="none" opacity=".8" stroke-linecap="round"/>
      <g fill="url(#wxDrop)" stroke="#2f6fb3" stroke-width=".6">
        <path d="M22 45 C22 45 19 50 19 52 A3 3 0 0 0 25 52 C25 50 22 45 22 45 Z"/>
        <path d="M33 47 C33 47 30 52 30 54 A3 3 0 0 0 36 54 C36 52 33 47 33 47 Z"/>
        <path d="M44 44 C44 44 41 49 41 51 A3 3 0 0 0 47 51 C47 49 44 44 44 44 Z"/>
        <path d="M28 55 C28 55 26 58 26 59.5 A2 2 0 0 0 30 59.5 C30 58 28 55 28 55 Z" opacity=".8"/>
        <path d="M39 56 C39 56 37 59 37 60.5 A2 2 0 0 0 41 60.5 C41 59 39 56 39 56 Z" opacity=".8"/>
      </g>`,
    wx1: `
      <g fill="none" stroke-linecap="round">
        <path d="M6 22 H36 C43 22 46 14 40 11 C35 9 32 14 35 17" stroke="url(#wxWind)" stroke-width="4"/>
        <path d="M4 33 H48 C56 33 59 42 52 46 C46 49 42 43 46 40" stroke="url(#wxWind)" stroke-width="4.5"/>
        <path d="M10 44 H28 C34 44 36 51 31 53 C27 55 24 51 27 49" stroke="url(#wxWind)" stroke-width="3.2"/>
      </g>
      <path d="M50 18 C54 12 61 12 61 12 C61 12 60 19 54 21 C52 22 50 21 50 18 Z" fill="#7fbf4a" stroke="#3d6e22" stroke-width="1"/>
      <path d="M51 20 L59 13" stroke="#dfffc8" stroke-width=".9"/>`,
    wx2: `
      <path d="M16 38 C8 38 6 28 13 25 C12 16 22 12 28 17 C31 9 45 9 47 19 C55 18 59 27 54 33 C57 37 53 40 49 40 L18 40 C17 40 16 39 16 38 Z" transform="translate(0 -4)" fill="url(#wxCloudDark)" stroke="#262d3a" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M17 23 C18 18 23 15 28 17 M30 13 C34 8 42 8 45 15" stroke="#c3cbd8" stroke-width="1.4" fill="none" opacity=".7" stroke-linecap="round"/>
      <path d="M35 33 L24 48 L32 48 L27 61 L44 42 L35 42 L40 33 Z" fill="url(#wxBolt)" stroke="#9a4a05" stroke-width="1.2" stroke-linejoin="round" filter="url(#wxGlow)"/>
      <path d="M36 35 L29 45" stroke="#fff" stroke-width="1.3" opacity=".8" stroke-linecap="round"/>
      <g stroke="#9ec9f5" stroke-width="1.6" stroke-linecap="round" opacity=".75"><path d="M18 42 L16 47 M49 40 L47 45 M20 52 L18 56"/></g>`,
    wx3: `
      <path d="M4 16 C10 8 22 6 32 9 C42 6 56 8 60 16 C56 20 46 21 32 20 C18 21 8 20 4 16 Z" fill="url(#wxAnvil)" stroke="#23302b" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M10 14 C18 10 28 10 32 12 C38 10 48 10 54 14" stroke="#e1f0e8" stroke-width="1.2" fill="none" opacity=".6"/>
      <path d="M18 20 C22 28 28 32 29 38 C30 45 33 50 31 58 L35 58 C36 50 34 45 36 39 C38 33 44 27 47 20 Z" fill="url(#wxFunnel)" stroke="#23302b" stroke-width="1.2" stroke-linejoin="round"/>
      <g stroke="#e7f3ed" stroke-width="1.1" fill="none" opacity=".7" stroke-linecap="round">
        <path d="M22 25 C28 28 38 28 43 25"/><path d="M26 32 C30 34 36 34 40 32"/><path d="M29 40 C31 41 35 41 37 40"/><path d="M30 48 C32 49 34 49 35 48"/>
      </g>
      <g fill="#3a4a44"><circle cx="24" cy="54" r="1.6"/><circle cx="41" cy="52" r="1.3"/><circle cx="20" cy="47" r="1"/><rect x="43" y="57" width="3" height="1.6" rx=".5"/><rect x="18" y="58" width="2.6" height="1.4" rx=".5"/></g>`,
    wx4: `
      <path d="M16 38 C8 38 6 28 13 25 C12 16 22 12 28 17 C31 9 45 9 47 19 C55 18 59 27 54 33 C57 37 53 40 49 40 L18 40 C17 40 16 39 16 38 Z" transform="translate(0 -6)" fill="url(#wxCloudRed)" stroke="#12060c" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M16 32 C22 34 42 34 50 32" stroke="#ff4d73" stroke-width="1.6" fill="none" opacity=".7" filter="url(#wxGlow)"/>
      <path d="M30 32 L22 45 L29 45 L23 60 L38 41 L31 41 L36 32 Z" fill="url(#wxBoltRed)" stroke="#5c0418" stroke-width="1.1" stroke-linejoin="round" filter="url(#wxGlow)"/>
      <path d="M42 33 L38 41 L43 41 L40 50 L49 38 L44 38 L47 33 Z" fill="url(#wxBoltRed)" stroke="#5c0418" stroke-width=".9" stroke-linejoin="round" opacity=".9"/>
      <g fill="#ff9aa9" opacity=".8"><circle cx="15" cy="46" r="1"/><circle cx="52" cy="50" r="1.2"/><circle cx="46" cy="58" r=".9"/></g>`,
    bolt: `
      <path d="M36 4 L14 36 L29 36 L24 60 L50 26 L34 26 L42 4 Z" fill="url(#wxBolt)" stroke="#8a4200" stroke-width="2" stroke-linejoin="round"/>
      <path d="M36 9 L22 31" stroke="#fff" stroke-width="2.2" opacity=".75" stroke-linecap="round"/>`,

    leaf: `
      <g filter="url(#fShadow)">
        <path d="M18 84 C 16 44 46 14 88 12 C 90 52 62 84 18 84 Z" fill="url(#gLeaf)" stroke="#164f18" stroke-width="2.5"/>
        <path d="M22 80 Q 52 52 84 16" stroke="#eaffd0" stroke-width="2.6" fill="none" opacity=".85"/>
        <path d="M38 64 L 34 46 M48 54 L 64 56 M56 44 L 54 30 M66 34 L 78 38 M44 58 L 30 56" stroke="#eaffd0" stroke-width="1.8" fill="none" opacity=".6"/>
        <path d="M28 72 C 30 50 48 30 72 22" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
      </g>
      <path d="M6 58 q 9 -9 19 -2 M10 70 q 7 -6 14 -1" stroke="#dfffe8" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`,
    drop: `
      <g filter="url(#fShadow)">
        <path d="M50 6 C 50 6 18 44 18 64 A 32 32 0 0 0 82 64 C 82 44 50 6 50 6 Z" fill="url(#gDrop)" stroke="#08367e" stroke-width="2.5"/>
        <ellipse cx="37" cy="58" rx="6.5" ry="13" fill="#fff" opacity=".6" transform="rotate(22 37 58)"/>
        <circle cx="62" cy="76" r="3" fill="#fff" opacity=".45"/>
      </g>
      <path d="M54 40 L 46 58 L 55 58 L 47 78" stroke="#f2fbff" stroke-width="3" fill="none" stroke-linejoin="round" filter="url(#fGlow)"/>`,
    rock: `
      <g filter="url(#fShadow)">
        <path d="M22 86 L 14 50 L 30 18 L 62 10 L 86 32 L 88 70 L 64 90 Z" fill="url(#gRock)" stroke="#312b24" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M30 18 L 42 46 L 14 50 M42 46 L 62 10 M42 46 L 60 60 L 86 32 M60 60 L 64 90 M60 60 L 22 86" stroke="#2c261f" stroke-width="1.5" fill="none" opacity=".4"/>
        <path d="M32 22 L 58 14" stroke="#fff" stroke-width="2.5" opacity=".35" stroke-linecap="round"/>
      </g>
      <path d="M50 30 L 50 72 M50 40 L 63 31 M50 52 L 37 43 M50 60 L 63 68" stroke="#7fe8ff" stroke-width="4.5" stroke-linecap="round" fill="none" filter="url(#fGlow)"/>`,
    ice: `
      <g filter="url(#fShadow)">
        <path d="M50 4 L 80 21 L 80 71 L 50 96 L 20 71 L 20 21 Z" fill="url(#gIce)" stroke="#1f6aa8" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M50 4 L 50 96 M20 21 L 80 71 M80 21 L 20 71" stroke="#fff" stroke-width="1.5" opacity=".4"/>
        <path d="M50 26 L 65 35 L 65 58 L 50 70 L 35 58 L 35 35 Z" fill="#fff" opacity=".3"/>
        <path d="M24 26 L 48 12" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>
      </g>
      <path d="M78 8 L 80 14 L 86 16 L 80 18 L 78 24 L 76 18 L 70 16 L 76 14 Z" fill="#fff" filter="url(#fGlow)"/>`,
    wolf: `
      <g filter="url(#fShadow)">
        <circle cx="50" cy="50" r="45" fill="url(#gMedal)" stroke="url(#gSilverRim)" stroke-width="5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#9fb4e0" stroke-width="1" opacity=".35"/>
        <path d="M50 86 L 35 72 L 27 54 L 22 22 L 38 36 L 50 32 L 62 36 L 78 22 L 73 54 L 65 72 Z" fill="url(#gSilver)" stroke="#161d33" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M26 28 L 36 39 L 30 45 Z M74 28 L 64 39 L 70 45 Z" fill="#4a5674"/>
        <path d="M50 36 L 45 48 L 50 60 L 55 48 Z" fill="#fff" opacity=".6"/>
        <path d="M34 62 L 42 70 M66 62 L 58 70 M30 54 L 38 60 M70 54 L 62 60" stroke="#56627f" stroke-width="2" stroke-linecap="round"/>
        <path d="M43 68 L 50 80 L 57 68 Z" fill="#161d33"/>
      </g>
      <path d="M36 51 L 46 55 L 39 58 Z M64 51 L 54 55 L 61 58 Z" fill="#8ff0ff" filter="url(#fGlow)"/>`,
    eagle: `
      <g filter="url(#fShadow)">
        <circle cx="50" cy="50" r="45" fill="url(#gMedal)" stroke="url(#gGoldRim)" stroke-width="5"/>
        <path d="M18 82 C 20 52 32 30 55 25 C 70 22 82 28 86 40 L 74 43 C 80 50 77 58 70 60 L 65 52 C 58 58 50 68 46 86 Z" fill="url(#gGold)" stroke="#5e340c" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M74 43 L 92 47 C 90 56 81 59 71 56 Z" fill="#ffe894" stroke="#5e340c" stroke-width="2"/>
        <path d="M84 48 L 91 48" stroke="#5e340c" stroke-width="1.5"/>
        <path d="M54 31 L 72 33" stroke="#5e340c" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M32 62 Q 42 58 46 48 M28 72 Q 40 68 44 58 M38 80 Q 48 72 50 62" stroke="#8a5514" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M30 48 C 34 38 42 32 52 30" stroke="#fff" stroke-width="2.5" opacity=".5" fill="none" stroke-linecap="round"/>
      </g>
      <circle cx="64" cy="38" r="3.6" fill="#8ff0ff" filter="url(#fGlow)"/>`,
    trident: `
      <g filter="url(#fShadow)">
        <rect x="46" y="38" width="8" height="58" rx="3" fill="url(#gGold)" stroke="#5e340c" stroke-width="2"/>
        <path d="M46 70 L 54 66 M46 80 L 54 76" stroke="#5e340c" stroke-width="1.6"/>
        <path d="M20 8 L 30 30 L 30 40 Q 50 54 70 40 L 70 30 L 80 8 L 73 11 L 64 32 Q 50 41 36 32 L 27 11 Z" fill="url(#gGold)" stroke="#5e340c" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M50 2 L 57 18 L 53.5 18 L 53.5 42 L 46.5 42 L 46.5 18 L 43 18 Z" fill="url(#gGold)" stroke="#5e340c" stroke-width="2.2" stroke-linejoin="round"/>
        <circle cx="50" cy="45" r="5.5" fill="#3aa0ff" stroke="#fff" stroke-width="1.5"/>
      </g>
      <path d="M28 18 L 36 24 L 32 28 L 42 32 M72 18 L 64 24 L 68 28 L 58 32 M50 50 L 44 60 L 52 62 L 46 74" stroke="#c8f6ff" stroke-width="2.2" fill="none" stroke-linejoin="round" filter="url(#fGlow)"/>`,
    crown: `
      <g filter="url(#fShadow)">
        <path d="M14 72 L 8 28 L 30 46 L 50 14 L 70 46 L 92 28 L 86 72 Z" fill="url(#gGold)" stroke="#5e340c" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="12" y="68" width="76" height="16" rx="4" fill="url(#gGold)" stroke="#5e340c" stroke-width="2.5"/>
        <path d="M20 64 L 16 38 M50 22 L 50 40" stroke="#fff" stroke-width="3" opacity=".5" stroke-linecap="round"/>
        <circle cx="31" cy="76" r="4.5" fill="#ff4d6d" stroke="#fff" stroke-width="1.2"/>
        <circle cx="50" cy="76" r="5.5" fill="#3aa0ff" stroke="#fff" stroke-width="1.2"/>
        <circle cx="69" cy="76" r="4.5" fill="#ff4d6d" stroke="#fff" stroke-width="1.2"/>
      </g>
      <g filter="url(#fGlow)" fill="#aef1ff"><circle cx="8" cy="28" r="5"/><circle cx="50" cy="14" r="6"/><circle cx="92" cy="28" r="5"/></g>`,
    charge: `
      <circle cx="50" cy="50" r="46" fill="url(#gBoltHalo)"/>
      <path d="M60 4 L 20 56 L 46 56 L 36 96 L 82 38 L 55 38 L 68 4 Z" fill="url(#gBolt)" stroke="#8a4200" stroke-width="2.5" stroke-linejoin="round" filter="url(#fGlow)"/>
      <path d="M58 12 L 30 50" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>`,
    dragon: `
      <g filter="url(#fShadow)">
        <circle cx="50" cy="50" r="45" fill="url(#gMedalRed)" stroke="url(#gGoldRim)" stroke-width="5"/>
        <path d="M52 26 L 38 6 L 58 22 Z M62 26 L 60 6 L 68 24 Z" fill="#f6e8c8" stroke="#5c0a22" stroke-width="1.5"/>
        <path d="M14 76 C 16 46 32 28 58 24 C 72 22 84 30 90 42 L 76 48 L 88 56 C 78 64 66 62 58 60 C 52 68 46 78 44 90 Z" fill="url(#gDragon)" stroke="#3a0612" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M78 50 L 80 56 L 82 50 M84 53 L 85 58 L 87 54" stroke="#fff" stroke-width="1.6" fill="none"/>
        <path d="M26 64 q 6 -6 12 0 M30 74 q 6 -6 12 0 M36 54 q 6 -6 12 0" stroke="#5c0a22" stroke-width="1.8" fill="none" opacity=".7"/>
        <path d="M30 44 C 36 34 46 28 58 27" stroke="#fff" stroke-width="2.5" opacity=".45" fill="none" stroke-linecap="round"/>
      </g>
      <path d="M64 36 L 76 39 L 67 43 Z" fill="#ffe36b" filter="url(#fGlow)"/>`,
    wild: `
      <circle cx="50" cy="50" r="46" fill="url(#gWild)" stroke="#bfe9ff" stroke-width="2.5" filter="url(#fGlow)"/>
      <g stroke-linecap="round" fill="none">
        <path d="M50 50 C 50 36 70 34 74 50 C 78 70 50 82 34 70 C 16 56 24 22 50 16" stroke="#fff" stroke-width="5" opacity=".9"/>
        <path d="M50 50 C 50 36 70 34 74 50 C 78 70 50 82 34 70 C 16 56 24 22 50 16" stroke="#fff" stroke-width="3" opacity=".5" transform="rotate(120 50 50)"/>
        <path d="M50 50 C 50 36 70 34 74 50 C 78 70 50 82 34 70 C 16 56 24 22 50 16" stroke="#fff" stroke-width="3" opacity=".5" transform="rotate(240 50 50)"/>
      </g>
      <text x="50" y="58" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="900" font-size="21" fill="#fff" stroke="#0b2a6b" stroke-width="3" paint-order="stroke" letter-spacing="1">WILD</text>`,
    mystery: `
      <circle cx="50" cy="50" r="45" fill="url(#gMystery)" stroke="#b9a7ff" stroke-width="3" filter="url(#fGlow)"/>
      <text x="50" y="66" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="900" font-size="46" fill="#e8e0ff">?</text>`,
  };

  let sprite = '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' + DEFS;
  for (const [k, body] of Object.entries(ART)) {
    const vb = k.startsWith('wx') || k.startsWith('ico') || k === 'bolt' ? '0 0 64 64' : '0 0 100 100';
    sprite += `<symbol id="sym-${k}" viewBox="${vb}">${body}</symbol>`;
  }
  sprite += '</svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);

  // Illustrations peintes (img/*.webp) ; le dessin vectoriel sert de secours et pour le symbole caché.
  const PAINTED = ['leaf', 'drop', 'rock', 'ice', 'wolf', 'eagle', 'trident', 'crown', 'wild', 'charge', 'dragon'];
  const painted = new Set(PAINTED);
  for (const k of PAINTED) { const i = new Image(); i.src = `img/${k}.webp`; }  // préchargement

  window.symbolSVG = (key) => painted.has(key)
    ? `<img class="art" src="img/${key}.webp" alt="" draggable="false">`
    : `<svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#sym-${key}"/></svg>`;
})();
