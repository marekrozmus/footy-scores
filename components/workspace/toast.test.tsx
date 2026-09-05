// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Toast } from "./toast";

describe("Toast", () => {
  it("renders nothing visible when message is empty", () => {
    const { container } = render(<Toast message="" />);
    expect(container.querySelector(".bg-panel")).toBeNull();
  });

  it("shows the message when set", () => {
    render(<Toast message="Endpoint copied to clipboard" />);
    expect(screen.getByText("Endpoint copied to clipboard")).toBeInTheDocument();
  });
});
