import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DisplayActivity from "@/components/activity-log/ActivityLog";
import type { ActivityEvent } from "@/types";

const events: ActivityEvent[] = [
  { id: "1", message: "Price Calculated: $29.99 — Wireless Mouse", timestamp: "2026-11-12T10:00:00Z", category: "price" },
  { id: "2", message: "Stock Checked: 84 available — Wireless Mouse", timestamp: "2026-11-12T10:00:01Z", category: "stock" },
];

describe("DisplayActivity: screen reader announcements (#14)", () => {
  it("is one polite log region holding every entry", () => {
    render(<DisplayActivity events={events} />);

    const log = screen.getByRole("log", { name: "Activity log" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveTextContent("Price Calculated");
    expect(log).toHaveTextContent("Stock Checked");
  });

  it("doesn't mark each entry as an alert, so entries don't interrupt", () => {
    render(<DisplayActivity events={events} />);

    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });
});
