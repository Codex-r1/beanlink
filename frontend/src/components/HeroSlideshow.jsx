import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HERO_SLIDES = [
  { src: "annie-spratt-QYcSeY7vuZM-unsplash.jpg", alt: "Bean field in Kenya" },
  { src: "annie-spratt-GaLzDCnA5EI-unsplash.jpg", alt: "Farmer harvesting beans by hand" },
  { src: "Untitled design.jpg", alt: "Sorting dried beans" },
  { src: "kelly-sikkema-k1cpHnqBuMM-unsplash.jpg", alt: "Beans drying on tarps" },
];

export default function HeroSlideshow({ interval = 5000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const prefersReduced = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (paused || prefersReduced || HERO_SLIDES.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, interval);
    return () => clearInterval(id);
  }, [paused, prefersReduced, interval]);

  const prev = () => setIndex((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => setIndex((i) => (i + 1) % HERO_SLIDES.length);

  return (
    <div
      className="agri-card p-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full h-72 rounded overflow-hidden bg-[var(--surface-alt)]">
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={s.alt}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === index ? 1 : 0,
              transition: prefersReduced ? "none" : "opacity 700ms ease-in-out",
            }}
          />
        ))}

        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{ background: "rgba(20, 38, 25, 0.78)", color: "#fff" }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{ background: "rgba(20, 38, 25, 0.78)", color: "#fff" }}
        >
          <ChevronRight size={18} />
        </button>

        <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
          {HERO_SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className="w-2 h-2 rounded-sm transition-colors"
              style={{
                background: i === index ? "var(--primary)" : "rgba(255,255,255,0.65)",
                border: "1px solid rgba(20, 38, 25, 0.45)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}