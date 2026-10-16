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
      "Dissolves calcium carbonate skeletons — hits boulder & plate corals hardest.",
  },
  {
    driver: "bottomTrawling",
    title: "Bottom Trawling",
    blurb:
      "Physically damages fragile branches — hits branching corals hardest.",
  },
  {
    driver: "marineLitter",
    title: "Marine Litter",
    blurb: "Entangles and smothers coral surfaces of every shape.",
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
          ← Back to simulator
        </Link>

        <span className="coral-story-kicker">A story in three chapters</span>

        <h1>16 Coral Colonies, One Reef's Story</h1>

        <p>
          Somewhere on the seafloor, sixteen real coral colonies are
          living through the same story — just told by three
          different pressures. Pick a colony to open its story in a
          new tab and follow it, chapter by chapter, from healthy
          reef to collapse.
        </p>
      </section>

      {GROUPS.map((group, groupIndex) => {
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
                      <img
                        src={isCollapsed ? deadCoralSrc : coral.image}
                        alt={coral.name}
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
