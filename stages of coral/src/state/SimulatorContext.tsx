import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type SimulatorState = {
  marineLitter: number;
  setMarineLitter: (value: number) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  acidification: number;
  setAcidification: (value: number) => void;
  bottomTrawling: number;
  setBottomTrawling: (value: number) => void;
  year: number;
  setYear: (value: number) => void;
  health: number;
};

const SimulatorContext = createContext<SimulatorState | null>(
  null,
);

const STORAGE_KEY = "oceanSimSliders";

type PersistedSliders = {
  marineLitter: number;
  temperature: number;
  acidification: number;
  bottomTrawling: number;
  year: number;
};

const DEFAULTS: PersistedSliders = {
  marineLitter: 15,
  temperature: 10,
  acidification: 10,
  bottomTrawling: 12,
  year: 2024,
};

function readPersisted(): PersistedSliders {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function SimulatorProvider({
  children,
}: {
  children: ReactNode;
}) {
  const initial = useRef(readPersisted());

  const [marineLitter, setMarineLitter] = useState(
    initial.current.marineLitter,
  );
  const [temperature, setTemperature] = useState(
    initial.current.temperature,
  );
  const [acidification, setAcidification] = useState(
    initial.current.acidification,
  );
  const [bottomTrawling, setBottomTrawling] = useState(
    initial.current.bottomTrawling,
  );
  const [year, setYear] = useState(initial.current.year);

  // any change here is a real, local slider move — persist it so
  // other already-open tabs (e.g. a coral detail page opened in a
  // new tab) can pick it up via the "storage" event below
  useEffect(() => {
    const payload: PersistedSliders = {
      marineLitter,
      temperature,
      acidification,
      bottomTrawling,
      year,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage unavailable — cross-tab sync simply won't work
    }
  }, [marineLitter, temperature, acidification, bottomTrawling, year]);

  // "storage" only fires in OTHER tabs, never the tab that wrote it —
  // exactly what's needed to keep a coral page in sync with sliders
  // moved on the main simulator tab, live, without a page reload
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;

      try {
        const parsed: PersistedSliders = JSON.parse(event.newValue);
        setMarineLitter(parsed.marineLitter);
        setTemperature(parsed.temperature);
        setAcidification(parsed.acidification);
        setBottomTrawling(parsed.bottomTrawling);
        setYear(parsed.year);
      } catch {
        // ignore malformed payloads
      }
    }

    window.addEventListener("storage", handleStorage);
    return () =>
      window.removeEventListener("storage", handleStorage);
  }, []);

  const health = useMemo(
    () =>
      Math.max(
        0,
        Math.round(
          100 -
            marineLitter * 0.25 -
            temperature * 0.25 -
            acidification * 0.25 -
            bottomTrawling * 0.25,
        ),
      ),
    [marineLitter, temperature, acidification, bottomTrawling],
  );

  const value = useMemo(
    () => ({
      marineLitter,
      setMarineLitter,
      temperature,
      setTemperature,
      acidification,
      setAcidification,
      bottomTrawling,
      setBottomTrawling,
      year,
      setYear,
      health,
    }),
    [
      marineLitter,
      temperature,
      acidification,
      bottomTrawling,
      year,
      health,
    ],
  );

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);

  if (!context) {
    throw new Error(
      "useSimulator must be used within a SimulatorProvider",
    );
  }

  return context;
}
