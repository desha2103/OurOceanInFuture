import { Link, useParams } from "react-router-dom";

import { useSimulator } from "../state/SimulatorContext";
import { CORAL_SPECIES, getStageIndex } from "../data/coralSpecies";
import CoralScene3D from "../components/CoralScene3D";
import CoralGLTFStages from "../components/CoralGLTFStages";

import "./CoralImpact.css";


function CoralSymbol() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 54V12M32 28 20 18M20 18 17 9M20 18 10 18M32 39 45 28M45 28 45 14M45 28 55 23M32 47 22 37M22 37 13 35M22 37 22 29" />
      <circle cx="32" cy="10" r="3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="56" cy="22" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BackArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7M5 12h14" /></svg>;
}

export default function CoralImpactDetail() {
  const { coralKey } = useParams();
  const { marineLitter, acidification, bottomTrawling } =
    useSimulator();

  const coral = CORAL_SPECIES.find((c) => c.key === coralKey);

  if (!coral) {
    return (
      <main className="coral-page">
        <section className="coral-detail-hero">
          <Link to="/coral-impact" className="coral-back-link">
            <span className="coral-back-arrow"><BackArrowIcon /></span><span>All coral species</span>
          </Link>

          <h1>Coral not found</h1>
        </section>
      </main>
    );
  }

  const driverValue =
    coral.driver === "acidification"
      ? acidification
      : coral.driver === "bottomTrawling"
        ? bottomTrawling
        : marineLitter;

  const stageIndex = getStageIndex(coral.stages, driverValue);
  const currentStage = coral.stages[stageIndex];

  return (
    <main className="coral-page">
      <div className="water-overlay" />

      <section className="coral-detail-hero">
        <Link to="/coral-impact" className="coral-back-link">
          <span className="coral-back-arrow"><BackArrowIcon /></span><span>All coral species</span>
        </Link>

        <span className="coral-story-kicker">A coral's story</span>

        <div className="coral-detail-title">
          <span className="coral-detail-icon"><CoralSymbol /></span>

          <div>
            <h1>{coral.name}</h1>
            <p>
              <em>{coral.scientificName}</em> · Driven by{" "}
              {coral.driverLabel}
            </p>
          </div>
        </div>

        <p className="coral-story-intro">{coral.storyIntro}</p>
        <div className="coral-story-tags"><span>Deep-sea ecosystem</span><span>Interactive 3D specimen</span><span>{coral.driverLabel} scenario</span></div>
      </section>

      <section className="coral-detail-body">
        <div className="coral-detail-stage-column">
          <div
            className={`coral-detail-stage-badge stage-${stageIndex}`}
          >
            Chapter {stageIndex + 1} of {coral.stages.length} ·{" "}
            {currentStage.label}
          </div>

          <p className="coral-detail-cause">{currentStage.cause}</p>

          <p className="coral-scenario-explainer">The four chapters follow your existing simulator. The numbers show scenario levels, not measured pollution at a real coral site.</p>
          <ol className="coral-timeline">
            {coral.stages.map((stage, index) => (
              <li
                key={stage.label}
                className={`coral-timeline-item ${
                  index <= stageIndex ? "reached" : ""
                } ${index === stageIndex ? "current" : ""}`}
              >
                <span className="coral-timeline-dot" />

                <div>
                  <strong>
                    Chapter {index + 1}: {stage.label}
                  </strong>
                  <span className="coral-timeline-threshold">
                    Scenario threshold · {stage.max}/100
                  </span>
                  <p>{stage.cause}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="coral-detail-canvas-column">
          {coral.stageModels && coral.stageModelDescriptions ? (
            <CoralGLTFStages
              stageModels={coral.stageModels}
              descriptions={coral.stageModelDescriptions}
              driverLabel={coral.driverLabel}
              driverValue={driverValue}
              stageIndex={stageIndex}
            />
          ) : (
            <CoralScene3D
              modelUrl={coral.model}
              visualType={coral.visualType}
              stageIndex={stageIndex}
              palette={coral.palette}
              driverLabel={coral.driverLabel}
              currentStageLabel={currentStage.label}
              currentStageCause={currentStage.cause}
            />
          )}

          <p className="coral-detail-canvas-caption">
            <span aria-hidden="true">✦</span> Based on a scanned {coral.scientificName} specimen. Colours and damage stages are conceptual illustrations; the underlying geometry and stage selection remain unchanged.
          </p>
        </div>
      </section>

      <section className="coral-before-after">
        <h2>How Far the Story Has Gone</h2>

        <div className="coral-before-after-bar">
          <div className="coral-bar-track">
            <div
              className="coral-bar-fill"
              style={{ width: `${driverValue}%` }}
            />

            <div
              className="coral-bar-marker baseline"
              style={{ left: `${coral.baseline}%` }}
              title="2024 baseline"
            />

            <div
              className="coral-bar-marker current"
              style={{ left: `${driverValue}%` }}
              title="Current"
            />
          </div>

          <div className="coral-bar-labels">
            <span>
              Where the story began (2024):{" "}
              <strong>{coral.baseline}%</strong>
            </span>

            <span>
              Where it stands now: <strong>{driverValue}%</strong>{" "}
              {coral.driverLabel}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
