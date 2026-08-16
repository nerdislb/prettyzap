import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  DEFAULT_CUSTOM_PALETTE,
  parsePalette,
  paletteToRecord,
  readPrettyZapPalette,
  recordToPalette,
  removePrettyZapPalette,
  writePrettyZapPalette,
} from "./palette";

const TOKYO_NIGHT = `mode = "dark"

accent = "#7aa2f7"
selection = "#292e42"
muted = "#414868"

background = "#1a1b26"
dark_background = "#13141c"
darker_background = "#0e0e14"

foreground = "#a9b1d6"

red = "#f7768e"
yellow = "#e0af68"
green = "#9ece6a"
blue = "#7aa2f7"
`;

test("parsePalette reads Omarchy colors.toml values", () => {
  const palette = parsePalette(TOKYO_NIGHT);
  assert.ok(palette);
  assert.equal(palette.mode, "dark");
  assert.equal(palette.background, "#1a1b26");
  assert.equal(palette.darkBackground, "#13141c");
  assert.equal(palette.darkerBackground, "#0e0e14");
  assert.equal(palette.foreground, "#a9b1d6");
  assert.equal(palette.muted, "#414868");
  assert.equal(palette.accent, "#7aa2f7");
  assert.equal(palette.selection, "#292e42");
  assert.equal(palette.red, "#f7768e");
  assert.equal(palette.green, "#9ece6a");
});

test("parsePalette detects light mode", () => {
  const palette = parsePalette('mode = "light"\nbackground = "#ffffff"\nforeground = "#111111"\nmuted = "#666666"\naccent = "#0000ff"\nselection = "#dddddd"\n');
  assert.ok(palette);
  assert.equal(palette.mode, "light");
});

test("parsePalette falls back for missing optional accents", () => {
  const palette = parsePalette('mode = "dark"\nbackground = "#000000"\nforeground = "#ffffff"\nmuted = "#888888"\naccent = "#ff0000"\nselection = "#333333"\n');
  assert.ok(palette);
  assert.equal(palette.red, "#ff0000"); // red falls back to accent
  assert.equal(palette.yellow, "#ffffff"); // yellow falls back to foreground
  assert.equal(palette.blue, "#ff0000");
});

test("parsePalette rejects missing required keys and bad hex", () => {
  assert.equal(parsePalette('mode = "dark"\nbackground = "#000000"\n'), undefined);
  assert.equal(
    parsePalette('mode = "dark"\nbackground = "red"\nforeground = "#ffffff"\nmuted = "#888888"\naccent = "#ff0000"\nselection = "#333333"\n'),
    undefined,
  );
});

test("recordToPalette validates untrusted IPC payloads", () => {
  assert.equal(recordToPalette(null), undefined);
  assert.equal(recordToPalette({ mode: "dark", colors: {} }), undefined);
  assert.equal(recordToPalette({ mode: "sepia", colors: {} }), undefined);

  const valid = paletteToRecord(DEFAULT_CUSTOM_PALETTE);
  const palette = recordToPalette({ mode: valid.mode, colors: valid.colors });
  assert.ok(palette);
  assert.deepEqual(palette, DEFAULT_CUSTOM_PALETTE);

  const invalidHex = {
    mode: "dark",
    colors: { ...valid.colors, accent: "not-a-color" },
  };
  assert.equal(recordToPalette(invalidHex), undefined);
});

test("write/read/remove custom palette round-trips atomically", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prettyzap-palette-"));
  const file = path.join(dir, "colors.toml");
  try {
    writePrettyZapPalette(DEFAULT_CUSTOM_PALETTE, file);
    const written = fs.readFileSync(file, "utf8");
    assert.ok(written.includes('mode = "dark"'));
    assert.ok(written.includes('accent = "#e68e0d"'));
    assert.ok(written.includes('dark_background = "#0d0d0d"'));
    assert.ok(!written.includes("darkBackground"));

    const parsed = readPrettyZapPalette(file);
    assert.deepEqual(parsed, DEFAULT_CUSTOM_PALETTE);

    removePrettyZapPalette(file);
    assert.equal(fs.existsSync(file), false);
    assert.equal(readPrettyZapPalette(file), undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("default palette survives a full parse round-trip", () => {
  const record = paletteToRecord(DEFAULT_CUSTOM_PALETTE);
  const palette = recordToPalette({ mode: record.mode, colors: record.colors });
  assert.ok(palette);
  assert.deepEqual(palette, DEFAULT_CUSTOM_PALETTE);
});
