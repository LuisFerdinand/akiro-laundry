// components/admin/VariableMenu.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface TemplateVariable {
  token: string;
  label: string;
  /** Optional muted second line — where the value comes from / when it's empty. */
  hint?:  string;
}

const MENU_WIDTH      = 290;
const MENU_MAX_HEIGHT = 360;
const GAP             = 6;  // between the toolbar button and the menu
const EDGE            = 8;  // min distance from the viewport edge

interface MenuPosition {
  top?:      number;
  bottom?:   number;
  left:      number;
  width:     number;
  maxHeight: number;
}

/**
 * "Insert variable" dropdown shared by the WhatsApp and receipt template editors.
 *
 * Rendered in a portal with fixed positioning so it floats over the editor
 * instead of being clipped inside the field's card (which is `overflow: hidden`
 * for its rounded corners). Opens below `anchorRef`, right-aligned to it, and
 * flips above when there isn't enough room below.
 */
export function VariableMenu({
  open,
  anchorRef,
  variables,
  onPick,
  onClose,
}: {
  open:      boolean;
  /** Wraps the toggle button — clicks inside it don't count as "outside". */
  anchorRef: React.RefObject<HTMLElement | null>;
  variables: TemplateVariable[];
  onPick:    (token: string) => void;
  onClose:   () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r     = anchor.getBoundingClientRect();
      const vw    = window.innerWidth;
      const vh    = window.innerHeight;
      const width = Math.min(MENU_WIDTH, vw - EDGE * 2);
      const left  = Math.min(Math.max(EDGE, r.right - width), vw - width - EDGE);
      const below = vh - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;

      if (below >= Math.min(MENU_MAX_HEIGHT, 240) || below >= above) {
        setPos({ top: r.bottom + GAP, left, width, maxHeight: Math.min(MENU_MAX_HEIGHT, below) });
      } else {
        setPos({ bottom: vh - r.top + GAP, left, width, maxHeight: Math.min(MENU_MAX_HEIGHT, above) });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, anchorRef, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed", zIndex: 1000,
        top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width,
        maxHeight: pos.maxHeight, overflowY: "auto",
        background: "white", borderRadius: 8, border: "1.5px solid #e2e8f0",
        boxShadow: "0 12px 32px rgba(15,23,42,0.16), 0 2px 6px rgba(15,23,42,0.06)",
      }}
    >
      {variables.map((v) => (
        <button
          key={v.token}
          type="button"
          role="menuitem"
          // Keep focus (and the caret) in the textarea while picking.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onPick(v.token); onClose(); }}
          style={{
            width: "100%", padding: "7px 10px",
            display: "flex", alignItems: "center", gap: 10,
            border: "none", borderBottom: "1px solid #f1f5f9",
            background: "white", cursor: "pointer", textAlign: "left",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
        >
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#334155", lineHeight: 1.35 }}>
              {v.label}
            </span>
            {v.hint && (
              <span style={{ fontSize: "9.5px", fontWeight: 500, color: "#94a3b8", lineHeight: 1.35 }}>
                {v.hint}
              </span>
            )}
          </span>
          <code
            style={{
              flexShrink: 0, whiteSpace: "nowrap",
              fontSize: "9px", fontWeight: 700, color: "#1a7fba",
              background: "#edf7fd", padding: "2px 5px", borderRadius: 4,
            }}
          >
            {v.token}
          </code>
        </button>
      ))}
    </div>,
    document.body,
  );
}
