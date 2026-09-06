import test from 'node:test';
import assert from 'node:assert/strict';
import {chmod, mkdtemp, readFile, readlink, realpath, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CODEX_BIN_ENV,
  CODEX_MODEL,
  VERIFIED_CODEX_VERSION,
  StudyChatProviderError,
  createCodexStudyProvider,
  resolveCodexExecutable,
  runCodexChild,
} from '../chat-provider.mjs';

const startupDenial = 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';

function eventStream(reply = 'Try a tiny example first. What state must remain true?') {
  return [
    {type:'thread.started', thread_id:'synthetic'},
    {type:'item.completed', item:{type:'error', message:startupDenial}},
    {type:'turn.started'},
    {type:'item.completed', item:{type:'agent_message', text:reply}},
    {type:'turn.completed', usage:{}},
  ].map(event => JSON.stringify(event)).join('\n');
}

test('Codex executable resolution uses a synthetic PATH or absolute local override', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'padipps-bin-test-'));
  const executable = path.join(root, 'codex');
  await writeFile(executable, '#!/bin/sh\nexit 0\n');
  await chmod(executable, 0o700);
  try {
    const resolved = await realpath(executable);
    assert.equal(await resolveCodexExecutable({env:{PATH:root}, platform:'linux'}), resolved);
    assert.equal(await resolveCodexExecutable({env:{PATH:'', [CODEX_BIN_ENV]:executable}, platform:'darwin'}), resolved);
    await assert.rejects(resolveCodexExecutable({env:{PATH:'', [CODEX_BIN_ENV]:'relative/codex'}, platform:'linux'}), /absolute executable path/);
    await assert.rejects(resolveCodexExecutable({env:{PATH:root}, platform:'win32'}), /macOS and Linux/);
  } finally {
    await rm(root, {recursive:true, force:true});
  }
});

test('provider links synthetic auth without reading it and pins the verified no-tool invocation', async () => {
  const authRoot = await mkdtemp(path.join(os.tmpdir(), 'padipps-auth-test-'));
  const authFile = path.join(authRoot, 'auth.json');
  await writeFile(authFile, 'synthetic-only');
  const calls = [];
  const provider = createCodexStudyProvider({executable:'/synthetic/codex', authFile, platform:'linux', run:async options => {
    calls.push(options);
    if (options.args[0] === '--version') return {stdout:`codex-cli ${VERIFIED_CODEX_VERSION}\n`, stderr:'', exitCode:0};
    assert.equal(await readlink(path.join(options.env.CODEX_HOME, 'auth.json')), authFile);
    return {stdout:eventStream(), stderr:'', exitCode:0};
  }});
  try {
    assert.equal((await provider.status()).available, true);
    const result = await provider.complete('SYNTHETIC STUDY PROMPT');
    assert.deepEqual(result, {reply:'Try a tiny example first. What state must remain true?', provider:'codex', model:CODEX_MODEL});
    const invocation = calls.at(-1);
    assert.equal(invocation.input, 'SYNTHETIC STUDY PROMPT');
    assert.ok(!invocation.args.includes('SYNTHETIC STUDY PROMPT'));
    assert.deepEqual(Object.keys(invocation.env).sort(), ['CODEX_HOME', 'HOME', 'PATH', 'TMPDIR']);
    assert.equal(invocation.env.HOME, invocation.env.TMPDIR);
    assert.equal(invocation.cwd, path.join(invocation.env.TMPDIR, 'workspace'));
    for (const argument of ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config', 'read-only', '--json', CODEX_MODEL, 'approval_policy="never"', 'web_search="disabled"', 'project_doc_max_bytes=0', 'project_doc_fallback_filenames=[]', 'project_root_markers=[]', 'memories.use_memories=false', 'memories.generate_memories=false', 'mcp_servers={}']) {
      assert.ok(invocation.args.includes(argument), argument);
    }
    for (const feature of ['shell_tool', 'shell_snapshot', 'code_mode_host', 'apps', 'plugins', 'multi_agent', 'skill_search', 'browser_use', 'standalone_web_search', 'memories', 'external_agent_memory_import']) {
      const index = invocation.args.indexOf(feature);
      assert.ok(index > 0 && invocation.args[index - 1] === '--disable', feature);
    }
    assert.equal(invocation.args.at(-1), '-');
  } finally {
    await rm(authRoot, {recursive:true, force:true});
  }
});

