// Theme props added to the MandapView scene: the couple's photographs in carved
// frames on brass easels, and engraved brass plaques for each ceremony.
import * as T from 'three';

const PLAT = 0.222;
const loader = new T.TextureLoader();

/**
 * A photograph on a brass easel, in one of four frame treatments so no two easels repeat:
 *  'carved' dark wood with a gold fillet · 'gilt' a wide stepped gold frame ·
 *  'ivory' a white lacquer frame with a deep mat · 'floral' ivory wrapped in roses (flowers API).
 * The photo always keeps its own proportions; nothing is masked or cropped.
 */
export function photoFrame(url, { height = 1.05, fallback = null, onSwap = null, style = 'carved', flowers = null } = {}) {
  const g = new T.Group();
  const lacquer = new T.MeshStandardMaterial({ color: '#f6f1e8', roughness: 0.35 });
  const wood = style === 'carved' ? new T.MeshStandardMaterial({ color: '#2a140b', roughness: 0.45, metalness: 0.1 })
    : style === 'gilt' ? new T.MeshStandardMaterial({ color: '#c99a45', metalness: 1, roughness: 0.28 })
      : lacquer;
  const gold = new T.MeshStandardMaterial({ color: '#d4a656', metalness: 1, roughness: 0.3 });
  const backWood = new T.MeshStandardMaterial({ color: '#3a1f12', roughness: 0.5, metalness: 0.05 });
  const brass = new T.MeshStandardMaterial({ color: '#b98b3e', metalness: 1, roughness: 0.32 });
  const photoMat = new T.MeshBasicMaterial({ color: new T.Color(0.9, 0.88, 0.85), toneMapped: false });
  photoMat.userData.gamma = { value: 1 };
  photoMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGamma = photoMat.userData.gamma;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uGamma;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(uGamma));');
  };
  const photo = new T.Mesh(new T.PlaneGeometry(1, 1), photoMat);
  g.add(photo);
  const parts = new T.Group();
  g.add(parts);
  const legs = new T.Group();
  g.add(legs);
  const state = { w: height * 0.75, h: height, ready: false };
  const build = (aspect) => {
    const h = height;
    const w = h * aspect;
    state.w = w + 0.16;
    state.h = h + 0.16;
    photo.scale.set(w, h, 1);
    parts.clear();
    const mat = style === 'ivory' ? 0.06 : 0; // a white mat around the photo
    const b = style === 'gilt' ? 0.11 : style === 'carved' ? 0.07 : 0.06;
    const bar = (bw, bh, x, y, m = wood, depth = 0.05, z = -0.005) => {
      const mesh = new T.Mesh(new T.BoxGeometry(bw, bh, depth), m);
      mesh.position.set(x, y, z);
      parts.add(mesh);
    };
    const W = w + 2 * mat, H = h + 2 * mat;
    if (mat) {
      const m = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ color: '#fbf8f2', roughness: 0.9 }));
      m.position.z = -0.002;
      parts.add(m);
    }
    bar(W + 2 * b, b, 0, H / 2 + b / 2);
    bar(W + 2 * b, b, 0, -H / 2 - b / 2);
    bar(b, H, -W / 2 - b / 2, 0);
    bar(b, H, W / 2 + b / 2, 0);
    if (style === 'gilt') {
      // A raised inner step and an outer bead for a carved-gilt look.
      const s2 = 0.035;
      bar(W + 2 * s2, s2, 0, H / 2 + s2 / 2, gold, 0.075, 0.01);
      bar(W + 2 * s2, s2, 0, -H / 2 - s2 / 2, gold, 0.075, 0.01);
      bar(s2, H, -W / 2 - s2 / 2, 0, gold, 0.075, 0.01);
      bar(s2, H, W / 2 + s2 / 2, 0, gold, 0.075, 0.01);
    } else {
      const f = 0.012;
      bar(W + 2 * f, f, 0, H / 2 + f / 2, gold, 0.056);
      bar(W + 2 * f, f, 0, -H / 2 - f / 2, gold, 0.056);
      bar(f, H, -W / 2 - f / 2, 0, gold, 0.056);
      bar(f, H, W / 2 + f / 2, 0, gold, 0.056);
    }
    state.w = W + 2 * b;
    state.h = H + 2 * b;
    // The back is a dressed panel (seen from the mandap): dark carved wood, a gold border and a
    // small rose swag, never a blank board.
    const back = new T.Mesh(new T.BoxGeometry(W + 2 * b, H + 2 * b, 0.01), backWood);
    back.position.z = -0.035;
    parts.add(back);
    const inset = new T.Mesh(new T.BoxGeometry(W + 2 * b - 0.12, H + 2 * b - 0.12, 0.004), gold);
    inset.position.z = -0.042;
    parts.add(inset);
    const inner = new T.Mesh(new T.BoxGeometry(W + 2 * b - 0.15, H + 2 * b - 0.15, 0.004), backWood);
    inner.position.z = -0.045;
    parts.add(inner);
    // Easel: two front legs and one back leg.
    legs.clear();
    const legGeo = new T.CylinderGeometry(0.014, 0.018, 1, 10);
    const bottom = -H / 2 - b;
    const top = h * 0.2;
    const leg = (x, z) => {
      const m = new T.Mesh(legGeo, brass);
      const from = new T.Vector3(x * 0.6, top, -0.07);
      const to = new T.Vector3(x, bottom - 0.62, z);
      m.position.copy(from).lerp(to, 0.5);
      m.scale.y = from.distanceTo(to);
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      legs.add(m);
    };
    leg(-(W / 2 - 0.02), -0.2);
    leg(W / 2 - 0.02, -0.2);
    leg(0, -0.6);
    const ledge = new T.Mesh(new T.BoxGeometry(W + 0.25, 0.03, 0.09), brass);
    ledge.position.set(0, bottom - 0.015, 0.02);
    legs.add(ledge);
  };
  build(0.75);
  const onLoad = (tex) => {
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    // Lift dark photographs so every portrait reads in the night scene; a photo that is
    // mostly black (a subject on a dark ground) gives its easel to the next portrait instead.
    try {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const g2 = c.getContext('2d', { willReadFrequently: true });
      g2.drawImage(tex.image, 0, 0, 32, 32);
      const d = g2.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      const lum = sum / (d.length / 4);
      if (lum < 0.17 && fallback) {
        const next = fallback();
        if (next) { tex.dispose(); onSwap?.(next); loader.load(next.url, onLoad); return; }
      }
      // A gamma lift opens the shadows without clipping the highlights.
      const gamma = lum < 0.32 ? Math.max(0.5, Math.log(0.4) / Math.log(Math.max(lum, 0.04))) : 1;
      photoMat.userData.gamma.value = gamma;
    } catch { /* cross-origin upload: keep the default */ }
    photoMat.map = tex;
    photoMat.needsUpdate = true;
    build(tex.image.width / tex.image.height);
    // Floral frames: roses climb the top corner and the opposite lower corner.
    if (flowers && !state.swag) {
      // A small rose swag across the top of the back panel.
      state.swag = true;
      g.updateMatrixWorld(true);
      const W2 = state.w / 2, H2 = state.h / 2;
      const B = (x, y) => g.localToWorld(new T.Vector3(x, y, -0.06));
      flowers.band([B(-W2 * 0.6, H2 - 0.02), B(0, H2 - 0.08), B(W2 * 0.6, H2 - 0.02)], { radius: 0.045, density: 70, size: 0.045 });
      flowers.finish();
    }
    if (style === 'floral' && flowers && !state.flowered) {
      state.flowered = true;
      g.updateMatrixWorld(true);
      const W2 = state.w / 2, H2 = state.h / 2;
      const P = (x, y) => g.localToWorld(new T.Vector3(x, y, 0.03));
      const out = new T.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new T.Quaternion()));
      flowers.band([P(-W2, H2 * 0.25), P(-W2, H2), P(-W2 * 0.2, H2)], { radius: 0.06, density: 90, size: 0.05 });
      flowers.band([P(W2 * 0.35, -H2), P(W2, -H2), P(W2, -H2 * 0.4)], { radius: 0.06, density: 90, size: 0.05 });
      flowers.cluster(P(-W2, H2).addScaledVector(out, 0.03), 0.1, 18, { size: 0.06 });
      flowers.finish();
    }
    state.ready = true;
  };
  loader.load(url, onLoad);
  g.userData.state = state;
  // Height so the bottom of the easel stands on the platform.
  g.userData.base = () => height / 2 + 0.07 + 0.62;
  return g;
}

