/**
 * Projective (four-point) transform helpers for the mockup studio.
 * Preview uses CSS matrix3d; export re-renders through canvas by warping the
 * artwork as a grid of textured triangles (projective ≈ per-cell affine).
 */

function adjugate(m) {
  return [
    m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3],
  ];
}

function multiplyMM(a, b) {
  const out = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

function multiplyMV(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

function basisToPoints(p1, p2, p3, p4) {
  const m = [p1.x, p2.x, p3.x, p1.y, p2.y, p3.y, 1, 1, 1];
  const v = multiplyMV(adjugate(m), [p4.x, p4.y, 1]);
  return multiplyMM(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

/** Homography mapping rect (0,0,w,h) onto corners [TL, TR, BR, BL]. */
export function projectionFromRect(w, h, corners) {
  const source = basisToPoints({ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h });
  const dest = basisToPoints(corners[0], corners[1], corners[2], corners[3]);
  return multiplyMM(dest, adjugate(source));
}

export function projectPoint(h, x, y) {
  const v = multiplyMV(h, [x, y, 1]);
  return { x: v[0] / v[2], y: v[1] / v[2] };
}

/** CSS matrix3d() string for the same homography. */
export function matrix3d(h) {
  const t = h.map((value) => value / h[8]);
  return `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
}

function drawTexturedTriangle(ctx, img, s0, s1, s2, d0, d1, d2) {
  const denom =
    s0.x * (s2.y - s1.y) - s1.x * s2.y + s2.x * s1.y + (s1.x - s2.x) * s0.y;
  if (!denom) return;
  const m11 = -(s0.y * (d2.x - d1.x) - s1.y * d2.x + s2.y * d1.x + (s1.y - s2.y) * d0.x) / denom;
  const m12 = (s1.y * d2.y + s0.y * (d1.y - d2.y) - s2.y * d1.y + (s2.y - s1.y) * d0.y) / denom;
  const m21 = (s0.x * (d2.x - d1.x) - s1.x * d2.x + s2.x * d1.x + (s1.x - s2.x) * d0.x) / denom;
  const m22 = -(s1.x * d2.y + s0.x * (d1.y - d2.y) - s2.x * d1.y + (s2.x - s1.x) * d0.y) / denom;
  const dx =
    (s0.x * (s2.y * d1.x - s1.y * d2.x) + s0.y * (s1.x * d2.x - s2.x * d1.x) +
      (s2.x * s1.y - s1.x * s2.y) * d0.x) / denom;
  const dy =
    (s0.x * (s2.y * d1.y - s1.y * d2.y) + s0.y * (s1.x * d2.y - s2.x * d1.y) +
      (s2.x * s1.y - s1.x * s2.y) * d0.y) / denom;

  // Expand the clip slightly from the centroid so cell seams don't show.
  const cx = (d0.x + d1.x + d2.x) / 3;
  const cy = (d0.y + d1.y + d2.y) / 3;
  const grow = (p) => ({ x: p.x + (p.x - cx) * 0.04, y: p.y + (p.y - cy) * 0.04 });
  const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0.x, g0.y);
  ctx.lineTo(g1.x, g1.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(m11, m12, m21, m22, dx, dy);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** Draw `img` warped so its rect maps onto `corners` [TL,TR,BR,BL] (canvas px). */
export function drawWarped(ctx, img, corners, grid = 18) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const homography = projectionFromRect(w, h, corners);
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const sx0 = (col / grid) * w, sy0 = (row / grid) * h;
      const sx1 = ((col + 1) / grid) * w, sy1 = ((row + 1) / grid) * h;
      const tl = { x: sx0, y: sy0 }, tr = { x: sx1, y: sy0 };
      const br = { x: sx1, y: sy1 }, bl = { x: sx0, y: sy1 };
      const dtl = projectPoint(homography, sx0, sy0);
      const dtr = projectPoint(homography, sx1, sy0);
      const dbr = projectPoint(homography, sx1, sy1);
      const dbl = projectPoint(homography, sx0, sy1);
      drawTexturedTriangle(ctx, img, tl, tr, br, dtl, dtr, dbr);
      drawTexturedTriangle(ctx, img, tl, br, bl, dtl, dbr, dbl);
    }
  }
}

/* ---- corner-set transforms (move / scale / rotate / skew act on corners) ---- */

export function centroid(corners) {
  return {
    x: corners.reduce((sum, c) => sum + c.x, 0) / 4,
    y: corners.reduce((sum, c) => sum + c.y, 0) / 4,
  };
}

export function translateCorners(corners, dx, dy) {
  return corners.map((c) => ({ x: c.x + dx, y: c.y + dy }));
}

export function scaleCorners(corners, factor) {
  const c = centroid(corners);
  return corners.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }));
}

export function rotateCorners(corners, degrees) {
  const c = centroid(corners);
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return corners.map((p) => ({
    x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin,
    y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos,
  }));
}

export function skewCorners(corners, hDegrees, vDegrees) {
  const c = centroid(corners);
  const tanH = Math.tan((hDegrees * Math.PI) / 180);
  const tanV = Math.tan((vDegrees * Math.PI) / 180);
  return corners.map((p) => ({
    x: c.x + (p.x - c.x) + (p.y - c.y) * tanH,
    y: c.y + (p.y - c.y) + (p.x - c.x) * tanV,
  }));
}
