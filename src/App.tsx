import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Mail, Menu, ArrowDown, Sun, Moon } from "lucide-react";
import ReelsFeed, { type ReelItem } from "@/components/ReelsFeed.tsx";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import ShowcaseCarousel, { type ShowcaseSlide } from "@/components/ShowcaseCarousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import SceneErrorBoundary from "@/components/SceneErrorBoundary.tsx";

// ── Data ───────────────────────────────────────────────────────────────────
const HeroScene = lazy(() => import("@/components/HeroScene"));

const NAV = ["about", "skills", "showcase", "experience", "projects", "education", "contact"];

const TECH_STATS = [
  { value: "9", label: "Languages", sub: "Python · TS · Java · C++ · more" },
  { value: "10", label: "Frameworks", sub: "React · NestJS · FastAPI · Flask · more" },
  { value: "9", label: "AI / ML libraries", sub: "DistilBERT · PyTorch · LangChain · more" },
  { value: "8", label: "Databases & Cloud", sub: "PostgreSQL · Redis · AWS · Azure · more" },
];

const SKILLS = [
  { title: "Languages", tags: ["Python", "TypeScript", "JavaScript", "Java", "C++", "C#", "SQL", "PHP", "HTML/CSS"] },
  { title: "Frameworks & Libraries", tags: ["React", "NestJS", "FastAPI", "Flask", "Angular", "Tailwind CSS", "Prisma", "LangChain", "TanStack", "Zustand"] },
  { title: "AI / ML", tags: ["Azure OpenAI", "HuggingFace", "SentenceTransformer", "TensorFlow", "PyTorch", "XGBoost", "spaCy", "NLTK", "DistilBERT"] },
  { title: "Databases & Cloud", tags: ["PostgreSQL", "Redis", "Firebase", "Oracle", "AWS EC2", "Databricks", "Azure DevOps", "S3"] },
  { title: "Dev Tools", tags: ["Git", "Docker", "GraphQL", "REST APIs", "JWT Auth", "Jupyter", "NGINX", "Power BI"] },
];

const REELS: ReelItem[] = [
  {
    type: "image",
    src: "/showcase/books.jpg",
    title: "My Library",
    caption: "I love to read on my free time.",
    tag: "Books",
  },
  {
    type: "video",
    src: "/showcase/piano.mp4",
    poster: "/showcase/piano-poster.jpg",
    title: "...",
    caption: "...",
    tag: "...",
  },
  {
    type: "image",
    src: "/showcase/drawing.jpg",
    title: "Digital art",
    caption: "My favorite hobby has to be drawing!",
    tag: "Art",
  },

];

