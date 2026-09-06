/** Fail-closed adapter from the opt-in local Padipps server to the installer's Codex CLI. */
import {spawn} from 'node:child_process';
import {access, mkdir, mkdtemp, realpath, rm, symlink} from 'node:fs/promises';
import {constants as fsConstants} from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CODEX_MODEL = 'gpt-5.6-sol';
export const VERIFIED_CODEX_VERSION = '0.147.0';
export const CODEX_BIN_ENV = 'PADIPPS_CODEX_BIN';

const STARTUP_DENIAL = 'Code Mode is unavailable because code-mode host is disabled. Code mode will fail closed; enable `features.code_mode_host` and install `codex-code-mode-host`.';
const MAX_STDOUT_BYTES = 128 * 1024;
const MAX_STDERR_BYTES = 32 * 1024;
const MAX_REPLY_CHARS = 4_000;
const PROBE_TIMEOUT_MS = 3_000;
const COMPLETE_TIMEOUT_MS = 30_000;
const POSIX_PLATFORMS = new Set(['darwin', 'linux']);

const disabledFeatures = [
  'shell_tool', 'unified_exec', 'code_mode', 'code_mode_host', 'code_mode_only',
  'code_mode_buffered_exec', 'deferred_executor', 'request_permissions_tool',
  'token_budget', 'current_time_reminder', 'computer_use', 'browser_use',
  'browser_use_external', 'browser_use_full_cdp_access', 'in_app_browser',
  'image_generation', 'view_image', 'artifact', 'apps', 'enable_mcp_apps',
  'plugins', 'plugin_sharing', 'remote_plugin', 'hooks', 'multi_agent',
  'multi_agent_v2', 'skill_search', 'skill_mcp_dependency_install',
  'workspace_dependencies', 'standalone_web_search', 'tool_suggest', 'goals',
  'unavailable_dummy_tools', 'memories', 'external_agent_memory_import',
  'chronicle', 'shell_snapshot', 'recommended_plugins', 'use_agent_identity',
  'personality', 'auth_elicitation', 'tool_call_mcp_elicitation',
];

const fixedConfig = [
  'approval_policy="never"',
  'include_environment_context=false',
  'include_apps_instructions=false',
  'include_collaboration_mode_instructions=false',
  'include_permissions_instructions=false',
  'tools.update_plan.enabled=false',
  'tools.experimental_request_user_input.enabled=false',
  'web_search="disabled"',
  'agents.enabled=false',
  'orchestrator.skills.enabled=false',
  'orchestrator.mcp.enabled=false',
  'project_doc_max_bytes=0',
  'project_doc_fallback_filenames=[]',
  'project_root_markers=[]',
  'memories.use_memories=false',
  'memories.generate_memories=false',
  'mcp_servers={}',
  'cli_auth_credentials_store="file"',
];

export class StudyChatProviderError extends Error {
  constructor(message, code = 'provider_error') {
    super(message);
    this.name = 'StudyChatProviderError';
    this.code = code;
  }
}

export class StudyChatProviderUnavailableError extends StudyChatProviderError {
  constructor(message = 'The local Codex study connection is unavailable.') {
    super(message, 'provider_unavailable');
    this.name = 'StudyChatProviderUnavailableError';
  }
}

export function defaultAuthFile(env = process.env) {
  const configuredHome = env.CODEX_HOME;
  const codexHome = configuredHome && path.isAbsolute(configuredHome)
    ? configuredHome
    : path.join(env.HOME || os.homedir(), '.codex');
  return path.join(codexHome, 'auth.json');
}

export async function resolveCodexExecutable({env = process.env, platform = process.platform} = {}) {
  if (!POSIX_PLATFORMS.has(platform)) throw new StudyChatProviderUnavailableError('Local Codex study chat is supported only on macOS and Linux.');
  const override = env[CODEX_BIN_ENV];
  if (override && !path.isAbsolute(override)) throw new StudyChatProviderUnavailableError(`${CODEX_BIN_ENV} must be an absolute executable path.`);
  const candidates = override
    ? [override]
    : String(env.PATH || '').split(path.delimiter).filter(Boolean).map(directory => path.join(directory, 'codex'));
  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK);
      return await realpath(candidate);
    } catch {}
  }
  throw new StudyChatProviderUnavailableError(override
    ? `Codex is not executable at the ${CODEX_BIN_ENV} path.`
    : 'Codex was not found on the server process PATH.');
}

