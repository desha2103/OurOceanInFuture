import { BrowserRouter, Routes, Route } from "react-router-dom";

import OceanFutureSimulator from "./OceanFutureSimulator";
import CoralImpactList from "./pages/CoralImpactList";
import CoralImpactDetail from "./pages/CoralImpactDetail";
import { SimulatorProvider } from "./state/SimulatorContext";

export default function App() {
  return (
    <SimulatorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OceanFutureSimulator />} />
          <Route
            path="/coral-impact"
            element={<CoralImpactList />}
          />
          <Route
            path="/coral-impact/:coralKey"
            element={<CoralImpactDetail />}
          />
        </Routes>
      </BrowserRouter>
    </SimulatorProvider>
  );
}
