#!/usr/bin/env bun
import { mkdir, access, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { FUNES_REVISION } from '../src/config.ts';

const root = resolve(import.meta.dir,'..');
const build = resolve(process.env.FUNES_BUILD_DIR ?? join(root,'.build/funes'));
const source = join(build,'source');
const patch = join(root,'patches/funes.patch');
await access(patch);
await mkdir(build,{recursive:true});
async function run(args: string[], cwd=build): Promise<void> {
  const child = Bun.spawn(args,{cwd,stdin:'inherit',stdout:'inherit',stderr:'inherit',env:{...process.env,CARGO_BUILD_JOBS:process.env.CARGO_BUILD_JOBS ?? '2',CARGO_PROFILE_DEV_DEBUG:'0',CARGO_PROFILE_DEV_OPT_LEVEL:'1',CARGO_PROFILE_DEV_INCREMENTAL:'false',RUSTFLAGS:'-C link-arg=-fuse-ld=lld'}});
  if (await child.exited !== 0) throw new Error(`Build command failed: ${args[0]}`);
}
if (!await Bun.file(join(source,'.git/HEAD')).exists()) {
  await run(['git','clone','--no-checkout','https://github.com/huggingface/funes.git',source]);
  await run(['git','checkout','--detach',FUNES_REVISION],source);
  await run(['git','apply','--check',patch],source);
  await run(['git','apply','--index',patch],source);
} else {
  const revision = Bun.spawn(['git','rev-parse','HEAD'],{cwd:source,stdout:'pipe',stderr:'inherit'});
  const current = (await new Response(revision.stdout).text()).trim();
  if (await revision.exited !== 0 || current !== FUNES_REVISION) throw new Error('Existing build source is not the pinned revision; choose a fresh FUNES_BUILD_DIR');
  const diff = Bun.spawn(['git','diff','HEAD','--binary'],{cwd:source,stdout:'pipe',stderr:'inherit'});
  const actual = await new Response(diff.stdout).text();
  const extras = Bun.spawn(['git','ls-files','--others','--exclude-standard'],{cwd:source,stdout:'pipe',stderr:'inherit'});
  const untracked = (await new Response(extras.stdout).text()).trim();
  if (await diff.exited !== 0 || await extras.exited !== 0 || untracked || actual !== await Bun.file(patch).text()) throw new Error('Cached source differs from the complete pinned patch; choose a fresh FUNES_BUILD_DIR');
}
await run(['cargo','build','--locked'],source);
await mkdir(join(build,'bin'),{recursive:true});
await copyFile(join(resolve(source,process.env.CARGO_TARGET_DIR ?? 'target'),'debug/funes'),join(build,'bin/funes'));
console.log(`Patched Funes: ${join(build,'bin/funes')}`);
