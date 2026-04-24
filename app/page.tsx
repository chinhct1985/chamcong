import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HomeForm } from "@/components/HomeForm";
import { verifyUserToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { ymdHcmForDate } from "@/lib/format-datetime-vn";
import {
  listActiveDropdownOptions,
  listAttendanceEntriesForMonth,
} from "@/lib/user-attendance";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  const raw = jar.get(AUTH_COOKIE_NAME)?.value;
  if (!raw) redirect("/login");

  let userId: string;
  try {
    userId = (await verifyUserToken(raw)).userId;
  } catch {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      fullName: true,
      phone: true,
      isActive: true,
      isManager: true,
      employeeType: { select: { name: true } },
    },
  });
  if (!user?.isActive) redirect("/login");

  const serverNow = new Date();
  /** Múi HCM: danh sách tháng + ngày mặc định trùng "hôm nay" tại VN. */
  const initialDateYmd = ymdHcmForDate(serverNow);
  const listParts = initialDateYmd.split("-");
  const listYear = Number(listParts[0]) || serverNow.getFullYear();
  const listMonth = Number(listParts[1]) || serverNow.getMonth() + 1;

  const [initialOptions, initialEntries] = await Promise.all([
    listActiveDropdownOptions(),
    listAttendanceEntriesForMonth(userId, listYear, listMonth),
  ]);

  return (
    <HomeForm
      initialFullName={user.fullName}
      initialEmployeeTypeName={user.employeeType?.name ?? null}
      initialPhone={user.phone}
      initialIsManager={Boolean(user.isManager)}
      initialDateYmd={initialDateYmd}
      initialOptions={initialOptions}
      initialEntries={initialEntries}
      initialListYear={listYear}
      initialListMonth={listMonth}
    />
  );
}
