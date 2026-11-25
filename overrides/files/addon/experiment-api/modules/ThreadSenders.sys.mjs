/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Summarise the actual view thread, including cross-folder search views.
 *
 * @param {object} thread - A native nsIMsgThread.
 * @param {Function} parseSender - Decode a message's sender.
 */
export function summariseThread(thread, parseSender) {
  if (thread.numChildren < 2) {
    return null;
  }
  const first = thread.getChildHdrAt(0);
  let latest = first;
  for (let i = 1; i < thread.numChildren; i++) {
    const candidate = thread.getChildHdrAt(i);
    // Thread traversal order is not necessarily chronological.
    if (candidate.date >= latest.date) {
      latest = candidate;
    }
  }
  const original = parseSender(first);
  const last = parseSender(latest);
  const same = original.key === last.key;
  return {
    text: `${same ? original.name : `${original.name}, ${last.name}`} (${thread.numChildren})`,
    tooltip: `Original sender: ${original.full}\nLatest sender: ${last.full}\nMessages in this view: ${thread.numChildren}`,
  };
}

/**
 * Extend the native row renderers, using Conversations' existing tab lifecycle.
 * No message, folder, sorting, or selection state is modified.
 *
 * @param {object} win - The about:3pane window.
 * @returns {Promise<Function>} Cleanup function.
 */
export async function installThreadSenders(win) {
  // @ts-expect-error ChromeUtils is provided by Thunderbird's privileged scope.
  const { MailServices } = ChromeUtils.importESModule(
    "resource:///modules/MailServices.sys.mjs"
  );
  const constructors = await Promise.all(
    ["thread-card", "thread-row"].map(async (name) => {
      await win.customElements.whenDefined(name);
      return win.customElements.get(name);
    })
  );
  const restorers = [];
  const generations = new WeakMap();
  let active = true;

  function parseSender(header) {
    const decoded = header.mime2DecodedAuthor || header.author || "";
    const address = MailServices.headerParser.parseDecodedHeader(decoded)[0];
    const email = address?.email || "";
    return {
      name: address?.name || email || decoded || "Unknown sender",
      key: email.toLowerCase() || decoded,
      full: decoded || "Unknown sender",
    };
  }

  function updateRow(row) {
    const generation = (generations.get(row) || 0) + 1;
    generations.set(row, generation);
    // Group headings and expanded threads must retain their native labels.
    if (
      !win.gViewWrapper?.showThreaded ||
      win.gViewWrapper.showGroupedBySort ||
      !row.classList.contains("children") ||
      !row.classList.contains("collapsed") ||
      row.dataset.properties?.split(" ").includes("dummy")
    ) {
      return;
    }
    const summary = summariseThread(
      win.gDBView.getThreadContainingIndex(row.index),
      parseSender
    );
    if (!summary) {
      return;
    }
    const cells = row.senderLine
      ? [row.senderLine]
      : Array.from(
          row.querySelectorAll(".sendercol-column, .correspondentcol-column")
        );
    for (const cell of cells) {
      // Native table-cell localisation would otherwise overwrite our tooltip.
      cell.removeAttribute("data-l10n-id");
      cell.removeAttribute("data-l10n-args");
      cell.textContent = summary.text;
      cell.title = summary.tooltip;
    }
    // Native fillRow sets the row's accessible label asynchronously. Schedule
    // after that work, but ignore a row that has been recycled in the meantime.
    const index = row.index;
    win.requestAnimationFrame(() => {
      if (
        active &&
        row.isConnected &&
        row.index === index &&
        generations.get(row) === generation &&
        cells.length
      ) {
        const label = row.getAttribute("aria-label") || "";
        row.setAttribute("aria-label", `${label}; ${summary.tooltip}`);
      }
    });
  }

  for (const rowClass of constructors) {
    const prototype = rowClass.prototype;
    const original = prototype.fillRow;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      try {
        updateRow(this);
      } catch (error) {
        // Rendering a folder must continue if a thread disappears mid-refresh.
        console.error("Conversations: thread sender summary", error);
      }
      return result;
    };
    prototype.fillRow = wrapped;
    restorers.push(() => {
      if (prototype.fillRow === wrapped) {
        prototype.fillRow = original;
      }
    });
  }
  win.threadTree?.invalidate();
  return () => {
    active = false;
    for (const restore of restorers) {
      restore();
    }
    win.threadTree?.invalidate();
  };
}
