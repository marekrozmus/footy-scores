import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

// This project doesn't use vitest's `globals: true`, so Testing Library's own auto-cleanup
// detection (which looks for a global `afterEach`) never registers — do it explicitly instead,
// once here, rather than repeating `afterEach(cleanup)` in every component test file.
afterEach(() => {
  cleanup();
});
