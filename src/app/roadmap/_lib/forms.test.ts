import { describe, it, expect } from "vitest";
import {
  hydrateFeatureForm,
  isEmptyFeatureDraft,
  hydrateTaskForm,
  isEmptyTaskDraft,
  visibleTaskChanges,
  applyTaskPermissions,
  type TaskForm,
} from "./forms";
import type { Feature, TaskRow } from "./types";

const feature = (over: Partial<Feature> = {}): Feature => ({
  id: "f1",
  created_at: "2026-08-28T00:00:00Z",
  completed_at: null,
  deleted_at: null,
  quarter_id: "q1",
  title: "",
  description: null,
  status: "draft",
  sort_order: 0,
  sprint_ids: [],
  ...over,
});

const task = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: "t1",
  created_at: "2026-08-28T00:00:00Z",
  completed_at: null,
  deleted_at: null,
  sprint_id: null,
  feature_id: null,
  title: "",
  description: null,
  status: "to_do",
  sort_order: 0,
  created_by_user_uuid: null,
  is_backlog: true,
  developer_uuid: null,
  ...over,
});

describe("hydrateFeatureForm", () => {
  it("maps a stored feature onto the form", () => {
    expect(
      hydrateFeatureForm(
        feature({
          title: "Grid",
          description: "<p>x</p>",
          status: "in_progress",
          sprint_ids: ["s1"],
        }),
      ),
    ).toEqual({ title: "Grid", description: "<p>x</p>", status: "in_progress", sprintIds: ["s1"] });
  });

  it("turns a null description into an empty string so the editor stays controlled", () => {
    expect(hydrateFeatureForm(feature()).description).toBe("");
  });
});

describe("isEmptyFeatureDraft", () => {
  it("treats a brand new draft as empty", () => {
    expect(isEmptyFeatureDraft(hydrateFeatureForm(feature()))).toBe(true);
  });

  it("treats whitespace as empty", () => {
    expect(
      isEmptyFeatureDraft({ title: "   ", description: "  ", status: "draft", sprintIds: [] }),
    ).toBe(true);
  });

  it("is no longer empty once a title is typed", () => {
    expect(
      isEmptyFeatureDraft({ title: "A", description: "", status: "draft", sprintIds: [] }),
    ).toBe(false);
  });

  it("is no longer empty once a description is written", () => {
    expect(
      isEmptyFeatureDraft({
        title: "",
        description: "<p>notes</p>",
        status: "draft",
        sprintIds: [],
      }),
    ).toBe(false);
  });

  it("is no longer empty once a sprint label is picked", () => {
    expect(
      isEmptyFeatureDraft({ title: "", description: "", status: "draft", sprintIds: ["s1"] }),
    ).toBe(false);
  });

  it("ignores an empty rich-text paragraph left behind by the editor", () => {
    expect(
      isEmptyFeatureDraft({ title: "", description: "<p></p>", status: "draft", sprintIds: [] }),
    ).toBe(true);
  });
});

describe("hydrateTaskForm", () => {
  it("maps a stored task onto the form", () => {
    expect(
      hydrateTaskForm(
        task({
          title: "Fix",
          sprint_id: "s1",
          feature_id: "f1",
          status: "in_progress",
          is_backlog: false,
        }),
      ),
    ).toEqual({
      title: "Fix",
      description: "",
      status: "in_progress",
      featureId: "f1",
      sprintId: "s1",
      developerUuid: null,
      isBacklog: false,
    });
  });

  it("normalises an empty sprint id to null", () => {
    expect(hydrateTaskForm(task({ sprint_id: "" })).sprintId).toBeNull();
  });
});

describe("isEmptyTaskDraft", () => {
  const base: TaskForm = {
    title: "",
    description: "",
    status: "to_do",
    featureId: null,
    sprintId: null,
    developerUuid: null,
    isBacklog: true,
  };

  it("treats a brand new draft as empty", () => {
    expect(isEmptyTaskDraft(base)).toBe(true);
  });

  it("only considers what the user typed — not the sprint it was created in", () => {
    expect(isEmptyTaskDraft({ ...base, sprintId: "s1", isBacklog: false })).toBe(true);
  });

  it("is no longer empty once a title is typed", () => {
    expect(isEmptyTaskDraft({ ...base, title: "Bug" })).toBe(false);
  });

  it("is no longer empty once a developer is assigned", () => {
    expect(isEmptyTaskDraft({ ...base, developerUuid: "u1" })).toBe(false);
  });
});

describe("visibleTaskChanges", () => {
  it("keeps fields other people can see in the list", () => {
    expect(visibleTaskChanges(["title", "status"])).toEqual(["title", "status"]);
  });

  it("drops description-only edits so typing notes does not notify subscribers", () => {
    expect(visibleTaskChanges(["description"])).toEqual([]);
  });

  it("keeps a sprint reassignment, which moves the ticket for everyone", () => {
    expect(visibleTaskChanges(["sprintId"])).toEqual(["sprintId"]);
  });
});

describe("applyTaskPermissions", () => {
  const devForm: TaskForm = {
    title: "Fix",
    description: "<p>notes</p>",
    status: "in_progress",
    featureId: "f1",
    sprintId: "s1",
    developerUuid: "u1",
    isBacklog: false,
  };

  it("leaves a developer's form untouched", () => {
    expect(applyTaskPermissions(devForm, true)).toEqual(devForm);
  });

  it("forces a non-developer's ticket into the backlog", () => {
    expect(applyTaskPermissions(devForm, false)).toEqual({
      ...devForm,
      status: "to_do",
      sprintId: null,
      isBacklog: true,
      developerUuid: null,
    });
  });

  it("keeps what a non-developer is allowed to write", () => {
    const result = applyTaskPermissions(devForm, false);
    expect(result.title).toBe("Fix");
    expect(result.description).toBe("<p>notes</p>");
    expect(result.featureId).toBe("f1");
  });
});
