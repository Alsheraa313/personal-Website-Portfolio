import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ShowcaseSlide {
  id: string;
  label: string;
  /** `visible` is true only while this slide is the one on screen. */
  render: (visible: boolean) => ReactNode;
}

export default function ShowcaseCarousel({ slides }: { slides: ShowcaseSlide[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Track which slide is mostly in view
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.index));
          }
        });
      },
      { root, threshold: [0.6] },
    );

    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [slides.length]);

  const goTo = (i: number) => {
    const root = scrollerRef.current;
    if (!root) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, i));
    root.scrollTo({ left: clamped * root.clientWidth, behavior: "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") goTo(active + 1);
    if (e.key === "ArrowLeft") goTo(active - 1);
  };

  return (
    <div>
      {/* Horizontal swipe track */}
      <div
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-roledescription="carousel"
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            data-index={i}
            aria-label={slide.label}
            className="w-full shrink-0 snap-center snap-always px-1"
          >
            {slide.render(i === active)}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          onClick={() => goTo(active - 1)}
          disabled={active === 0}
          aria-label="Previous showcase"
          className="rounded-full border bg-secondary/60 p-2.5 transition hover:border-primary/40 hover:text-primary disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to ${s.label}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "w-8 bg-primary" : "w-1.5 bg-primary/30 hover:bg-primary/60",
              )}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(active + 1)}
          disabled={active === slides.length - 1}
          aria-label="Next showcase"
          className="rounded-full border bg-secondary/60 p-2.5 transition hover:border-primary/40 hover:text-primary disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 text-center font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">
        {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")} ·{" "}
        {slides[active]?.label}
      </div>
    </div>
  );
}