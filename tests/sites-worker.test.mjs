import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker/index.js";

test("Sites worker delegates requests to the static asset binding", async () => {
  const request = new Request("https://example.test/");
  const response = await worker.fetch(request, {
    ASSETS: { fetch: async () => new Response("ok") },
  });

  assert.equal(await response.text(), "ok");
});