test('provider rejects dispatch events, version drift, and unsupported Windows boundaries', async () => {
  const authRoot = await mkdtemp(path.join(os.tmpdir(), 'padipps-auth-test-'));
  const authFile = path.join(authRoot, 'auth.json');
  await writeFile(authFile, '{}');
  let response = {stdout:eventStream(), stderr:'codex_core::tools::router: error=code-mode host is disabled', exitCode:0};
  const provider = createCodexStudyProvider({executable:'/synthetic/codex', authFile, platform:'linux', run:async options => options.args[0] === '--version'
    ? {stdout:`codex-cli ${VERIFIED_CODEX_VERSION}\n`, stderr:'', exitCode:0}
    : response});
  try {
    await assert.rejects(provider.complete('Try a tool.'), error => error instanceof StudyChatProviderError && error.code === 'tool_attempt');
    response = {stdout:`${eventStream()}\n${JSON.stringify({type:'item.completed', item:{type:'command_execution'}})}`, stderr:'', exitCode:0};
    await assert.rejects(provider.complete('Try again.'), error => error instanceof StudyChatProviderError && error.code === 'unexpected_event');
    const drifted = createCodexStudyProvider({executable:'/synthetic/codex', platform:'linux', run:async()=>({stdout:'codex-cli 0.148.0\n', stderr:'', exitCode:0})});
    assert.equal((await drifted.status()).available, false);
    await assert.rejects(drifted.complete('Do not start.'), /found 0\.148\.0; verified 0\.147\.0/);
    const windows = createCodexStudyProvider({executable:'C:\\codex.exe', platform:'win32', run:async()=>assert.fail('Windows must not spawn.')});
    assert.equal((await windows.status()).available, false);
    await assert.rejects(windows.complete('Do not start.'), /unsupported process boundary/);
  } finally {
    await rm(authRoot, {recursive:true, force:true});
  }
});

async function waitForPidFile(file) {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch { await new Promise(resolve => setTimeout(resolve, 10)); }
  }
  throw new Error('Synthetic child did not publish its process ids.');
}

async function waitUntilGone(pid) {
  const deadline = Date.now() + 1_000;
  while (Date.now() < deadline) {
    try { process.kill(pid, 0); }
    catch (error) { if (error.code === 'ESRCH') return; throw error; }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`Synthetic process ${pid} survived group termination.`);
}

test('cancel and timeout reap a stubborn synthetic wrapper and grandchild', async () => {
  if (!['darwin', 'linux'].includes(process.platform)) return;
  const root = await mkdtemp(path.join(os.tmpdir(), 'padipps-process-test-'));
  const script = path.join(root, 'stubborn-tree.mjs');
  await writeFile(script, `
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
process.on('SIGTERM', () => {});
const grandchild = spawn(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], {stdio:'ignore'});
writeFileSync(process.argv[2], JSON.stringify({wrapper:process.pid, grandchild:grandchild.pid}));
setInterval(() => {}, 1000);
`);
  try {
    for (const mode of ['cancel', 'timeout']) {
      const pidFile = path.join(root, `${mode}.json`);
      const controller = new AbortController();
      const running = runCodexChild({
        executable:process.execPath,
        args:[script, pidFile],
        cwd:root,
        env:{PATH:process.env.PATH},
        signal:controller.signal,
        timeoutMs:mode === 'timeout' ? 150 : 5_000,
      });
      const pids = await waitForPidFile(pidFile);
      if (mode === 'cancel') controller.abort();
      await assert.rejects(running, error => error instanceof StudyChatProviderError
        && error.code === (mode === 'cancel' ? 'aborted' : 'provider_unavailable'));
      await waitUntilGone(pids.wrapper);
      await waitUntilGone(pids.grandchild);
    }
  } finally {
    await rm(root, {recursive:true, force:true});
  }
});
