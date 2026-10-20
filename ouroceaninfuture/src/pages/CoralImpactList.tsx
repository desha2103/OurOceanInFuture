import { useEffect } from "react";
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
      "Fishing gear can break and damage fragile coral colonies.",
  },
  {
    driver: "marineLitter",
    title: "Marine Litter",
    blurb:
      "Lost fishing gear and marine litter can entangle and damage corals.",
  },
];

export default function CoralImpactList() {
  const { marineLitter, acidification, bottomTrawling } =
    useSimulator();

  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const el = document.getElementById(hash.slice(1));

    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [hash]);

  // Display only two entries from the partner's coral data.
  // This does not affect the main ocean simulator.
  const showcasedCorals = CORAL_SPECIES.slice(0, 2);

  // Display only environmental groups that contain
  // one of the two selected coral entries.
  const visibleGroups = GROUPS.filter((group) =>
    showcasedCorals.some(
      (coral) => coral.driver === group.driver
    )
  );

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
          ← Back to simulator
        </Link>

        <span className="coral-story-kicker">
          Explore Coral Changes
        </span>

        <h1>
          Cold-Water Coral: How Conditions Change
        </h1>

        <p>
          Explore two selected coral models and discover
          how environmental pressures can affect their
          condition. Select a coral to view its interactive
          3D model and follow its changing stages.
        </p>
      </section>

      {visibleGroups.map((group, groupIndex) => {
        const species = showcasedCorals.filter(
          (coral) => coral.driver === group.driver
        );

        const value = driverValues[group.driver];

        return (
          <section
            key={group.driver}
            className="coral-group"
          >
            <div className="coral-group-header">
              <h2>
                Part {groupIndex + 1}: {group.title}
              </h2>

              <span className="coral-group-value">
                Currently {value}%
              </span>
            </div>

            <p className="coral-group-blurb">
              {group.blurb}
            </p>

            <div className="coral-list-grid">
              {species.map((coral) => {
                const currentIndex = getStageIndex(
                  coral.stages,
                  value
                );

                const currentStage =
                  coral.stages[currentIndex];

                const isCollapsed =
                  currentIndex ===
                  coral.stages.length - 1;

                return (
                  <Link
                    key={coral.key}
                    id={coral.key}
                    to={`/coral-impact/${coral.key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`coral-list-card severity-${currentIndex}`}
                  >
                    <div className="coral-list-thumb">
                      <img
                        src={
                          isCollapsed
                            ? deadCoralSrc
                            : coral.image
                        }
                        alt={coral.name}
                        style={{
                          filter: `saturate(${
                            1 -
                            (currentIndex / 3) * 0.8
                          }) brightness(${
                            1 -
                            (currentIndex / 3) * 0.3
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
                        Chapter {currentIndex + 1} of{" "}
                        {coral.stages.length}
                      </span>

                      <span
                        className={`coral-list-stage stage-${currentIndex}`}
                      >
                        {currentStage.label}
                      </span>
                    </div>

                    <span className="coral-list-arrow">
                      ↗
                    </span>
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
