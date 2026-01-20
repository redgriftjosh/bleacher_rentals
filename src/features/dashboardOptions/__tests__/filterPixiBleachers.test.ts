// import { describe, it, expect } from "vitest";
// import { filterSortPixiBleachers } from "../util";
// import { Bleacher } from "../../dashboard/types";

// function makeBleacher(partial: Partial<Bleacher>): Bleacher {
//   return {
//     bleacherId: partial.bleacherId!,
//     bleacherNumber: partial.bleacherNumber ?? partial.bleacherId!,
//     bleacherRows: partial.bleacherRows ?? 5,
//     bleacherSeats: partial.bleacherSeats ?? 50,
//     summerHomeBase: partial.summerHomeBase ?? { id: 1, name: "A" },
//     winterHomeBase: partial.winterHomeBase ?? { id: 10, name: "W" },
//     bleacherEvents: partial.bleacherEvents ?? [],
//     blocks: partial.blocks ?? [],
//     workTrackers: partial.workTrackers ?? [],
//     linxupDeviceId: partial.linxupDeviceId ?? null,
//   };
// }

// describe("filterSortPixiBleachers optimizationMode behaviour", () => {
//   /**
//    * Scenario:
//    * - Filters (homeBaseIds / winterHomeBaseIds / rows) intentionally exclude some bleachers.
//    * - User selects bleachers (alwaysIncludeBleacherIds) that belong to the same event.
//    * - With optimizationMode = true, every selected bleacher MUST appear (not promoted to top, original order preserved).
//    * - With optimizationMode = false, selected bleachers are promoted to the top preserving their relative order.
//    */
//   const bleachers: Bleacher[] = [
//     makeBleacher({
//       bleacherId: 1,
//       bleacherNumber: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 2,
//       bleacherNumber: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 3,
//       bleacherNumber: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 7,
//     }),
//     makeBleacher({
//       bleacherId: 4,
//       bleacherNumber: 4,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//   ];

//   // Filters that ONLY allow: summerHomeBase id=1, winterHomeBase id=10, rows=5
//   const summerAllowed = [1];
//   const winterAllowed = [10];
//   const rowsAllowed = [5];

//   // Selected (always include) bleachers include one that would be filtered out by rows (id=3 has rows=7)
//   const selected = [2, 3, 4];

//   it("includes all selected bleachers in optimization mode without reordering", () => {
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       true, // isFormExpanded
//       true, // optimizationMode
//       null, // season (no season filtering)
//       [],
//       []
//     );

//     // Expect ALL selected bleachers present (2,3,4) even if 2 & 3 fail filters
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toContain(2);
//     expect(ids).toContain(3);
//     expect(ids).toContain(4);

//     // Should also contain bleacher 1 that passes filters
//     expect(ids).toContain(1);

//     // Original order preserved (1,2,3,4) because optimizationMode=true
//     expect(ids).toEqual([1, 2, 3, 4]);
//   });

//   it("promotes selected bleachers to top when optimizationMode is false", () => {
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       true, // isFormExpanded
//       false, // optimizationMode OFF
//       null,
//       [],
//       []
//     );

//     const ids = result.map((b) => b.bleacherId);
//     // Selected first (2,3,4) preserving their relative order, then the remaining filtered passers (1)
//     expect(ids.slice(0, 3)).toEqual([2, 3, 4]);
//     expect(ids).toContain(1);
//   });

//   it("always-includes bypass season gating when optimizationMode=true", () => {
//     // summerAssigned excludes bleacher 2, but 2 is in alwaysInclude list thus should appear.
//     const summerAssigned = [1, 3, 4];
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4]);
//   });
// });

// // ------------------------------------------------------------
// // Additional suites
// // ------------------------------------------------------------

