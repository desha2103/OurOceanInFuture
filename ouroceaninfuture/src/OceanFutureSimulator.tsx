import { useMemo, useState } from "react";
import "./OceanFutureSimulator.css";

type Scenario = {
  status: string;
  coral: string;
  fish: string;
  plastic: string;
  outlook: string;
  moodClass: "healthy" | "warning" | "critical";
};

export default function OceanFutureSimulator() {
  const [pollution, setPollution] = useState<number>(15);
  const [temperature, setTemperature] = useState<number>(10);
  const [fishing, setFishing] = useState<number>(12);

  const health = useMemo(() => {
    return Math.max(
      0,
      Math.round(100 - pollution * 0.45 - temperature * 0.35 - fishing * 0.25)
    );
  }, [pollution, temperature, fishing]);

  const riskLevels = [
    {
      min: 85,
      max: 100,
      label: "Healthy Ocean",
      note: "Ocean systems are functioning well.",
    },
    {
      min: 70,
      max: 84,
      label: "Mostly Stable",
      note: "Stable, but early warning signs exist.",
    },
    {
      min: 55,
      max: 69,
      label: "Warning Signs Increasing",
      note: "Visible stress from pollution, warming, or fishing.",
    },
    {
      min: 35,
      max: 54,
      label: "Human activities are putting the ocean at risk.",
      note: "Marine ecosystems are under strong pressure.",
    },
    {
      min: 0,
      max: 34,
      label: "Critical Ecosystem State",
      note: "Severe damage and collapse risk.",
    },
  ];

  const currentRisk = riskLevels.find(
    (level) => health >= level.min && health <= level.max
  );

  const scenario: Scenario = useMemo(() => {
     if (health >= 85) {
    return {
      status: "Healthy",
      coral: "Colorful and stable",
      fish: "Thriving population",
      plastic: "Minimal impact",
      outlook: "The ocean is healthy and vibrant.",
      moodClass: "healthy",
    };
  }

  if (health >= 70) {
    return {
      status: "Mostly Stable",
      coral: "Mostly healthy",
      fish: "Stable population",
      plastic: "Visible pollution",
      outlook: "Life is still active, but protection is needed.",
      moodClass: "warning",
    };
  }

  if (health >= 40) {
    return {
      status: "Warning",
      coral: "Bleaching increasing",
      fish: "Population decreasing",
      plastic: "Significant impact",
      outlook: "Many marine species are struggling to survive.",
      moodClass: "warning-low",
    };
  }

  return {
    status: "Critical",
    coral: "Dead coral zones spreading",
    fish: "Collapse risk",
    plastic: "Severe pollution",
    outlook: "The ecosystem is close to collapse.",
    moodClass: "critical",
  };

}, [health]);

  function resetScenario() {
  setPollution(15);
  setTemperature(10);
  setFishing(12);
}

  return (
    <main className={`ocean-page ${scenario.moodClass}`}>
      <div className="water-overlay" />
      <div className="bubble-layer" />

      <section className="hero">
        <h1>Ocean in Future</h1>
        <p>An Ocean Future Simulator</p>
        <div className="wave-line">〰</div>
      </section>

      <section className="control-panel glass">
        <OceanSlider
          icon="♻"
          title="Plastic Pollution"
          description="How much plastic enters the ocean"
          value={pollution}
          onChange={setPollution}
        />

        <OceanSlider
          icon="🌡"
          title="Temperature Rise"
          description="Increase in ocean temperature"
          value={temperature}
          onChange={setTemperature}
        />

        <OceanSlider
          icon="🐟"
          title="Overfishing"
          description="Level of overfishing in the ocean"
          value={fishing}
          onChange={setFishing}
        />
      </section>

      <section className="result-panel glass">
  <div className="result-top">
    <div className="health-circle">
      <div
        className="health-ring"
        style={{
          background: `conic-gradient(
            #27f5ff ${health * 3.6}deg,
            rgba(255,255,255,0.15) ${health * 3.6}deg
          )`,
        }}
      >
        <div className="health-inner">
          <span className="health-title">Overall Ocean Health Index</span>
          <strong>{health}%</strong>

          <em>
            {health >= 85
              ? "Healthy Ocean"
              : health >= 70
              ? "Mostly Stable"
              : health >= 55
              ? "Warning Signs Increasing"
              : health >= 35
              ? "Human activities are putting the ocean at risk."
              : "Critical Ecosystem State"}
          </em>
        </div>
      </div>
    </div>

    <div className="mini-ocean-animation">
      <div className="sun-ray"></div>
      <div className="animated-fish fish-a">🐟</div>
      <div className="animated-fish fish-b">🐠</div>
      <div className="animated-fish fish-c">🐡</div>

      <div className="animated-plastic plastic-a">▯</div>
      <div className="animated-plastic plastic-b">○</div>

      <div className="animated-coral coral-a"></div>
      <div className="animated-coral coral-b"></div>
      <div className="animated-coral coral-c"></div>

      <p>
        {health >= 85
          ? "The ocean is healthy and vibrant."
          : health >= 70
          ? "Life is still active, but protection is needed."
          : health >= 40
          ? "Many marine species are struggling to survive."
          : "The ecosystem is close to collapse."}
      </p>
    </div>
  </div>

  <div className="result-bottom">
    <div className="ohi-risk-box">
      <h3>OHI-Inspired Score Meaning</h3>

      <div className="ohi-scale-list">
        {riskLevels.map((level) => (
          <div
            key={level.label}
            className={`ohi-scale-row ${
              health >= level.min && health <= level.max ? "active" : ""
            }`}
          >
            <span className="range">
              {level.min}–{level.max}%
            </span>

            <div>
              <strong>{level.label}</strong>
              <p>{level.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="scenario-info">
      <h2>Future Ocean Scenario</h2>

      <InfoRow icon="🪸" title="Coral Reef" value={scenario.coral} />
      <InfoRow icon="🐠" title="Fish Population" value={scenario.fish} />
      <InfoRow icon="🧴" title="Plastic Pollution" value={scenario.plastic} />
      <InfoRow icon="🌍" title="Overall Outlook" value={scenario.outlook} />

      <button onClick={resetScenario}>Reset Scenario</button>
    </div>
  </div>
</section>

      <section className="ocean-visual glass">
        <h2>How This Impacts Human Life</h2>

        <div className="impact-grid">
          {pollution > 70 && (
            <div className="impact-card danger">
              <h3>Plastic Pollution Crisis</h3>
              <p>
                Large amounts of plastic enter the food chain through fish and
                sea salt. Humans may consume microplastics daily through food
                and water.
              </p>
            </div>
          )}

          {temperature > 60 && (
            <div className="impact-card warning">
              <h3>Ocean Temperature Rising</h3>
              <p>
                Warmer oceans increase storms, floods, coral death and damage
                marine ecosystems that millions of people depend on.
              </p>
            </div>
          )}

          {fishing > 50 && (
            <div className="impact-card danger">
              <h3>Overfishing</h3>
              <p>
                Fish populations may collapse, causing food shortages, economic
                loss and rising seafood prices around the world.
              </p>
            </div>
          )}

          {health < 40 && (
            <div className="impact-card critical">
              <h3>Human Future At Risk</h3>
              <p>
                A damaged ocean affects climate stability, oxygen production,
                biodiversity and global food systems. Human life becomes more
                unstable.
              </p>
            </div>
          )}

          {health >= 55 && health < 70 && (
            <div className="impact-card warning">
              <h3>Warning Signs Increasing</h3>
              <p>
                The ocean is still functioning, but warning signs are becoming more
                visible. Coral reefs are under stress, fish populations are declining,
                and environmental pressures are increasing. Immediate action can still
                prevent more serious damage.
              </p>
            </div>
          )}

          {health > 70 && (
            <div className="impact-card healthy-card">
              <h3>Hopeful Future</h3>
              <p>
                Sustainable actions can still protect marine ecosystems and
                maintain a healthier future for both nature and humanity.
              </p>
            </div>
          )}
        </div>

        <p className="bottom-text">
          Small changes today, big impact tomorrow. The ocean&apos;s future is in
          our hands.
        </p>
      </section>
    </main>
  );
}

type SliderProps = {
  icon: string;
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
};

function OceanSlider({
  icon,
  title,
  description,
  value,
  onChange,
}: SliderProps) {
  const level = value > 70 ? "High" : value > 35 ? "Medium" : "Low";

  return (
    <div className="slider-row">
      <div className="slider-icon">{icon}</div>

      <div className="slider-main">
        <div className="slider-head">
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>

          <div className="slider-value">
            <strong>{value}%</strong>
            <span>{level}</span>
          </div>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

type InfoRowProps = {
  icon: string;
  title: string;
  value: string;
};

function InfoRow({ icon, title, value }: InfoRowProps) {
  return (
    <div className="info-row">
      <span>{icon}</span>
      <div>
        <h4>{title}</h4>
        <p>{value}</p>
      </div>
    </div>
  );
}