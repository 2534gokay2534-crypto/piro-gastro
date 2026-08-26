import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Veritabani: PostgreSQL (Neon) — hem yayin hem gelistirme.
 * Varsayilan adres YOK: tanimsizken sessizce yerel bir dosyaya yazmak,
 * "calisiyor sandim ama veriler baska yerdeydi" hatasina yol acar.
 */
const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
