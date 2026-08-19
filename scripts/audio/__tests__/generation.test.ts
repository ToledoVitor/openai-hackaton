import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createPcm, type StereoPcm } from "../dsp";
import { encodeOgg } from "../export";
import { generateAudio } from "../generate-audio";
import { verifyAudio } from "../verify-audio";

let fixtureRoot: string;
const temporaryRoots: string[] = [];

beforeAll(async () => {
  fixtureRoot = await mkdtemp(join(tmpdir(), "city-audio-fixture-"));
  temporaryRoots.push(fixtureRoot);
  await generateAudio(fixtureRoot);
});

afterAll(async () => {
  await Promise.all(temporaryRoots.map((root) => rm(root, { recursive: true, force: true })));
});

async function copyFixture(): Promise<string> {
  const outputRoot = await mkdtemp(join(tmpdir(), "city-audio-mutated-"));
  temporaryRoots.push(outputRoot);
  await cp(fixtureRoot, outputRoot, { recursive: true });
  return outputRoot;
}

it("generates licensed deterministic runtime assets", async () => {
  const first = await mkdtemp(join(tmpdir(), "city-audio-a-"));
  const second = await mkdtemp(join(tmpdir(), "city-audio-b-"));
  temporaryRoots.push(first, second);
  const a = await generateAudio(first);
  const b = await generateAudio(second);
  expect(a.assets.map(({ path, sha256 }) => ({ path, sha256 }))).toEqual(
    b.assets.map(({ path, sha256 }) => ({ path, sha256 })),
  );
  expect(a.assets).toHaveLength(7);
  expect(await readFile(join(first, "LICENSE"), "utf8")).toContain("CC0 1.0");
  await expect(verifyAudio(first)).resolves.toBeUndefined();
});

it("encodes repeatable Ogg bytes and restores global randomness", async () => {
  const pcm = createPcm(0.05);
  pcm.left[12] = 0.25;
  pcm.right[24] = -0.25;
  const originalRandom = Math.random;

  const [first, second] = await Promise.all([encodeOgg(pcm), encodeOgg(pcm)]);

  expect(first).toEqual(second);
  expect(createHash("sha256").update(first).digest("hex")).toBe(
    createHash("sha256").update(second).digest("hex"),
  );
  expect(Math.random).toBe(originalRandom);
});

it("restores global randomness when Ogg encoder construction fails", async () => {
  const malformed = {
    sampleRate: "not-a-number",
    left: new Float32Array(8),
    right: new Float32Array(8),
  } as unknown as StereoPcm;
  const originalRandom = Math.random;

  await expect(encodeOgg(malformed)).rejects.toThrow("Invalid sample rate");
  expect(Math.random).toBe(originalRandom);
});

it("rejects a missing asset", async () => {
  const outputRoot = await copyFixture();
  await unlink(join(outputRoot, "sfx/birds.ogg"));
  await expect(verifyAudio(outputRoot)).rejects.toThrow(/missing or unexpected files/);
});

it("rejects missing provenance documentation", async () => {
  const outputRoot = await copyFixture();
  await unlink(join(outputRoot, "README.md"));
  await expect(verifyAudio(outputRoot)).rejects.toThrow(/README/);
});

it("rejects an unexpected asset", async () => {
  const outputRoot = await copyFixture();
  await writeFile(join(outputRoot, "sfx/unexpected.ogg"), "OggS");
  await expect(verifyAudio(outputRoot)).rejects.toThrow(/missing or unexpected files/);
});

it("rejects a tampered asset", async () => {
  const outputRoot = await copyFixture();
  const path = join(outputRoot, "sfx/footsteps.ogg");
  const bytes = await readFile(path);
  bytes[bytes.length - 1] ^= 1;
  await writeFile(path, bytes);
  await expect(verifyAudio(outputRoot)).rejects.toThrow(/SHA-256 mismatch/);
});

it("rejects a malformed Ogg even when its manifest hash matches", async () => {
  const outputRoot = await copyFixture();
  const relativePath = "sfx/birds.ogg";
  const malformed = Buffer.alloc(64);
  malformed.write("OggS");
  await writeFile(join(outputRoot, relativePath), malformed);

  const manifestPath = join(outputRoot, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const asset = manifest.assets.find(({ path }: { path: string }) => path === relativePath);
  asset.bytes = malformed.length;
  asset.sha256 = createHash("sha256").update(malformed).digest("hex");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await expect(verifyAudio(outputRoot)).rejects.toThrow(/malformed Ogg stream/);
});

it("rejects malformed manifest duration metadata", async () => {
  const outputRoot = await copyFixture();
  const manifestPath = join(outputRoot, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.assets.find(({ path }: { path: string }) => path === "sfx/birds.ogg").duration = 99;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await expect(verifyAudio(outputRoot)).rejects.toThrow(/duration/);
});
