import { formatDateInput, isValidBirthDate } from "../../lib/dateValidators";

/**
 * Testes de integração para o fluxo de validação de data de nascimento
 */
describe("Cadastro - Birth Date Integration", () => {
  describe("User entering date on mobile", () => {
    it("formats input as user types", () => {
      let value = "";

      // User types: 1
      value = formatDateInput(value + "1");
      expect(value).toBe("1");

      // User types: 1, 5
      value = formatDateInput(value + "5");
      expect(value).toBe("15");

      // User types: 1, 5, 0
      value = formatDateInput(value + "0");
      expect(value).toBe("15/0");

      // User types: 1, 5, 0, 3
      value = formatDateInput(value + "3");
      expect(value).toBe("15/03");

      // User types: 1, 5, 0, 3, 1, 9, 9, 0
      value = formatDateInput(value + "1990");
      expect(value).toBe("15/03/1990");

      // Extra digits are ignored
      value = formatDateInput(value + "999");
      expect(value).toBe("15/03/1990");
    });

    it("rejects incomplete dates on submission", () => {
      expect(isValidBirthDate("15/03/19")).toBe(false);
      expect(isValidBirthDate("15/03/")).toBe(false);
      expect(isValidBirthDate("15/")).toBe(false);
      expect(isValidBirthDate("15")).toBe(false);
    });

    it("rejects invalid dates on submission", () => {
      expect(isValidBirthDate("32/01/1990")).toBe(false);
      expect(isValidBirthDate("15/13/1990")).toBe(false);
      expect(isValidBirthDate("30/02/2020")).toBe(false);
    });

    it("rejects future dates on submission", () => {
      const futureYear = new Date().getFullYear() + 1;
      expect(isValidBirthDate(`15/03/${futureYear}`)).toBe(false);
    });

    it("accepts valid past dates on submission", () => {
      expect(isValidBirthDate("15/03/1990")).toBe(true);
      expect(isValidBirthDate("01/01/2000")).toBe(true);
      expect(isValidBirthDate("31/12/1980")).toBe(true);
    });

    it("allows reasonable age range (0-120 years)", () => {
      const thisYear = new Date().getFullYear();

      // Someone born 20 years ago
      expect(isValidBirthDate(`15/03/${thisYear - 20}`)).toBe(true);

      // Someone born ~100 years ago
      expect(isValidBirthDate(`15/03/${thisYear - 100}`)).toBe(true);

      // Someone born last year
      expect(isValidBirthDate(`15/01/${thisYear - 1}`)).toBe(true);
    });
  });
});
