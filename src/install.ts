import { getActiveProfile, getAgentDir, getSessionsDir } from '@oh-my-pi/pi-utils/dirs';
import { access, mkdir, readFile, readdir, rmdir, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { atomicJson, canonical, CONFIG_NAME, FUNES_REVISION, hashFile, isMissing, object, OMP_VERSION, OWNER, parseConfig, SERVER_NAME, type Config } from './config.ts';

export interface InstallOptions { agentDir?: string; roots: string[]; memoryHome?: string; funesBin: string; ompBin: string }
const OWNED_FILES = ['index.ts','config.ts','scheduler.ts'];
const POLICY = 'omp-text-graph-v2';

function server(config: Config): Record<string, unknown> {
  return {type:'stdio',command:config.funesBin,args:['mcp',join(config.memoryHome,'memory')],env:{FUNES_HOME:config.memoryHome,RAYON_NUM_THREADS:'1',TOKIO_WORKER_THREADS:'2'},timeout:120000};
}
async function document(path: string): Promise<Record<string, unknown> | undefined> {
  try { return object(JSON.parse(await readFile(path, 'utf8'))); }
  catch (error) { if (isMissing(error)) return undefined; throw error; }
}
async function command(command: string, args: string[]): Promise<string> {
  const process = Bun.spawn([command,...args], {stdin:'ignore',stdout:'pipe',stderr:'ignore'});
  const text = await new Response(process.stdout).text();
  if (await process.exited !== 0) throw new Error('Compatibility command failed');
  return text.trim();
}
function same(a: unknown, b: unknown): boolean {
  // Configuration is JSON data; compare key ordering independently from semantics.
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v,i) => same(v,b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    const av = object(a), bv = object(b);
    return Object.keys(av).length === Object.keys(bv).length && Object.entries(av).every(([k,v]) => Object.hasOwn(bv,k) && same(v,bv[k]));
  }
  return false;
}
async function verifyOwnedFiles(directory: string): Promise<void> {
  const manifest = await document(join(directory, 'installation.json'));
  if (!manifest || manifest.owner !== OWNER) throw new Error('Extension directory is not bridge-owned');
  const files = object(manifest.files);
  for (const name of OWNED_FILES) {
    if (typeof files[name] !== 'string' || await hashFile(join(directory,name)) !== files[name]) throw new Error('Installed bridge file was modified; refusing to overwrite/remove it');
  }
}

