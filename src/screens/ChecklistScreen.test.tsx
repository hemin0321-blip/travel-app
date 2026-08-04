import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistList } from "./ChecklistScreen";

const items = [{ checkId: "c1", tripId: "t1", label: "여권", done: false }];

describe("ChecklistList", () => {
  it("renders checkbox as enabled when online", () => {
    render(<ChecklistList items={items} online={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).not.toBeDisabled();
  });

  it("disables the checkbox and shows a message when offline", () => {
    render(<ChecklistList items={items} online={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText("오프라인입니다 · 체크 변경은 온라인에서")).toBeInTheDocument();
  });

  it("calls onToggle with the item id when checked online", () => {
    const onToggle = vi.fn();
    render(<ChecklistList items={items} online={true} onToggle={onToggle} />);
    screen.getByRole("checkbox").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith("c1", true);
  });
});
