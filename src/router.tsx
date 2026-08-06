import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import { TripListScreen } from "./screens/TripListScreen";
import { TripOverviewScreen } from "./screens/TripOverviewScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { ChecklistScreen } from "./screens/ChecklistScreen";
import { SegmentDetailScreen } from "./screens/SegmentDetailScreen";
import { ItineraryItemFormScreen } from "./screens/forms/ItineraryItemFormScreen";
import { getCurrentTripId } from "./lib/currentTrip";

/**
 * "/" is never a screen of its own — it sends a returning user straight back
 * into whichever trip they were last looking at, and a first-time user to
 * the trip picker. This is what lets a trip stay "selected" across app
 * launches instead of always landing on a list to re-pick from.
 */
function RootRedirect() {
  const tripId = getCurrentTripId();
  return <Navigate to={tripId ? `/trips/${tripId}` : "/trips"} replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: "trips", element: <TripListScreen /> },
      { path: "trips/:tripId", element: <TripOverviewScreen /> },
      { path: "trips/:tripId/today", element: <TodayScreen /> },
      { path: "trips/:tripId/checklist", element: <ChecklistScreen /> },
      { path: "trips/:tripId/segments/:segmentId", element: <SegmentDetailScreen /> },
      { path: "segments/:segmentId/items/new", element: <ItineraryItemFormScreen /> },
    ],
  },
]);
