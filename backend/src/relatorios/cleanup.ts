import { unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { prisma } from "../db/prisma.js";

const uploadsRoot = process.env.UPLOADS_DIR
  ? resolve(process.env.UPLOADS_DIR)
  : join(process.cwd(), "uploads");

const MEDIA_EXPIRY_DAYS = 20;
const REPORT_EXPIRY_DAYS = 365;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore missing or already-deleted files
  }
}

function resolveStoragePath(url: string): string | undefined {
  if (!url.startsWith("/uploads/")) {
    return undefined;
  }
  const relative = url.slice("/uploads/".length);
  const storagePath = resolve(uploadsRoot, relative);
  if (storagePath !== uploadsRoot && !storagePath.startsWith(`${uploadsRoot}${sep}`)) {
    return undefined;
  }
  return storagePath;
}

export async function purgeOldMedia(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MEDIA_EXPIRY_DAYS);

  const reports = await prisma.report.findMany({
    where: { createdAt: { lte: cutoff }, media: { some: {} } },
    select: { id: true, media: { select: { id: true, url: true } } },
  });

  let deletedCount = 0;
  for (const report of reports) {
    for (const media of report.media) {
      const storagePath = resolveStoragePath(media.url);
      if (storagePath) {
        await safeUnlink(storagePath);
      }
    }
    const result = await prisma.reportMedia.deleteMany({ where: { reportId: report.id } });
    deletedCount += result.count;
  }

  return deletedCount;
}

export async function purgeOldReports(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - REPORT_EXPIRY_DAYS);

  const reports = await prisma.report.findMany({
    where: { createdAt: { lte: cutoff } },
    select: { id: true, media: { select: { url: true } } },
  });

  for (const report of reports) {
    for (const media of report.media) {
      const storagePath = resolveStoragePath(media.url);
      if (storagePath) {
        await safeUnlink(storagePath);
      }
    }
  }

  const result = await prisma.report.deleteMany({
    where: { createdAt: { lte: cutoff } },
  });

  return result.count;
}

export function scheduleCleanup(log: { info(msg: string): void; error(msg: string, err?: unknown): void }): void {
  const run = async () => {
    try {
      const mediaDeleted = await purgeOldMedia();
      if (mediaDeleted > 0) {
        log.info(`cleanup: ${mediaDeleted} midia(s) removida(s) de relatorios com mais de ${MEDIA_EXPIRY_DAYS} dias`);
      }
    } catch (err) {
      log.error("cleanup: erro ao remover midias antigas", err);
    }

    try {
      const reportsDeleted = await purgeOldReports();
      if (reportsDeleted > 0) {
        log.info(`cleanup: ${reportsDeleted} relatorio(s) removido(s) com mais de ${REPORT_EXPIRY_DAYS} dias`);
      }
    } catch (err) {
      log.error("cleanup: erro ao remover relatorios antigos", err);
    }
  };

  run();
  setInterval(run, CLEANUP_INTERVAL_MS);
}
