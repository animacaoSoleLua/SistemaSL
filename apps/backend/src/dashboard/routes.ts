import { FastifyInstance } from "fastify";
import { requireRole } from "../auth/guard.js";
import { listUsers } from "../auth/store.js";
import { listReports } from "../relatorios/store.js";

interface DashboardQuery {
  period_start?: string;
  period_end?: string;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

async function filterReportsByPeriod(query: DashboardQuery) {
  const periodStart = parseDate(query.period_start);
  const periodEnd = parseDate(query.period_end);

  if (query.period_start && !periodStart) {
    return { error: "Periodo inicial invalido" } as const;
  }

  if (query.period_end && !periodEnd) {
    return { error: "Periodo final invalido" } as const;
  }

  if (periodStart && periodEnd && periodStart > periodEnd) {
    return { error: "Periodo inicial maior que final" } as const;
  }

  let reports = await listReports();

  if (periodStart) {
    reports = reports.filter((report) => report.eventDate >= periodStart);
  }
  if (periodEnd) {
    reports = reports.filter((report) => report.eventDate <= periodEnd);
  }

  return { reports } as const;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/dashboard/resumo",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const query = request.query as DashboardQuery;
      const result = await filterReportsByPeriod(query);

      if ("error" in result) {
        return reply.status(400).send({
          error: "invalid_request",
          message: result.error,
        });
      }

      const reports = result.reports;
      const qualityValues = reports.flatMap((report) => {
        const values: number[] = [];
        if (report.qualitySound !== undefined) {
          values.push(report.qualitySound);
        }
        if (report.qualityMicrophone !== undefined) {
          values.push(report.qualityMicrophone);
        }
        return values;
      });

      return reply.status(200).send({
        data: {
          total_events: reports.length,
          total_reports: reports.length,
          avg_quality: average(qualityValues),
        },
      });
    }
  );

  app.get(
    "/api/v1/dashboard/animadores",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const query = request.query as DashboardQuery;
      const result = await filterReportsByPeriod(query);

      if ("error" in result) {
        return reply.status(400).send({
          error: "invalid_request",
          message: result.error,
        });
      }

      const usersById = new Map(
        (await listUsers()).map((user) => [user.id, user])
      );
      const counts = new Map<string, number>();

      result.reports.forEach((report) => {
        const user = usersById.get(report.authorId);
        if (user?.role !== "animador") {
          return;
        }
        counts.set(user.name, (counts.get(user.name) ?? 0) + 1);
      });

      const data = Array.from(counts.entries())
        .map(([animador, events]) => ({ animador, events }))
        .sort((a, b) => b.events - a.events || a.animador.localeCompare(b.animador));

      return reply.status(200).send({ data });
    }
  );

  app.get(
    "/api/v1/dashboard/qualidade",
    { preHandler: requireRole(["admin"]) },
    async (request, reply) => {
      const query = request.query as DashboardQuery;
      const result = await filterReportsByPeriod(query);

      if ("error" in result) {
        return reply.status(400).send({
          error: "invalid_request",
          message: result.error,
        });
      }

      const soundValues: number[] = [];
      const micValues: number[] = [];

      result.reports.forEach((report) => {
        if (report.qualitySound !== undefined) {
          soundValues.push(report.qualitySound);
        }
        if (report.qualityMicrophone !== undefined) {
          micValues.push(report.qualityMicrophone);
        }
      });

      return reply.status(200).send({
        data: {
          sound: average(soundValues),
          microphone: average(micValues),
        },
      });
    }
  );
}
