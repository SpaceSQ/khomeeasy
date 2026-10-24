import assert from 'node:assert/strict';
import { productionWebOrigin, resolveWebOrigin } from './web-origin.ts';

assert.equal(resolveWebOrigin(undefined), productionWebOrigin);
assert.equal(resolveWebOrigin(''), productionWebOrigin);
assert.equal(resolveWebOrigin('   '), productionWebOrigin);
assert.equal(resolveWebOrigin('http://MacBook-Air-2.local:3015'), productionWebOrigin);
assert.equal(resolveWebOrigin('http://127.0.0.1:3015'), productionWebOrigin);
assert.equal(resolveWebOrigin('http://192.168.1.8:3015'), productionWebOrigin);
assert.equal(resolveWebOrigin('http://10.0.0.4:3015'), productionWebOrigin);
assert.equal(resolveWebOrigin('https://khomeeasy.qianjia.com'), productionWebOrigin);
assert.equal(resolveWebOrigin('https://khomeeasy.qianjia.com/'), productionWebOrigin);
assert.equal(resolveWebOrigin('https://example.com/app'), 'https://example.com');
assert.equal(resolveWebOrigin('not a url'), productionWebOrigin);
