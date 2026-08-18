"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const ICONS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  projects: "M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z",
  mockups: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 11l4.5-6 3.5 4.5 2.5-3L19 16H5z",
  proposals: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-5 4h8v2H8v-2zm0 4h8v2H8v-2z",
  clients: "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  templates: "M4 4h16v4H4V4zm0 6h10v10H4V10zm12 0h4v10h-4V10z",
  billing: "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4H4V6h16v2zm0 10H4v-6h16v6z",
  settings: "M19.14 12.94a7 7 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.58.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7 7 0 0 0 0 1.88L2.82 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.4-.96c.5.39 1.04.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.54c.58-.24 1.13-.55 1.63-.94l2.39.96c.22.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.56zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z",
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/mockups", label: "Mockups", icon: "mockups" },
  { href: "/proposals", label: "Proposals", icon: "proposals" },
  { href: "/clients", label: "Clients", icon: "clients" },
  { href: "/templates", label: "Templates", icon: "templates" },
  { href: "/billing", label: "Billing", icon: "billing" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={ICONS[name]} fill="currentColor" />
    </svg>
  );
}

export default function AppShell({ title, actions, children }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  return (
    <div className="app">
      <aside className={`sidebar no-print${open ? " open" : ""}`}>
        <a className="side-brand" href="/">
          <img src="/logo.svg" alt="" />
          <span>MuralForge</span>
        </a>
        <nav>
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`side-link${isActive(item.href) ? " active" : ""}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <a className="side-link side-studio" href="/studio">
          <span className="dot" /> Mockup Studio
        </a>
      </aside>

      <div className="main">
        <header className="topbar no-print">
          <button
            type="button"
            className="menu-btn"
            aria-label="Menu"
            onClick={() => setOpen(!open)}
          >
            ☰
          </button>
          <h1>{title}</h1>
          <div className="topbar-actions">{actions}</div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
