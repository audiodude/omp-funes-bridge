#!/usr/bin/env bun
import { mkdir, lstat, copyFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { canonical, FUNES_REPOSITORY, FUNES_REVISION, inside, isMissing, verifyFunesBinary } from '../src/config.ts';

const root = resolve(import.meta.dir,'..');
const build = await canonical(resolve(process.env.FUNES_BUILD_DIR ?? join(root,'.build/funes')));
const source = join(build,'source');
const target = await canonical(resolve(process.env.CARGO_TARGET_DIR ?? join(build,'target')));
if (inside(target,source)) throw new Error('CARGO_TARGET_DIR must be outside the pinned source checkout');
await mkdir(build,{recursive:true});
async function run(args: string[], cwd=build): Promise<void> {
  const child = Bun.spawn(args,{cwd,stdin:'inherit',stdout:'inherit',stderr:'inherit',env:{...process.env,CARGO_TARGET_DIR:target,CARGO_BUILD_JOBS:process.env.CARGO_BUILD_JOBS ?? '2',CARGO_PROFILE_DEV_DEBUG:'0',CARGO_PROFILE_DEV_OPT_LEVEL:'1',CARGO_PROFILE_DEV_INCREMENTAL:'false',RUSTFLAGS:'-C link-arg=-fuse-ld=lld'}});
  if (await child.exited !== 0) throw new Error(`Build command failed: ${args[0]}`);
}
async function git(args: string[]): Promise<string> {
  const child = Bun.spawn(['git',...args],{cwd:source,stdin:'ignore',stdout:'pipe',stderr:'inherit'});
  const text = await new Response(child.stdout).text();
  if (await child.exited !== 0) throw new Error('Cannot verify pinned Funes source checkout');
  return text.trim();
}
async function verifySource(): Promise<void> {
  if (await git(['remote','get-url','--all','origin']) !== FUNES_REPOSITORY ||
      await git(['rev-parse','HEAD']) !== FUNES_REVISION ||
      await git(['diff','HEAD','--binary']) ||
      await git(['diff','--cached','--binary']) ||
      await git(['ls-files','--others'])) {
    throw new Error('Cached source has the wrong fork/revision or dirty/extra files; choose a fresh FUNES_BUILD_DIR');
  }
}
const existing = await lstat(source).catch(error => { if (isMissing(error)) return undefined; throw error; });
if (!existing) {
  await run(['git','clone','--no-checkout',FUNES_REPOSITORY,source]);
  await run(['git','checkout','--detach',FUNES_REVISION],source);
} else if (!existing.isDirectory() || existing.isSymbolicLink()) {
  throw new Error('Cached source must be a real checkout directory');
}
await verifySource();
await run(['cargo','build','--locked'],source);
await verifySource();
const binary = join(target,'debug/funes');
const sha256 = await verifyFunesBinary(binary);
await mkdir(join(build,'bin'),{recursive:true});
const destination = join(build,'bin/funes');
await copyFile(binary,destination);
console.log(JSON.stringify({binary:destination,repository:FUNES_REPOSITORY,revision:FUNES_REVISION,sha256},null,2));
