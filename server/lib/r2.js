import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const r2Configured = Boolean(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET &&
  process.env.R2_PUBLIC_URL,
);

if (!r2Configured) {
  console.warn("[r2] R2 env vars not set - avatar uploads will use local disk storage.");
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, "..", "..", "uploads", "avatars");

async function saveLocally(buffer, filename) {
  await mkdir(uploadsDir, { recursive: true });
  const safeName = basename(filename);
  await writeFile(join(uploadsDir, safeName), buffer);
  return `/uploads/avatars/${safeName}`;
}

let _r2 = null;
function getR2Client() {
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _r2;
}

export async function uploadToR2(buffer, filename, mimeType) {
  if (!r2Configured) {
    return saveLocally(buffer, filename);
  }

  try {
    await getR2Client().send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000",
    }));

    return `${process.env.R2_PUBLIC_URL}/${filename}`;
  } catch (err) {
    console.warn("[r2] Upload failed, falling back to local disk storage.", err?.Code || err?.name || err);
    return saveLocally(buffer, filename);
  }
}

export async function deleteFromR2(url) {
  if (!url) return;

  // Local fallback path — delete regardless of R2 config
  if (url.startsWith("/uploads/avatars/")) {
    try {
      await unlink(join(uploadsDir, basename(url)));
    } catch {
      // best effort
    }
    return;
  }

  if (!r2Configured) return;

  try {
    const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, "");
    if (!key || key === url) return; // not an R2 URL
    await getR2Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }));
  } catch {
    // best effort
  }
}
