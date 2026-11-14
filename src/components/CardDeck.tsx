import { useEffect, useRef, useState, type PointerEventHandler, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DeckCard {
  id: string;
  /** Small label at the top of the card, e.g. "Fact 01" */
  tag: string;
  title: string;
  body: ReactNode;
}

/** Vertical breathing room above/below the hand so cards can lift and be dragged. */
const PAD = 40;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const inside = (r: DOMRect, x: number, y: number, margin = 0) =>
  x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin;

function useCardSize() {
  const [big, setBig] = useState(() => window.matchMedia("(min-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const onChange = () => setBig(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return big ? { w: 176, h: 240 } : { w: 128, h: 176 };
}

// ── A single card in the hand ──────────────────────────────────────────────

interface HandCardProps {
  card: DeckCard;
  size: { w: number; h: number };
  transform: string;
  /** Where the card starts before flying into its slot */
  enterTransform: string;
  transition: string;
  zIndex: number;
  dragging: boolean;
  /** Skip the fly-in (used when the card was dragged straight off the deck) */
  instant: boolean;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerLeave: PointerEventHandler<HTMLElement>;
}

function HandCard({
  card,
  size,
  transform,
  enterTransform,
  transition,
  zIndex,
  dragging,
  instant,
  ...handlers
}: HandCardProps) {
  // Start off to the side (where the deck is), then fly into the slot
  const [entered, setEntered] = useState(instant);
  useEffect(() => {
    if (instant) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  return (
    <article
      {...handlers}
      className={cn(
        "absolute left-0 top-0 flex touch-none select-none flex-col rounded-xl border bg-card p-3 text-left ring-1 ring-foreground/10 sm:p-4",
        dragging ? "cursor-grabbing shadow-2xl" : "cursor-grab shadow-md",
      )}
      style={{
        width: size.w,
        height: size.h,
        zIndex,
        opacity: entered ? 1 : 0,
        transform: entered ? transform : enterTransform,
        transition: entered ? `${transition}, opacity 250ms ease` : "none",
        willChange: "transform",
      }}
    >
      <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-widest text-primary">
        {card.tag}
      </p>
      <h4 className="mb-2 font-display text-xl font-bold uppercase leading-none sm:text-2xl">
        {card.title}
      </h4>
      <div className="text-xs font-light leading-5 text-muted-foreground sm:text-sm sm:leading-6">
        {card.body}
      </div>
    </article>
  );
}

// ── Deck + hand ────────────────────────────────────────────────────────────

export default function CardDeck({ cards }: { cards: DeckCard[] }) {
  const size = useCardSize();
  const rootRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(0);

  // Cards still in the deck (index 0 is the top) and cards in the hand
  const [deck, setDeck] = useState<DeckCard[]>(cards);
  const [hand, setHand] = useState<DeckCard[]>([]);
  const remaining = deck.length;

  // Drag state. x / y are the card's top-left corner, relative to the hand area.
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [overDeck, setOverDeck] = useState(false);
  const [tilt, setTilt] = useState(0);
  const grab = useRef({ x: 0, y: 0 });
  const lastX = useRef(0);
  const tiltTarget = useRef(0);
  const pending = useRef<{ x: number; y: number } | null>(null); // deck press that may become a drag
  const dragId = drag?.id ?? null;

  // Hover state (mouse only): which card is lifted and how it tilts toward the cursor
  const [hover, setHover] = useState<{ id: string; rx: number; ry: number } | null>(null);

  // ── Layout: cards fan out evenly, overlapping only if space runs out ──
  const n = hand.length;
  const step = n <= 1 ? 0 : Math.max(0, Math.min(size.w * 0.88, (width - size.w) / (n - 1)));
  const startX = (width - (size.w + step * (n - 1))) / 2;
  const slot = (i: number) => {
    const t = n <= 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1 … 1 across the hand
    return { x: startX + i * step, y: PAD + t * t * 8, rot: t * 5 };
  };

  // ── Deck actions ──
  const draw = () => {
    const card = deck[0];
    if (!card) return;
    setDeck((d) => d.slice(1));
    setHand((h) => [...h, card]);
  };

  const onDeckDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || remaining === 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pending.current = { x: e.clientX, y: e.clientY };
  };

  // Press on the deck and move a little: pull the top card off and start dragging it
  const onDeckMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const p = pending.current;
    if (!p || Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) return;
    const card = deck[0];
    const hr = handRef.current?.getBoundingClientRect();
    const dr = deckRef.current?.getBoundingClientRect();
    if (!card || !hr || !dr) return;

    pending.current = null;
    grab.current = { x: e.clientX - dr.left, y: e.clientY - dr.top };
    lastX.current = e.clientX;
    tiltTarget.current = 0;
    setHover(null);
    setOverDeck(true);
    setDeck((d) => d.slice(1));
    setHand((h) => [...h, card]);
    setDrag({
      id: card.id,
      x: e.clientX - hr.left - grab.current.x,
      y: e.clientY - hr.top - grab.current.y,
    });
  };

  // Press and release without moving: a plain tap draws a card
  const onDeckUp = () => {
    if (!pending.current) return;
    pending.current = null;
    draw();
  };

  // ── Hand card pointer handlers ──
  const onDown = (e: React.PointerEvent<HTMLElement>, id: string, index: number) => {
    if (e.button !== 0) return;
    const rect = handRef.current?.getBoundingClientRect();
    if (!rect) return;
    const s = slot(index);
    grab.current = { x: e.clientX - rect.left - s.x, y: e.clientY - rect.top - s.y };
    lastX.current = e.clientX;
    tiltTarget.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHover(null);
    setOverDeck(false);
    setDrag({ id, x: s.x, y: s.y });
  };

  // Hover: lift + tilt toward the cursor (mouse only)
  const onHover = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (drag || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setHover({ id, rx: -ny * 16, ry: nx * 16 });
  };

  // ── Window-level drag handlers (work for cards dragged from the deck or the hand) ──
  const onWindowMove = (e: PointerEvent) => {
    if (!drag) return;
    const hr = handRef.current?.getBoundingClientRect();
    const rr = rootRef.current?.getBoundingClientRect();
    const dr = deckRef.current?.getBoundingClientRect();
    if (!hr || !rr || !dr) return;

    // Keep the card inside the whole deck + hand area
    const x = clamp(e.clientX - hr.left - grab.current.x, rr.left - hr.left, rr.right - hr.left - size.w);
    const y = clamp(e.clientY - hr.top - grab.current.y, rr.top - hr.top, rr.bottom - hr.top - size.h);
    setDrag({ id: drag.id, x, y });

    // Tilt follows horizontal speed
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    tiltTarget.current = clamp(tiltTarget.current * 0.5 + dx * 1.2, -22, 22);

    // Is the pointer over the deck? (dropping here puts the card back)
    setOverDeck(inside(dr, e.clientX, e.clientY, 16));

    // Swap places when dragged past a neighbour (only while over the hand)
    if (step > 0 && inside(hr, e.clientX, e.clientY)) {
      const to = clamp(Math.round((x - startX) / step), 0, n - 1);
      const id = drag.id;
      setHand((h) => {
        const from = h.findIndex((c) => c.id === id);
        if (from === -1 || from === to) return h;
        const next = [...h];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    }
  };

  const onWindowUp = () => {
    if (drag && overDeck) {
      // Dropped on the deck: the card goes back on top
      const card = hand.find((c) => c.id === drag.id);
      if (card) {
        setHand((h) => h.filter((c) => c.id !== card.id));
        setDeck((d) => [card, ...d]);
      }
    }
    setOverDeck(false);
    tiltTarget.current = 0;
    setDrag(null);
  };

  // Always point the window listeners at the latest handlers
  const live = useRef({ move: onWindowMove, up: onWindowUp });
  useEffect(() => {
    live.current = { move: onWindowMove, up: onWindowUp };
  });

  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => live.current.move(e);
    const up = () => live.current.up();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragId]);

  // Track the width of the hand area
  useEffect(() => {
    const el = handRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // While dragging, ease the card's tilt toward its horizontal velocity
  useEffect(() => {
    if (!dragId) return;
    let raf = 0;
    let cur = 0;
    const tick = () => {
      tiltTarget.current *= 0.88;
      cur += (tiltTarget.current - cur) * 0.25;
      setTilt(cur);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragId]);

  return (
    <div
      ref={rootRef}
      className="flex w-full flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10"
    >
      {/* ── Deck ── */}
      <div className="flex shrink-0 flex-col items-center gap-3">
        <button
          ref={deckRef}
          aria-label={remaining > 0 ? `Draw a card, ${remaining} left` : "Deck empty"}
          aria-disabled={remaining === 0}
          // Keyboard (Enter / Space) draws; pointer taps are handled in onDeckUp
          onClick={(e) => {
            if (e.detail === 0) draw();
          }}
          onPointerDown={onDeckDown}
          onPointerMove={onDeckMove}
          onPointerUp={onDeckUp}
          onPointerCancel={() => {
            pending.current = null;
          }}
          className="relative touch-none select-none outline-none"
          style={{ width: size.w, height: size.h }}
        >
          {remaining > 0 ? (
            <>
              {/* Stack effect: one back-card per remaining card */}
              {Array.from({ length: remaining }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="absolute inset-0 rounded-xl border bg-primary/10 ring-1 ring-foreground/10"
                  style={{ transform: `translate(${i * 3}px, ${-i * 3}px)` }}
                />
              ))}
              {/* Top of the deck (card back) */}
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-xl border-2 bg-secondary font-display text-lg font-bold uppercase tracking-widest text-primary transition",
                  drag && overDeck ? "scale-105 border-primary" : "border-primary/40 hover:border-primary",
                )}
                style={{
                  transform: `translate(${(remaining - 1) * 3}px, ${-(remaining - 1) * 3}px)`,
                }}
              >
                Draw
              </span>
            </>
          ) : (
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-xl border border-dashed text-center font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground transition",
                drag && overDeck && "border-primary text-primary",
              )}
            >
              Deck empty
            </span>
          )}
        </button>
        
      </div>

      {/* ── Hand ── */}
      <div className="flex w-full flex-col items-center gap-2 sm:max-w-[580px] sm:flex-1">
        <div
          ref={handRef}
          className="relative w-full"
          style={{ height: size.h + PAD * 2 }}
        >
         <div
              className="absolute inset-x-0 flex items-center justify-center rounded-xl border border-dashed px-3 text-center font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground"
              style={{ top: PAD, height: size.h }}
            >
              Your draws land here
            </div>

                    {/* Render in a fixed order (the order of `cards`) and find each card's slot by
              its place in `hand`. If we rendered in hand order, React would physically
              move DOM nodes when you reorder, which cancels their CSS transition, so
              some cards would snap instead of sliding. */}
          {cards
            .filter((c) => hand.some((h) => h.id === c.id))
            .map((card) => {
            const i = hand.findIndex((h) => h.id === card.id);
            const s = slot(i);
            const isDragging = drag?.id === card.id;
            const isHover = !drag && hover?.id === card.id;

            let transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`;
            let transition = "transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)"; // springy settle
            let zIndex = i + 1;

            if (isDragging && drag) {
              transform = `translate(${drag.x}px, ${drag.y}px) rotate(${tilt}deg) scale(1.1)`;
              transition = "none"; // follow the pointer exactly
              zIndex = 50;
            } else if (isHover && hover) {
              transform =
                `translate(${s.x}px, ${s.y - 20}px) rotate(${s.rot * 0.5}deg) ` +
                `perspective(700px) rotateX(${hover.rx}deg) rotateY(${hover.ry}deg) scale(1.06)`;
              transition = "transform 120ms ease-out";
              zIndex = 40;
            }

            return (
              <HandCard
                key={card.id}
                card={card}
                size={size}
                transform={transform}
                enterTransform={`translate(${s.x - 220}px, ${s.y - 30}px) rotate(-14deg) scale(0.7)`}
                transition={transition}
                zIndex={zIndex}
                dragging={isDragging}
                instant={isDragging}
                onPointerDown={(e) => onDown(e, card.id, i)}
                onPointerMove={(e) => onHover(e, card.id)}
                onPointerLeave={() => setHover((h) => (h?.id === card.id ? null : h))}
              />
            );
          })}
        </div>

        <p className="h-4 font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
          {n > 0 ? "Drag to rearrange · drop on the deck to put back" : ""}
        </p>
      </div>
    </div>
  );
}
