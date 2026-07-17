"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plane, MapPin, ArrowRight, Banknote } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Tag } from "@/components/core/Tag";
import { Img } from "@/components/mk/Img";

export function Hero() {
  const router = useRouter();
  const [city, setCity] = React.useState("");

  function search() {
    const q = city.trim();
    router.push(q ? `/search?city=${encodeURIComponent(q)}` : "/search");
  }

  return (
    <section className="mk-hero">
      <div className="mk-shell mk-hero__in">
        <div className="mk-hero__copy">
          <span className="mk-eyebrow mk-eyebrow--light">
            <Plane size={14} /> Student-first marketplace
          </span>
          <h1 className="mk-hero__title">
            Find the right
            <br />
            flight school — <em>fast.</em>
          </h1>
          <p className="mk-hero__lead">
            We index flight schools and normalize the details that matter — cost,
            timeline, fleet, and training type — so you can compare with
            confidence.
          </p>
          <div className="mk-hero__search">
            <div className="mk-hero__field">
              <MapPin size={18} style={{ color: "var(--text-faint)" }} />
              <input
                placeholder="City, state, or airport code (e.g. KAPA)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={search}
              rightIcon={<ArrowRight size={18} />}
            >
              Search
            </Button>
          </div>
          <div className="mk-hero__second">
            <button
              className="mk-finchip"
              onClick={() => router.push("/search?financingAvailable=true")}
            >
              <Banknote size={18} />
              <span>
                Browse schools with <strong>financing</strong>
              </span>
              <ArrowRight size={15} />
            </button>
            <div className="mk-hero__chips">
              <span className="mk-hero__chiplabel">Popular:</span>
              <Tag>PPL</Tag>
              <Tag>Instrument</Tag>
              <Tag>Part 141</Tag>
            </div>
          </div>
        </div>
        <div className="mk-hero__media">
          <Img
            dark
            ratio="4 / 5"
            radius={18}
            label="Hero image"
            src="/images/hero.png"
            alt="Student pilot and instructor walking toward a Cessna 172"
          />
        </div>
      </div>
    </section>
  );
}
