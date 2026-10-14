// Adaptive performance for the 3D scene: a device tier, a pixel-ratio cap, and a frame-time
// governor that steps quality down when frames run long and back up when there is headroom.
// Kept inside the theme (no shared core changes); the same file sits in bagaicha, durbar and mandap.

const WEAK_GPU = /swiftshader|llvmpipe|softpipe|basic render|mali-[4t]|mali-g(31|51|52|57)\b|adreno \(tm\) ([3-5]\d\d|6[0-1]\d)\b|powervr|sgx|intel.*\bhd graphics ([2-5]\d{2,3})\b|\bgma\b/i;

let cached = null;
/** 'low' | 'mid' | 'high'. ?tier=low|mid|high overrides (testing). */
export function deviceTier() {
  if (cached) return cached;
  const forced = new URLSearchParams(location.search).get('tier');
  if (/^(low|mid|high)$/.test(forced || '')) return (cached = { tier: forced, gpu: 'forced', mobile: mobileUA() });
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const mobile = mobileUA();
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    gpu = (ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || gl?.getParameter(gl.RENDERER) || '';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { /* no WebGL: the theme falls back to its still version */ }
  const weakGpu = WEAK_GPU.test(gpu);
  let tier = 'high';
  if (weakGpu || mem <= 2 || cores <= 2 || (mobile && mem <= 3 && cores <= 4)) tier = 'low'; // most phones report 4 GB/8 cores: those are 'mid', not 'low'
  else if (mobile || mem <= 4 || cores <= 4) tier = 'mid';
  cached = { tier, gpu, mobile, mem, cores };
  (window.__perf ||= {}).tier = cached; // read by the perf harness
  return cached;
}

function mobileUA() {
  const ua = navigator.userAgent || '';
  return navigator.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua);
}

/** devicePixelRatio cap: desktop ≤ 1.75, phones ≤ 2 (low-tier phones 1.5, low-tier desktops 1). */
export function dprCap({ tier, mobile }) {
  const cap = tier === 'low' ? (mobile ? 1.5 : 1) : mobile ? 2 : 1.75; // phones render sharp; the governor steps down if frames run long
  return Math.min(window.devicePixelRatio || 1, cap);
}

/**
 * Frame-time governor. `levels` run from best (0) to cheapest; `apply(level)` switches the
 * scene to that level. Call `sample(dtSeconds)` once per drawn frame.
 * Steps down when the average frame is over `slowMs` for `windowS` seconds; steps back up after
 * a run of fast windows, waiting longer each time a step up had to be undone (no ping-pong).
 */
export function createGovernor({ levels, apply, start = 0, slowMs = 20, fastMs = 17.6, windowS = 2, name = '3d' }) {
  let level = Math.max(0, Math.min(levels - 1, start));
  let sum = 0, n = 0, fastRun = 0, upWait = 2, lastUp = -1;
  const log = [];
  const set = (next, why) => {
    if (next === level || next < 0 || next >= levels) return;
    level = next;
    log.push({ t: Math.round(performance.now()), level, why });
    apply(level);
  };
  apply(level);
  const gov = {
    get level() { return level; },
    log: () => log.slice(),
    reset() { sum = 0; n = 0; },
    sample(dt) {
      if (!(dt > 0) || dt > 0.25) return; // tab switches and load hitches say nothing about steady cost
      sum += dt; n++;
      if (sum < windowS) return;
      const avg = (sum / n) * 1000;
      sum = 0; n = 0;
      if (avg > slowMs) {
        fastRun = 0;
        if (lastUp === level) upWait = Math.min(upWait * 2, 32); // the last step up did not hold
        set(level + 1, `avg ${avg.toFixed(1)}ms`);
      } else if (avg < fastMs && level > 0) {
        if (++fastRun >= upWait) { fastRun = 0; lastUp = level - 1; set(level - 1, `avg ${avg.toFixed(1)}ms`); }
      } else fastRun = 0;
    },
  };
  (window.__perf ||= {})[name] = gov;
  window.__perf.log = () => Object.fromEntries(Object.entries(window.__perf).filter(([, g]) => g?.log).map(([k, g]) => [k, { level: g.level, log: g.log() }]));
  return gov;
}

/** Calls `onChange(hidden)` when the tab is hidden or shown. */
export function onTabHidden(onChange) {
  document.addEventListener('visibilitychange', () => onChange(document.hidden));
}
