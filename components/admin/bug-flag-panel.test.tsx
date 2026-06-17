import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BugDefinition } from "@/lib/bug-registry";
import { listAssessmentBugs, listBugs } from "@/lib/bug-registry";
import type { BugFlags } from "@/lib/bug-flags";
import { BugFlagPanel } from "@/components/admin/bug-flag-panel";

// Slice 5 — the admin panel rendering + interaction (AC 1,2,3,4,9,10). We pass an
// explicit synthetic `bugs` fixture spanning categories/difficulties to exercise
// filtering and grouping deterministically, independent of the real registry.
// Tests are behavior-focused: rendered text/state and the POST body the panel
// sends — not internal calls.
//
// useRouter and fetch are mocked so toggling never hits a real server. We assert
// the panel POSTs the expected body and reflects the passed flags.

const routerRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

const bugs: BugDefinition[] = [
  {
    key: "FUNC_EASY",
    title: "Quantity not updating in cart",
    category: "functional",
    difficulty: "easy",
    location: "components/cart",
    hipaa: false,
    effect: "Cart quantity does not update on the screen.",
    where: "/cart",
    howToSpot: "eyeball",
  },
  {
    key: "SEC_EXPERT",
    title: "PHI leaks in order confirmation",
    category: "security",
    difficulty: "expert",
    location: "app/orders",
    hipaa: true,
    effect: "Another customer's PHI is exposed on the order page.",
    where: "/orders/[id]",
    howToSpot: "DevTools Network",
  },
  {
    key: "UI_MODERATE",
    title: "Misaligned price badge",
    category: "ui",
    difficulty: "moderate",
    location: "components/product",
    hipaa: false,
    effect: "The price badge is misaligned on the card.",
    where: "/products",
    howToSpot: "eyeball",
  },
];

const flags: BugFlags = {
  FUNC_EASY: true,
  SEC_EXPERT: false,
  UI_MODERATE: false,
};

let fetchMock: ReturnType<typeof vi.fn>;

function okResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

beforeEach(() => {
  routerRefresh.mockClear();
  fetchMock = vi.fn().mockResolvedValue(okResponse(flags));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function rowFor(title: string): HTMLElement {
  return screen.getByText(title).closest("li") as HTMLElement;
}

function lastPostBody(): Record<string, unknown> {
  const call = fetchMock.mock.calls.at(-1);
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

// AC 1: every registry bug passed in is listed.
describe("rendering — lists every bug (AC 1)", () => {
  it("renders a row for each supplied bug", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    for (const bug of bugs) {
      expect(screen.getByText(bug.title)).toBeInTheDocument();
    }
  });
});

// AC 2: each row shows title, category, difficulty, and an explicit on/off state
// (text, not color alone).
describe("rendering — each row shows metadata and explicit state (AC 2)", () => {
  it("shows the title, category, and difficulty for a bug", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);
    const row = within(rowFor("PHI leaks in order confirmation"));

    expect(row.getByText("security")).toBeInTheDocument();
    expect(row.getByText("expert")).toBeInTheDocument();
  });

  it("shows an explicit On label for an enabled bug, not color only", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);
    const row = within(rowFor("Quantity not updating in cart"));

    expect(row.getByText("On")).toBeInTheDocument();
  });

  it("shows an explicit Off label for a disabled bug", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);
    const row = within(rowFor("Misaligned price badge"));

    expect(row.getByText("Off")).toBeInTheDocument();
  });
});

// AC 3: the displayed switch state matches the passed flags.
describe("rendering — switch state matches the passed flags (AC 3)", () => {
  it("renders the switch checked for an enabled flag and unchecked for a disabled one", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    expect(
      screen.getByRole("switch", { name: "Toggle Quantity not updating in cart" }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", { name: "Toggle PHI leaks in order confirmation" }),
    ).not.toBeChecked();
  });

  it("reports the enabled count derived from the flags", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    // One of three flags is enabled.
    expect(screen.getByRole("status")).toHaveTextContent("1 of 3 enabled");
  });
});

// AC 4: toggling a bug POSTs the expected {key, enabled} body.
describe("toggling — POSTs the new state (AC 4)", () => {
  it("posts {key, enabled:true} when an off switch is turned on", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("switch", { name: "Toggle PHI leaks in order confirmation" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/bug-flags",
      expect.objectContaining({ method: "POST" }),
    );
    expect(lastPostBody()).toEqual({ key: "SEC_EXPERT", enabled: true });
  });

  it("posts {key, enabled:false} when an on switch is turned off", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("switch", { name: "Toggle Quantity not updating in cart" }),
    );

    expect(lastPostBody()).toEqual({ key: "FUNC_EASY", enabled: false });
  });

  it("reflects the server-confirmed state after a successful toggle", async () => {
    // A real toggle returns the updated flag map; the panel reconciles to it.
    fetchMock.mockResolvedValue(okResponse({ ...flags, SEC_EXPERT: true }));
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("switch", { name: "Toggle PHI leaks in order confirmation" }),
    );

    expect(
      screen.getByRole("switch", { name: "Toggle PHI leaks in order confirmation" }),
    ).toBeChecked();
  });
});

