import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AutosaveEngine } from "./AutosaveEngine";
import type { AutosaveAdapter } from "./types";

type Form = { title: string; description: string };

const emptyForm: Form = { title: "", description: "" };

function makeAdapter(overrides: Partial<AutosaveAdapter<Form>> = {}) {
  return {
    save: vi.fn(async () => {}),
    isEmptyDraft: (f: Form) => f.title.trim() === "" && f.description.trim() === "",
    discard: vi.fn(async () => {}),
    softDelete: vi.fn(async () => {}),
    onFirstCommit: vi.fn(async () => {}),
    ...overrides,
  } satisfies AutosaveAdapter<Form> & Record<string, unknown>;
}

function makeEngine(
  adapter: AutosaveAdapter<Form>,
  initial: Form = emptyForm,
  onError?: (e: unknown) => void,
) {
  return new AutosaveEngine<Form>({ id: "rec-1", initial, adapter, debounceMs: 600, onError });
}

/** Let queued promise callbacks run without advancing timers. */
const drain = () => Promise.resolve().then(() => Promise.resolve());

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("AutosaveEngine — state machine", () => {
  it("starts idle and holds the hydrated form", () => {
    const engine = makeEngine(makeAdapter(), { title: "Hello", description: "" });
    expect(engine.saveState).toBe("idle");
    expect(engine.form).toEqual({ title: "Hello", description: "" });
  });

  it("goes to 'saving' immediately on patch, before the debounce elapses", () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "A" });

    expect(engine.saveState).toBe("saving");
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("writes once after the debounce and settles on 'saved'", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "A" });
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(adapter.save).toHaveBeenCalledWith("rec-1", { title: "A", description: "" });
    expect(engine.saveState).toBe("saved");
  });

  it("coalesces rapid keystrokes into a single write with the final value", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "R" });
    await vi.advanceTimersByTimeAsync(100);
    engine.patch({ title: "Ro" });
    await vi.advanceTimersByTimeAsync(100);
    engine.patch({ title: "Roa" });
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(adapter.save).toHaveBeenCalledWith("rec-1", { title: "Roa", description: "" });
  });

  it("ignores a patch that changes nothing", () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter, { title: "Same", description: "" });

    engine.patch({ title: "Same" });

    expect(engine.saveState).toBe("idle");
  });

  it("notifies subscribers on form and state changes", async () => {
    const engine = makeEngine(makeAdapter());
    const listener = vi.fn();
    engine.subscribe(listener);

    engine.patch({ title: "A" });
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    await vi.advanceTimersByTimeAsync(600);
    expect(listener).toHaveBeenCalled();
  });
});

describe("AutosaveEngine — errors", () => {
  it("moves to 'error' and reports once per failed run", async () => {
    const onError = vi.fn();
    const boom = new Error("write failed");
    const adapter = makeAdapter({
      save: vi.fn(async () => {
        throw boom;
      }),
    });
    const engine = makeEngine(adapter, emptyForm, onError);

    engine.patch({ title: "A" });
    await vi.advanceTimersByTimeAsync(600);

    expect(engine.saveState).toBe("error");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(boom);
  });

  it("retry() re-runs the write and recovers to 'saved'", async () => {
    const save = vi
      .fn<(id: string, form: Form) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    const engine = makeEngine(makeAdapter({ save }));

    engine.patch({ title: "A" });
    await vi.advanceTimersByTimeAsync(600);
    expect(engine.saveState).toBe("error");

    await engine.retry();

    expect(save).toHaveBeenCalledTimes(2);
    expect(engine.saveState).toBe("saved");
  });
});

describe("AutosaveEngine — flush", () => {
  it("writes the pending value immediately instead of waiting out the debounce", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "Last keystroke" });
    await engine.flush();

    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(engine.saveState).toBe("saved");
  });

  it("does not write when nothing is pending", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter, { title: "Untouched", description: "" });

    await engine.flush();

    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("cancels the debounce so flushing does not write twice", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "A" });
    await engine.flush();
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.save).toHaveBeenCalledTimes(1);
  });
});

