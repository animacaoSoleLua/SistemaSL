"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ReportPdfItem {
  id: string;
  event_date: string;
  contractor_name: string;
  title_schedule?: string | null;
  author_name?: string | null;
}

interface ReportsPdfProps {
  reports: ReportPdfItem[];
  period: string;
  generatedAt: string;
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: "Helvetica", fontSize: 9 },
  header: { marginBottom: 18 },
  title: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  meta: { fontSize: 9, color: "#666", marginBottom: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#6f4cff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    borderBottomStyle: "solid",
  },
  rowAlt: { backgroundColor: "#f9f7ff" },
  hText: { color: "#ffffff", fontWeight: "bold" },
  cDate: { width: "15%" },
  cContractor: { width: "30%" },
  cTitle: { width: "30%" },
  cAuthor: { width: "25%" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#aaaaaa" },
});

export function ReportsPdf({ reports, period, generatedAt }: ReportsPdfProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Relatórios de Eventos</Text>
          <Text style={s.meta}>Período: {period}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {reports.length} relatório(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cDate, s.hText]}>Data</Text>
          <Text style={[s.cContractor, s.hText]}>Contratante</Text>
          <Text style={[s.cTitle, s.hText]}>Título do Roteiro</Text>
          <Text style={[s.cAuthor, s.hText]}>Autor</Text>
        </View>

        {reports.map((r, i) => (
          <View key={r.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cDate}>
              {new Date(`${r.event_date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")}
            </Text>
            <Text style={s.cContractor}>{r.contractor_name}</Text>
            <Text style={s.cTitle}>{r.title_schedule ?? "-"}</Text>
            <Text style={s.cAuthor}>{r.author_name ?? "-"}</Text>
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Sol e Lua Animação</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
