"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import UpgradeModal from "@/components/UpgradeModal";
import { canCreateMockup, consumePassExport, exportPolicy, watermarkDataUrl } from "@/lib/billing";
import { getImage, makeThumb, putImage } from "@/lib/images";
import { optimizeWallPhoto } from "@/lib/optimize-photo";
import { MURAL_COVERAGE, MURAL_STYLES } from "@/lib/mural-prompt";
import { actions, newId, useData } from "@/lib/store";
import {
  drawWarped,
  matrix3d,
  projectionFromRect,
  rotateCorners,
  scaleCorners,
  skewCorners,
} from "@/lib/warp";

const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "soft-light"];
const BLEND_TO_CANVAS = {
  normal: "source-over",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  "soft-light": "soft-light",
};

function readAsDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function StudioInner() {
  const data = useData();
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState("overlay");
  const [started, setStarted] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState("");
  const [upgrade, setUpgrade] = useState(null); // { context, onContinueWatermark? }
  const [exportNote, setExportNote] = useState("");

  // Overlay state
  const [wall, setWall] = useState(null); // { src, naturalW, naturalH }
  const [art, setArt] = useState(null); // { src, naturalW, naturalH }
  const [stage, setStage] = useState(null); // displayed { w, h }
  const [corners, setCorners] = useState(null); // [TL,TR,BR,BL] in stage px
  const [adjust, setAdjust] = useState({ opacity: 100, brightness: 100, contrast: 100, saturation: 100, blend: "normal" });
  const [xform, setXform] = useState({ scale: 100, rotate: 0, skewH: 0, skewV: 0 });
  const baseCorners = useRef(null);
  const stageRef = useRef(null);
  const wallImgRef = useRef(null);
  const dragRef = useRef(null);

  // AI state
  const [aiWall, setAiWall] = useState(null); // { file, preview }
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("painterly");
  const [coverage, setCoverage] = useState("medium");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const project = params.get("project");
    if (project) setProjectId(project);
    const edit = params.get("edit");
    if (edit) {
      setEditId(edit);
      getImage(edit).then((src) => {
        if (src) setWall({ src, naturalW: 0, naturalH: 0 });
      });
    }
    try {
      const saved = localStorage.getItem("mf_code");
      if (saved) setCode(saved);
    } catch {}
  }, [params]);

  useEffect(() => {
    if (!data || !editId) return;
    const record = data.mockups.find((m) => m.id === editId);
    if (record) {
      setName(record.name);
      if (record.projectId) setProjectId(record.projectId);
    }
  }, [data, editId]);

  // Derived corners from base + slider transforms
  useEffect(() => {
    if (!baseCorners.current) return;
    let next = scaleCorners(baseCorners.current, xform.scale / 100);
    next = rotateCorners(next, xform.rotate);
    next = skewCorners(next, xform.skewH, xform.skewV);
    setCorners(next);
  }, [xform]);

  function rebase(next) {
    baseCorners.current = next;
    setXform({ scale: 100, rotate: 0, skewH: 0, skewV: 0 });
    setCorners(next);
  }

  async function pickWall(file) {
    if (!file) return;
    const optimized = await optimizeWallPhoto(file);
    const src = await readAsDataUrl(optimized.file);
    const img = await loadImage(src);
    setWall({ src, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
    baseCorners.current = null;
    setCorners(null);
  }

  async function pickArt(file) {
    if (!file) return;
    const optimized = await optimizeWallPhoto(file);
    const src = await readAsDataUrl(optimized.file);
    const img = await loadImage(src);
    setArt({ src, naturalW: img.naturalWidth, naturalH: img.naturalHeight });
    if (stage) {
      const width = stage.w * 0.55;
      const height = width * (img.naturalHeight / img.naturalWidth);
      const x = (stage.w - width) / 2;
      const y = (stage.h - height) / 2;
      rebase([
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ]);
    }
  }

  // Artwork can be added before the wall photo; once the stage exists
  // (or a replaced wall resizes it), place any unplaced artwork centered.
  useEffect(() => {
    if (!stage || !art || corners) return;
    const width = stage.w * 0.55;
    const height = width * (art.naturalH / art.naturalW);
    const x = (stage.w - width) / 2;
    const y = (stage.h - height) / 2;
    rebase([
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, art, corners]);

  function onWallLoad() {
    const el = wallImgRef.current;
    if (!el) return;
    setStage({ w: el.clientWidth, h: el.clientHeight });
    if (!wall.naturalW) {
      setWall((w) => ({ ...w, naturalW: el.naturalWidth, naturalH: el.naturalHeight }));
    }
  }

  function stagePoint(event) {
    const rect = stageRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrag(event, cornerIndex = null) {
    if (!corners) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { cornerIndex, last: stagePoint(event), snapshot: corners.map((c) => ({ ...c })) };
    const move = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const point = { x: e.clientX, y: e.clientY };
      const rect = stageRef.current.getBoundingClientRect();
      const current = { x: point.x - rect.left, y: point.y - rect.top };
      const dx = current.x - drag.last.x;
      const dy = current.y - drag.last.y;
      if (drag.cornerIndex === null) {
        setCorners(drag.snapshot.map((c) => ({ x: c.x + dx, y: c.y + dy })));
      } else {
        setCorners(
          drag.snapshot.map((c, i) =>
            i === drag.cornerIndex ? { x: c.x + dx, y: c.y + dy } : c,
          ),
        );
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setCorners((final) => {
        if (final) rebase(final);
        return final;
      });
      dragRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const artTransform = useMemo(() => {
    if (!art || !corners) return null;
    return matrix3d(projectionFromRect(art.naturalW, art.naturalH, corners));
  }, [art, corners]);

  async function composeOverlay() {
    const wallImg = await loadImage(wall.src);
    const canvas = document.createElement("canvas");
    canvas.width = wallImg.naturalWidth;
    canvas.height = wallImg.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(wallImg, 0, 0);
    if (art && corners && stage) {
      const factor = wallImg.naturalWidth / stage.w;
      const scaled = corners.map((c) => ({ x: c.x * factor, y: c.y * factor }));
      const artImg = await loadImage(art.src);
      ctx.save();
      ctx.filter = `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;
      ctx.globalAlpha = adjust.opacity / 100;
      ctx.globalCompositeOperation = BLEND_TO_CANVAS[adjust.blend] || "source-over";
      drawWarped(ctx, artImg, scaled);
      ctx.restore();
    }
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function saveMockup(draft) {
    try {
      if (!editId) {
        const check = canCreateMockup(data, projectId || null);
        if (!check.ok) {
          setUpgrade({ context: "mockups" });
          return;
        }
      }
      setSaving("saving");
      const image = mode === "ai" ? aiResult : await composeOverlay();
      if (!image) {
        setSaving("");
        return;
      }
      const isNew = !editId;
      const id = editId || newId();
      await putImage(id, image);
      const thumb = await makeThumb(image);
      actions.upsertMockup({
        id,
        name: name.trim() || "Untitled mockup",
        projectId: projectId || null,
        kind: mode,
        draft,
        thumb,
      });
      if (isNew) actions.billingRecordUsage("mockups");
      setEditId(id);
      setSaving("saved");
      setTimeout(() => setSaving(""), 2000);
    } catch {
      setSaving("");
      setError("Couldn't save the mockup — try again.");
    }
  }

  function triggerDownload(image) {
    const link = document.createElement("a");
    link.href = image;
    link.download = `${name.trim() || "mockup"}.jpg`;
    link.click();
  }

  async function downloadMockup() {
    const image = mode === "ai" ? aiResult : await composeOverlay();
    if (!image) return;
    const policy = exportPolicy(data, projectId || null);
    if (!policy.ok && policy.reason === "pass-exports") {
      setUpgrade({ context: "pass-exports" });
      return;
    }
    if (policy.watermark) {
      setUpgrade({
        context: "watermark",
        onContinueWatermark: async () => {
          triggerDownload(await watermarkDataUrl(image));
        },
      });
      return;
    }
    if (policy.passId) {
      consumePassExport(policy.passId);
      if (policy.remainingExports != null) {
        setExportNote(`${Math.max(0, policy.remainingExports - 1)} pass exports left`);
        setTimeout(() => setExportNote(""), 4000);
      }
    }
    triggerDownload(image);
  }

  async function generate() {
    if (!aiWall?.file) return setError("Attach a wall photo first.");
    if (description.trim().length < 3) return setError("Describe the mural in a few words.");
    const check = canCreateMockup(data, projectId || null);
    if (!check.ok) return setUpgrade({ context: "mockups" });
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("wall", aiWall.file);
      form.set("description", description);
      form.set("style", style);
      form.set("coverage", coverage);
      if (code.trim()) form.set("code", code.trim());
      const response = await fetch("/api/generate", { method: "POST", body: form });
      const body = await response.json();
      if (!body.ok) return setError(body.error || "Something went wrong.");
      setAiResult(body.image);
      if (code.trim()) {
        try { localStorage.setItem("mf_code", code.trim()); } catch {}
      }
      setRemaining(
        body.remaining === null
          ? "Unlimited generations on this code"
          : `${body.remaining} ${body.tier === "code" ? "generations left on this code" : "free generations left"}`,
      );
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <AppShell title="Mockup Studio" subtitle="Put your mural on a real wall" />;

  const projectOptions = data.projects.filter((p) => p.status !== "Archived");
  const showStart = !started && !editId && !params.get("edit") && !wall && !aiResult;

  return (
    <AppShell
      title="Mockup Studio"
      subtitle="Put your mural on a real wall"
      actions={
        showStart ? null : (
          <>
            {saving === "saving" ? <span className="saving-note">Saving…</span> : null}
            {saving === "saved" ? <span className="saving-note saved">Saved ✓</span> : null}
            {exportNote ? <span className="saving-note">{exportNote}</span> : null}
            <button className="btn ghost" onClick={() => saveMockup(true)}>Save draft</button>
            <button className="btn primary" onClick={() => saveMockup(false)}>Save final</button>
          </>
        )
      }
    >
      {showStart ? (
        <div className="choice-grid">
          <button
            type="button"
            className="choice"
            onClick={() => {
              setMode("overlay");
              setStarted(true);
            }}
          >
            <b>Upload my artwork</b>
            <span>Place your own design on a wall photo and fit it to the wall&apos;s perspective.</span>
          </button>
          <button
            type="button"
            className="choice"
            onClick={() => {
              setMode("ai");
              setStarted(true);
            }}
          >
            <b>Generate with AI</b>
            <span>No artwork yet? Describe the mural and AI paints it onto your wall photo.</span>
          </button>
        </div>
      ) : (
      <>
      <div className="toolbar">
        <div className="seg">
          <button className={mode === "overlay" ? "on" : ""} onClick={() => setMode("overlay")}>
            Artwork overlay
          </button>
          <button className={mode === "ai" ? "on" : ""} onClick={() => setMode("ai")}>
            AI generation
          </button>
        </div>
        <div className="spacer" />
        <input
          className="search"
          placeholder="Mockup name…"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <select className="search" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">No project</option>
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <button className="btn ghost" onClick={downloadMockup}>Download</button>
      </div>

      {mode === "overlay" ? (
        <div className="steps-rail">
          <div className={`step-chip${wall ? " done" : " active"}`}>
            <span className="n">1</span>Wall photo
          </div>
          <div className={`step-chip${wall && art ? " done" : wall ? " active" : ""}`}>
            <span className="n">2</span>Your artwork
          </div>
          <div className={`step-chip${wall && art ? " active" : ""}`}>
            <span className="n">3</span>Fine-tune &amp; save
          </div>
        </div>
      ) : null}

      {mode === "overlay" ? (
        <div className="studio-layout">
          <div className="stage-wrap">
            {wall ? (
              <div
                className="stage"
                ref={stageRef}
                onPointerDown={(event) => startDrag(event)}
              >
                <img
                  className="wall"
                  src={wall.src}
                  alt="Wall"
                  ref={wallImgRef}
                  onLoad={onWallLoad}
                  draggable={false}
                />
                {art && corners ? (
                  <img
                    className="art"
                    src={art.src}
                    alt="Artwork"
                    draggable={false}
                    style={{
                      width: art.naturalW,
                      height: art.naturalH,
                      left: 0,
                      top: 0,
                      transform: artTransform,
                      opacity: adjust.opacity / 100,
                      filter: `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`,
                      mixBlendMode: adjust.blend,
                    }}
                  />
                ) : null}
                {art && corners
                  ? corners.map((corner, index) => (
                      <div
                        key={index}
                        className="corner"
                        style={{ left: corner.x, top: corner.y }}
                        onPointerDown={(event) => startDrag(event, index)}
                      />
                    ))
                  : null}
              </div>
            ) : (
              <div className="stage-hint">
                Upload a wall photo to open the workspace.
                <br />
                <label className="btn primary" style={{ marginTop: 14 }}>
                  Upload wall photo
                  <input type="file" accept="image/*" hidden onChange={(e) => pickWall(e.target.files?.[0])} />
                </label>
              </div>
            )}
          </div>

          <div className="panel-stack">
            <div className="card">
              <h3>Images</h3>
              <label className="drop-zone" style={{ display: "block", marginBottom: 8 }}>
                {wall ? "Replace wall photo" : "Upload wall photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => pickWall(e.target.files?.[0])} />
              </label>
              <label className="drop-zone" style={{ display: "block" }}>
                {art ? "Replace artwork" : "Add mural artwork"}
                <input type="file" accept="image/*" hidden onChange={(e) => pickArt(e.target.files?.[0])} />
              </label>
              {art ? (
                <button className="btn mini ghost" style={{ marginTop: 8 }} onClick={() => { setArt(null); setCorners(null); baseCorners.current = null; }}>
                  Remove artwork
                </button>
              ) : null}
            </div>

            {art ? (
              <>
                <div className="card">
                  <h3>Size &amp; angle</h3>
                  <p className="saving-note" style={{ marginTop: -6, marginBottom: 8 }}>
                    Drag artwork to move · drag corners for perspective
                  </p>
                  {[
                    ["Scale", "scale", 20, 300, "%"],
                    ["Rotate", "rotate", -45, 45, "°"],
                    ["Skew H", "skewH", -40, 40, "°"],
                    ["Skew V", "skewV", -40, 40, "°"],
                  ].map(([label, key, min, max, unit]) => (
                    <div className="slider-row" key={key}>
                      <span>{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={xform[key]}
                        onChange={(event) =>
                          setXform((x) => ({ ...x, [key]: Number(event.target.value) }))
                        }
                      />
                      <output>{xform[key]}{unit}</output>
                    </div>
                  ))}
                </div>

                <div className="card">
                  <h3>Blend into the wall</h3>
                  {[
                    ["Opacity", "opacity", 10, 100],
                    ["Brightness", "brightness", 40, 160],
                    ["Contrast", "contrast", 40, 160],
                    ["Saturation", "saturation", 0, 200],
                  ].map(([label, key, min, max]) => (
                    <div className="slider-row" key={key}>
                      <span>{label}</span>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={adjust[key]}
                        onChange={(event) =>
                          setAdjust((a) => ({ ...a, [key]: Number(event.target.value) }))
                        }
                      />
                      <output>{adjust[key]}</output>
                    </div>
                  ))}
                  <div style={{ marginTop: 10 }}>
                    <div className="saving-note" style={{ marginBottom: 6 }}>Blend mode</div>
                    <div className="seg">
                      {BLEND_MODES.map((blend) => (
                        <button
                          key={blend}
                          className={adjust.blend === blend ? "on" : ""}
                          onClick={() => setAdjust((a) => ({ ...a, blend }))}
                        >
                          {blend}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="studio-layout">
          <div className="stage-wrap">
            {aiResult ? (
              <img src={aiResult} alt="Generated mockup" style={{ maxWidth: "100%", borderRadius: 8 }} />
            ) : aiWall ? (
              <img src={aiWall.preview} alt="Wall" style={{ maxWidth: "100%", borderRadius: 8, opacity: 0.85 }} />
            ) : (
              <div className="stage-hint">
                Upload a wall photo, describe the mural, and AI paints it onto that exact wall —
                architecture, signs and light untouched.
              </div>
            )}
          </div>

          <div className="panel-stack">
            <div className="card">
              <h3>Wall photo</h3>
              <label className="drop-zone" style={{ display: "block" }}>
                {aiWall ? "Replace wall photo" : "Upload wall photo (any size)"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const optimized = await optimizeWallPhoto(file);
                    setAiWall({ file: optimized.file, preview: await readAsDataUrl(optimized.file) });
                    setAiResult(null);
                  }}
                />
              </label>
            </div>
            <div className="card">
              <h3>Describe the mural</h3>
              <textarea
                className="search"
                style={{ width: "100%", minHeight: 90, resize: "vertical" }}
                placeholder="Describe the mural…"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <div className="seg" style={{ marginTop: 10 }}>
                {MURAL_STYLES.map((option) => (
                  <button
                    key={option.value}
                    className={style === option.value ? "on" : ""}
                    onClick={() => setStyle(option.value)}
                    title={option.subtitle}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              <div className="seg" style={{ marginTop: 8 }}>
                {MURAL_COVERAGE.map((option) => (
                  <button
                    key={option.value}
                    className={coverage === option.value ? "on" : ""}
                    onClick={() => setCoverage(option.value)}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
              <input
                className="search"
                style={{ width: "100%", marginTop: 10 }}
                placeholder="Invite code (optional)"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <button className="btn primary" style={{ width: "100%", marginTop: 10 }} onClick={generate} disabled={busy}>
                {busy ? "Painting the mockup…" : "Generate mockup"}
              </button>
              {remaining ? <div className="saving-note" style={{ marginTop: 8 }}>{remaining}</div> : null}
              {error ? (
                <div style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>{error}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {upgrade ? (
        <UpgradeModal
          context={upgrade.context}
          projectId={projectId || null}
          onClose={() => setUpgrade(null)}
          onContinueWatermark={upgrade.onContinueWatermark}
        />
      ) : null}
    </AppShell>
  );
}

export default function StudioPage() {
  return (
    <Suspense>
      <StudioInner />
    </Suspense>
  );
}