describe("AutosaveEngine — first commit", () => {
  it("fires onFirstCommit once the draft becomes non-empty", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "My ticket" });
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.onFirstCommit).toHaveBeenCalledTimes(1);
    expect(adapter.onFirstCommit).toHaveBeenCalledWith("rec-1", {
      title: "My ticket",
      description: "",
    });
  });

  it("fires it exactly once across many later edits", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    for (const title of ["A", "AB", "ABC", "ABCD"]) {
      engine.patch({ title });
      await vi.advanceTimersByTimeAsync(600);
    }

    expect(adapter.save).toHaveBeenCalledTimes(4);
    expect(adapter.onFirstCommit).toHaveBeenCalledTimes(1);
  });

  it("does not fire while the draft is still empty", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "   " });
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(adapter.onFirstCommit).not.toHaveBeenCalled();
  });

  it("never fires for a record that was already committed when hydrated", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter, { title: "Existing", description: "" });

    engine.patch({ title: "Existing edited" });
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.onFirstCommit).not.toHaveBeenCalled();
  });
});

describe("AutosaveEngine — draft lifecycle", () => {
  it("discardIfEmpty() hard-deletes an untouched draft", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    const discarded = await engine.discardIfEmpty();

    expect(discarded).toBe(true);
    expect(adapter.discard).toHaveBeenCalledWith("rec-1");
  });

  it("discardIfEmpty() keeps a record that was ever committed, even if emptied later", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "Something" });
    await vi.advanceTimersByTimeAsync(600);
    engine.patch({ title: "" });
    await vi.advanceTimersByTimeAsync(600);

    const discarded = await engine.discardIfEmpty();

    expect(discarded).toBe(false);
    expect(adapter.discard).not.toHaveBeenCalled();
  });

  it("discardIfEmpty() cancels a pending write so the row is not resurrected", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ description: "  " });
    await engine.discardIfEmpty();
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.discard).toHaveBeenCalledTimes(1);
    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("softDelete() stamps the record and cancels any pending write", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter, { title: "Doomed", description: "" });

    engine.patch({ title: "Doomed edit" });
    await engine.softDelete();
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.softDelete).toHaveBeenCalledWith("rec-1");
    expect(adapter.save).not.toHaveBeenCalled();
  });
});

describe("AutosaveEngine — changed keys", () => {
  it("reports only the fields the user actually changed", async () => {
    const engine = makeEngine(makeAdapter(), { title: "Original", description: "Body" });

    engine.patch({ title: "Edited" });
    await vi.advanceTimersByTimeAsync(600);

    expect(engine.changedKeys()).toEqual(["title"]);
  });

  it("reports nothing when a field is edited back to its original value", async () => {
    const engine = makeEngine(makeAdapter(), { title: "Original", description: "" });

    engine.patch({ title: "Edited" });
    await vi.advanceTimersByTimeAsync(600);
    engine.patch({ title: "Original" });
    await vi.advanceTimersByTimeAsync(600);

    expect(engine.changedKeys()).toEqual([]);
  });
});

describe("AutosaveEngine — dispose", () => {
  it("cancels a pending write", async () => {
    const adapter = makeAdapter();
    const engine = makeEngine(adapter);

    engine.patch({ title: "A" });
    engine.dispose();
    await vi.advanceTimersByTimeAsync(600);

    expect(adapter.save).not.toHaveBeenCalled();
  });

  it("stops notifying subscribers after an in-flight write resolves", async () => {
    let resolveSave: () => void = () => {};
    const adapter = makeAdapter({
      save: vi.fn(
        () =>
          new Promise<void>((res) => {
            resolveSave = res;
          }),
      ),
    });
    const engine = makeEngine(adapter);
    const listener = vi.fn();
    engine.subscribe(listener);

    engine.patch({ title: "A" });
    await vi.advanceTimersByTimeAsync(600);
    engine.dispose();
    listener.mockClear();

    resolveSave();
    await drain();

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("AutosaveEngine — didFirstCommit", () => {
  it("is false before anything is written", () => {
    expect(makeEngine(makeAdapter()).didFirstCommit).toBe(false);
  });

  it("flips once the draft is committed in this session", async () => {
    const engine = makeEngine(makeAdapter());

    engine.patch({ title: "New ticket" });
    await vi.advanceTimersByTimeAsync(600);

    expect(engine.didFirstCommit).toBe(true);
  });

  it("stays false when editing a record that was already committed", async () => {
    const engine = makeEngine(makeAdapter(), { title: "Existing", description: "" });

    engine.patch({ title: "Existing edited" });
    await vi.advanceTimersByTimeAsync(600);

    expect(engine.didFirstCommit).toBe(false);
  });
});
