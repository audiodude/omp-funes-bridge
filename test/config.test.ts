import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonical, inside } from '../src/config.ts';

test('missing direct root descendants retain their first basename character',async () => {
  const path = `/omp-funes-missing-${crypto.randomUUID()}/sessions`;
  expect(await canonical(path)).toBe(path);
});

test('canonical enrollment resolves existing symlink ancestors without accepting prefix siblings',async () => {
  const root = await mkdtemp(join(tmpdir(),'funes-boundary-'));
  try {
    await mkdir(join(root,'real'));
    await symlink(join(root,'real'),join(root,'alias'));
    const enrolled = await canonical(join(root,'alias','sessions'));
    expect(enrolled).toBe(join(root,'real','sessions'));
    expect(inside(join(enrolled,'child','session.jsonl'),enrolled)).toBe(true);
    expect(inside(`${enrolled}-other/session.jsonl`,enrolled)).toBe(false);
  } finally { await rm(root,{recursive:true,force:true}); }
});
