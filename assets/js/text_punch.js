(function() {
const SVGN = 'http://www.w3.org/2000/svg';

// Robust data reader (works even if dataset is flaky on SVG)
function read(svg, name, fallback = null) {
    // prefer attribute
    const attr = svg.getAttribute('data-' + name);
    if (attr !== null) return attr;
    // try dataset camelCase as last resort
    const key = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (svg.dataset && (key in svg.dataset)) return svg.dataset[key];
    return fallback;
}

function toNum(v, def) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

function build(svg) {
    // Read config (strings), then coerce where needed
    const textStr = (read(svg, 'text', '') || svg.textContent || 'TEXT').trim();
    const weight  = toNum(read(svg, 'weight', 800), 800);
    const lsPx    = toNum(read(svg, 'letter-spacing', 0), 0);     // px
    const baseFS  = toNum(read(svg, 'font-size', 64), 64);        // px baseline
    const xpad    = toNum(read(svg, 'xpad', 28), 28);             // px each side
    const ypad    = toNum(read(svg, 'ypad', 20), 20);
    const color   = (read(svg, 'color', '')); 
    // const color   = toNum(read(svg, 'color', 'rgba(255,255,255,.92)'), 'rgba(255,255,0,.92)');             // px total extra

    // DIAGNOSTICS
    if (!svg.__logged) {
    console.log('[KnockoutTag] config for', svg, { textStr, weight, lsPx, baseFS, xpad, ypad, color });
    svg.__logged = true;
    }

    // Clear SVG content
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Current rendered height drives scaling (because width is auto)
    const renderedH = svg.getBoundingClientRect().height || (baseFS + ypad);
    // Map height -> font-size approximately
    const fs = (baseFS / (baseFS + ypad)) * renderedH;

    // TEMP text for measurement
    const measure = document.createElementNS(SVGN, 'text');
    measure.textContent = textStr;
    measure.setAttribute('font-family', "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif");
    measure.setAttribute('font-weight', String(weight));
    measure.setAttribute('font-size', fs + 'px');
    measure.setAttribute('letter-spacing', lsPx + 'px');
    measure.setAttribute('fill', 'black'); // black punches hole in mask
    // Append to measure
    svg.appendChild(measure);

    // Some engines need a sync reflow before getBBox
    const tb = measure.getBBox();
    const textW = tb.width;
    const textH = tb.height;

    // Compute pill
    const pillH = Math.ceil(textH + ypad);
    const pillW = Math.ceil(textW + xpad * 2);
    const rx    = 15;

    // Center the measured text and move it to mask later
    measure.setAttribute('x', String(pillW / 2));
    measure.setAttribute('y', String(pillH / 2));
    measure.setAttribute('text-anchor', 'middle');
    measure.setAttribute('dominant-baseline', 'central');

    // Build mask
    const defs  = document.createElementNS(SVGN, 'defs');
    const mask  = document.createElementNS(SVGN, 'mask');
    const maskId = 'mask-' + Math.random().toString(36).slice(2);
    mask.setAttribute('id', maskId);

    const back = document.createElementNS(SVGN, 'rect');
    back.setAttribute('x', '0');
    back.setAttribute('y', '0');
    back.setAttribute('width', String(pillW));
    back.setAttribute('height', String(pillH));
    back.setAttribute('fill', 'white');

    mask.appendChild(back);
    mask.appendChild(measure); // move text into the mask
    defs.appendChild(mask);

    // Visual pill
    const pill = document.createElementNS(SVGN, 'rect');
    pill.setAttribute('x', '0');
    pill.setAttribute('y', '0');
    pill.setAttribute('width', String(pillW));
    pill.setAttribute('height', String(pillH));
    pill.setAttribute('rx', String(rx));
    pill.setAttribute('fill', color);
    pill.setAttribute('mask', 'url(#' + maskId + ')');
    pill.setAttribute('class', 'pill');

    // Append
    svg.appendChild(defs);
    svg.appendChild(pill);

    // Configure viewBox so width adapts to content
    svg.setAttribute('viewBox', `0 0 ${pillW} ${pillH}`);
    svg.setAttribute('width', pillW);
    svg.setAttribute('height', pillH);
}

function rebuildAll() {
    document.querySelectorAll('svg.tag-fill-svg-h1').forEach(build);
    document.querySelectorAll('svg.tag-fill-svg-h3').forEach(build);
}

// Run when DOM is ready AND fonts are loaded
function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fn();
    } else {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
    }
}

ready(() => {
    const run = () => rebuildAll();

    // Ensure web fonts are available before measuring
    if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(run).catch(run);
    } else {
    run();
    }

    // Rebuild on resize (debounced)
    let t;
    window.addEventListener('resize', () => {
    clearTimeout(t); t = setTimeout(run, 80);
    });

    // Rebuild whenever attributes change
    const mo = new MutationObserver(muts => {
    let needs = false;
    for (const m of muts) {
        if (m.type === 'attributes' && m.target.matches('svg.tag-fill-svg-h1') &&
            m.attributeName && m.attributeName.startsWith('data-')) {
        needs = true; break;
        }
    }
    if (needs) run();
    });
    document.querySelectorAll('svg.tag-fill-svg-h1').forEach(svg => {
    mo.observe(svg, { attributes: true });
    });
    document.querySelectorAll('svg.tag-fill-svg-h3').forEach(svg => {
    mo.observe(svg, { attributes: true });
    });
});
})();