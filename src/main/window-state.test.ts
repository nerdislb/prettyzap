import * as assert from "node:assert/strict";
import { test } from "node:test";
import { isWindowPresented, resolveToggleAction } from "./window-state";
import { parseUnreadCount } from "./unread-count";

function fakeWindow(
  options: { destroyed?: boolean; minimized?: boolean; visible?: boolean } = {},
) {
  return {
    isDestroyed: () => options.destroyed === true,
    isMinimized: () => options.minimized === true,
    isVisible: () => options.visible === true,
  };
}

test("presentation requires a live, visible, non-minimized window", () => {
  assert.equal(isWindowPresented(undefined), false);
  assert.equal(isWindowPresented(fakeWindow({ destroyed: true, visible: true })), false);
  assert.equal(isWindowPresented(fakeWindow({ visible: false })), false);
  assert.equal(isWindowPresented(fakeWindow({ minimized: true, visible: true })), false);
  assert.equal(isWindowPresented(fakeWindow({ visible: true })), true);
});

test("a toggle used to start the app resolves to show", () => {
  assert.equal(resolveToggleAction(false), "show");
  assert.equal(resolveToggleAction(true), "toggle");
});

test("unread count parses Chromium's WhatsApp title formats", () => {
  assert.equal(parseUnreadCount("(3) WhatsApp"), 3);
  assert.equal(parseUnreadCount("WhatsApp (12)"), 12);
  assert.equal(parseUnreadCount("(99+) WhatsApp"), 100);
  assert.equal(parseUnreadCount("WhatsApp"), 0);
});
