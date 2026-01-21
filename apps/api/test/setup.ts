if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://sol_e_lua:sol_e_lua@localhost:5432/sol_e_lua";
}
