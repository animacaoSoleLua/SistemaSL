import { toastReducer } from "./ToastContext";

describe("toastReducer", () => {
  it("ADD adiciona toast à lista", () => {
    const toast = { id: "1", message: "Erro", type: "error" as const };
    const result = toastReducer([], { type: "ADD", toast });
    expect(result).toEqual([toast]);
  });

  it("ADD preserva toasts existentes", () => {
    const existing = { id: "1", message: "A", type: "error" as const };
    const incoming = { id: "2", message: "B", type: "success" as const };
    const result = toastReducer([existing], { type: "ADD", toast: incoming });
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(incoming);
  });

  it("DISMISS remove o toast pelo id", () => {
    const toasts = [
      { id: "1", message: "A", type: "error" as const },
      { id: "2", message: "B", type: "success" as const },
    ];
    const result = toastReducer(toasts, { type: "DISMISS", id: "1" });
    expect(result).toEqual([{ id: "2", message: "B", type: "success" }]);
  });

  it("DISMISS com id inexistente não altera a lista", () => {
    const toasts = [{ id: "1", message: "A", type: "error" as const }];
    const result = toastReducer(toasts, { type: "DISMISS", id: "999" });
    expect(result).toEqual(toasts);
  });
});
