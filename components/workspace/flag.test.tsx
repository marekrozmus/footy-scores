// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Flag } from "./flag";

describe("Flag", () => {
  it("renders a flag image for a known NOC code", () => {
    // The image is decorative (aria-hidden, empty alt), so it has no accessible "img" role —
    // query by tag rather than role.
    const { container } = render(<Flag noc="ARG" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "https://flagcdn.com/w20/ar.png");
  });

  it("renders a placeholder swatch (no image) for an unknown NOC code", () => {
    const { container } = render(<Flag noc="ZZZ" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("span")).toBeInTheDocument();
  });
});
