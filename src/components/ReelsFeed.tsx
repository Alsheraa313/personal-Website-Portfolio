import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Film,
  Image as ImageIcon,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";

import { cn } from "@/lib/utils";

const withBase = (p: string) =>
  /^(https?:)?\/\//.test(p) ? p : import.meta.env.BASE_URL + p.replace(/^\//, "");

export interface ReelItem {
  type: "image" | "video";
  /** Path in /public, e.g. "/showcase/clip1.mp4". Leave "" for a placeholder. */
  src: string;
  /** Optional thumbnail shown before a video loads. */
  poster?: string;
  title: string;
  caption: string;
  tag?: string;
}


export default function ReelsFeed({
  items,
  visible = true,
}: {
  items: ReelItem[];
  visible?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true); // browsers only autoplay muted video
  const [paused, setPaused] = useState(false);

  // Track which slide is mostly in view
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.index));
            setPaused(false);
          }
        });
      },
      { root, threshold: [0.6] },
    );

    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  // Play only the active video; pause the rest
    // Play only the active video; pause the rest
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      v.muted = muted;
      if (i === active && !paused && visible) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [active, paused, muted, visible]);

  const goTo = (i: number) => {
    const root = scrollerRef.current;
    if (!root) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    root.scrollTo({ top: clamped * root.clientHeight, behavior: "smooth" });
  };

  const activeIsVideo = items[active]?.type === "video" && items[active]?.src;

  return (
<div className="relative mx-auto w-fit">      {/* Phone frame */}
<div className="relative aspect-[9/16] h-[min(540px,62svh)] shrink-0 overflow-hidden rounded-[2.5rem] border-[6px] border-foreground/15 bg-black shadow-2xl">        {/* Top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-5 pb-6 pt-4 text-white">
          <div className="flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-widest">
            <Film className="size-3.5" />
            Alsheraa's feed
          </div>
          {activeIsVideo && (
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="pointer-events-auto rounded-full bg-black/40 p-2 backdrop-blur transition hover:bg-black/60"
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
        </div>

        {/* Scroll-snap feed */}
        <div
          ref={scrollerRef}
          className="h-full snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, i) => (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              data-index={i}
              className="relative h-full w-full snap-start snap-always overflow-hidden"
              onClick={() => item.type === "video" && item.src && i === active && setPaused((p) => !p)}
            >
              {/* Media */}
              {item.src ? (
                item.type === "video" ? (
                  <video
                    ref={(el) => {
                      videoRefs.current[i] = el;
                    }}
                    src={withBase(item.src)}
                    poster={item.poster}
                    className="size-full object-cover"
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={withBase(item.src)} alt={item.title} className="size-full object-cover" loading="lazy" />
                )
              ) : (
                <Placeholder index={i} type={item.type} />
              )}

              {/* Pause indicator */}
              {i === active && paused && item.type === "video" && item.src && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-5 backdrop-blur">
                    <Play className="size-8 fill-white text-white" />
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-6 pt-16 text-white">
                {item.tag && (
                  <span className="mb-2 inline-block rounded-sm bg-white/15 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-widest backdrop-blur">
                    {item.tag}
                  </span>
                )}
                <div className="font-display text-2xl font-bold uppercase leading-tight">{item.title}</div>
                <p className="mt-1 text-sm font-light leading-snug text-white/80">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="absolute right-2.5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to item ${i + 1}`}
              className={cn(
                "w-1 rounded-full bg-white/40 transition-all",
                i === active ? "h-5 bg-white" : "h-1.5 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>

      {/* Desktop arrows */}
<div className="absolute left-full top-1/2 ml-6 hidden -translate-y-1/2 flex-col gap-3 md:flex">        <button
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous"
          className="rounded-full border bg-secondary/60 p-3 text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-30"
        >
          <ChevronUp className="size-5" />
        </button>
        <button
          onClick={() => goTo(active + 1)}
          disabled={active === items.length - 1}
          aria-label="Next"
          className="rounded-full border bg-secondary/60 p-3 text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-30"
        >
          <ChevronDown className="size-5" />
        </button>
      </div>
    </div>
  );
}

function Placeholder({ index, type }: { index: number; type: "image" | "video" }) {
  const gradients = [
    "from-[#4D7C8A] to-[#7FC8B2]",
    "from-[#24424A] to-[#4D7C8A]",
    "from-[#7FC8B2] to-[#A7D8F2]",
    "from-[#A7D8F2] to-[#4D7C8A]",
  ];
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br text-white/80",
        gradients[index % gradients.length],
      )}
    >
      {type === "video" ? <Film className="size-10" /> : <ImageIcon className="size-10" />}
      <span className="font-mono text-[0.65rem] uppercase tracking-widest">
        {type} placeholder
      </span>
    </div>
  );
}