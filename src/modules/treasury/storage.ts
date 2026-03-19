import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { StorageProvider } from "@prisma/client";
import { env } from "@/config/env";
import { normalizeText } from "@/modules/treasury/utils";

type StoredAttachment = {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storageProvider: StorageProvider;
  storageBucket: string;
  storageKey: string;
  publicUrl: string;
};

async function ensureBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function storeLocalFile(file: File, storageKey: string, bucket: string) {
  const buffer = await ensureBuffer(file);
  const relativePath = path.join("uploads", storageKey);
  const absolutePath = path.join(process.cwd(), "public", relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    storageProvider: StorageProvider.LOCAL,
    storageBucket: bucket,
    storageKey,
    publicUrl: `/${relativePath.replace(/\\/g, "/")}`,
  };
}

async function storeSupabaseFile(file: File, storageKey: string, bucket: string) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return storeLocalFile(file, storageKey, bucket);
  }

  const buffer = await ensureBuffer(file);
  const response = await fetch(`${env.SUPABASE_URL}/storage/v1/object/${bucket}/${storageKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`No se pudo subir el adjunto a Supabase Storage (${response.status}).`);
  }

  return {
    storageProvider: StorageProvider.SUPABASE,
    storageBucket: bucket,
    storageKey,
    publicUrl: `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${storageKey}`,
  };
}

export async function persistAttachments(input: {
  companyId: string;
  ownerSegment: string;
  files: File[];
}) {
  const bucket = env.STORAGE_BUCKET;
  const configuredProvider = env.STORAGE_PROVIDER;

  const attachments = await Promise.all(
    input.files
      .filter((file) => file.size > 0)
      .map(async (file) => {
        const extension = path.extname(file.name) || "";
        const baseName = path.basename(file.name, extension);
        const key = `${input.companyId}/${input.ownerSegment}/${Date.now()}-${normalizeText(baseName)}${extension.toLowerCase()}`;

        const storageInfo =
          configuredProvider === "SUPABASE"
            ? await storeSupabaseFile(file, key, bucket)
            : await storeLocalFile(file, key, bucket);

        return {
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          ...storageInfo,
        } satisfies StoredAttachment;
      }),
  );

  return attachments;
}
