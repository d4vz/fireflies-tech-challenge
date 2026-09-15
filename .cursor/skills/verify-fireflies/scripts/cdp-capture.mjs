#!/usr/bin/env node
/**
 * Drive Chrome DevTools Protocol.
 *
 * One shot:
 *   node cdp-capture.mjs --cdp http://127.0.0.1:9333 --url URL \
 *     --shot out.png --html out.html --aria out.aria.txt
 *
 * Signed-in tour:
 *   node cdp-capture.mjs --plan plan.json
 */

import { readFileSync, writeFileSync } from "node:fs";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0 || index === process.argv.length - 1) {
    return fallback;
  }
  return process.argv[index + 1];
}

function fail(message) {
  console.error(`cdp-capture: ${message}`);
  process.exit(1);
}

function preferIpv4(wsUrl, cdpBase) {
  const parsed = new URL(wsUrl);
  const base = new URL(cdpBase);
  parsed.hostname = base.hostname;
  parsed.port = base.port;
  return parsed.toString();
}

class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
    this.listeners = new Map();
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== undefined && this.pending.has(message.id)) {
        const waiter = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          waiter.reject(new Error(`${message.error.message}`));
        } else {
          waiter.resolve(message.result ?? {});
        }
        return;
      }
      if (typeof message.method === "string") {
        const persistent = this.listeners.get(message.method) ?? [];
        for (const listener of persistent) {
          listener(message.params ?? {});
        }
        const waiters = this.eventWaiters.get(message.method) ?? [];
        this.eventWaiters.delete(message.method);
        for (const waiter of waiters) {
          waiter(message.params ?? {});
        }
      }
    });
  }

  ready() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve(undefined));
      this.ws.addEventListener("error", () => reject(new Error("CDP websocket failed")));
    });
  }

  on(method, fn) {
    const list = this.listeners.get(method) ?? [];
    list.push(fn);
    this.listeners.set(method, list);
  }

  send(method, params = {}, timeoutMs = 20000) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timed out on ${method}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  wait(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiters = this.eventWaiters.get(method) ?? [];
        this.eventWaiters.set(
          method,
          waiters.filter((waiter) => waiter !== onEvent),
        );
        reject(new Error(`timed out waiting for ${method}`));
      }, timeoutMs);
      const onEvent = (params) => {
        clearTimeout(timer);
        resolve(params);
      };
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push(onEvent);
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    this.ws.close();
  }
}

function flattenAx(nodes) {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const childIds = new Set();
  for (const node of nodes) {
    for (const child of node.childIds ?? []) {
      childIds.add(child);
    }
  }
  function walk(id, depth) {
    const node = byId.get(id);
    if (!node) {
      return [];
    }
    const role = node.role?.value ?? "unknown";
    const name = node.name?.value ?? "";
    const line = `${"  ".repeat(depth)}${role}${name === "" ? "" : `: ${name}`}`;
    const children = (node.childIds ?? []).flatMap((child) => walk(child, depth + 1));
    return [line, ...children];
  }
  const roots = nodes.filter((node) => !childIds.has(node.nodeId));
  return roots.flatMap((node) => walk(node.nodeId, 0)).join("\n");
}

async function listPages(cdpBase) {
  const res = await fetch(`${cdpBase}/json/list`);
  if (!res.ok) {
    fail(`GET /json/list -> ${res.status}`);
  }
  const targets = await res.json();
  if (!Array.isArray(targets)) {
    return [];
  }
  return targets.filter(
    (target) => target.type === "page" && typeof target.webSocketDebuggerUrl === "string",
  );
}

async function openPage(cdpBase) {
  try {
    const created = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, {
      method: "PUT",
    });
    if (created.ok) {
      const target = await created.json();
      if (typeof target.webSocketDebuggerUrl === "string" && target.webSocketDebuggerUrl !== "") {
        return preferIpv4(target.webSocketDebuggerUrl, cdpBase);
      }
    }
  } catch {
    // Fall through to an existing page target.
  }
  const pages = await listPages(cdpBase);
  if (pages.length === 0) {
    fail("no CDP page targets");
  }
  return preferIpv4(pages[pages.length - 1].webSocketDebuggerUrl, cdpBase);
}

