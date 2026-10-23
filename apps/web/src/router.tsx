import { createBrowserRouter, Navigate } from "react-router";
import SignIn from "./routes/SignIn";
import NewVisit from "./routes/NewVisit";
import Visit from "./routes/Visit";
import ReviewQueue from "./routes/ReviewQueue";
import ReviewVisit from "./routes/ReviewVisit";

// One screen = one route file (October canvas rule, CLAUDE.md).
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/sign-in" replace /> },
  { path: "/sign-in", element: <SignIn /> },
  { path: "/visits/new", element: <NewVisit /> },
  { path: "/visits/:visitId", element: <Visit /> },
  { path: "/review", element: <ReviewQueue /> },
  { path: "/review/:visitId", element: <ReviewVisit /> },
]);
