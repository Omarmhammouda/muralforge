"use client";

import { useEffect, useRef, useState } from "react";
import { MURAL_COVERAGE, MURAL_STYLES } from "@/lib/mural-prompt";
import { formatBytes, optimizeWallPhoto } from "@/lib/optimize-photo";

export default function Home() {
  const fileInput = useRef(null);
  const [wallFile, setWallFile] = useState(null);
  const [wallPreview, setWallPreview] = useState(null);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("painterly");
  const [coverage, setCoverage] = useState("medium");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [showBefore, setShowBefore] = useState(false);
  const [sizeNote, setSizeNote] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("mf_code");
    if (saved) setCode(saved);
  }, []);

  async function pickWall(file) {
    if (!file) return;
    setError(null);
    setSizeNote(null);
    const optimized = await optimizeWallPhoto(file);
    setWallFile(optimized.file);
    if (optimized.resized) {
      setSizeNote(
        `Optimized ${formatBytes(optimized.originalBytes)} → ${formatBytes(optimized.optimizedBytes)}`,
      );
    }
    const reader = new FileReader();
    reader.onload = () => setWallPreview(String(reader.result));
    reader.readAsDataURL(optimized.file);
  }

  async function generate() {
    if (!wallFile) {
      setError("Attach a wall photo first.");
      return;
    }
    if (description.trim().length < 3) {
      setError("Describe the mural in a few words.");
      return;
    }
    setBusy(true);
    setError(null);
    setShowBefore(false);
    try {
      const form = new FormData();
      form.set("wall", wallFile);
      form.set("description", description);
      form.set("style", style);
      form.set("coverage", coverage);
      if (code.trim()) form.set("code", code.trim());
      const response = await fetch("/api/generate", { method: "POST", body: form });
      const body = await response.json();
      if (!body.ok) {
        setError(body.error || "Something went wrong.");
        return;
      }
      setResult(body.image);
      setHistory((previous) => [body.image, ...previous].slice(0, 8));
      if (code.trim()) localStorage.setItem("mf_code", code.trim());
      setRemaining(
        body.tier === "code"
          ? body.remaining === null
            ? "Unlimited mockups on this code"
            : `${body.remaining} mockups left on this code`
          : `${body.remaining} free mockups left`,
      );
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="brand">
        <img className="brand-mark" src="/logo.svg" alt="MuralForge logo" />
        <div>
          <h1>MuralForge</h1>
          <div className="tag">by OMH Studios</div>
        </div>
        <a className="ghost brand-cta" href="/proposal">
          Proposal builder →
        </a>
      </div>

      <div className="hero">
        <h2>
          See the mural on the wall <em>before it&apos;s painted</em>
        </h2>
        <p>
          Upload a photo of a real wall, describe the mural in plain words, and get a
          photoreal mockup painted onto that exact wall — architecture, signs and light
          untouched.
        </p>
      </div>

      <div className="workbench">
        <div className="panel">
          <h3>1 · The wall &amp; the idea</h3>
          <div
            className="drop"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickWall(event.dataTransfer.files?.[0]);
            }}
          >
            {wallPreview ? <img src={wallPreview} alt="Your wall" /> : null}
            <div className="hint">
              {wallPreview
                ? "Click to swap the wall photo"
                : "Click or drop a wall photo (JPG/PNG, any size — big photos are optimized automatically)"}
            </div>
          </div>
          {sizeNote ? <div className="quota">{sizeNote}</div> : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => pickWall(event.target.files?.[0])}
          />

          <div style={{ marginTop: 14 }}>
            <textarea
              placeholder="Describe the mural — e.g. “a cherry-blossom branch sweeping around the round sign, petals drifting, our tagline in script”"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="pills">
            {MURAL_STYLES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`pill${style === option.value ? " active" : ""}`}
                onClick={() => setStyle(option.value)}
              >
                {option.title}
                <small>{option.subtitle}</small>
              </button>
            ))}
          </div>
          <div className="pills">
            {MURAL_COVERAGE.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`pill${coverage === option.value ? " active" : ""}`}
                onClick={() => setCoverage(option.value)}
              >
                {option.title}
              </button>
            ))}
          </div>

          <div className="row">
            <input
              className="code-input"
              placeholder="Invite code (optional)"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>

          <button className="generate" onClick={generate} disabled={busy}>
            {busy ? "Painting the mockup…" : "Generate mockup"}
          </button>
          {remaining ? <div className="quota">{remaining}</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </div>

        <div className="panel">
          <h3>2 · The mockup</h3>
          <div className="result-frame">
            {busy ? (
              <div className="spin" aria-label="Generating" />
            ) : result ? (
              <img
                src={showBefore && wallPreview ? wallPreview : result}
                alt={showBefore ? "Original wall" : "Mural mockup"}
              />
            ) : (
              <span>Your mockup appears here.</span>
            )}
          </div>
          {result ? (
            <div className="result-actions">
              <button
                type="button"
                className="ghost"
                onMouseDown={() => setShowBefore(true)}
                onMouseUp={() => setShowBefore(false)}
                onMouseLeave={() => setShowBefore(false)}
                onTouchStart={() => setShowBefore(true)}
                onTouchEnd={() => setShowBefore(false)}
              >
                Hold to compare
              </button>
              <a className="ghost" href={result} download="muralforge-mockup.png">
                Download
              </a>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  try {
                    sessionStorage.setItem("mf_proposal_mockup", result);
                  } catch {}
                  window.location.href = "/proposal";
                }}
              >
                Use in proposal
              </button>
            </div>
          ) : null}
          {history.length > 1 ? (
            <div className="history">
              {history.map((item, index) => (
                <img
                  key={index}
                  src={item}
                  alt={`Mockup ${index + 1}`}
                  onClick={() => setResult(item)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="steps">
        <div className="step">
          <b>PRESERVED, NOT REDRAWN</b>
          <p>
            Every generation carries a scene-preservation contract: the camera angle,
            signs, fixtures and lighting of your photo stay put — only the wall gets painted.
          </p>
        </div>
        <div className="step">
          <b>STYLES THAT SELL</b>
          <p>
            Painterly, photoreal airbrush, painted neon, bold graphic or minimal — the
            same range a working mural studio quotes from.
          </p>
        </div>
        <div className="step">
          <b>MADE FOR CLIENT CALLS</b>
          <p>
            Generate options live, hold to compare against the bare wall, download and
            drop straight into a proposal.
          </p>
        </div>
      </div>

      <footer>
        MuralForge · OMH Studios · mockups are AI previews — final murals are painted by hand.
      </footer>
    </div>
  );
}