/** Brushed brass with engraved, bilingual lettering. Redraw on language change. */
export function brassPlaque() {
  const W = 1024, H = 680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new T.MeshStandardMaterial({ map: tex, metalness: 0.75, roughness: 0.36, emissive: new T.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.22 });
  const g = new T.Group();
  const pw = 0.96, ph = (0.96 * H) / W;
  const plate = new T.Mesh(new T.BoxGeometry(pw, ph, 0.02), [mat, mat, mat, mat, mat, mat].map((m, i) => (i === 4 ? m : new T.MeshStandardMaterial({ color: '#8a6a30', metalness: 1, roughness: 0.4 }))));
  g.add(plate);
  const brass = new T.MeshStandardMaterial({ color: '#b98b3e', metalness: 1, roughness: 0.3 });
  const post = new T.Mesh(new T.CylinderGeometry(0.025, 0.03, 1, 12), brass);
  post.scale.y = 0.95;
  post.position.set(0, -ph / 2 - 0.47, -0.03);
  g.add(post);
  const foot = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 0.05, 24), brass);
  foot.position.set(0, -ph / 2 - 0.95, -0.03);
  g.add(foot);
  g.userData = { size: [pw, ph], center: ph / 2 + 0.97 - ph / 2 };
  const draw = ({ title, num, kicker, lang }) => {
    const c = canvas.getContext('2d');
    // Brushed brass
    const grd = c.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#b9893b');
    grd.addColorStop(0.45, '#e1b867');
    grd.addColorStop(0.55, '#d4a552');
    grd.addColorStop(1, '#9c7130');
    c.fillStyle = grd;
    c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) {
      c.fillStyle = `rgba(${Math.random() > 0.5 ? '255,240,200' : '60,35,10'},${Math.random() * 0.06})`;
      c.fillRect(0, y, W, 1);
    }
    // Engraved double border
    const line = (inset, wdt) => {
      c.strokeStyle = 'rgba(60,32,8,0.85)';
      c.lineWidth = wdt;
      c.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
      c.strokeStyle = 'rgba(255,236,190,0.5)';
      c.lineWidth = 1.5;
      c.strokeRect(inset + wdt / 2 + 1, inset + wdt / 2 + 1, W - inset * 2 - wdt - 2, H - inset * 2 - wdt - 2);
    };
    line(26, 4);
    line(44, 2);
    const engrave = (text, x, y, font, size, opts = {}) => {
      c.font = `${opts.weight || 400} ${size}px ${font}`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      if (opts.track) c.letterSpacing = `${opts.track}px`;
      else c.letterSpacing = '0px';
      c.fillStyle = 'rgba(255,238,196,0.55)';
      c.fillText(text, x + 1.5, y + 2);
      c.fillStyle = '#3a1f08';
      c.fillText(text, x, y);
    };
    const deva = lang === 'ne';
    engrave(kicker, W / 2, 150, deva ? '"Martel", serif' : '"Marcellus SC", serif', deva ? 40 : 34, { track: deva ? 0 : 8 });
    engrave(num, W / 2, 330, '"Marcellus", serif', 150);
    // Fit the title.
    let size = deva ? 84 : 78;
    c.font = `400 ${size}px ${deva ? '"Martel", serif' : '"Marcellus SC", serif'}`;
    while (c.measureText(title).width > W - 150 && size > 36) { size -= 4; c.font = `400 ${size}px ${deva ? '"Martel", serif' : '"Marcellus SC", serif'}`; }
    engrave(title, W / 2, 500, deva ? '"Martel", serif' : '"Marcellus SC", serif', size, { track: deva ? 0 : 2, weight: deva ? 600 : 400 });
    // A small lotus mark.
    c.save();
    c.translate(W / 2, 580);
    c.strokeStyle = '#3a1f08';
    c.lineWidth = 3;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 34, -6, s * 60, -26); c.stroke(); }
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-14, -24, 0, -40); c.quadraticCurveTo(14, -24, 0, 0); c.stroke();
    c.restore();
    tex.needsUpdate = true;
  };
  g.userData.draw = draw;
  return g;
}

export { PLAT };
