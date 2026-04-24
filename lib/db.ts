import { Prisma, PrismaClient } from "@prisma/client";

/** Đổi tên khi thêm model Prisma — tránh dùng instance cũ trong `next dev` (thiếu delegate mới). */
const PRISMA_GLOBAL_KEY = "__chamcong_prisma_client_v3__" as const;

const globalForPrisma = globalThis as unknown as {
  [PRISMA_GLOBAL_KEY]?: ReturnType<typeof createPrismaClient>;
};

/** Lỗi tạm thời do Postgres đóng socket (restart container, idle, mạng). */
const CONNECTION_RETRY_CODES = new Set([
  "P1017", // Server has closed the connection
  "P1001", // Can't reach database server
  "P1008", // Operations timed out
]);

function createPrismaClient() {
  const base = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  const hasDelegate = (c: { publicHoliday?: unknown }) => c.publicHoliday != null;

  if (!hasDelegate(base)) {
    throw new Error(
      "Prisma Client thiếu model PublicHoliday. Chạy: npx prisma generate — sau đó xóa thư mục .next và chạy lại npm run dev (hoặc dev:restart).",
    );
  }

  const ext = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          try {
            return await query(args);
          } catch (e) {
            if (
              e instanceof Prisma.PrismaClientKnownRequestError &&
              CONNECTION_RETRY_CODES.has(e.code)
            ) {
              await base.$disconnect().catch(() => {});
              await base.$connect();
              return query(args);
            }
            throw e;
          }
        },
      },
    },
  });

  if (!hasDelegate(ext as { publicHoliday?: unknown })) {
    return base;
  }
  return ext;
}

export const prisma =
  globalForPrisma[PRISMA_GLOBAL_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_GLOBAL_KEY] = prisma;
}
