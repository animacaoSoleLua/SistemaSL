import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface MemberPdfItem {
  id: string;
  name: string;
  last_name?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  role: string;
}

interface MembersPdfProps {
  members: MemberPdfItem[];
  roleFilter: string;
  generatedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  animador: "Animador",
  recreador: "Recreador",
};

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
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
  cName: { width: "35%" },
  cCpf: { width: "20%" },
  cBirth: { width: "18%" },
  cAge: { width: "10%" },
  cRole: { width: "17%" },
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

export function MembersPdf({ members, roleFilter, generatedAt }: MembersPdfProps) {
  const roleLabel =
    roleFilter === "all" ? "Todos" : (ROLE_LABELS[roleFilter] ?? roleFilter);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Relação de Membros</Text>
          <Text style={s.meta}>Função: {roleLabel}</Text>
          <Text style={s.meta}>Gerado em: {generatedAt}</Text>
          <Text style={s.meta}>Total: {members.length} membro(s)</Text>
        </View>

        <View style={s.tableHeader}>
          <Text style={[s.cName, s.hText]}>Nome Completo</Text>
          <Text style={[s.cCpf, s.hText]}>CPF</Text>
          <Text style={[s.cBirth, s.hText]}>Nascimento</Text>
          <Text style={[s.cAge, s.hText]}>Idade</Text>
          <Text style={[s.cRole, s.hText]}>Função</Text>
        </View>

        {members.map((m, i) => (
          <View key={m.id} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]}>
            <Text style={s.cName}>
              {m.name}
              {m.last_name ? ` ${m.last_name}` : ""}
            </Text>
            <Text style={s.cCpf}>{m.cpf ?? "-"}</Text>
            <Text style={s.cBirth}>
              {m.birth_date
                ? new Date(`${m.birth_date}T00:00:00`).toLocaleDateString("pt-BR")
                : "-"}
            </Text>
            <Text style={s.cAge}>
              {m.birth_date ? String(calcAge(m.birth_date)) : "-"}
            </Text>
            <Text style={s.cRole}>{ROLE_LABELS[m.role] ?? m.role}</Text>
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
