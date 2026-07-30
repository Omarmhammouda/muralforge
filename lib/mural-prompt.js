/**
 * MuralForge's core: wrap a plain-words mural idea in a scene-preservation
 * contract so the model paints the wall in the photo instead of redrawing
 * the scene. Every generation goes through composeMuralPrompt().
 */

export const MURAL_STYLES = [
  { value: "painterly", title: "Painterly", subtitle: "Soft, elegant brushwork" },
  { value: "airbrush", title: "Photoreal", subtitle: "Airbrush realism" },
  { value: "neon", title: "Neon accent", subtitle: "Painted glow accents" },
  { value: "graphic", title: "Bold graphic", subtitle: "Flat shapes, crisp lines" },
  { value: "minimal", title: "Minimal", subtitle: "One idea, lots of wall" },
];

export const MURAL_COVERAGE = [
  { value: "simple", title: "Simple" },
  { value: "medium", title: "Medium" },
  { value: "full", title: "Full wall" },
];

const STYLE_FRAGMENTS = {
  painterly:
    "Render the mural in a soft, elegant painterly style — confident hand-painted brushwork, refined color transitions, gallery-grade composition.",
  airbrush:
    "Render the mural in hand-painted photorealistic airbrush style — smooth gradients, believable light and reflections, fine detail work.",
  neon:
    "Render the mural with painted neon accents — realistic glowing tube lines and light bloom on the wall surface, balanced against darker painted fields.",
  graphic:
    "Render the mural in a bold graphic style — flat confident shapes, crisp edges, a tight limited palette, readable from a distance.",
  minimal:
    "Keep the mural minimal — one strong idea with generous clean wall left breathing around it; restraint is the point.",
};

const COVERAGE_FRAGMENTS = {
  simple:
    "Keep coverage light: a contained composition on part of the wall, most of the original surface left visible.",
  medium:
    "Use confident medium coverage: the mural owns the center of the wall while clear margins of the original surface remain.",
  full:
    "Cover the wall edge to edge: an immersive full-wall composition that treats the entire surface as the canvas.",
};

export function composeMuralPrompt({ description, style, coverage }) {
  const parts = [];
  parts.push(
    "The input image is a photograph of a real wall on a real building or room. Recreate the photograph exactly as it is — same camera angle and perspective, and every architectural element unchanged: signs, windows, doors, fixtures, lights, cameras, pipes, conduits, cables, awnings, steps, railings, vehicles, pavement, sky, weather and lighting all stay exactly as photographed. Only paint a mural onto the main wall surface, working around anything mounted on it.",
  );
  const trimmed = (description || "").trim();
  if (trimmed.length > 0) parts.push(`The mural: ${trimmed}.`);
  if (STYLE_FRAGMENTS[style]) parts.push(STYLE_FRAGMENTS[style]);
  if (COVERAGE_FRAGMENTS[coverage]) parts.push(COVERAGE_FRAGMENTS[coverage]);
  parts.push(
    "The mural must look genuinely hand-painted in matte wall paint directly on the surface — subtle brush texture with the wall's material (brick courses, block joints or plaster) showing through the paint, colors reacting naturally to the photograph's lighting. Photorealistic result, indistinguishable from a photo of the finished wall.",
  );
  return parts.join("\n\n");
}
