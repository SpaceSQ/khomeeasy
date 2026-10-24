import assert from 'node:assert/strict';
import { workspaceForRole } from './workspace.ts';

assert.equal(workspaceForRole('installer'), 'installer');
assert.equal(workspaceForRole('homeowner'), 'owner');
assert.equal(workspaceForRole(null), 'unknown');
assert.equal(workspaceForRole(undefined), 'unknown');
assert.equal(workspaceForRole(''), 'unknown');
assert.equal(workspaceForRole('architect'), 'unknown');
assert.equal(workspaceForRole('admin'), 'unknown');