function cleanEnvironment(tempRoot, codexHome, executable) {
  const systemPath = process.platform === 'darwin'
    ? ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin']
    : ['/usr/local/bin', '/usr/bin', '/bin'];
  return {
    HOME: tempRoot,
    CODEX_HOME: codexHome,
    PATH: [...new Set([path.dirname(executable), ...systemPath])].join(path.delimiter),
    TMPDIR: tempRoot,
  };
}

function baseArguments(cwd) {
  const args = [
    'exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--strict-config',
    '--sandbox', 'read-only', '--skip-git-repo-check', '--json', '--model', CODEX_MODEL,
  ];
  for (const value of fixedConfig) args.push('-c', value);
  for (const feature of disabledFeatures) args.push('--disable', feature);
  args.push('-C', cwd, '-');
  return args;
}

function terminateProcessGroup(child) {
  const signal = value => {
    if (child.pid) {
      try { process.kill(-child.pid, value); return; }
      catch (error) { if (error.code === 'ESRCH') return; }
    }
    try { child.kill(value); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  signal('SIGTERM');
  const timer = setTimeout(() => signal('SIGKILL'), 750);
  child.once('close', () => {
    clearTimeout(timer);
    signal('SIGKILL');
  });
  timer.unref();
}

function parseJsonLines(stdout, stderr, exitCode) {
  if (/codex_core::tools::router:\s+error=/u.test(stderr)) {
    throw new StudyChatProviderError('Codex attempted a disabled tool. The response was discarded.', 'tool_attempt');
  }
  let threadStarted = false;
  let denialSeen = false;
  let turnStarted = false;
  let turnCompleted = false;
  const replies = [];
  for (const line of stdout.split(/\r?\n/u)) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); }
    catch { throw new StudyChatProviderError('Codex returned an unreadable event stream.', 'invalid_stream'); }
    if (event.type === 'thread.started' && !threadStarted && !denialSeen) {
      threadStarted = true;
      continue;
    }
    if (event.type === 'item.completed' && event.item?.type === 'error'
      && event.item.message === STARTUP_DENIAL && threadStarted && !turnStarted && !denialSeen) {
      denialSeen = true;
      continue;
    }
    if (event.type === 'turn.started' && denialSeen && !turnStarted) {
      turnStarted = true;
      continue;
    }
    if (event.type === 'item.completed' && event.item?.type === 'agent_message'
      && typeof event.item.text === 'string' && turnStarted && !turnCompleted) {
      replies.push(event.item.text);
      continue;
    }
    if (event.type === 'turn.completed' && turnStarted && !turnCompleted && replies.length) {
      turnCompleted = true;
      continue;
    }
    throw new StudyChatProviderError('Codex exposed an unexpected tool or event. The response was discarded.', 'unexpected_event');
  }
  if (exitCode !== 0) throw new StudyChatProviderUnavailableError('Codex could not complete the study response.');
  if (!threadStarted || !denialSeen) throw new StudyChatProviderError('The structural tool-denial marker was missing.', 'unsafe_configuration');
  if (!turnStarted || !turnCompleted || !replies.length) throw new StudyChatProviderError('Codex returned an incomplete response.', 'incomplete_stream');
  const reply = replies.at(-1).trim();
  if (!reply) throw new StudyChatProviderError('Codex returned an empty response.', 'empty_response');
  if (Array.from(reply).length > MAX_REPLY_CHARS) throw new StudyChatProviderError('Codex exceeded the reply limit.', 'output_too_large');
  return reply;
}

