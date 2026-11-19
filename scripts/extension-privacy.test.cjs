const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

test("browser capture sends only origin, method and status to an approved transport", async () => {
  let destination = "https://collector.example";
  let outbound;
  const listener = { addListener() {} };
  const context = vm.createContext({
    URL,
    chrome: {
      debugger: { onEvent: listener, onDetach: listener },
      runtime: { onMessage: listener },
      storage: {
        local: { get: async () => ({ serverUrl: destination, token: "fixture" }) },
        session: { set: async () => {} }
      }
    },
    fetch: async (url, options) => {
      outbound = { url, options };
      return { ok: true, json: async () => ({ ingested: 1 }) };
    }
  });
  vm.runInContext(readFileSync(join(__dirname, "../extension/background.js"), "utf8"), context);
  await context.queueExchange({
    method: "POST", url: "https://user:fixture@example.test/private/fixture?q=fixture",
    headers: { Authorization: "fixture" }, postData: "fixture"
  }, { status: 201, headers: { "Set-Cookie": "fixture" } });
  destination = "http://collector.example";
  await context.flush();
  assert.equal(outbound, undefined);
  destination = "https://collector.example";
  await context.flush();
  assert.equal(outbound.url, destination + "/api/traffic/ingest");
  assert.equal(outbound.options.redirect, "error");
  assert.deepEqual(JSON.parse(outbound.options.body), {
    exchanges: [{ method: "POST", url: "https://example.test", status: 201 }]
  });
});