async function waitReady(cdp, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const evaluated = await cdp.send("Runtime.evaluate", {
        expression: "document.readyState",
        returnByValue: true,
      });
      if (evaluated.result?.value === "complete") {
        return;
      }
    } catch {
      // The document may still be swapping during navigation.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

async function evaluate(cdp, expression, timeoutMs = 20000) {
  const result = await cdp.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
    },
    timeoutMs,
  );
  if (result.exceptionDetails) {
    const text = result.exceptionDetails.text || result.exceptionDetails.exception?.description;
    throw new Error(text || "Runtime.evaluate failed");
  }
  return result.result?.value;
}

async function navigate(cdp, url) {
  const loaded = cdp.wait("Page.loadEventFired", 15000).catch(() => null);
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, waitReady(cdp, 15000)]);
  await waitReady(cdp, 5000);
}

async function captureNow(cdp, shot, htmlPath, ariaPath) {
  const shotResult = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  const png = shotResult.data;
  if (typeof png !== "string" || png === "") {
    fail("Page.captureScreenshot returned no data");
  }
  writeFileSync(shot, Buffer.from(png, "base64"));
  if (htmlPath) {
    const html = await evaluate(cdp, "document.documentElement.outerHTML");
    writeFileSync(htmlPath, typeof html === "string" ? html : "");
  }
  if (ariaPath) {
    const tree = await cdp.send("Accessibility.getFullAXTree");
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
    writeFileSync(ariaPath, flattenAx(nodes) + "\n");
  }
}

async function connect(cdpBase) {
  const versionRes = await fetch(`${cdpBase}/json/version`);
  if (!versionRes.ok) {
    fail(`GET /json/version -> ${versionRes.status}`);
  }
  const pageWs = await openPage(cdpBase);
  const cdp = new Cdp(pageWs);
  await cdp.ready();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Accessibility.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return cdp;
}

async function continueFetch(cdp, params, testingToken) {
  const url = params.request?.url ?? "";
  const cont = { requestId: params.requestId };
  if (
    testingToken !== "" &&
    /clerk|accounts\.dev/i.test(url) &&
    !url.includes("__clerk_testing_token=")
  ) {
    cont.url = `${url}${url.includes("?") ? "&" : "?"}__clerk_testing_token=${encodeURIComponent(testingToken)}`;
  }
  try {
    await cdp.send("Fetch.continueRequest", cont);
  } catch {
    try {
      await cdp.send("Fetch.continueRequest", { requestId: params.requestId });
    } catch {
      // The request may already have been cancelled.
    }
  }
}

async function enableTestingToken(cdp, testingToken) {
  if (testingToken === "") {
    return;
  }
  await cdp.send("Fetch.enable", {
    patterns: [{ urlPattern: "*clerk*" }, { urlPattern: "*accounts.dev*" }],
  });
  cdp.on("Fetch.requestPaused", (params) => {
    void continueFetch(cdp, params, testingToken);
  });
}

const CLICK_SCRIPT = `(() => {
  const name = __NAME__;
  const ordered = [
    ...document.querySelectorAll("aside nav a, aside nav button"),
    ...document.querySelectorAll("header a, header button"),
    ...document.querySelectorAll("a, button, [role='link'], [role='button']"),
  ];
  const seen = new Set();
  for (const el of ordered) {
    if (seen.has(el)) {
      continue;
    }
    seen.add(el);
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) {
      continue;
    }
    const label = (el.getAttribute("aria-label") || "").trim();
    const text = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (label === name || text === name) {
      el.click();
      return true;
    }
  }
  throw new Error("no visible control named " + name);
})()`;

async function clickName(cdp, name) {
  await evaluate(cdp, CLICK_SCRIPT.replace("__NAME__", JSON.stringify(name)));
}

