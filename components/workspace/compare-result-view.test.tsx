// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompareResultView } from "./compare-result-view";

describe("CompareResultView", () => {
  it("shows 'not run yet' when there's no result", () => {
    render(<CompareResultView result={undefined} />);
    expect(screen.getByText(/comparison has not run/i)).toBeInTheDocument();
  });

  it("shows a pass state", () => {
    render(<CompareResultView result={{ status: "pass" }} />);
    expect(screen.getByText(/exact match/i)).toBeInTheDocument();
  });

  it("shows an error state with the message", () => {
    render(<CompareResultView result={{ status: "error", message: "Tested API returned 500" }} />);
    expect(screen.getByText("Tested API returned 500")).toBeInTheDocument();
  });

  it("shows a fail state with a diff row per difference", () => {
    render(
      <CompareResultView
        result={{ status: "fail", diffs: [{ path: "score.home", kind: "changed", expected: 1, actual: 2 }] }}
      />,
    );
    expect(screen.getByText("score.home")).toBeInTheDocument();
    expect(screen.getByText("1 difference")).toBeInTheDocument();
  });

  it("pluralizes the difference count", () => {
    render(
      <CompareResultView
        result={{
          status: "fail",
          diffs: [
            { path: "score.home", kind: "changed", expected: 1, actual: 2 },
            { path: "score.away", kind: "changed", expected: 2, actual: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText("2 differences")).toBeInTheDocument();
  });

  it("shows '—' for the actual column on a missing field, and for expected on an extra field", () => {
    render(
      <CompareResultView
        result={{
          status: "fail",
          diffs: [
            { path: "referee", kind: "missing", expected: "NYBERG Glenn" },
            { path: "extraField", kind: "extra", actual: "surprise" },
          ],
        }}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
