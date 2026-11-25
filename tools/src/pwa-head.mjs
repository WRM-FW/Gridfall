/* Shared PWA head + iOS standalone safe-area rules for generated pages. */

export const IOS_STANDALONE_DETECT = `<script>(function(){try{var ua=navigator.userAgent||"";var ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);var standalone=navigator.standalone===true||(window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches);if(ios&&standalone)document.documentElement.classList.add("ios-standalone");}catch(e){}})();</script>`;

const COMMON_SAFE = `
html.ios-standalone{--safe-top:env(safe-area-inset-top,0px);--safe-left:env(safe-area-inset-left,0px);--safe-right:env(safe-area-inset-right,0px);}
html.ios-standalone .topnav{top:var(--safe-top);}
html.ios-standalone .side{top:calc(20px + var(--safe-top));}
html.ios-standalone .gf-hall-fixed{top:calc(16px + var(--safe-top));right:calc(16px + var(--safe-right));}
@media (max-width:560px){html.ios-standalone .gf-hall-fixed{top:calc(8px + var(--safe-top));right:calc(8px + var(--safe-right));}}
html.ios-standalone .hud{padding-top:calc(clamp(14px,3vw,28px) + var(--safe-top));padding-left:calc(clamp(14px,3vw,28px) + var(--safe-left));padding-right:calc(clamp(14px,3vw,28px) + var(--safe-right));}
html.ios-standalone .settings-popover{top:calc(clamp(62px,8vw,76px) + var(--safe-top));}
html.ios-standalone .app-shell{padding-top:var(--safe-top);padding-left:var(--safe-left);padding-right:var(--safe-right);}
html.ios-standalone .modal{padding-top:calc(28px + var(--safe-top));}
`;

const BODY_SAFE = `html.ios-standalone body{padding-top:var(--safe-top);padding-left:var(--safe-left);padding-right:var(--safe-right);}`;
const BODY_SAFE_XQ = `html.ios-standalone body{padding-top:calc(22px + var(--safe-top));padding-left:calc(22px + var(--safe-left));padding-right:calc(22px + var(--safe-right));}
@media (max-width:960px){html.ios-standalone body{padding-top:calc(16px + var(--safe-top));padding-left:calc(14px + var(--safe-left));padding-right:calc(14px + var(--safe-right));}}`;
const BODY_SAFE_10 = `html.ios-standalone body{padding-top:calc(10px + var(--safe-top));padding-left:calc(10px + var(--safe-left));padding-right:calc(10px + var(--safe-right));}`;
const BODY_SAFE_12 = `html.ios-standalone body{padding-top:calc(12px + var(--safe-top));padding-left:calc(12px + var(--safe-left));padding-right:calc(12px + var(--safe-right));}`;
const BODY_SAFE_16 = `html.ios-standalone body{padding-top:calc(16px + var(--safe-top));padding-left:calc(16px + var(--safe-left));padding-right:calc(16px + var(--safe-right));}`;

const PAGE_SAFE = {
  index: BODY_SAFE,
  'board-club': BODY_SAFE,
  '2048': BODY_SAFE,
  'chinese-checkers': BODY_SAFE,
  'army-chess': BODY_SAFE,
  minesweeper: BODY_SAFE,
  'chinese-chess': BODY_SAFE_XQ,
  snake: BODY_SAFE_10,
  tetris: BODY_SAFE_10,
  'tic-tac-toe': BODY_SAFE_12,
  sokoban: BODY_SAFE_16,
  jump: '',
  uno: ''
};

export function safeAreaCss(page) {
  return COMMON_SAFE + (PAGE_SAFE[page] || '');
}

export function pwaHead(prefix, page) {
  return `<link rel="manifest" href="${prefix}manifest.webmanifest" />
<link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/icons/apple-touch-icon.png" />
<style id="ios-safe-area">${safeAreaCss(page)}</style>
${IOS_STANDALONE_DETECT}
<script src="${prefix}pwa.js" defer></script>`;
}

export function ensureViewportCover(html) {
  return html.replace(/<meta name="viewport" content="([^"]*)"\s*\/?>/, (match, content) => {
    if (content.indexOf('viewport-fit=cover') >= 0) return match;
    return '<meta name="viewport" content="' + content + ', viewport-fit=cover">';
  });
}