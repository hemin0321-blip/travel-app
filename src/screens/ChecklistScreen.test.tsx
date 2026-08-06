import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistList } from "./ChecklistScreen";

const items = [{ checkId: "c1", tripId: "t1", label: "여권", done: false }];

describe("ChecklistList", () => {
  it("renders checkbox as enabled when online", () => {
    render(<ChecklistList items={items} online={true} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("checkbox")).not.toBeDisabled();
  });

  it("disables the checkbox and shows a message when offline", () => {
    render(<ChecklistList items={items} online={false} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText("오프라인입니다 · 체크 변경은 온라인에서")).toBeInTheDocument();
  });

  it("calls onToggle with the item id when checked online", () => {
    const onToggle = vi.fn();
    render(<ChecklistList items={items} online={true} onToggle={onToggle} onDelete={vi.fn()} />);
    screen.getByRole("checkbox").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onToggle).toHaveBeenCalledWith("c1", true);
  });

  it("shows a strikethrough class on a done item's label", () => {
    const done = [{ checkId: "c1", tripId: "t1", label: "여권", done: true }];
    render(<ChecklistList items={done} online={true} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("여권").closest(".checklist-list__item")).toHaveClass("checklist-list__item--done");
  });

  it("sorts done items below not-done items without reordering within each group", () => {
    const mixed = [
      { checkId: "c1", tripId: "t1", label: "먼저 체크됨", done: true },
      { checkId: "c2", tripId: "t1", label: "안 함 A", done: false },
      { checkId: "c3", tripId: "t1", label: "안 함 B", done: false },
      { checkId: "c4", tripId: "t1", label: "나중에 체크됨", done: true },
    ];
    render(<ChecklistList items={mixed} online={true} onToggle={vi.fn()} onDelete={vi.fn()} />);
    const labels = screen.getAllByText(/안 함|체크됨/).map((el) => el.textContent);
    expect(labels).toEqual(["안 함 A", "안 함 B", "먼저 체크됨", "나중에 체크됨"]);
  });

  it("shows a delete button after clicking the ⋯ menu, and calls onDelete with the item id", () => {
    const onDelete = vi.fn();
    render(<ChecklistList items={items} online={true} onToggle={vi.fn()} onDelete={onDelete} />);

    expect(screen.queryByText("삭제")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "더보기" }));
    expect(screen.getByText("삭제")).toBeInTheDocument();

    fireEvent.click(screen.getByText("삭제"));
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  it("disables the ⋯ menu trigger when offline", () => {
    render(<ChecklistList items={items} online={false} onToggle={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "더보기" })).toBeDisabled();
  });
});