export function runCodexChild({
  executable, args, cwd, env, input = '', signal,
  maxStdout = MAX_STDOUT_BYTES,
  maxStderr = MAX_STDERR_BYTES,
  timeoutMs = COMPLETE_TIMEOUT_MS,
  platform = process.platform,
}) {
  return new Promise((resolve, reject) => {
    if (!POSIX_PLATFORMS.has(platform)) {
      reject(new StudyChatProviderUnavailableError('Local Codex study chat requires a supported POSIX process boundary.'));
      return;
    }
    if (signal?.aborted) {
      reject(new StudyChatProviderError('The study response was cancelled.', 'aborted'));
      return;
    }
    const child = spawn(executable, args, {cwd, env, stdio:['pipe', 'pipe', 'pipe'], detached:true});
    let stdout = '';
    let stderr = '';
    let pendingError = null;
    let closed = false;
    const finish = result => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (pendingError) reject(pendingError); else resolve(result);
    };
    const requestStop = error => {
      if (closed || pendingError) return;
      pendingError = error;
      terminateProcessGroup(child);
    };
    const onAbort = () => requestStop(new StudyChatProviderError('The study response was cancelled.', 'aborted'));
    const timer = setTimeout(() => requestStop(new StudyChatProviderUnavailableError('Codex did not respond before the provider timeout.')), timeoutMs);
    timer.unref();
    signal?.addEventListener('abort', onAbort, {once:true});
    child.on('error', error => {
      if (!pendingError) pendingError = new StudyChatProviderUnavailableError(`Codex could not start: ${error.code || error.message}`);
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      if (pendingError) return;
      stdout += chunk;
      if (Buffer.byteLength(stdout) > maxStdout) requestStop(new StudyChatProviderError('Codex exceeded the event-stream limit.', 'output_too_large'));
    });
    child.stderr.on('data', chunk => {
      if (pendingError) return;
      stderr += chunk;
      if (Buffer.byteLength(stderr) > maxStderr) requestStop(new StudyChatProviderError('Codex exceeded the diagnostic limit.', 'output_too_large'));
    });
    child.on('close', (code, childSignal) => finish({stdout, stderr, exitCode:code, signal:childSignal}));
    child.stdin.on('error', error => {
      if (error.code !== 'EPIPE') requestStop(new StudyChatProviderUnavailableError('Codex could not receive the study prompt.'));
    });
    child.stdin.end(input, 'utf8');
  });
}

export function createCodexStudyProvider({
  executable,
  run = runCodexChild,
  authFile = defaultAuthFile(),
  platform = process.platform,
} = {}) {
  let liveVerified = false;

  async function probe() {
    if (!POSIX_PLATFORMS.has(platform)) return {ok:false, version:null, unsupported:true};
    if (!executable || !path.isAbsolute(executable)) return {ok:false, version:null};
    const cwd = os.tmpdir();
    try {
      const result = await run({
        executable,
        args:['--version'],
        cwd,
        env:cleanEnvironment(cwd, path.join(cwd, 'padipps-probe-codex-home'), executable),
        maxStdout:2_048,
        maxStderr:4_096,
        timeoutMs:PROBE_TIMEOUT_MS,
        platform,
      });
      const version = /codex-cli\s+(\d+\.\d+\.\d+)/u.exec(result.stdout)?.[1];
      if (result.exitCode !== 0 || !version) return {ok:false, version:null};
      return {ok:version === VERIFIED_CODEX_VERSION, version};
    } catch {
      return {ok:false, version:null};
    }
  }

  async function status() {
    const result = await probe();
    if (!result.ok) {
      liveVerified = false;
      const detail = result.unsupported
        ? 'unsupported process boundary; macOS and Linux only'
        : result.version ? `found ${result.version}; verified ${VERIFIED_CODEX_VERSION}` : 'CLI not runnable';
      return {available:false, provider:'codex', model:CODEX_MODEL, message:`Local Codex study chat is disabled (${detail}).`};
    }
    return {
      available:true,
      provider:'codex',
      model:CODEX_MODEL,
      message:liveVerified
        ? `Codex ${result.version} text-only connection verified; tool execution is disabled.`
        : `Codex ${result.version} is ready with tool execution disabled; your existing sign-in and connectivity are checked on the first message.`,
    };
  }

  async function complete(prompt, {signal} = {}) {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new StudyChatProviderError('A study prompt is required.', 'invalid_prompt');
    const readiness = await status();
    if (!readiness.available) throw new StudyChatProviderUnavailableError(readiness.message);
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'padipps-codex-'));
    const cwd = path.join(tempRoot, 'workspace');
    const codexHome = path.join(tempRoot, 'codex-home');
    try {
      try {
        await mkdir(cwd);
        await mkdir(codexHome);
        // Link only the installer's existing auth file; never read or copy its contents.
        await symlink(authFile, path.join(codexHome, 'auth.json'));
      } catch {
        throw new StudyChatProviderUnavailableError('The existing Codex sign-in could not be isolated for Padipps.');
      }
      const result = await run({
        executable,
        args:baseArguments(cwd),
        cwd,
        env:cleanEnvironment(tempRoot, codexHome, executable),
        input:prompt,
        signal,
        timeoutMs:COMPLETE_TIMEOUT_MS,
        platform,
      });
      const reply = parseJsonLines(result.stdout, result.stderr, result.exitCode);
      liveVerified = true;
      return {reply, provider:'codex', model:CODEX_MODEL};
    } finally {
      await rm(tempRoot, {recursive:true, force:true});
    }
  }

  return {status, complete};
}
