/* =========================================================
   COCO BOUM! — dessins cartoon provisoires (SVG)
   À remplacer par les images finales (voir PROMPT_CHATGPT.md).
   ========================================================= */
(function (root) {
  'use strict';
  const O = '#2a1608';
  const S = `stroke="${O}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"`;

  // Yeux cartoon : blanc, pupille, reflet. look = décalage de la pupille.
  function eye(x, y, r, look = [1, 1]) {
    return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.8}" ry="${r}" fill="#fff" stroke="${O}" stroke-width="2.5"/>` +
      `<circle cx="${x + look[0]}" cy="${y + look[1]}" r="${r * 0.48}" fill="${O}"/>` +
      `<circle cx="${x + look[0] + r * 0.22}" cy="${y + look[1] - r * 0.25}" r="${r * 0.17}" fill="#fff"/>`;
  }
  const smile = (x, y, w, d = 6) => `<path d="M${x - w} ${y} Q${x} ${y + d} ${x + w} ${y}" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`;
  const shine = (d) => `<path d="${d}" fill="#fff" opacity=".45"/>`;

  // Contour d'une union de cercles : on trace d'abord les contours épais, puis les remplissages.
  const blob = (circles, fill) =>
    circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${O}" stroke="${O}" stroke-width="7"/>`).join('') +
    circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');

  function cornKernels() {
    let k = '';
    for (let y = 22; y <= 78; y += 8.5) {
      const half = 15 - Math.abs(y - 48) * 0.22;
      for (let x = 50 - half + 4; x <= 50 + half - 3; x += 7.5)
        k += `<ellipse cx="${x.toFixed(1)}" cy="${y}" rx="3.2" ry="3.6" fill="#ffe98a" stroke="#d99a00" stroke-width="1.3"/>`;
    }
    return k;
  }

  const ART = {
    corn: `
      <path d="M50 9 C65 9 70 34 69 58 C68 78 60 88 50 88 C40 88 32 78 31 58 C30 34 35 9 50 9Z" fill="#ffc928" ${S}/>
      ${cornKernels()}
      ${shine('M40 20 C36 30 35 42 36 52 C38 40 40 30 44 22Z')}
      <path d="M49 94 C27 92 14 70 19 36 C27 56 36 68 50 78Z" fill="#6cc644" ${S}/>
      <path d="M51 94 C73 92 86 70 81 36 C73 56 64 68 50 78Z" fill="#58b536" ${S}/>
      ${eye(43, 42, 6.5)}${eye(57, 42, 6.5)}
      ${smile(50, 54, 6, 6)}`,

    carrot: `
      <path d="M50 34 C44 16 34 8 26 9 C30 18 38 28 48 36Z" fill="#6cc644" ${S}/>
      <path d="M50 34 C54 14 62 6 72 8 C68 18 60 28 52 36Z" fill="#58b536" ${S}/>
      <path d="M50 34 C49 20 50 10 52 4 C56 14 55 24 52 36Z" fill="#7ed957" ${S}/>
      <path d="M24 38 Q50 24 76 38 Q66 66 50 96 Q34 66 24 38Z" fill="#ff8a1f" ${S}/>
      <path d="M31 56 l9 1 M62 52 l-9 2 M40 74 l7 0 M58 70 l-6 1" stroke="#c75a00" stroke-width="2.5" stroke-linecap="round"/>
      ${shine('M32 40 C36 50 40 58 44 64 C38 58 33 50 31 42Z')}
      ${eye(42, 46, 6)}${eye(58, 46, 6)}
      ${smile(50, 57, 5, 5)}`,

    apple: `
      <path d="M50 28 C50 20 52 14 58 8" fill="none" ${S}/>
      <path d="M55 20 C62 8 76 9 81 13 C73 22 63 24 55 20Z" fill="#6cc644" ${S}/>
      <path d="M50 28 C36 17 14 23 14 50 C14 75 33 92 50 85 C67 92 86 75 86 50 C86 23 64 17 50 28Z" fill="#e8323c" ${S}/>
      ${shine('M26 38 C22 46 22 56 25 62 C28 52 30 44 34 38Z')}
      <path d="M33 50 Q39 45 45 50" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      ${eye(60, 49, 6.5)}
      ${smile(50, 63, 8, 7)}
      <ellipse cx="32" cy="62" rx="5" ry="3" fill="#ff8fa0" opacity=".8"/>`,

    sheep: `
      ${blob([[30, 38, 15], [50, 30, 16], [70, 38, 15], [24, 58, 14], [76, 58, 14], [34, 76, 14], [66, 76, 14], [50, 80, 14]], '#fbf7ef')}
      <ellipse cx="22" cy="52" rx="9" ry="5" fill="#4b3b47" ${S} transform="rotate(-25 22 52)"/>
      <ellipse cx="78" cy="52" rx="9" ry="5" fill="#4b3b47" ${S} transform="rotate(25 78 52)"/>
      <ellipse cx="50" cy="58" rx="18" ry="22" fill="#5a4856" ${S}/>
      ${blob([[40, 38, 8], [50, 34, 9], [60, 38, 8]], '#fbf7ef')}
      <path d="M38 55 Q43 51 48 55" fill="#fff" stroke="${O}" stroke-width="2.5"/>
      <path d="M52 55 Q57 51 62 55" fill="#fff" stroke="${O}" stroke-width="2.5"/>
      <path d="M38 55 Q43 58 48 55 M52 55 Q57 58 62 55" fill="none" stroke="${O}" stroke-width="2.5"/>
      <ellipse cx="50" cy="68" rx="5" ry="3.5" fill="#ff9fb5" stroke="${O}" stroke-width="2"/>
      ${smile(50, 73, 5, 4)}`,

    pig: `
      <path d="M22 34 L20 12 L40 24Z" fill="#ff85b0" ${S}/>
      <path d="M78 34 L80 12 L60 24Z" fill="#ff85b0" ${S}/>
      <circle cx="50" cy="54" r="35" fill="#ffadc9" ${S}/>
      ${shine('M24 44 C22 52 22 58 24 64 C26 56 28 50 32 44Z')}
      <ellipse cx="30" cy="62" rx="6" ry="4" fill="#ff7aa6" opacity=".7"/>
      <ellipse cx="70" cy="62" rx="6" ry="4" fill="#ff7aa6" opacity=".7"/>
      ${eye(38, 44, 6.5)}${eye(62, 44, 6.5)}
      <ellipse cx="50" cy="64" rx="15" ry="11" fill="#ff85b0" ${S}/>
      <ellipse cx="44.5" cy="64" rx="3" ry="4.5" fill="${O}"/>
      <ellipse cx="55.5" cy="64" rx="3" ry="4.5" fill="${O}"/>
      ${smile(50, 79, 7, 4)}`,

    cow: `
      <path d="M30 28 C20 22 16 12 20 5 C26 14 32 18 40 22Z" fill="#fff0c8" ${S}/>
      <path d="M70 28 C80 22 84 12 80 5 C74 14 68 18 60 22Z" fill="#fff0c8" ${S}/>
      <ellipse cx="14" cy="40" rx="11" ry="6" fill="#fff" ${S} transform="rotate(20 14 40)"/>
      <ellipse cx="86" cy="40" rx="11" ry="6" fill="#fff" ${S} transform="rotate(-20 86 40)"/>
      <path d="M22 40 C22 16 78 16 78 40 L75 64 C73 84 27 84 25 64Z" fill="#fff" ${S}/>
      <path d="M26 30 C34 26 40 32 36 40 C32 46 24 42 24 36Z" fill="${O}"/>
      <path d="M62 24 C70 22 76 28 74 36 C68 34 62 32 62 24Z" fill="${O}"/>
      ${eye(39, 45, 6.5)}${eye(61, 45, 6.5)}
      <ellipse cx="50" cy="72" rx="23" ry="15" fill="#ffb3c1" ${S}/>
      <ellipse cx="42" cy="70" rx="3.5" ry="5" fill="${O}"/>
      <ellipse cx="58" cy="70" rx="3.5" ry="5" fill="${O}"/>
      ${smile(50, 79, 7, 4)}`,

    fox: `
      <path d="M50 90 C33 88 14 72 12 50 L18 12 L38 30 C44 28 56 28 62 30 L82 12 L88 50 C86 72 67 88 50 90Z" fill="#ff8a1f" ${S}/>
      <path d="M22 22 L24 38 L33 31Z M78 22 L76 38 L67 31Z" fill="#7a3b1e"/>
      <path d="M12 50 C24 64 38 68 50 90 C62 68 76 64 88 50 C75 60 62 62 50 72 C38 62 25 60 12 50Z" fill="#fff" ${S}/>
      <path d="M31 44 Q38 38 45 45" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <path d="M55 42 Q63 34 71 42" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 51 Q38 46 44 51 Q38 55 32 51Z" fill="#ffe24a" stroke="${O}" stroke-width="2.5"/>
      <path d="M56 51 Q62 46 68 51 Q62 55 56 51Z" fill="#ffe24a" stroke="${O}" stroke-width="2.5"/>
      <circle cx="39" cy="51" r="2.3" fill="${O}"/><circle cx="63" cy="51" r="2.3" fill="${O}"/>
      <ellipse cx="50" cy="75" rx="6" ry="4.5" fill="${O}"/>
      <path d="M43 83 Q52 88 60 80" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>`,

    wild: `
      <path d="M44 22 C40 12 48 8 50 16 C52 6 60 10 54 22" fill="#ffd23f" ${S}/>
      <circle cx="50" cy="46" r="26" fill="#ffd23f" ${S}/>
      ${shine('M32 36 C30 42 30 48 32 52 C34 46 36 42 40 38Z')}
      <path d="M34 40 h13 v7 a6 6 0 0 1 -13 0Z M53 40 h13 v7 a6 6 0 0 1 -13 0Z" fill="${O}"/>
      <path d="M47 42 h6" stroke="${O}" stroke-width="3"/>
      <path d="M37 42 l4 0" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <path d="M44 54 L56 54 L50 62Z" fill="#ff8a1f" ${S}/>
      <path d="M18 62 L27 54 L35 62 L43 54 L50 62 L57 54 L65 62 L73 54 L82 62 C82 84 68 94 50 94 C32 94 18 84 18 62Z" fill="#fff4dc" ${S}/>
      <text x="50" y="86" text-anchor="middle" font-family="Luckiest Guy, Impact, sans-serif" font-size="17" fill="#e0452b" stroke="${O}" stroke-width="1.2">WILD</text>`,

    barn: `
      <path d="M17 46 L50 20 L83 46 L83 90 L17 90Z" fill="#e0452b" ${S}/>
      <path d="M22 52 v34 M30 50 v36 M70 50 v36 M78 52 v34" stroke="#b8311c" stroke-width="2"/>
      <path d="M10 48 L50 14 L90 48 L84 53 L50 25 L16 53Z" fill="#7a3b2e" ${S}/>
      <rect x="42" y="34" width="16" height="12" rx="2" fill="#ffd23f" ${S}/>
      <rect x="33" y="58" width="34" height="32" fill="#fff" ${S}/>
      <path d="M33 58 L67 90 M67 58 L33 90 M50 58 V90" stroke="${O}" stroke-width="3.5"/>
      <rect x="8" y="70" width="84" height="20" rx="6" fill="#ffd23f" ${S}/>
      <text x="50" y="87" text-anchor="middle" font-family="Luckiest Guy, Impact, sans-serif" font-size="17" fill="#e0452b" stroke="${O}" stroke-width="1">BONUS</text>`,

    egg: `
      <path d="M50 8 C72 8 84 44 84 62 C84 82 68 93 50 93 C32 93 16 82 16 62 C16 44 28 8 50 8Z" fill="#fff4dc" ${S}/>
      <circle cx="38" cy="40" r="3" fill="#e7c98f"/><circle cx="63" cy="32" r="2.5" fill="#e7c98f"/>
      <circle cx="68" cy="60" r="3.5" fill="#e7c98f"/><circle cx="34" cy="70" r="2.5" fill="#e7c98f"/>
      <circle cx="55" cy="78" r="2" fill="#e7c98f"/>
      ${shine('M32 30 C26 40 24 52 25 60 C29 48 33 38 40 28Z')}`,

    nestbase: `
      <path d="M8 70 C10 92 90 92 92 70 C80 80 20 80 8 70Z" fill="#c98a4b" ${S}/>
      <path d="M12 74 L30 84 M24 72 L44 88 M40 76 L58 88 M56 74 L74 86 M72 72 L88 80 M20 84 L36 76 M50 88 L66 76" stroke="#8a5528" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M8 70 C20 62 80 62 92 70" fill="none" stroke="#e3b16a" stroke-width="5" stroke-linecap="round"/>`,

    nest: `
      <path d="M50 14 C66 14 76 40 76 54 C76 70 64 78 50 78 C36 78 24 70 24 54 C24 40 34 14 50 14Z" fill="#fff4dc" ${S}/>
      <circle cx="42" cy="36" r="2.5" fill="#e7c98f"/><circle cx="60" cy="48" r="3" fill="#e7c98f"/>
      ${shine('M34 30 C30 38 29 46 30 52 C33 44 36 36 41 30Z')}
      <path d="M6 62 C8 94 92 94 94 62 C80 74 20 74 6 62Z" fill="#c98a4b" ${S}/>
      <path d="M12 70 L30 82 M24 68 L44 86 M42 72 L58 86 M58 70 L74 84 M72 68 L88 76 M20 82 L36 72" stroke="#8a5528" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M6 62 C20 54 80 54 94 62" fill="none" stroke="#e3b16a" stroke-width="5" stroke-linecap="round"/>`,

    golden: `
      <path d="M50 8 C72 8 84 44 84 62 C84 82 68 93 50 93 C32 93 16 82 16 62 C16 44 28 8 50 8Z" fill="#ffcf2e" ${S}/>
      <path d="M50 20 C64 22 74 48 74 62 C74 76 64 84 50 84" fill="none" stroke="#f0a800" stroke-width="5" stroke-linecap="round"/>
      ${shine('M32 30 C26 40 24 52 25 60 C29 48 33 38 40 28Z')}
      <path d="M80 10 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3Z M14 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#fff" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
      <text x="50" y="68" text-anchor="middle" font-family="Luckiest Guy, Impact, sans-serif" font-size="22" fill="#fff" stroke="${O}" stroke-width="1.5">×5+</text>`,

    crack1: `<path d="M20 50 L32 46 L38 54 L48 46 L54 52" fill="none" stroke="${O}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`,
    crack2: `<path d="M16 56 L28 48 L36 58 L46 46 L56 56 L64 44 L72 52 L84 50" fill="none" stroke="${O}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M46 46 L44 34 L50 26 M56 56 L60 68 L54 76" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>`,

    dynamite: `
      <path d="M58 22 C64 12 72 12 76 6" fill="none" stroke="#6b4a2a" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="22" y="26" width="17" height="62" rx="5" fill="#e0452b" ${S}/>
      <rect x="41" y="22" width="18" height="66" rx="5" fill="#f25a3c" ${S}/>
      <rect x="61" y="26" width="17" height="62" rx="5" fill="#e0452b" ${S}/>
      <rect x="18" y="48" width="64" height="12" rx="3" fill="#6b4a2a" ${S}/>
      ${shine('M45 28 v50 h3 v-50Z')}`,

    spark: `<path d="M50 0 L57 38 L96 30 L64 52 L90 84 L52 64 L34 98 L38 60 L2 66 L34 44 L10 12 L44 34Z" fill="#ffd23f" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`,

    burst: `<path d="M50 2 L60 30 L88 16 L74 44 L98 56 L70 64 L80 94 L52 76 L30 98 L32 68 L2 62 L26 44 L10 18 L38 28Z" fill="#ffd23f" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M50 18 L57 36 L76 28 L66 46 L82 56 L64 60 L70 80 L52 68 L36 84 L38 64 L18 60 L34 48 L24 30 L42 36Z" fill="#ff8a1f"/>`,
  };

  // Coco, la mascotte (inline pour pouvoir animer les yeux et la mèche).
  const COCO = `
  <svg class="coco-svg" viewBox="0 0 220 240" aria-hidden="true">
    <g class="coco-legs" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M92 196 v26 M92 222 l-12 6 M92 222 l12 6" stroke="#ff9a1f" stroke-width="7"/>
      <path d="M126 196 v26 M126 222 l-12 6 M126 222 l12 6" stroke="#ff9a1f" stroke-width="7"/>
    </g>
    <g class="coco-body">
      ${blob([[36, 118, 20], [26, 96, 17], [40, 82, 15]], '#fff')}
      ${blob([[108, 158, 58], [148, 118, 22], [140, 86, 38]], '#fff')}
      <path d="M92 150 C104 130 136 132 142 156 C136 180 104 186 92 170Z" fill="#f1e6d6" stroke="${O}" stroke-width="3.5"/>
      <path d="M100 162 q8 -6 14 2 M112 170 q8 -6 14 2" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
      <g class="coco-comb">${blob([[124, 50, 12], [140, 44, 13], [156, 52, 11]], '#e8323c')}</g>
      <path d="M170 84 L200 94 L170 104Z" fill="#ffb21f" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M172 94 L198 94" stroke="${O}" stroke-width="2.5"/>
      <path d="M166 104 C174 110 172 124 164 124 C158 120 158 110 166 104Z" fill="#e8323c" stroke="${O}" stroke-width="3"/>
      <g class="coco-eyes">
        ${eye(138, 78, 11, [4, 1])}${eye(162, 76, 10, [4, 1])}
        <rect class="lid" x="124" y="64" width="50" height="28" fill="#fff" />
      </g>
      <path d="M128 62 Q138 56 148 62 M154 60 Q162 55 170 60" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="128" cy="100" rx="7" ry="4" fill="#ff9fb5" opacity=".8"/>
      <g class="coco-dyn" transform="translate(40 150) rotate(-18)">
        <rect x="0" y="0" width="16" height="44" rx="4" fill="#e0452b" stroke="${O}" stroke-width="3"/>
        <rect x="-2" y="16" width="20" height="8" rx="2" fill="#6b4a2a" stroke="${O}" stroke-width="2.5"/>
        <path d="M8 0 C8 -10 16 -12 18 -20" fill="none" stroke="#6b4a2a" stroke-width="3" stroke-linecap="round"/>
        <g class="fuse-spark" transform="translate(18 -22)">
          <path d="M0 -9 L3 -3 L9 -3 L4 1 L6 8 L0 4 L-6 8 L-4 1 L-9 -3 L-3 -3Z" fill="#ffd23f" stroke="#ff8a1f" stroke-width="1.5"/>
        </g>
      </g>
    </g>
  </svg>`;

  function sprite() {
    return '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">' +
      Object.entries(ART).map(([k, v]) => `<symbol id="s-${k}" viewBox="0 0 100 100">${v}</symbol>`).join('') + '</svg>';
  }

  root.CocoArt = { ART, COCO, sprite, use: (k, cls = '') => `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-${k}"/></svg>` };
})(typeof window !== 'undefined' ? window : globalThis);
