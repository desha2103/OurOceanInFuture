import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useSimulator } from "../state/SimulatorContext";
import {
  CORAL_SPECIES,
  deadCoralSrc,
  getStageIndex,
  type CoralDriver,
} from "../data/coralSpecies";

import "./CoralImpact.css";

const GROUPS: {
  driver: CoralDriver;
  title: string;
  blurb: string;
}[] = [
  {
    driver: "acidification",
    title: "Ocean Acidification",
    blurb:
      "Increasing acidity can affect the skeletons of cold-water corals.",
  },
  {
    driver: "bottomTrawling",
    title: "Bottom Trawling",
    blurb:
      "Heavy fishing gear can scrape and break fragile coral branches.",
  },
  {
    driver: "marineLitter",
    title: "Marine Litter",
    blurb: "Lost nets and debris can entangle and smother coral colonies.",
  },
];

function Thumb({
  src,
  alt,
  icon,
  style,
}: {
  src: string;
  alt: string;
  icon: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span style={{ fontSize: "2rem" }}>{icon}</span>;
  return (
    <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />
  );
}

export default function CoralImpactList() {
  const { marineLitter, acidification, bottomTrawling } =
    useSimulator();

  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [hash]);

  const driverValues: Record<CoralDriver, number> = {
    acidification,
    bottomTrawling,
    marineLitter,
  };

  return (
    <main className="coral-page">
      <div className="water-overlay" />

      <section className="coral-list-hero">
        <Link to="/" className="coral-back-link">
          <span className="coral-back-arrow" aria-hidden="true">←</span><span>Back to simulator</span>
        </Link>

        <span className="coral-story-kicker">
          Explore coral changes
        </span>

        <h1>Cold-Water Coral: How Conditions Change</h1>

        <p>
          Explore {["zero","one","two","three","four","five","six"][CORAL_SPECIES.length] ?? CORAL_SPECIES.length}{" "}
          selected coral models and discover how environmental
          pressures can affect their condition. Select a coral to view
          its interactive 3D model and follow its changing stages.
        </p>
      </section>

      {GROUPS.filter((g) =>
        CORAL_SPECIES.some((c) => c.driver === g.driver),
      ).map((group, groupIndex) => {
        const species = CORAL_SPECIES.filter(
          (c) => c.driver === group.driver,
        );

        const value = driverValues[group.driver];

        return (
          <section key={group.driver} className="coral-group">
            <div className="coral-group-header">
              <h2>
                Part {groupIndex + 1}: {group.title}
              </h2>
              <span className="coral-group-value">
                Currently {value}%
              </span>
            </div>

            <p className="coral-group-blurb">{group.blurb}</p>

            <div className="coral-list-grid">
              {species.map((coral) => {
                const currentIndex = getStageIndex(
                  coral.stages,
                  value,
                );

                const currentStage = coral.stages[currentIndex];
                const isCollapsed =
                  currentIndex === coral.stages.length - 1;

                return (
                  <Link
                    to={`/coral-impact/${coral.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={coral.key}
                    id={coral.key}
                    className={`coral-list-card severity-${currentIndex}`}
                  >
                    <div className="coral-list-thumb">
                      <Thumb
                        src={isCollapsed ? deadCoralSrc : coral.image}
                        alt={coral.name}
                        icon={coral.icon}
                        style={{
                          filter: `saturate(${
                            1 - (currentIndex / 3) * 0.8
                          }) brightness(${
                            1 - (currentIndex / 3) * 0.3
                          })`,
                        }}
                      />
                    </div>

                    <div className="coral-list-info">
                      <div className="coral-list-name">
                        <span>{coral.icon}</span>
                        <h3>{coral.name}</h3>
                      </div>

                      <span className="coral-list-driver">
                        Chapter {currentIndex + 1} of {coral.stages.length}
                      </span>

                      <span
                        className={`coral-list-stage stage-${currentIndex}`}
                      >
                        {currentStage.label}
                      </span>
                    </div>

                    <span className="coral-list-arrow">↗</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