// describe("Selected bleachers are never filtered out (precedence over all filters)", () => {
//   /**
//    * Dataset purpose:
//    * - Provide bleachers that intentionally fail different filters (summer HB, winter HB, rows, season assignments)
//    * - Put those failing IDs in the alwaysInclude list so we can verify they still appear in results.
//    */
//   const bleachers: Bleacher[] = [
//     // Passes all base filters
//     makeBleacher({
//       bleacherId: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     // Fails summer HB (summer=2) when allowed=[1]
//     makeBleacher({
//       bleacherId: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     // Fails winter HB (winter=11) and rows (7) when allowed winter=[10], rows=[5]
//     makeBleacher({
//       bleacherId: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 7,
//     }),
//     // Fails both summer HB (3) and winter HB (12)
//     makeBleacher({
//       bleacherId: 4,
//       summerHomeBase: { id: 3, name: "C" },
//       winterHomeBase: { id: 12, name: "W2" },
//       bleacherRows: 5,
//     }),
//     // Fails rows (9)
//     makeBleacher({
//       bleacherId: 5,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 9,
//     }),
//   ];

//   // Base filters used in tests when focusing on specific dimensions
//   const summerAllowedOnly1 = [1];
//   const winterAllowedOnly10 = [10];
//   const rowsAllowedOnly5 = [5];

//   const allSummerHBs = [1, 2, 3];
//   const allWinterHBs = [10, 11, 12];
//   const allRows = [5, 7, 9];

//   // Always include the ones that deliberately fail some filters
//   const selected = [2, 3, 4, 5];

//   /**
//    * 1) Selected vs Summer Home Base Filtering
//    * Goal: Even if summer home base filter would exclude some selected bleachers, they must still appear.
//    */
//   it("1 - selected survive summer home base filtering", () => {
//     const result = filterSortPixiBleachers(
//       summerAllowedOnly1, // only summer HB id=1 is allowed, excluding 2 and 4
//       allWinterHBs,
//       allRows,
//       bleachers,
//       selected,
//       true, // form expanded to enable inclusion behavior
//       true, // optimization mode on to avoid promotion affecting ordering assertions
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Must include all selected (2,3,4,5) even though some fail summer HB filter
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });

//   /**
//    * 2) Selected vs Winter Home Base Filtering
//    * Goal: Selected bleachers appear even if their winter home base is not allowed.
//    */
//   it("2 - selected survive winter home base filtering", () => {
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       winterAllowedOnly10, // allow only winter HB 10, excludes 3 (11) and 4 (12)
//       allRows,
//       bleachers,
//       selected,
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });

//   /**
//    * 3) Selected vs Row Filtering
//    * Goal: Selected bleachers appear even if their row count is not in the allowed set.
//    */
//   it("3 - selected survive row filtering", () => {
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       rowsAllowedOnly5, // only rows=5 allowed, excludes 3 (7) and 5 (9)
//       bleachers,
//       selected,
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });

//   /**
//    * 4) Selected vs Summer Assigned Gating (season=SUMMER)
//    * Goal: Even when season is SUMMER and an ID is not in summerAssigned, selected bleachers still appear.
//    */
//   it("4 - selected survive summer assigned gating", () => {
//     const summerAssigned = [1]; // 2,3,4,5 are not assigned for summer
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       allRows,
//       bleachers,
//       selected,
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });

//   /**
//    * 5) Selected vs Winter Assigned Gating (season=WINTER)
//    * Goal: Even when season is WINTER and an ID is not in winterAssigned, selected bleachers still appear.
//    */
//   it("5 - selected survive winter assigned gating", () => {
//     const winterAssigned = [1]; // 2,3,4,5 are not assigned for winter
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       allRows,
//       bleachers,
//       selected,
//       true,
//       true,
//       "WINTER",
//       [],
//       winterAssigned
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });
// });

// describe("Filters without any selected bleachers (baseline behavior)", () => {
//   /**
//    * Dataset: reuse the same as above for clarity, but with no selected IDs.
//    * Purpose: verify each filter behaves strictly when no always-include override is present.
//    */
//   const bleachers: Bleacher[] = [
//     makeBleacher({
//       bleacherId: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 7,
//     }),
//     makeBleacher({
//       bleacherId: 4,
//       summerHomeBase: { id: 3, name: "C" },
//       winterHomeBase: { id: 12, name: "W2" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 5,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 9,
//     }),
//   ];

//   const allSummerHBs = [1, 2, 3];
//   const allWinterHBs = [10, 11, 12];
//   const allRows = [5, 7, 9];

