import { Prisma, PrismaClient } from "@prisma/client";

/** Đổi tên khi thêm model Prisma — tránh dùng instance cũ trong `next dev` (thiếu delegate mới). */
const PRISMA_GLOBAL_KEY = "__chamcong_prisma_client_v4__" as const;

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

  const hasDelegates = (c: {
    publicHoliday?: unknown;
    employeeType?: unknown;
  }) => c.publicHoliday != null && c.employeeType != null;

  if (!hasDelegates(base)) {
    throw new Error(
      "Prisma Client lệch schema (thiếu PublicHoliday hoặc EmployeeType). Chạy: npx prisma generate — xóa .next — chạy lại npm run dev (hoặc npm run dev:restart).",
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

  if (!hasDelegates(ext as { publicHoliday?: unknown; employeeType?: unknown })) {
    return base;
  }
  return ext;
}

export const prisma =
  globalForPrisma[PRISMA_GLOBAL_KEY] ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_GLOBAL_KEY] = prisma;
}