// AC 10: the reset control posts a reset request.
describe("reset — posts a reset request (AC 10)", () => {
  it("posts {reset:true} when Reset to defaults is clicked", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(screen.getByRole("button", { name: /reset to defaults/i }));

    expect(lastPostBody()).toEqual({ reset: true });
  });
});

// AC 9: filtering by category and difficulty, grouping, and the empty state.
describe("filtering and grouping (AC 9)", () => {
  it("filters the list down to a single category", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.selectOptions(screen.getByLabelText("Category"), "security");

    expect(screen.getByText("PHI leaks in order confirmation")).toBeInTheDocument();
    expect(screen.queryByText("Quantity not updating in cart")).not.toBeInTheDocument();
    expect(screen.queryByText("Misaligned price badge")).not.toBeInTheDocument();
  });

  it("filters the list down to a single difficulty", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.selectOptions(screen.getByLabelText("Difficulty"), "easy");

    expect(screen.getByText("Quantity not updating in cart")).toBeInTheDocument();
    expect(screen.queryByText("PHI leaks in order confirmation")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when filters match nothing", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    // security + easy: no bug matches both.
    await user.selectOptions(screen.getByLabelText("Category"), "security");
    await user.selectOptions(screen.getByLabelText("Difficulty"), "easy");

    expect(screen.getByText(/no bugs match the current filters/i)).toBeInTheDocument();
  });

  it("groups bugs under category headings when grouping by category", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.selectOptions(screen.getByLabelText("Group by"), "category");

    expect(screen.getByRole("heading", { name: "Functional" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Security" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ui" })).toBeInTheDocument();
  });
});

// MED-29 — each row has an ⓘ info affordance surfacing the reviewer enrichment
// (effect / where / how-to-spot).
describe("info affordance — exposes effect/where/howToSpot (MED-29)", () => {
  it("renders an info affordance per bug row", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    for (const bug of bugs) {
      expect(
        screen.getByRole("button", { name: `Details for ${bug.title}` }),
      ).toBeInTheDocument();
    }
  });

  it("reveals the effect and where text when the info affordance is opened", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("button", { name: "Details for Quantity not updating in cart" }),
    );

    expect(
      await screen.findByText("Cart quantity does not update on the screen."),
    ).toBeInTheDocument();
    expect(screen.getByText("/cart")).toBeInTheDocument();
  });
});

// MED-29 — each row has a Preview control that opens the clean-vs-buggy modal.
describe("preview control — per row + opens the modal (MED-29)", () => {
  it("renders a Preview control for every bug row", () => {
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    for (const bug of bugs) {
      expect(
        screen.getByRole("button", { name: `Preview ${bug.title}` }),
      ).toBeInTheDocument();
    }
  });

  it("opens a dialog with a buggy/clean toggle and a zoomable screenshot", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("button", { name: "Preview PHI leaks in order confirmation" }),
    );

    const dialog = await screen.findByRole("dialog");
    // A Buggy/Clean toggle flips the single large screenshot; plus zoom + an
    // "open full size" escape hatch.
    expect(within(dialog).getByRole("tab", { name: "Buggy (customer)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("tab", { name: "Clean (admin)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /zoom screenshot/i })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /open full size/i })).toBeInTheDocument();
  });

  it("defaults to the buggy variant and can switch to clean", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("button", { name: "Preview PHI leaks in order confirmation" }),
    );
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByRole("tab", { name: "Buggy (customer)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(within(dialog).getByRole("tab", { name: "Clean (admin)" }));

    expect(within(dialog).getByRole("tab", { name: "Clean (admin)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the Screenshot pending placeholder when the image fails to load", async () => {
    const user = userEvent.setup();
    render(<BugFlagPanel bugs={bugs} initialFlags={flags} />);

    await user.click(
      screen.getByRole("button", { name: "Preview PHI leaks in order confirmation" }),
    );

    const dialog = await screen.findByRole("dialog");
    // jsdom never loads <img> src, so fire onError to exercise the placeholder.
    fireEvent.error(within(dialog).getByRole("img"));

    expect(within(dialog).getByText(/screenshot pending/i)).toBeInTheDocument();
  });
});

// MED-9 — after Phase-4 cleanup the registry holds exactly the 45 real
// assessment bugs with no internal/probe entries; listAssessmentBugs still
// filters internal entries (defensively) so the panel only ever shows real bugs.
describe("assessment-bug filtering — exactly 45 real bugs, no internal entries (MED-9)", () => {
  it("contains no internal entries and never surfaces the removed PROBE_NOOP probe", () => {
    const keys = listAssessmentBugs().map((bug) => bug.key);

    expect(keys).not.toContain("PROBE_NOOP");
    expect(listAssessmentBugs().every((bug) => bug.internal !== true)).toBe(true);
    expect(listBugs().some((bug) => bug.internal === true)).toBe(false);
  });

  it("the assessment list is exactly the 45 real bugs (registry == assessment)", () => {
    const all = listBugs();
    const assessment = listAssessmentBugs();

    expect(all).toHaveLength(45);
    expect(assessment).toHaveLength(45);
    expect(assessment).toHaveLength(all.length);
  });

  it("does not render a row for the removed Phase-1 probe", () => {
    render(<BugFlagPanel bugs={listAssessmentBugs()} initialFlags={{}} />);

    expect(screen.queryByText(/Phase-1 engine probe/i)).not.toBeInTheDocument();
  });
});