async function waitText(cdp, text, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await evaluate(cdp, "document.body ? document.body.innerText : ''");
    if (typeof body === "string" && body.includes(text)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`timed out waiting for text ${JSON.stringify(text)}`);
}

async function waitPath(cdp, path, exact, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await evaluate(cdp, "location.pathname");
    if (typeof current === "string") {
      const ok = exact ? current === path : current === path || current.startsWith(`${path}/`);
      if (ok) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`timed out waiting for path ${path}`);
}

async function signInTicket(cdp, ticket) {
  const expression = `(async () => {
    const ticket = ${JSON.stringify(ticket)};
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (window.Clerk) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    const clerk = window.Clerk;
    if (!clerk) {
      throw new Error("Clerk JS did not load");
    }
    if (typeof clerk.load === "function" && !clerk.loaded) {
      await clerk.load();
    }
    if (!clerk.client || typeof clerk.client.signIn?.create !== "function") {
      throw new Error("Clerk client signIn is not available");
    }
    const signIn = await clerk.client.signIn.create({ strategy: "ticket", ticket });
    const sessionId = signIn.createdSessionId;
    if (!sessionId) {
      throw new Error("Clerk ticket did not create a session");
    }
    await clerk.setActive({ session: sessionId });
    return true;
  })()`;
  await evaluate(cdp, expression, 25000);
}

async function runPlan(planPath) {
  let plan;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (error) {
    fail(`cannot read plan: ${error instanceof Error ? error.message : String(error)}`);
  }
  const cdpBase = String(plan.cdp || "").replace(/\/$/, "");
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const testingToken = typeof plan.testingToken === "string" ? plan.testingToken : "";
  const ticket = typeof plan.ticket === "string" ? plan.ticket : "";
  if (cdpBase === "" || steps.length === 0) {
    fail("plan needs cdp and steps");
  }
  const cdp = await connect(cdpBase);
  await enableTestingToken(cdp, testingToken);
  try {
    for (const step of steps) {
      const action = String(step.action || "");
      switch (action) {
        case "goto":
          await navigate(cdp, String(step.url || ""));
          break;
        case "waitText":
          await waitText(cdp, String(step.text || ""), Number(step.timeoutMs) || 20000);
          break;
        case "waitPath":
          await waitPath(
            cdp,
            String(step.path || ""),
            Boolean(step.exact),
            Number(step.timeoutMs) || 20000,
          );
          break;
        case "click":
          await clickName(cdp, String(step.name || ""));
          break;
        case "capture":
          await captureNow(cdp, String(step.shot || ""), step.html || "", step.aria || "");
          break;
        case "signInTicket":
          if (ticket === "") {
            fail("plan signInTicket needs ticket");
          }
          await signInTicket(cdp, ticket);
          break;
        case "waitMs":
          await new Promise((resolve) => setTimeout(resolve, Number(step.ms) || 0));
          break;
        default:
          fail(`unknown plan action ${action}`);
      }
    }
    console.log(`harness=cdp plan=${planPath} steps=${steps.length}`);
  } finally {
    await cdp.send("Page.close").catch(() => null);
    cdp.close();
  }
}

async function runCapture(cdpBase, url, shot, htmlPath, ariaPath) {
  const cdp = await connect(cdpBase);
  try {
    await navigate(cdp, url);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await captureNow(cdp, shot, htmlPath, ariaPath);
    console.log(`harness=cdp url=${url} shot=${shot}`);
  } finally {
    await cdp.send("Page.close").catch(() => null);
    cdp.close();
  }
}

async function main() {
  const planPath = arg("--plan");
  if (planPath !== "") {
    await runPlan(planPath);
    return;
  }
  const cdpBase = arg("--cdp").replace(/\/$/, "");
  const url = arg("--url");
  const shot = arg("--shot");
  const htmlPath = arg("--html");
  const ariaPath = arg("--aria");
  if (cdpBase === "" || url === "" || shot === "") {
    fail("need --cdp --url --shot, or --plan");
  }
  await runCapture(cdpBase, url, shot, htmlPath, ariaPath);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