/** Explicit setup approval is the install invocation; no source is indexed by this command. */
export async function install(options: InstallOptions): Promise<Config> {
  if ((options.agentDir || getActiveProfile() || process.env.PI_CODING_AGENT_DIR) && options.roots.length === 0) throw new Error('Custom agent directories/profiles require explicit --source enrollment');
  const agentDir = await canonical(options.agentDir ?? getAgentDir());
  const roots = await Promise.all((options.roots.length ? options.roots : [getSessionsDir()]).map(canonical));
  const memoryHome = await canonical(options.memoryHome ?? join(homedir(),'.omp-funes-bridge'));
  const funesBin = await canonical(options.funesBin);
  await access(funesBin, constants.X_OK);
  if (await command(options.ompBin,['--version']) !== `omp/${OMP_VERSION}`) throw new Error(`Requires OMP ${OMP_VERSION}`);
  const help = await command(funesBin,['index','--help']);
  if (!help.includes('--omp-max-chunks')) throw new Error('Requires the recorded patched Funes build, not stock Funes');
  const config: Config = {version:1,agentDir,roots:[...new Set(roots)],memoryHome,funesBin,binarySha256:await hashFile(funesBin),pollMs:10000,maxChunks:128};
  const configPath = join(agentDir, CONFIG_NAME);
  const oldDocument = await document(configPath);
  const previous = oldDocument ? parseConfig(oldDocument) : undefined;
  const extensionDir = join(agentDir,'extensions',OWNER);
  const mcpPath = join(agentDir,'mcp.json');
  const mcp = await document(mcpPath) ?? {};
  const servers = mcp.mcpServers === undefined ? {} : object(mcp.mcpServers);
  if (servers[SERVER_NAME] !== undefined && (!previous || !same(servers[SERVER_NAME],server(previous)))) throw new Error('MCP server name belongs to another or modified integration');
  if (Array.isArray(mcp.disabledServers) && mcp.disabledServers.includes(SERVER_NAME)) throw new Error('Bridge MCP server is explicitly disabled; preserve that decision');
  const existingFiles = await readdir(extensionDir).catch(error => { if (isMissing(error)) return []; throw error; });
  if (existingFiles.length) await verifyOwnedFiles(extensionDir);
  const ownership = await document(join(memoryHome,'bridge-owner.json'));
  if (ownership && (ownership.owner !== OWNER || ownership.policy !== POLICY)) throw new Error('Memory belongs to another integration/policy');
  const memoryFiles = await readdir(memoryHome).catch(error => { if (isMissing(error)) return []; throw error; });
  if (memoryFiles.length && !ownership) throw new Error('Refusing to mix with an existing unowned memory; choose an empty --memory directory');
  // All ownership and compatibility checks precede changes. Transcripts are never edited.
  for (const root of roots) await mkdir(root,{recursive:true,mode:0o700});
  await mkdir(extensionDir,{recursive:true,mode:0o700});
  await atomicJson(join(memoryHome,'bridge-owner.json'),{owner:OWNER,policy:POLICY,funesRevision:FUNES_REVISION,ompVersion:OMP_VERSION});
  const hashes: Record<string,string> = {};
  const sources: Record<string,string> = {'index.ts':'extension.ts','config.ts':'config.ts','scheduler.ts':'scheduler.ts'};
  for (const name of OWNED_FILES) {
    const bytes = await readFile(new URL(sources[name]!, import.meta.url));
    await Bun.write(join(extensionDir,name),bytes,{mode:0o600});
    hashes[name] = await hashFile(join(extensionDir,name));
  }
  await atomicJson(join(extensionDir,'installation.json'),{owner:OWNER,files:hashes});
  // Refuse a concurrent unrelated edit rather than clobbering it with the stale snapshot.
  if (!same(await document(mcpPath) ?? {},mcp)) throw new Error('MCP configuration changed during installation; rerun to merge safely');
  await atomicJson(configPath,config);
  await atomicJson(mcpPath,{...mcp,mcpServers:{...servers,[SERVER_NAME]:server(config)}});
  return config;
}

export async function uninstall(agentDir: string): Promise<void> {
  const dir = await canonical(agentDir);
  const configPath = join(dir,CONFIG_NAME);
  const old = await document(configPath);
  if (!old) return;
  const config = parseConfig(old);
  if (config.agentDir !== dir) throw new Error('Installation directory mismatch');
  const extensionDir = join(dir,'extensions',OWNER);
  await verifyOwnedFiles(extensionDir);
  const mcpPath = join(dir,'mcp.json');
  const mcp = await document(mcpPath) ?? {};
  const servers = mcp.mcpServers === undefined ? {} : object(mcp.mcpServers);
  if (servers[SERVER_NAME] !== undefined && !same(servers[SERVER_NAME],server(config))) throw new Error('Bridge MCP entry was modified; refusing to remove it');
  const remaining = {...servers};
  delete remaining[SERVER_NAME];
  if (!same(await document(mcpPath) ?? {},mcp)) throw new Error('MCP configuration changed; retry removal');
  await atomicJson(mcpPath,{...mcp,mcpServers:remaining});
  for (const name of [...OWNED_FILES,'installation.json']) await unlink(join(extensionDir,name));
  await rmdir(extensionDir).catch(error => {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOTEMPTY')) throw error;
  });
  await unlink(configPath);
  // Original sessions, derived memory, scan receipts, and other OMP backends remain untouched.
}
