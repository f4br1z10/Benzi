"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

const links = [
  ["/", "Dashboard", "dashboard"],
  ["/preventivi", "Preventivi", "quote"],
  ["/clienti", "Clienti", "users"],
  ["/prodotti", "Prodotti", "box"],
  ["/servizi", "Servizi", "tools"],
  ["/scadenze", "Scadenze", "calendar"],
  ["/tutorial", "Tutorial", "tutorial"],
  ["/impostazioni", "Impostazioni", "settings"],
  ["/backup", "Backup e ripristino", "backup"],
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Navigazione principale">
        <div className="brand">
          <div className="brand-mark">SG</div>
          <div>
            <strong>SG Clima</strong>
            <small>Gestione preventivi</small>
          </div>
        </div>
        <nav className="nav">
          {links.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`nav-link ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}`}
            >
              <Icon name={icon} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          Applicazione locale
          <br />I dati restano su questo computer
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="actions">
            <button className="icon-btn mobile-menu" onClick={() => setOpen(!open)} aria-label="Apri menu">☰</button>
            <div className="topbar-title">SG Clima · Gestione preventivi</div>
          </div>
          <div className="topbar-meta">
            <span className="local-dot" />
            <span>Archivio locale attivo</span>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
