import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { TripListScreen } from "./screens/TripListScreen";
import { TripOverviewScreen } from "./screens/TripOverviewScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { ChecklistScreen } from "./screens/ChecklistScreen";
import { TripFormScreen } from "./screens/forms/TripFormScreen";
import { SegmentFormScreen } from "./screens/forms/SegmentFormScreen";
import { ItineraryItemFormScreen } from "./screens/forms/ItineraryItemFormScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <TripListScreen /> },
      { path: "trips/:tripId", element: <TripOverviewScreen /> },
      { path: "trips/:tripId/today", element: <TodayScreen /> },
      { path: "trips/:tripId/checklist", element: <ChecklistScreen /> },
      { path: "trips/new", element: <TripFormScreen /> },
      { path: "trips/:tripId/segments/new", element: <SegmentFormScreen /> },
      { path: "segments/:segmentId/items/new", element: <ItineraryItemFormScreen /> },
    ],
  },
]);
