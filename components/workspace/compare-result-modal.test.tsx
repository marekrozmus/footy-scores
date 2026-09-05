// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CompareResultModal } from "./compare-result-modal";

describe("CompareResultModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CompareResultModal open={false} onClose={vi.fn()} result={{ status: "pass" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the result when open", () => {
    render(<CompareResultModal open={true} onClose={vi.fn()} result={{ status: "pass" }} />);
    expect(screen.getByRole("dialog", { name: /comparison result/i })).toBeInTheDocument();
    expect(screen.getByText(/exact match/i)).toBeInTheDocument();
  });

  it("calls onClose when the Close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CompareResultModal open={true} onClose={onClose} result={{ status: "pass" }} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CompareResultModal open={true} onClose={onClose} result={{ status: "pass" }} />);

    await user.click(screen.getByRole("button", { name: /close comparison result/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
