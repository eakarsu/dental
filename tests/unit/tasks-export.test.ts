import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTaskInput, toCsv } from '../../lib/tasks-export';

describe('dental tasks and export helpers', () => {
  it('requires a task title and defaults status to OPEN', () => {
    assert.throws(() => parseTaskInput({}), /Title is required/);
    assert.equal(parseTaskInput({ title: ' Call patient ' }).status, 'OPEN');
    assert.equal(parseTaskInput({ title: 'X', status: 'BOGUS' }).status, 'OPEN');
  });
  it('CSV export preserves false and 0 values', () => {
    const csv = toCsv([{ name: 'Ana', visits: 0, active: false }], ['name', 'visits', 'active']);
    assert.match(csv, /Ana,0,false/);
  });
});