const SHOWCASE: ShowcaseSlide[] = [
  {
    id: "reels",
    label: "Reels",
    render: (visible) => (
      <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-12">
        {/* Left: intro (desktop only; shown under the phone on mobile) */}
        <div className="hidden space-y-4 md:block">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            01 / Reels
          </p>
          <h3 className="font-display text-4xl font-bold uppercase leading-none lg:text-5xl">
            What's on my feed.
          </h3>
          <p className="max-w-xs text-base font-light leading-7 text-muted-foreground">
            A quick scroll to get to know me!
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Scroll · swipe · tap to pause
          </p>
        </div>

        {/* Center: phone */}
        <ReelsFeed items={REELS} visible={visible} />

        {/* Mobile: text under the phone */}
        <div className="space-y-2 text-center md:hidden">
          <p className="text-base font-light text-muted-foreground">
            A quick scroll to get to know me!
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Scroll · swipe · tap to pause
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "next",
    label: "Coming soon",
    render: () => (
      <div className="flex h-[min(540px,62svh)] items-center justify-center rounded-xl border border-dashed bg-secondary/30 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Coming soon!
      </div>
    ),
  },
];

const PROJECTS = [
  {
    num: "01",
    name: "Wavely",
    desc: "A full-stack social media application with secure authentication, hashed credentials, and backend validation via NestJS. Optimized React 18 rendering reduced page load time by ~35% (~300ms).",
    stack: ["NestJS", "React 18", "PostgreSQL", "Redis", "Prisma", "Zustand", "S3"],
  },
  {
    num: "02",
    name: "Locket.AI",
    desc: "An AI-powered semantic search system combining SentenceTransformer embeddings, TF-IDF, and fuzzy matching across 40+ REST endpoints. Offline-first architecture with Docker containerization and zero external dependencies.",
    stack: ["FastAPI", "SentenceTransformer", "PostgreSQL", "Docker", "JWT Auth", "React"],
  },
  {
    num: "03",
    name: "AI Bias Detection System",
    desc: "Full-stack bias detection platform identifying 6 categories of textual bias via transformer-based NLP. Severity classification pipeline combines DistilBERT embeddings, curated lexicons, and regex pattern matching to detect subtle coded language and implicit stereotypes.",
    stack: ["FastAPI", "DistilBERT", "spaCy", "NLTK", "React", "Tailwind CSS"],
  },
  {
    num: "04",
    name: "DriveShare",
    desc: "A peer-to-peer car rental platform delivering core features — listing, search, booking, payments, and messaging — across a 12-page SPA. Secured with JWT + bcrypt authentication with role-based access between car owners and renters.",
    stack: ["React 18", "NestJS", "PostgreSQL", "shadcn/ui", "Zustand", "JWT"],
  },
];

const COURSES = [
  "Computer Science I & II",
  "Java Programming",
  "Discrete Structures I & II",
  "Computer Org & Assembly",
  "Software Engineering I",
  "Software Engineering Tools",
  "Software Architecture & Design Patterns",
  "Computer Networks & Distributed Processing",
  "Operating Systems",
  "Intro to Software Security",
  "Wireless & Mobile Computing Security",
  "Practical Computer Security",
  "Calculus I & II",
  "Linear Algebra",
  "Engineering Probability & Statistics",
  "Technical Writing for Engineers",
];

const EXPERIENCE_BULLETS: ReactNode[] = [
  <>Built a <strong>distribution management system</strong> using Flask and React, optimizing logistics and tracking for 5,000+ tons of food.</>,
  <>Implemented <strong>secure authentication workflows</strong> leveraging Firebase and OAuth, improving platform security and user accessibility.</>,
  <>Deployed scalable web platforms using <strong>AWS EC2 and NGINX</strong>, expanding digital outreach to 120,000+ families.</>,
  <>Refactored legacy applications into <strong>microservices</strong>, improving maintainability, scalability, and deployment efficiency.</>,
];

// ── Hooks ──────────────────────────────────────────────────────────────────

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Small pieces ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  title,
  center,
}: {
  label: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={cn("mb-10 md:mb-14", center && "text-center")}>
      <div
        className={cn(
          "mb-4 flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary",
          center && "justify-center",
        )}
      >
        {label}
        <span className="h-px w-14 bg-border" />
      </div>
      <h2 className="reveal font-display text-5xl font-extrabold uppercase tracking-tight sm:text-6xl md:text-7xl">
        {title}
      </h2>
    </div>
  );
}

function BrandIcon({ path }: { path: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-4">
      {path}
    </svg>
  );
}
// ── Theme ──────────────────────────────────────────────────────────────────

function useTheme() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch { }
  };

  return { dark, toggle };
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

// ── Scroll progress ────────────────────────────────────────────────────────

