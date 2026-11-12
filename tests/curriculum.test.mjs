import { test } from "node:test";
import assert from "node:assert/strict";
import { catalog, componentChoices, validateAcademicSelection } from "../lib/curriculum.ts";

test("catalog preserves all source credits and explicit lab parents", () => {
  assert.equal(catalog.length, 113);
  assert.equal(catalog.filter(c => c.parentCode).length, 38);
  assert.equal(new Set(catalog.map(c => c.code)).size, 113);
  for (const component of catalog.filter(c => c.parentCode)) {
    assert.equal(component.units, 0);
    assert.ok(catalog.some(parent => parent.code === component.parentCode && !parent.parentCode));
  }
  assert.deepEqual([1,2,3,4].flatMap(year => [1,2].map(semester =>
    catalog.filter(c=>c.year===year && c.semester===semester).reduce((n,c)=>n+c.units,0))),
    [23,26,23,23,21,19,21,9]);
});

test("unresolved subjects stay inactive and lab choices follow the parent", () => {
  assert.ok(catalog.filter(c=>c.code.startsWith("IT Elective") || c.code==="add101" || c.track || c.code.startsWith("NSTP")).every(c=>!c.active));
  assert.deepEqual(componentChoices("ITCC41").map(c=>c.code), ["ITCC41","ITCC41A"]);
  assert.equal(componentChoices("ITCC41")[1].units, 0);
});

test("academic choices reject forged links and preserve text class codes", () => {
  const input={ classCode:"00123", parentCode:"ITCC41", componentCode:"ITCC41A", year:1, semester:1 };
  assert.equal(validateAcademicSelection(input), null);
  assert.match(validateAcademicSelection({...input,componentCode:"ITCC44A"}), /component/i);
  assert.match(validateAcademicSelection({...input,year:2}), /year/i);
  assert.match(validateAcademicSelection({...input,classCode:"   "}), /class code/i);
  assert.match(validateAcademicSelection({...input,parentCode:"IT Elective 1",componentCode:"IT Elective 1"}), /inactive/i);
});