//   /** 6) Summer home base filtering only */
//   it("6 - filters by summer home base when no selections", () => {
//     const result = filterSortPixiBleachers(
//       [1], // only allow summer HB id=1
//       allWinterHBs, // don't constrain winter HB
//       allRows, // don't constrain rows
//       bleachers,
//       [],
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Only those with summer HB 1 should remain: 1,3,5
//     expect(ids).toEqual([1, 3, 5]);
//   });

//   /** 7) Winter home base filtering only */
//   it("7 - filters by winter home base when no selections", () => {
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       [10], // only allow winter HB id=10
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Winter HB 10 are: 1,2,5
//     expect(ids).toEqual([1, 2, 5]);
//   });

//   /** 8) Row filtering only */
//   it("8 - filters by rows when no selections", () => {
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       [5], // only rows=5
//       bleachers,
//       [],
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Rows=5 are: 1,2,4
//     expect(ids).toEqual([1, 2, 4]);
//   });

//   /** 9) Season=SUMMER: only summerAssigned remain (with broad base filters) */
//   it("9 - summer season shows only summerAssigned when no selections", () => {
//     const summerAssigned = [1, 5];
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 5]);
//   });

//   /** 10) Season=WINTER: only winterAssigned remain (with broad base filters) */
//   it("10 - winter season shows only winterAssigned when no selections", () => {
//     const winterAssigned = [1, 3, 4];
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       "WINTER",
//       [],
//       winterAssigned
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 3, 4]);
//   });

//   /** 11) No season: all pass with broad base filters */
//   it("11 - no season returns all with broad base filters when no selections", () => {
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4, 5]);
//   });
// });

// describe("Combined filters with season (no selections) — ensure intersections apply", () => {
//   /**
//    * Goal: Prove that season assignment does NOT override base filters. All base filters still apply first,
//    * then season gating reduces further. We validate a few key combinations.
//    */
//   const bleachers: Bleacher[] = [
//     makeBleacher({
//       bleacherId: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 7,
//     }),
//     makeBleacher({
//       bleacherId: 4,
//       summerHomeBase: { id: 3, name: "C" },
//       winterHomeBase: { id: 12, name: "W2" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 5,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 9,
//     }),
//   ];

//   const allSummerHBs = [1, 2, 3];
//   const allWinterHBs = [10, 11, 12];
//   const allRows = [5, 7, 9];

//   /** 12) Season=SUMMER + summer HB filter excludes an assigned bleacher */
//   it("12 - summer season respects summer HB filter (assigned but filtered out)", () => {
//     const summerAssigned = [1, 2]; // both 1 and 2 are assigned for summer
//     const result = filterSortPixiBleachers(
//       [1], // only summer HB 1 allowed; bleacher 2 has summer HB 2 and should be filtered out
//       allWinterHBs,
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1]);
//   });

//   /** 13) Season=SUMMER + rows filter excludes an assigned bleacher */
//   it("13 - summer season respects row filter (assigned but wrong rows)", () => {
//     const summerAssigned = [1, 5]; // 5 has rows=9
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       [5], // only rows=5 allowed
//       bleachers,
//       [],
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1]);
//   });

//   /** 14) Season=WINTER + winter HB filter excludes an assigned bleacher */
//   it("14 - winter season respects winter HB filter (assigned but filtered out)", () => {
//     const winterAssigned = [1, 3]; // 3 has winter HB 11
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       [10], // only winter HB 10 allowed
//       allRows,
//       bleachers,
//       [],
//       true,
//       true,
//       "WINTER",
//       [],
//       winterAssigned
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1]);
//   });

//   /** 15) Season=WINTER + rows filter excludes an assigned bleacher */
//   it("15 - winter season respects row filter (assigned but wrong rows)", () => {
//     const winterAssigned = [1, 3, 4]; // 3 has rows=7, 4 has rows=5
//     const result = filterSortPixiBleachers(
//       allSummerHBs,
//       allWinterHBs,
//       [7], // only rows=7 allowed (excludes 1 and 4)
//       bleachers,
//       [],
//       true,
//       true,
//       "WINTER",
//       [],
//       winterAssigned
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([3]);
//   });

