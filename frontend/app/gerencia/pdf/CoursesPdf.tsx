"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface CoursePdfItem {
  id: string;
  title: string;
  course_date: string;
  instructor: { name: string };
  capacity?: number | null;
  enrolled_count: number;
}

interface CoursesPdfProps {
  courses: CoursePdfItem[];
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
  cTitle: { width: "35%" },
  cDate: { width: "18%" },
  cInstructor: { width: "28%" },
  cCapacity: { width: "19%" },
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

export function CoursesPdf({ courses, period, generatedAt }: CoursesPdfProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Cursos por Período</Text>
          <Text style={s.meta}>Período: {period}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {courses.length} curso(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cTitle, s.hText]}>Curso</Text>
          <Text style={[s.cDate, s.hText]}>Data</Text>
          <Text style={[s.cInstructor, s.hText]}>Instrutor</Text>
          <Text style={[s.cCapacity, s.hText]}>Inscritos / Vagas</Text>
        </View>

        {courses.map((c, i) => (
          <View key={c.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cTitle}>{c.title}</Text>
            <Text style={s.cDate}>
              {new Date(`${c.course_date.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR")}
            </Text>
            <Text style={s.cInstructor}>{c.instructor.name}</Text>
            <Text style={s.cCapacity}>
              {c.enrolled_count} / {c.capacity ?? "Ilimitado"}
            </Text>
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
