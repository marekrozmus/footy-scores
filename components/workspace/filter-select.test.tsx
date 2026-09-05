// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterSelect } from "./filter-select";

describe("FilterSelect", () => {
  it("shows the current value on the closed trigger and no listbox", () => {
    render(<FilterSelect label="Gender" value="All" options={["All", "Men", "Women"]} onChange={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("All");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox on click and lists every option", async () => {
    const user = userEvent.setup();
    render(<FilterSelect label="Gender" value="All" options={["All", "Men", "Women"]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("calls onChange with the picked option and closes the listbox", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FilterSelect label="Gender" value="All" options={["All", "Men", "Women"]} onChange={onChange} />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "Women" }));

    expect(onChange).toHaveBeenCalledWith("Women");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<FilterSelect label="Gender" value="All" options={["All", "Men", "Women"]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the component", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <FilterSelect label="Gender" value="All" options={["All", "Men", "Women"]} onChange={vi.fn()} />
        <button type="button">outside</button>
      </div>,
    );

    await user.click(screen.getByRole("button", { name: /gender/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
