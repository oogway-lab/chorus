// Node image source: stores uploaded image bytes on local disk and reads them
// back as base64 for the providers. Replaces the desktop app's Tauri-fs reader.
// Object storage is the production substrate (deferred); local disk is the dev one.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { EvalImage } from "@chorus/llm-core";

const UPLOAD_DIR =
    process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");

export async function storeImage(
    bytes: Buffer,
    _mimeType: string,
): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const key = randomUUID();
    await fs.writeFile(path.join(UPLOAD_DIR, key), bytes);
    return key;
}

export async function loadImage(
    storageKey: string,
    mimeType: string,
): Promise<EvalImage> {
    const bytes = await fs.readFile(path.join(UPLOAD_DIR, storageKey));
    return { mimeType, base64Data: bytes.toString("base64") };
}