function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? Math.min(el.scrollTop / max, 1) : 0;
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-x-0 -bottom-px h-0.5">
      <div
        ref={barRef}
        className="h-full origin-left bg-gradient-to-r from-primary to-[#7FC8B2]"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <a href="#hero" className="font-display text-2xl font-extrabold tracking-tight text-primary">
          Mohammed Alsheraa
        </a>

        <div className="flex items-center gap-2 md:gap-6">
          {/* Desktop links */}
          <ul className="hidden items-center gap-8 md:flex">
            {NAV.map((s) => (
              <li key={s}>
                <a
                  href={`#${s}`}
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>

          <ThemeToggle />

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <ul className="mt-12 flex flex-col gap-1 px-4">
                {NAV.map((s) => (
                  <li key={s}>
                    <a
                      href={`#${s}`}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-3 font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      <ScrollProgress />
    </header>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Portfolio() {
  useReveal();

  const section = "mx-auto max-w-6xl scroll-mt-16 px-5 py-20 md:px-8 md:py-28";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      {/* Background blobs */}
      <div className="pointer-events-none fixed -right-48 -top-48 -z-0 size-[600px] rounded-full bg-[#7FC8B2]/15 blur-[130px]" />
      <div className="pointer-events-none fixed -left-40 bottom-[20%] -z-0 size-[500px] rounded-full bg-[#A7D8F2]/20 blur-[130px]" />

      <Nav />

      <main className="relative z-10">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <SceneErrorBoundary>
            <Suspense fallback={null}>
              <HeroScene />
            </Suspense>
          </SceneErrorBoundary>

          <section id="hero" className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-5 pb-16 pt-28 md:px-8">
            <div className="hero-in mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-primary [animation-delay:100ms]">
              <span className="h-px w-8 bg-primary sm:w-10" />
              Software Engineer &amp; Builder
            </div>

            <h1 className="hero-in mb-6 font-display text-[clamp(4.5rem,24vw,14rem)] font-extrabold uppercase leading-[0.86] tracking-tight [animation-delay:250ms]">
              <span className="block">Mohammed</span>
              <span className="block text-primary/70">Alsheraa</span>
            </h1>

            <p className="hero-in mb-10 max-w-lg text-base font-light leading-relaxed text-muted-foreground sm:text-lg [animation-delay:400ms]">
              CS student at University of Michigan Dearborn crafting full-stack platforms,
              AI-powered systems, and scalable cloud architectures.
            </p>

            <div className="hero-in flex flex-col gap-3 sm:flex-row [animation-delay:550ms]">
              <a
                href="#projects"
                className={cn(buttonVariants({ size: "lg" }), "font-display text-lg font-bold uppercase tracking-wide")}
              >
                View my work <ArrowDown className="size-4" />
              </a>
              <a
                href="mailto:Alsheraam@gmail.com"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "font-display text-lg font-semibold uppercase tracking-wide")}
              >
                Get in touch
              </a>
            </div>
          </section>
        </div>

        {/* About */}
        <section id="about" className={section}>
          <SectionHeader label="01 — About" title="A builder at heart." />
          <div className="reveal grid gap-10 md:grid-cols-2 md:gap-14">
            <div className="space-y-5 text-base font-light leading-8 text-muted-foreground sm:text-[1.05rem] [&_strong]:font-medium [&_strong]:text-foreground">
              <p>
                I'm <strong>Mohammed Alsheraa</strong>, a Computer Science student at the University
                of Michigan Dearborn, expected to graduate in May 2027. I'm passionate about building
                software that has an impact.
              </p>
              <p>
                From full-stack social media apps to <strong>AI-powered semantic search systems</strong>{" "}
                and nonprofit logistics platforms, I love being involved with every aspect of a
                project: backend APIs, frontend UIs, cloud infrastructure, and machine learning
                pipelines.
              </p>
              <p>
                Currently interning at Eternal Light, where my work has impacted{" "}
                <strong>120,000+ families</strong> through scalable web platforms.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-primary">
                <span className="h-px w-6 bg-primary" />
                Technologies in my stack
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TECH_STATS.map((s) => (
                  <Card
                    key={s.label}
                    className="gap-0 bg-secondary/60 py-0 shadow-none ring-0 border transition-all hover:-translate-y-1 hover:border-primary/40"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="font-display text-6xl font-extrabold leading-none text-primary">
                        {s.value}
                      </div>
                      <div className="mt-1 font-display text-lg font-bold uppercase tracking-wide">{s.label}</div>
                      <div className="mt-1.5 font-mono text-[0.65rem] leading-snug text-muted-foreground">
                        {s.sub}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Skills */}
        <div id="skills" className="scroll-mt-16 border-y bg-secondary/40">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
            <SectionHeader label="02 — Technical Skills" title="What I work with." />
            <div className="reveal flex flex-wrap justify-center gap-5">
              {SKILLS.map((g) => (
                <Card
                  key={g.title}
                  className="w-full gap-4 bg-background py-6 shadow-none ring-0 border transition-all hover:-translate-y-1 hover:border-primary/40 sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
                >
                  <CardHeader className="px-6">
                    <CardTitle className="flex items-center gap-2 font-mono text-[0.7rem] font-normal uppercase tracking-[0.15em] text-primary">
                      <span className="size-1.5 rounded-full bg-primary" />
                      {g.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 px-6">
                    {g.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="rounded-sm font-mono text-[0.72rem] font-normal"
                      >
                        {t}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Experience */}
        <section id="experience" className={section}>
          <SectionHeader label="03 — Experience" title="Where I've built." />
          <div className="reveal grid gap-4 md:grid-cols-[1fr_3fr] md:gap-10">
            <div>
              <div className="font-display text-xl font-bold uppercase tracking-wide">Eternal Light</div>
              <div className="mt-1 font-mono text-[0.7rem] tracking-wider text-muted-foreground">
                Aug 2025 – Present
              </div>
              <div className="mt-1 font-mono text-[0.7rem] text-muted-foreground">Dearborn, MI</div>
            </div>
            <div>
              <Badge className="mb-4 rounded-sm font-mono text-[0.65rem] font-normal uppercase tracking-widest">
                Internship
              </Badge>
              <h3 className="mb-5 font-display text-3xl font-bold uppercase sm:text-4xl">
                Software Engineering Intern
              </h3>
              <ul className="space-y-3">
                {EXPERIENCE_BULLETS.map((b, i) => (
                  <li
                    key={i}
                    className="relative pl-5 text-[0.95rem] font-light leading-7 text-muted-foreground before:absolute before:left-0 before:text-primary before:content-['→'] [&_strong]:font-medium [&_strong]:text-foreground"
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Separator className="mt-12" />
        </section>

        {/* Technical Showcase */}
        <section id="showcase" className={section}>
          <SectionHeader label="04 — Showcase" title="A showcase." />
          <div className="reveal">
            <ShowcaseCarousel slides={SHOWCASE} />
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className={section}>
          <SectionHeader label="04 — Projects" title="Things I've built." />
          <div className="reveal grid gap-6 md:grid-cols-2">
            {PROJECTS.map((p) => (
              <Card
                key={p.name}
                className="group relative gap-0 overflow-hidden bg-secondary/50 py-0 shadow-none ring-0 border transition-all hover:-translate-y-1.5 hover:border-primary/40"
              >
                <span className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-[#7FC8B2] transition-transform duration-300 group-hover:scale-x-100" />
                <CardHeader className="gap-2 px-6 pb-3 pt-7 sm:px-8">
                  <div className="font-mono text-[0.65rem] tracking-[0.15em] text-muted-foreground">
                    PROJECT / {p.num}
                  </div>
                  <CardTitle className="font-display text-3xl font-bold uppercase">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6 px-6 pb-7 sm:px-8">
                  <CardDescription className="flex-1 text-sm font-light leading-7">
                    {p.desc}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5">
                    {p.stack.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="bg-background/60 font-mono text-[0.65rem] font-normal text-primary"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Education */}
        <section id="education" className={section}>
          <SectionHeader label="05 — Education" title="Academic background." />
          <Card className="reveal bg-secondary/50 py-0 shadow-none ring-0 border">
            <CardContent className="grid gap-5 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
              <div>
                <div className="font-display text-3xl font-extrabold uppercase sm:text-4xl">
                  University of Michigan Dearborn
                </div>
                <div className="mb-5 mt-2 text-[0.95rem] font-light text-muted-foreground">
                  Bachelor of Science in Computer Science
                </div>
                <div className="flex flex-wrap gap-2">
                  {COURSES.map((c) => (
                    <Badge
                      key={c}
                      variant="secondary"
                      className="h-auto rounded-sm bg-background/70 py-1 font-mono text-[0.68rem] font-normal text-muted-foreground"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="font-mono text-xs tracking-widest text-primary md:text-right">
                May 2027
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section id="contact" className={cn(section, "pb-28 text-center")}>
          <SectionHeader label="07 — Contact" title="Let's connect!" center />
          <p className="reveal mx-auto mb-10 max-w-md text-base font-light leading-relaxed text-muted-foreground">
            I'm open to internships, work opportunities, and interesting projects. Feel free to
            reach out!
          </p>
          <div className="reveal flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <a
              href="mailto:Alsheraam@gmail.com"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-secondary/50 font-mono text-xs tracking-wider")}
            >
              <Mail className="size-4" />
              Alsheraam@gmail.com
            </a>
            <a
              href="https://www.linkedin.com/in/mohammed-alsheraa-a414b237a/"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-secondary/50 font-mono text-xs tracking-wider")}
            >
              <BrandIcon
                path={
                  <>
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" />
                    <circle cx="4" cy="4" r="2" />
                  </>
                }
              />
              LinkedIn
            </a>
            <a
              href="https://github.com/Alsheraa313"
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-secondary/50 font-mono text-xs tracking-wider")}
            >
              <BrandIcon
                path={
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                }
              />
              GitHub
            </a>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t px-5 py-7 text-center font-mono text-[0.7rem] text-muted-foreground md:px-8">
        © 2026 Mohammed Alsheraa
      </footer>
    </div>
  );
}