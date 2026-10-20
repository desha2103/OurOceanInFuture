import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import CoralImpactList from "./pages/CoralImpactList";
import CoralImpactDetail from "./pages/CoralImpactDetail";
import { SimulatorProvider } from "./state/SimulatorContext";

// Local test shell only. Your partner does NOT copy this file — they add
// these two routes to their own router (see README.md).
export default function App() {
  return (
    <SimulatorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/coral-impact" replace />} />
          <Route path="/coral-impact" element={<CoralImpactList />} />
          <Route
            path="/coral-impact/:coralKey"
            element={<CoralImpactDetail />}
          />
        </Routes>
      </BrowserRouter>
    </SimulatorProvider>
  );
}
