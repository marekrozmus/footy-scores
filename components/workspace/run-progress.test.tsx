// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RunProgress } from "./run-progress";

describe("RunProgress", () => {
  it("labels the loading phase as retrieving the schedule", () => {
    render(<RunProgress phase="loading" progress={45} />);
    expect(screen.getByText("Retrieving Olympic schedule")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("labels any non-loading running phase as generating endpoints", () => {
    render(<RunProgress phase="generating" progress={90} />);
    expect(screen.getByText("Generating endpoints")).toBeInTheDocument();
  });

  it("sets the progress bar's width from the progress prop", () => {
    const { container } = render(<RunProgress phase="generating" progress={90} />);
    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "90%" });
  });
});