//   /** 16) Season=SUMMER + intersect all: summer HB, winter HB, rows, and assignment to isolate a single bleacher */
//   it("16 - combined filters intersect correctly with summer season", () => {
//     const summerAssigned = [1, 2, 5];
//     const result = filterSortPixiBleachers(
//       [1], // summer HB 1 only
//       [10], // winter HB 10 only
//       [5], // rows 5 only
//       bleachers,
//       [],
//       true,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Only bleacher 1 matches all base filters and is assigned for summer
//     expect(ids).toEqual([1]);
//   });
// });

// // ------------------------------------------------------------
// // Additional coverage for form-collapsed scenarios and promotion
// // ------------------------------------------------------------

// describe("Form collapsed (isFormExpanded=false) still includes selected when optimizationMode=true", () => {
//   /**
//    * Purpose: Prove that selection does not depend on the form being expanded
//    * when optimization mode is ON; selected must still be included and original order preserved.
//    */
//   const bleachers: Bleacher[] = [
//     makeBleacher({
//       bleacherId: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 7,
//     }),
//     makeBleacher({
//       bleacherId: 4,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//   ];
//   const summerAllowed = [1];
//   const winterAllowed = [10];
//   const rowsAllowed = [5];
//   const selected = [2, 3, 4];

//   it("selected are included and order preserved with form collapsed (optimizationMode=true)", () => {
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       false, // form collapsed
//       true, // optimization mode ON ensures inclusion even when form collapsed
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Even though 2 fails winter HB and 3 fails rows, they must be present; order preserved
//     expect(ids).toEqual([1, 2, 3, 4]);
//   });

//   it("selected bypass season gating with form collapsed (optimizationMode=true)", () => {
//     const summerAssigned = [1, 4]; // 2 and 3 not assigned for summer
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       false,
//       true,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // All still present and in original order
//     expect(ids).toEqual([1, 2, 3, 4]);
//   });

//   it("selected bypass winter assigned gating with form collapsed (optimizationMode=true)", () => {
//     const winterAssigned = [1, 4];
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       false,
//       true,
//       "WINTER",
//       [],
//       winterAssigned
//     );
//     const ids = result.map((b) => b.bleacherId);
//     expect(ids).toEqual([1, 2, 3, 4]);
//   });
// });

// describe("Optimization mode OFF promotes selected (and includes them despite filters)", () => {
//   /**
//    * Purpose: With optimizationMode=false, selected must be included AND promoted to the top
//    * as long as the form is expanded. Also verify inclusion against season gating.
//    */
//   const bleachers: Bleacher[] = [
//     makeBleacher({
//       bleacherId: 1,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 2,
//       summerHomeBase: { id: 2, name: "B" },
//       winterHomeBase: { id: 11, name: "W1" },
//       bleacherRows: 5,
//     }),
//     makeBleacher({
//       bleacherId: 3,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 7,
//     }),
//     makeBleacher({
//       bleacherId: 4,
//       summerHomeBase: { id: 1, name: "A" },
//       winterHomeBase: { id: 10, name: "W" },
//       bleacherRows: 5,
//     }),
//   ];
//   const summerAllowed = [1];
//   const winterAllowed = [10];
//   const rowsAllowed = [5];
//   const selected = [2, 3, 4];

//   it("selected promoted to top when optimizationMode=false (form expanded)", () => {
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       true, // form expanded enables inclusion when opt mode is off
//       false, // optimization mode off -> promotion expected
//       null,
//       [],
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Selected first, relative order preserved
//     expect(ids.slice(0, 3)).toEqual([2, 3, 4]);
//     // Remaining filtered passer (1) after
//     expect(ids).toEqual([2, 3, 4, 1]);
//   });

//   it("selected promoted and included despite summer season gating when optimizationMode=false", () => {
//     const summerAssigned = [1, 4]; // 2 and 3 are not assigned for summer
//     const result = filterSortPixiBleachers(
//       summerAllowed,
//       winterAllowed,
//       rowsAllowed,
//       bleachers,
//       selected,
//       true,
//       false,
//       "SUMMER",
//       summerAssigned,
//       []
//     );
//     const ids = result.map((b) => b.bleacherId);
//     // Selected should still be included and at the top
//     expect(ids.slice(0, 3)).toEqual([2, 3, 4]);
//     // Bleacher 1 (assigned) follows
//     expect(ids).toEqual([2, 3, 4, 1]);
//   });
// });
