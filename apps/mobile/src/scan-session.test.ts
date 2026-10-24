import assert from 'node:assert/strict';
import { accessTokenStillValid, approveUrl, shouldRefreshAccessToken } from './scan-session.ts';

const now = Date.parse('2026-10-24T04:30:00Z');
assert.equal(shouldRefreshAccessToken(undefined, now), false);
assert.equal(shouldRefreshAccessToken(0, now), false);
assert.equal(shouldRefreshAccessToken(Math.floor(now / 1000) + 3600, now), false);
assert.equal(shouldRefreshAccessToken(Math.floor(now / 1000) + 30, now), true);
assert.equal(accessTokenStillValid(undefined, now), true);
assert.equal(accessTokenStillValid(Math.floor(now / 1000) - 5, now), false);
assert.equal(approveUrl('https://khomeeasy.qianjia.com'), 'https://khomeeasy.qianjia.com/api/login-challenges/approve');
assert.equal(approveUrl('https://khomeeasy.qianjia.com/'), 'https://khomeeasy.qianjia.com/api/login-challenges/approve');
