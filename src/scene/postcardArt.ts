/**
 * The front of the postcard from home, as an SVG string: sunset over the Guaíba with the Usina do Gasômetro's chimney
 * on the shore, and "Greetings from Porto Alegre" across the sky. One drawing for both places it appears: the card
 * taped to the wall (drawn into a texture, see postcard.ts) and the Reader, which shows it inline.
 */

const W = 600;
const H = 400;

export function postcardFrontSvg(): string {
  // Low skyline along the shore, left to right: [x, width, height] of each block, standing on the waterline.
  const shore = 292;
  const blocks: [number, number, number][] = [
    [18, 34, 22], [50, 26, 34], [74, 40, 18], [212, 30, 26], [240, 22, 40], [260, 36, 20], [300, 26, 30],
    [324, 44, 16], [372, 22, 28], [392, 40, 20], [430, 28, 36], [456, 34, 18], [488, 22, 26], [508, 40, 14], [546, 36, 24],
  ];
  const skyline = blocks.map(([x, w, h]) => `<rect x="${x}" y="${shore - h}" width="${w}" height="${h}"/>`).join("");
  // Glints of the sun on the water, shorter the further from the middle.
  const glints = Array.from({ length: 9 }, (_, i) => {
    const y = shore + 12 + i * 11;
    const half = 86 - i * 7;
    return `<rect x="${300 - half}" y="${y}" width="${half * 2}" height="3" rx="1.5" fill="#ffd9a0" opacity="${0.75 - i * 0.06}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3c27e"/>
      <stop offset="0.55" stop-color="#ef9567"/>
      <stop offset="1" stop-color="#e2705c"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7a6a86"/>
      <stop offset="1" stop-color="#4b4f6e"/>
    </linearGradient>
    <clipPath id="card"><rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="6"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="10" fill="#fbf6ea"/>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <circle cx="300" cy="${shore}" r="74" fill="#ffe3a8"/>
    <circle cx="300" cy="${shore}" r="96" fill="#ffe3a8" opacity="0.25"/>
    <g fill="#3a2733">
      ${skyline}
      <rect x="112" y="${shore - 40}" width="92" height="40"/>
      <rect x="120" y="${shore - 58}" width="76" height="20"/>
      <path d="M150 ${shore - 58} L153 ${shore - 128} L163 ${shore - 128} L166 ${shore - 58} Z"/>
      <rect x="150" y="${shore - 134}" width="16" height="8"/>
    </g>
    <rect y="${shore}" width="${W}" height="${H - shore}" fill="url(#water)"/>
    ${glints}
  </g>
  <text x="44" y="72" font-family="Karla, 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="26" letter-spacing="1" fill="#fff8ea">Greetings from</text>
  <text x="42" y="146" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="70" textLength="${W - 84}" lengthAdjust="spacingAndGlyphs" fill="#fff8ea" stroke="#3a2733" stroke-width="2.5" paint-order="stroke">PORTO ALEGRE</text>
  <text x="${W - 40}" y="${H - 34}" text-anchor="end" font-family="Karla, 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="17" fill="#ffe9c7">&amp; Rio Pardo, where it all started</text>
</svg>`;
}

export const POSTCARD_ASPECT = W / H;
