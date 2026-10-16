import { Link, useParams } from "react-router-dom";

import { useSimulator } from "../state/SimulatorContext";
import { CORAL_SPECIES, getStageIndex } from "../data/coralSpecies";
import CoralScene3D from "../components/CoralScene3D";
import CoralGLTFStages from "../components/CoralGLTFStages";

import "./CoralImpact.css";

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
            ← Back to all corals
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
          ← Back to all corals
        </Link>

        <span className="coral-story-kicker">A coral's story</span>

        <div className="coral-detail-title">
          <span className="coral-detail-icon">{coral.icon}</span>

          <div>
            <h1>{coral.name}</h1>
            <p>
              <em>{coral.scientificName}</em> · Driven by{" "}
              {coral.driverLabel}
            </p>
          </div>
        </div>

        <p className="coral-story-intro">{coral.storyIntro}</p>
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
                    at {stage.max}% {coral.driverLabel.toLowerCase()}
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
            Real scanned {coral.scientificName} model, colored and lit
            to bring out its natural form. Chapter order reflects real
            coral biology.
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
