const { useState, useEffect, useRef, useMemo, useCallback } = React;

const NODE_W = 222, NODE_H = 104;
const LS_KEY = "nexus-funnel-v5";

const ORIGIN_KEYS = ["instagram", "youtube", "adsA", "adsB", "neutral"];
const ICON_KEYS = ["ad", "instagram", "youtube", "test", "form", "landing-video",
  "landing-doc", "email", "session", "session-paid", "meeting", "brand"];

// ---- geometry helpers ----
function rectOf(pos) { return { x: pos.x, y: pos.y, w: NODE_W, h: NODE_H }; }
function center(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

function anchor(r, side) {
  switch (side) {
    case "r": return { x: r.x + r.w, y: r.y + r.h / 2, nx: 1, ny: 0 };
    case "l": return { x: r.x,       y: r.y + r.h / 2, nx: -1, ny: 0 };
    case "t": return { x: r.x + r.w / 2, y: r.y,        nx: 0, ny: -1 };
    case "b": return { x: r.x + r.w / 2, y: r.y + r.h,  nx: 0, ny: 1 };
  }
}
function pickSides(s, t, bend) {
  const sc = center(s), tc = center(t);
  let ax = tc.x, ay = tc.y, bx = sc.x, by = sc.y;
  if (bend) {
    const w = { x: (sc.x + tc.x) / 2 + bend.x, y: (sc.y + tc.y) / 2 + bend.y };
    ax = w.x; ay = w.y; bx = w.x; by = w.y;
  }
  const sideFor = (r, gx, gy) => {
    const c = center(r); const dx = gx - c.x, dy = gy - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
    return dy >= 0 ? "b" : "t";
  };
  return [sideFor(s, ax, ay), sideFor(t, bx, by)];
}
function norm(x, y) { const m = Math.hypot(x, y) || 1; return { x: x / m, y: y / m }; }

function normalizeUrl(u) {
  if (!u) return "#";
  const t = u.trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return "https://" + t.replace(/^\/+/, "");
}

function geom(s, t, bend) {
  const [ss, ts] = pickSides(s, t, bend);
  const a = anchor(s, ss), b = anchor(t, ts);
  if (!bend) {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const k = Math.max(48, Math.min(170, dist * 0.42));
    const c1 = { x: a.x + a.nx * k, y: a.y + a.ny * k };
    const c2 = { x: b.x + b.nx * k, y: b.y + b.ny * k };
    const d = `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
    const mx = 0.125 * a.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * b.x;
    const my = 0.125 * a.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * b.y;
    return { d, a, b, mid: { x: mx, y: my } };
  }
  const W = { x: (s.x + s.w / 2 + t.x + t.w / 2) / 2 + bend.x,
              y: (s.y + s.h / 2 + t.y + t.h / 2) / 2 + bend.y };
  const dir = norm(b.x - a.x, b.y - a.y);
  const d1 = Math.hypot(W.x - a.x, W.y - a.y);
  const d2 = Math.hypot(b.x - W.x, b.y - W.y);
  const kA = Math.max(36, Math.min(150, d1 * 0.45));
  const kB = Math.max(36, Math.min(150, d2 * 0.45));
  const c1 = { x: a.x + a.nx * kA, y: a.y + a.ny * kA };
  const c2 = { x: W.x - dir.x * d1 * 0.4, y: W.y - dir.y * d1 * 0.4 };
  const c3 = { x: W.x + dir.x * d2 * 0.4, y: W.y + dir.y * d2 * 0.4 };
  const c4 = { x: b.x + b.nx * kB, y: b.y + b.ny * kB };
  const d = `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${W.x} ${W.y} C ${c3.x} ${c3.y}, ${c4.x} ${c4.y}, ${b.x} ${b.y}`;
  return { d, a, b, mid: W };
}

function defaultNodes() { return NODES.map(n => ({ id: n.id, origin: n.origin, icon: n.icon, tag: n.tag, title: n.title, cta: n.cta })); }
function defaultPositions() { const o = {}; NODES.forEach(n => { o[n.id] = { x: n.x, y: n.y }; }); return o; }
function defaultEdges() { return EDGES.map((e, i) => ({ id: "e" + i, bend: null, ...e })); }

// inline-editable text that does NOT re-render its own content while focused
// (prevents the caret from jumping to the start, which reversed the typed text)
function Editable({ as = "div", className, editing, html, onCommit }) {
  const ref = useRef(null);
  const focused = useRef(false);
  useEffect(() => {
    if (ref.current && !focused.current && ref.current.textContent !== html) ref.current.textContent = html;
  });
  const Tag = as;
  return (
    <Tag ref={ref} className={className}
      contentEditable={editing} suppressContentEditableWarning
      onFocus={() => { focused.current = true; }}
      onBlur={(e) => { focused.current = false; onCommit(e.currentTarget.textContent.trim()); }} />
  );
}

function App() {
  const loaded = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch (e) { return {}; }
  }, []);

  const [nodes, setNodes] = useState(() => (loaded.nodes && loaded.nodes.length ? loaded.nodes : defaultNodes()));
  const [pos, setPos] = useState(() => ({ ...defaultPositions(), ...(loaded.pos || {}) }));
  const [edges, setEdges] = useState(() => (loaded.edges && loaded.edges.length ? loaded.edges : defaultEdges()));
  const [notes, setNotes] = useState(() => loaded.notes || []);
  const [scale, setScale] = useState(() => loaded.scale || 1);
  const [showLanes, setShowLanes] = useState(() => loaded.showLanes === undefined ? true : loaded.showLanes);
  const [showLabels, setShowLabels] = useState(() => loaded.showLabels === undefined ? true : loaded.showLabels);

  const [hover, setHover] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [selEdge, setSelEdge] = useState(null);
  const [selNode, setSelNode] = useState(null);
  const [editNode, setEditNode] = useState(null);
  const [selNote, setSelNote] = useState(null);
  const [editNote, setEditNote] = useState(null);
  const [iconPop, setIconPop] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const canvasRef = useRef(null);
  const drag = useRef(null);
  const eDrag = useRef(null);
  const conn = useRef(null);
  const moved = useRef(false);
  const nDrag = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(LS_KEY, JSON.stringify({ nodes, pos, edges, notes, scale, showLanes, showLabels }));
    }, 140);
    return () => clearTimeout(id);
  }, [nodes, pos, edges, notes, scale, showLanes, showLabels]);

  const nodeById = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes]);

  const neighbors = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = new Set([n.id]); });
    edges.forEach(e => { if (m[e.from] && m[e.to]) { m[e.from].add(e.to); m[e.to].add(e.from); } });
    return m;
  }, [edges, nodes]);

  const toCanvas = useCallback((e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }, [scale]);

  const nodeAtPoint = useCallback((pt, exclude) => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]; if (n.id === exclude) continue;
      const p = pos[n.id]; if (!p) continue;
      if (pt.x >= p.x && pt.x <= p.x + NODE_W && pt.y >= p.y && pt.y <= p.y + NODE_H) return n.id;
    }
    return null;
  }, [pos, nodes]);

  // ---- node ----
  const updateNode = useCallback((id, patch) => {
    setNodes(list => list.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const addNode = useCallback(() => {
    const stage = canvasRef.current.parentElement;
    const cx = (stage.scrollLeft + stage.clientWidth / 2) / scale - NODE_W / 2;
    const cy = (stage.scrollTop + stage.clientHeight / 2) / scale - NODE_H / 2;
    const id = "n" + Date.now();
    const x = Math.max(0, Math.min(CANVAS.w - NODE_W, cx));
    const y = Math.max(0, Math.min(CANVAS.h - NODE_H, cy));
    setNodes(list => [...list, { id, origin: "neutral", icon: "test", tag: "Nuevo", title: "Nuevo bloque", cta: "Describe el paso del embudo" }]);
    setPos(p => ({ ...p, [id]: { x, y } }));
    setSelEdge(null); setSelNode(id); setEditNode(id); setIconPop(false);
  }, [scale]);

  const deleteNode = useCallback((id) => {
    setNodes(list => list.filter(n => n.id !== id));
    setEdges(list => list.filter(e => e.from !== id && e.to !== id));
    setPos(p => { const c = { ...p }; delete c[id]; return c; });
    setSelNode(null); setEditNode(null); setIconPop(false);
  }, []);

  // ---- notes (free labels) ----
  const updateNote = useCallback((id, patch) => {
    setNotes(list => list.map(n => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const addNote = useCallback(() => {
    const stage = canvasRef.current.parentElement;
    const cx = (stage.scrollLeft + stage.clientWidth / 2) / scale - 70;
    const cy = (stage.scrollTop + stage.clientHeight / 2) / scale - 18;
    const id = "nt" + Date.now();
    const x = Math.max(0, Math.min(CANVAS.w - 140, cx));
    const y = Math.max(0, Math.min(CANVAS.h - 36, cy));
    setNotes(list => [...list, { id, x, y, text: "Nueva etiqueta", url: "", color: "#1c4f8b" }]);
    setSelEdge(null); setSelNode(null); setEditNode(null);
    setSelNote(id); setEditNote(id); setIconPop(false);
  }, [scale]);

  const deleteNote = useCallback((id) => {
    setNotes(list => list.filter(n => n.id !== id));
    setSelNote(null); setEditNote(null);
  }, []);

  const onNoteDown = useCallback((e, id) => {
    if (e.button !== 0) return;
    if (editNote === id) return;
    e.stopPropagation(); e.preventDefault();
    setSelNote(id); setSelNode(null); setSelEdge(null); setEditNode(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    const note = notes.find(n => n.id === id);
    nDrag.current = { id, startX: e.clientX, startY: e.clientY, orig: { x: note.x, y: note.y }, moved: false, w: e.currentTarget.offsetWidth, h: e.currentTarget.offsetHeight };
  }, [editNote, notes]);

  const onNoteMove = useCallback((e) => {
    if (!nDrag.current) return;
    const { id, startX, startY, orig, w, h } = nDrag.current;
    const dx = (e.clientX - startX) / scale, dy = (e.clientY - startY) / scale;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) nDrag.current.moved = true;
    setNotes(list => list.map(n => n.id === id ? { ...n, ...{
      x: Math.max(0, Math.min(CANVAS.w - w, orig.x + dx)),
      y: Math.max(0, Math.min(CANVAS.h - h, orig.y + dy)),
    }} : n));
  }, [scale]);

  const onNoteUp = useCallback(() => { if (nDrag.current) nDrag.current = null; }, []);

  const onNodeDown = useCallback((e, id) => {
    if (e.button !== 0) return;
    if (editNode === id) return;               // editing → allow text selection
    e.preventDefault();
    setSelEdge(null); setSelNode(id);
    if (editNode && editNode !== id) { setEditNode(null); setIconPop(false); }
    e.currentTarget.setPointerCapture(e.pointerId);
    moved.current = false;
    drag.current = { id, startX: e.clientX, startY: e.clientY, orig: { ...pos[id] } };
    setDragId(id);
  }, [pos, editNode]);

  const onConnDown = useCallback((e, id) => {
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    conn.current = { from: id, pid: e.pointerId };
    setConnectFrom(id); setCursor(toCanvas(e));
  }, [toCanvas]);

  const onEdgeHandleDown = useCallback((e, edge, kind) => {
    e.preventDefault(); e.stopPropagation();
    canvasRef.current.setPointerCapture(e.pointerId);
    eDrag.current = { id: edge.id, kind, pid: e.pointerId };
    setSelEdge(edge.id); setCursor(toCanvas(e));
  }, [toCanvas]);

  const onMove = useCallback((e) => {
    if (drag.current) {
      const { id, startX, startY, orig } = drag.current;
      const dx = (e.clientX - startX) / scale, dy = (e.clientY - startY) / scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
      setPos(p => ({ ...p, [id]: {
        x: Math.max(0, Math.min(CANVAS.w - NODE_W, orig.x + dx)),
        y: Math.max(0, Math.min(CANVAS.h - NODE_H, orig.y + dy)),
      }}));
      return;
    }
    if (conn.current) {
      const pt = toCanvas(e); setCursor(pt);
      setDropTarget(nodeAtPoint(pt, conn.current.from));
      return;
    }
    if (eDrag.current) {
      const pt = toCanvas(e); setCursor(pt);
      const { id, kind } = eDrag.current;
      if (kind === "from" || kind === "to") {
        const ed = edges.find(x => x.id === id);
        const other = kind === "from" ? "to" : "from";
        setDropTarget(nodeAtPoint(pt, ed ? ed[other] : null));
      } else if (kind === "mid") {
        const ed = edges.find(x => x.id === id);
        if (ed && pos[ed.from] && pos[ed.to]) {
          const s = rectOf(pos[ed.from]), t = rectOf(pos[ed.to]);
          const baseX = (s.x + s.w / 2 + t.x + t.w / 2) / 2;
          const baseY = (s.y + s.h / 2 + t.y + t.h / 2) / 2;
          setEdges(list => list.map(x => x.id === id ? { ...x, bend: { x: pt.x - baseX, y: pt.y - baseY } } : x));
        }
      }
    }
  }, [scale, toCanvas, nodeAtPoint, edges, pos]);

  const onUp = useCallback((e) => {
    if (drag.current) {
      const id = drag.current.id; const wasMoved = moved.current;
      drag.current = null; setDragId(null);
      if (!wasMoved) { setSelNode(id); }   // click without move = select
      return;
    }
    if (conn.current) {
      const pt = toCanvas(e);
      const target = nodeAtPoint(pt, conn.current.from);
      if (target) {
        const from = conn.current.from;
        if (!edges.some(x => x.from === from && x.to === target)) {
          const via = nodeById[from].origin;
          const nid = "u" + Date.now();
          setEdges(list => [...list, { id: nid, from, to: target, via, kind: "solid", label: "", bend: null }]);
          setSelEdge(nid);
        }
      }
      conn.current = null; setConnectFrom(null); setCursor(null); setDropTarget(null); return;
    }
    if (eDrag.current) {
      const { id, kind } = eDrag.current;
      if (kind === "from" || kind === "to") {
        const pt = toCanvas(e);
        const ed = edges.find(x => x.id === id);
        const other = kind === "from" ? ed.to : ed.from;
        const target = nodeAtPoint(pt, other);
        if (target && target !== ed[kind]) {
          setEdges(list => list.map(x => {
            if (x.id !== id) return x;
            const next = { ...x, [kind]: target };
            next.via = nodeById[next.from] ? nodeById[next.from].origin : x.via;
            return next;
          }));
        }
      }
      eDrag.current = null; setCursor(null); setDropTarget(null);
    }
  }, [toCanvas, nodeAtPoint, edges, nodeById]);

  const wires = useMemo(() => edges.map(e => {
    if (!pos[e.from] || !pos[e.to]) return null;
    const g = geom(rectOf(pos[e.from]), rectOf(pos[e.to]), e.bend);
    return { ...e, ...g };
  }).filter(Boolean), [edges, pos]);

  useEffect(() => {
    const onKey = (ev) => {
      const editing = document.activeElement && document.activeElement.isContentEditable;
      if ((ev.key === "Delete" || ev.key === "Backspace") && !editing) {
        if (selEdge) { ev.preventDefault(); setEdges(l => l.filter(x => x.id !== selEdge)); setSelEdge(null); }
        else if (selNote && !editNote) { ev.preventDefault(); deleteNote(selNote); }
        else if (selNode && !editNode) { ev.preventDefault(); deleteNode(selNode); }
      }
      if (ev.key === "Escape") { setSelEdge(null); setSelNode(null); setEditNode(null); setSelNote(null); setEditNote(null); setIconPop(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selEdge, selNode, editNode, selNote, editNote, deleteNode, deleteNote]);

  // click anywhere outside the element being edited → exit edit mode (commits text)
  useEffect(() => {
    if (!editNote && !editNode) return;
    const onDown = (e) => {
      const t = e.target;
      if (editNote) {
        const el = t.closest && t.closest(".note-chip");
        if (!el || !el.classList.contains("editing")) setEditNote(null);
      }
      if (editNode) {
        const el = t.closest && t.closest(".node");
        if (!el || !el.classList.contains("editing")) { setEditNode(null); setIconPop(false); }
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [editNote, editNode]);

  const deleteEdge = (id) => { setEdges(l => l.filter(x => x.id !== id)); setSelEdge(null); };
  const reset = () => {
    setNodes(defaultNodes()); setPos(defaultPositions()); setEdges(defaultEdges()); setNotes([]);
    setSelEdge(null); setSelNode(null); setEditNode(null); setSelNote(null); setEditNote(null); setIconPop(false); setScale(1);
  };
  const zoom = (d) => setScale(s => Math.max(0.5, Math.min(1.25, +(s + d).toFixed(2))));

  const clearAll = () => { setSelEdge(null); setSelNode(null); setEditNode(null); setSelNote(null); setEditNote(null); setIconPop(false); };
  const dimNode = (id) => hover && !neighbors[hover].has(id);
  const activeEdge = (e) => hover && (e.from === hover || e.to === hover);
  const connecting = !!connectFrom || (eDrag.current && (eDrag.current.kind === "from" || eDrag.current.kind === "to"));

  return (
    <React.Fragment>
      <header className="appbar">
        <div className="brand">
          <div className="brand-mark"><Icon name="brand" /></div>
          <div className="brand-txt">
            <span className="t1">Embudo de ventas · Nexus Plan</span>
            <span className="t2">Mapa de flujo modular</span>
          </div>
        </div>

        <div className="legend">
          {ORIGIN_KEYS.map(k => (
            <div className="lg" key={k}>
              <span className="dot" style={{ background: ORIGINS[k].raw }}></span>
              {ORIGINS[k].label}
            </div>
          ))}
        </div>

        <div className="toolbar">
          <button className="btn primary" onClick={addNode}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Añadir bloque
          </button>
          <button className="btn" onClick={addNote}>
            <Icon name="tag" /> Añadir etiqueta
          </button>
          <button className={"btn" + (showLanes ? " on" : "")} onClick={() => setShowLanes(v => !v)}>
            <Icon name="lanes" /> Carriles
          </button>
          <button className={"btn" + (showLabels ? " on" : "")} onClick={() => setShowLabels(v => !v)}>
            <Icon name="tag" /> Etiquetas
          </button>
          <button className="btn" onClick={reset}>
            <Icon name="reset" /> Restablecer
          </button>
          <div className="zoom">
            <button onClick={() => zoom(-0.1)}>–</button>
            <span className="pct">{Math.round(scale * 100)}%</span>
            <button onClick={() => zoom(0.1)}>+</button>
          </div>
        </div>
      </header>

      <div className="stage">
        <div className="canvas" ref={canvasRef}
          style={{ width: CANVAS.w, height: CANVAS.h, transform: `scale(${scale})` }}
          onPointerMove={onMove} onPointerUp={onUp}
          onPointerDown={(e) => { if (e.target === canvasRef.current) clearAll(); }}>

          {showLanes && LANES.map(l => (
            <div className="lane" key={l.id}
              style={{
                top: l.y, left: 96, height: l.h, width: 940, borderRadius: 16,
                background: `linear-gradient(90deg, ${ORIGINS[l.origin].raw}13, ${ORIGINS[l.origin].raw}05 70%, transparent)`,
                borderLeft: `3px solid ${ORIGINS[l.origin].raw}40`,
              }}>
              <span className="lane-label" style={{
                position: "absolute", left: -82, top: "50%",
                transform: "translateY(-50%) rotate(180deg)",
                writingMode: "vertical-rl", margin: 0, textAlign: "center",
                color: ORIGINS[l.origin].raw,
              }}>{ORIGINS[l.origin].label}</span>
            </div>
          ))}

          {STAGES.map(s => (
            <div className="colhead" key={s.k} style={{ left: s.x }}>
              <span className="ch-k">FASE {s.k}</span>
              <span className="ch-t">{s.t}</span>
            </div>
          ))}

          <svg className={"wires" + (connecting ? " connecting" : "")} width={CANVAS.w} height={CANVAS.h}>
            <defs>
              {ORIGIN_KEYS.map(k => (
                <marker key={k} id={"arw-" + k} viewBox="0 0 10 10" refX="8.5" refY="5"
                  markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0.5 1 L9 5 L0.5 9 Z" fill={ORIGINS[k].raw} />
                </marker>
              ))}
            </defs>

            {wires.map(w => {
              const col = ORIGINS[w.via].raw;
              const act = activeEdge(w);
              const isSel = selEdge === w.id;
              const op = hover ? (act ? 1 : 0.1) : (selEdge && !isSel ? 0.32 : 0.9);
              return (
                <g key={w.id}>
                  <path className="wire-hit" d={w.d}
                    onPointerDown={(e) => { e.stopPropagation(); setSelEdge(w.id); setSelNode(null); setEditNode(null); }} />
                  <path className={"wire" + (isSel ? " sel" : "")} d={w.d}
                    stroke={col} strokeWidth={isSel ? 3.4 : (act ? 3 : 2)}
                    strokeDasharray={w.kind === "dashed" ? "2 7" : "none"}
                    markerEnd={`url(#arw-${w.via})`}
                    style={{ opacity: op, pointerEvents: "none" }} />
                </g>
              );
            })}

            {wires.filter(w => w.id === selEdge).map(w => {
              const col = ORIGINS[w.via].raw;
              return (
                <g key={"h" + w.id}>
                  <circle className="ehandle" cx={w.a.x} cy={w.a.y} r="6.5" fill={col}
                    onPointerDown={(e) => onEdgeHandleDown(e, w, "from")} />
                  <circle className="ehandle" cx={w.b.x} cy={w.b.y} r="6.5" fill={col}
                    onPointerDown={(e) => onEdgeHandleDown(e, w, "to")} />
                  <circle className="ehandle mid" cx={w.mid.x} cy={w.mid.y} r="6.5" fill="#fff" stroke={col}
                    onPointerDown={(e) => onEdgeHandleDown(e, w, "mid")} />
                </g>
              );
            })}

            {cursor && connectFrom && pos[connectFrom] && (() => {
              const c = center(rectOf(pos[connectFrom]));
              return <line x1={c.x} y1={c.y} x2={cursor.x} y2={cursor.y}
                stroke={ORIGINS[nodeById[connectFrom].origin].raw} strokeWidth="2.4"
                strokeDasharray="3 6" strokeLinecap="round" />;
            })()}
            {cursor && eDrag.current && (eDrag.current.kind === "from" || eDrag.current.kind === "to") && (() => {
              const ed = edges.find(x => x.id === eDrag.current.id); if (!ed) return null;
              const fixed = eDrag.current.kind === "from" ? ed.to : ed.from;
              if (!pos[fixed]) return null;
              const c = center(rectOf(pos[fixed]));
              return <line x1={c.x} y1={c.y} x2={cursor.x} y2={cursor.y}
                stroke={ORIGINS[ed.via].raw} strokeWidth="2.4" strokeDasharray="3 6" strokeLinecap="round" />;
            })()}
          </svg>

          {showLabels && wires.map(w => {
            if (!w.label) return null;
            const act = activeEdge(w);
            const isSel = selEdge === w.id;
            const op = hover ? (act ? 1 : 0.1) : (selEdge && !isSel ? 0.3 : 1);
            return (
              <div className="elabel" key={"l" + w.id}
                style={{ left: w.mid.x, top: w.mid.y - (isSel ? 22 : 0), opacity: op,
                  borderColor: (act || isSel) ? ORIGINS[w.via].raw : "var(--line)",
                  color: (act || isSel) ? ORIGINS[w.via].raw : "var(--ink-soft)" }}>
                {w.label}
              </div>
            );
          })}

          {wires.filter(w => w.id === selEdge).map(w => (
            <div className="edge-del" key={"d" + w.id}
              style={{ left: w.mid.x, top: w.mid.y + 22 }}
              title="Eliminar conexión (Supr)"
              onPointerDown={(e) => { e.stopPropagation(); deleteEdge(w.id); }}>
              <Icon name="trash" />
            </div>
          ))}

          {nodes.map(n => {
            const p = pos[n.id]; if (!p) return null;
            const o = ORIGINS[n.origin] || ORIGINS.neutral;
            const linked = hover && hover !== n.id && neighbors[hover].has(n.id);
            const isDrop = dropTarget === n.id;
            const isEdit = editNode === n.id;
            const isSel = selNode === n.id;
            return (
              <div key={n.id}
                className={"node" + (dragId === n.id ? " dragging" : "") + (dimNode(n.id) ? " dim" : "")
                  + (linked ? " linked" : "") + (isDrop ? " drop-ok" : "") + (isSel && !isEdit ? " sel" : "") + (isEdit ? " editing" : "") + (n.url && !isEdit ? " has-link" : "")}
                style={{ left: p.x, top: p.y, "--c": n.color || o.raw }}
                onPointerDown={(e) => onNodeDown(e, n.id)}
                onDoubleClick={(e) => { e.stopPropagation(); setEditNode(n.id); setSelNode(n.id); setSelEdge(null); }}
                onMouseEnter={() => { if (!drag.current && !conn.current && !eDrag.current && !editNode) setHover(n.id); }}
                onMouseLeave={() => { if (!editNode) setHover(null); }}>

                {isEdit && (
                  <div className="node-tools" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <div className="nt-row">
                      {ORIGIN_KEYS.map(k => (
                        <div key={k} className={"nt-dot" + (n.origin === k ? " on" : "")}
                          style={{ background: ORIGINS[k].raw }} title={ORIGINS[k].label}
                          onClick={() => updateNode(n.id, { origin: k, color: null })}></div>
                      ))}
                      <label className="nt-color" title="Color personalizado"
                        style={{ background: n.color || (ORIGINS[n.origin] || ORIGINS.neutral).raw }}>
                        <Icon name="drop" />
                        <input type="color" value={n.color || (ORIGINS[n.origin] || ORIGINS.neutral).raw}
                          onInput={(e) => updateNode(n.id, { color: e.target.value })} />
                      </label>
                      <div className="nt-sep"></div>
                      <div className="nt-ic" title="Cambiar icono" onClick={() => setIconPop(v => !v)}><Icon name={n.icon} /></div>
                      <div className="nt-ic danger" title="Eliminar bloque" onClick={() => deleteNode(n.id)}><Icon name="trash" /></div>
                      {iconPop && (
                        <div className="icon-pop" onPointerDown={(e) => e.stopPropagation()}>
                          {ICON_KEYS.map(ik => (
                            <div key={ik} className={"ip-b" + (n.icon === ik ? " on" : "")}
                              onClick={() => { updateNode(n.id, { icon: ik }); setIconPop(false); }}>
                              <Icon name={ik} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="nt-link">
                      <Icon name="link" />
                      <input type="url" placeholder="Pega un enlace (https://…)"
                        defaultValue={n.url || ""}
                        onPointerDown={(e) => e.stopPropagation()}
                        onBlur={(e) => updateNode(n.id, { url: e.target.value.trim() })}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                    </div>
                  </div>
                )}

                <div className="nrow">
                  <span className="nicon"><Icon name={n.icon} /></span>
                  <Editable as="span" className="ntag" editing={isEdit} html={n.tag}
                    onCommit={(t) => updateNode(n.id, { tag: t || "Bloque" })} />
                </div>
                <Editable className="ntitle" editing={isEdit} html={n.title}
                  onCommit={(t) => updateNode(n.id, { title: t || "Sin título" })} />
                <div className="ncta">
                  <Icon name="arrow" />
                  <Editable as="span" className="ncta-tx" editing={isEdit} html={n.cta}
                    onCommit={(t) => updateNode(n.id, { cta: t })} />
                </div>

                {!isEdit && (
                  <div className="conn-dot" title="Arrastrar para conectar con otro bloque"
                    onPointerDown={(e) => onConnDown(e, n.id)}></div>
                )}
                {!isEdit && n.url && (
                  <button className="node-link" title={"Abrir enlace en una pestaña nueva\n" + n.url}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); window.open(normalizeUrl(n.url), "_blank", "noopener"); }}>
                    <Icon name="link" />
                  </button>
                )}
              </div>
            );
          })}

          {/* free labels / notes */}
          {notes.map(nt => {
            const isEdit = editNote === nt.id;
            const isSel = selNote === nt.id;
            return (
              <div key={nt.id}
                className={"note-chip" + (isEdit ? " editing" : (isSel ? " sel" : ""))}
                style={{ left: nt.x, top: nt.y, "--c": nt.color || "#1c4f8b" }}
                onPointerDown={(e) => onNoteDown(e, nt.id)}
                onPointerMove={onNoteMove}
                onPointerUp={onNoteUp}
                onDoubleClick={(e) => { e.stopPropagation(); setEditNote(nt.id); setSelNote(nt.id); setSelNode(null); setSelEdge(null); }}>

                {isEdit && (
                  <div className="node-tools" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                    <div className="nt-row">
                      {ORIGIN_KEYS.map(k => (
                        <div key={k} className={"nt-dot" + (nt.color === ORIGINS[k].raw ? " on" : "")}
                          style={{ background: ORIGINS[k].raw }} title={ORIGINS[k].label}
                          onClick={() => updateNote(nt.id, { color: ORIGINS[k].raw })}></div>
                      ))}
                      <label className="nt-color" title="Color personalizado" style={{ background: nt.color || "#1c4f8b" }}>
                        <Icon name="drop" />
                        <input type="color" value={nt.color || "#1c4f8b"}
                          onInput={(e) => updateNote(nt.id, { color: e.target.value })} />
                      </label>
                      <div className="nt-sep"></div>
                      <div className="nt-ic danger" title="Eliminar etiqueta" onClick={() => deleteNote(nt.id)}><Icon name="trash" /></div>
                    </div>
                    <div className="nt-link">
                      <Icon name="link" />
                      <input type="url" placeholder="Enlace opcional (https://…)"
                        defaultValue={nt.url || ""}
                        onPointerDown={(e) => e.stopPropagation()}
                        onBlur={(e) => updateNote(nt.id, { url: e.target.value.trim() })}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
                    </div>
                  </div>
                )}

                <span className="nc-dot"></span>
                <Editable as="span" className="nc-text" editing={isEdit} html={nt.text}
                  onCommit={(t) => updateNote(nt.id, { text: t || "Etiqueta" })} />
                {!isEdit && nt.url && (
                  <button className="nc-link" title={"Abrir enlace en una pestaña nueva\n" + nt.url}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); window.open(normalizeUrl(nt.url), "_blank", "noopener"); }}>
                    <Icon name="link" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="hint" id="dragHint">
          <Icon name="drag" />
          Arrastra para mover · doble clic en un bloque para editarlo · arrastra el punto azul para conectar · clic en una flecha para curvarla o borrarla
        </div>
      </div>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

setTimeout(() => { const h = document.getElementById("dragHint"); if (h) h.style.opacity = "0"; }, 9000);
