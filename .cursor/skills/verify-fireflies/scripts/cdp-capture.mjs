#!/usr/bin/env node
/**
 * Drive one URL through Chrome DevTools Protocol.
 * Usage:
 *   node cdp-capture.mjs --cdp http://127.0.0.1:9333 --url URL \
 *     --shot out.png --html out.html --aria out.aria.txt
 */

import { writeFileSync } from "node:fs";

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

async function main() {
  const cdpBase = arg("--cdp").replace(/\/$/, "");
  const url = arg("--url");
  const shot = arg("--shot");
  const htmlPath = arg("--html");
  const ariaPath = arg("--aria");
  if (cdpBase === "" || url === "" || shot === "") {
    fail("need --cdp --url --shot");
  }
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
  const loaded = cdp.wait("Page.loadEventFired", 15000).catch(() => null);
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, waitReady(cdp, 15000)]);
  await waitReady(cdp, 5000);
  await new Promise((resolve) => setTimeout(resolve, 800));
  const shotResult = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  const png = shotResult.data;
  if (typeof png !== "string" || png === "") {
    fail("Page.captureScreenshot returned no data");
  }
  writeFileSync(shot, Buffer.from(png, "base64"));
  if (htmlPath !== "") {
    const evaluated = await cdp.send("Runtime.evaluate", {
      expression: "document.documentElement.outerHTML",
      returnByValue: true,
    });
    const html = evaluated.result?.value;
    writeFileSync(htmlPath, typeof html === "string" ? html : "");
  }
  if (ariaPath !== "") {
    const tree = await cdp.send("Accessibility.getFullAXTree");
    const nodes = Array.isArray(tree.nodes) ? tree.nodes : [];
    writeFileSync(ariaPath, flattenAx(nodes) + "\n");
  }
  await cdp.send("Page.close").catch(() => null);
  cdp.close();
  console.log(`harness=cdp url=${url} shot=${shot}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
