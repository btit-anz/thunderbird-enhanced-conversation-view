/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
// Node tests import this pure function without Thunderbird's module loader.
// eslint-disable-next-line mozilla/reject-import-system-module-from-non-system
import { summariseThread } from "../experiment-api/modules/ThreadSenders.sys.mjs";

function fixture(messages) {
  return {
    get numChildren() {
      return messages.length;
    },
    getChildHdrAt: (index) => messages[index],
  };
}

const sender = (header) => ({
  name: header.name,
  key: header.email.toLowerCase(),
  full: `${header.name} <${header.email}>`,
});

describe("collapsed thread senders", () => {
  it("uses message date rather than traversal order for the latest sender", () => {
    const thread = fixture([
      { name: "Fred", email: "fred@example.org", date: 1 },
      { name: "Matt", email: "matt@example.org", date: 3 },
      { name: "Someone", email: "other@example.org", date: 2 },
    ]);
    assert.equal(summariseThread(thread, sender).text, "Fred, Matt (3)");
    assert.match(
      summariseThread(thread, sender).tooltip,
      /Latest sender: Matt <matt@example.org>/
    );
  });

  it("deduplicates the same email even if its display name changes", () => {
    const thread = fixture([
      { name: "Fred", email: "Fred@example.org", date: 1 },
      { name: "Frederick", email: "fred@example.org", date: 2 },
    ]);
    assert.equal(summariseThread(thread, sender).text, "Fred (2)");
  });

  it("keeps distinct people with identical display names", () => {
    const thread = fixture([
      { name: "Matt", email: "matt@example.org", date: 1 },
      { name: "Matt", email: "other@example.org", date: 2 },
    ]);
    assert.equal(summariseThread(thread, sender).text, "Matt, Matt (2)");
  });

  it("updates after arrival or deletion, without a stale thread cache", () => {
    const messages = [
      { name: "Fred", email: "fred@example.org", date: 1 },
      { name: "Matt", email: "matt@example.org", date: 2 },
    ];
    const thread = fixture(messages);
    assert.equal(summariseThread(thread, sender).text, "Fred, Matt (2)");
    messages.push({ name: "Jane", email: "jane@example.org", date: 3 });
    assert.equal(summariseThread(thread, sender).text, "Fred, Jane (3)");
    messages.pop();
    assert.equal(summariseThread(thread, sender).text, "Fred, Matt (2)");
    messages.pop();
    assert.equal(summariseThread(thread, sender), null);
  });

  it("resolves equal dates deterministically to the later thread entry", () => {
    const thread = fixture([
      { name: "Fred", email: "fred@example.org", date: 1 },
      { name: "Matt", email: "matt@example.org", date: 1 },
    ]);
    assert.equal(summariseThread(thread, sender).text, "Fred, Matt (2)");
  });
});
