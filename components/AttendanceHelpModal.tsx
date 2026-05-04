"use client";

import { useEffect } from "react";

export function AttendanceHelpModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-help-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(88vh,40rem)] w-full max-w-2xl flex-col rounded-2xl border border-blue-100 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2
            id="attendance-help-title"
            className="text-lg font-semibold text-slate-900 sm:text-xl"
          >
            Hướng dẫn sử dụng — Chấm công
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Đóng hướng dẫn"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5 pt-2 text-sm text-slate-700 sm:px-6 sm:pb-6">
          <p className="mb-6 text-slate-600">
            Hướng dẫn dùng trang chấm công và phần dành cho tài khoản quản lý (nếu được
            phân quyền).
          </p>

          <section className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">
              1. Đăng nhập và thông tin hiển thị
            </h3>
            <ul className="list-inside list-disc space-y-1.5 marker:text-blue-600">
              <li>
                Tại <strong>Đăng nhập</strong>, nhập số điện thoại và mật khẩu quản trị cấp
                hoặc tài khoản đã đăng ký.
              </li>
              <li>
                Đầu trang hiển thị họ tên, loại nhân viên (nếu có), số điện thoại. Nút{" "}
                <strong>Đăng xuất</strong> kết thúc phiên trên trình duyệt hiện tại.
              </li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">
              2. Gửi bản ghi chấm công
            </h3>

            <h4 className="mb-1.5 mt-4 text-[0.9375rem] font-medium text-slate-800">
              2.1. Chọn ngày
            </h4>
            <ul className="mb-4 list-inside list-disc space-y-1.5 marker:text-blue-600">
              <li>
                Trên <strong>lịch</strong> (tuần bắt đầu từ Thứ Hai): bấm từng ngày để bật /
                tắt — ngày chọn được tô màu.
              </li>
              <li>Có thể chọn nhiều ngày trong một lần gửi.</li>
              <li>
                Dùng ‹ Tháng trước / Tháng sau › để xem tháng khác. Khối <strong>Ngày đã chọn</strong>{" "}
                hiển thị các ngày; bấm × để bỏ một ngày.
              </li>
            </ul>

            <h4 className="mb-1.5 mt-4 text-[0.9375rem] font-medium text-slate-800">
              2.2. Chọn loại chấm công (Loại CC)
            </h4>
            <ul className="mb-4 list-inside list-disc space-y-1.5 marker:text-blue-600">
              <li>
                <strong>Combobox 1</strong>: bắt buộc chọn ít nhất một loại (mã · tên do quản trị cấu
                hình).
              </li>
              <li>
                <strong>Combobox 2</strong>: chỉ khi trong cùng một lần gửi cần hai loại cho cùng các
                ngày đã chọn.
              </li>
            </ul>
            <p className="mb-2 font-medium text-slate-800">Quy tắc hai loại</p>
            <ul className="mb-4 list-inside list-disc space-y-1.5 marker:text-blue-600">
              <li>
                Chỉ một loại: hệ thống ghi nhận loại đó cho từng ngày đã chọn (mã như{" "}
                <span className="font-mono">P</span>, <span className="font-mono">No</span>…).
              </li>
              <li>
                Hai loại khác nhau: mỗi ngày có hai bản ghi; mã kèm hậu tố{" "}
                <span className="rounded bg-slate-100 px-1 font-mono text-xs">/2</span> (nửa ngày
                theo quy ước).
              </li>
              <li>Không chọn trùng một loại ở cả hai combobox.</li>
            </ul>

            <h4 className="mb-1.5 mt-4 text-[0.9375rem] font-medium text-slate-800">
              2.3. Gửi
            </h4>
            <p className="mb-4">
              Bấm <strong>Gửi</strong>. Thành công sẽ thông báo số bản ghi và làm mới phần{" "}
              <strong>Trong tháng</strong> (theo tháng/năm đang lọc bên dưới).
            </p>

            <h4 className="mb-1.5 mt-4 text-[0.9375rem] font-medium text-slate-800">
              2.4. Gửi lại cùng ngày — lưu ý
            </h4>
            <ul className="list-inside list-disc space-y-1.5 marker:text-amber-600">
              <li>
                Với <strong>mỗi ngày</strong> trong lần gửi, hệ thống <strong>xóa</strong> chấm công
                cũ của ngày đó rồi <strong>ghi lại</strong> theo các loại bạn chọn.
              </li>
              <li>
                Muốn sửa một ngày: chỉ <strong>tích đúng ngày đó</strong>, chọn đúng loại, rồi gửi.
              </li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">
              3. Trong tháng — xem lịch sử
            </h3>
            <ul className="list-inside list-disc space-y-1.5 marker:text-blue-600">
              <li>
                Chọn <strong>Tháng</strong> và <strong>Năm</strong>; có trạng thái «Đang tải…» khi đổi.
              </li>
              <li>
                Bảng có cột Ngày, Mã, Tên. Lịch phía trên và lọc tháng/năm ở đây độc lập nhau.
              </li>
            </ul>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">
              4. Tài khoản quản lý
            </h3>
            <p className="mb-3">
              Nếu được phân quyền quản lý, ở khối <strong>Gửi bản ghi chấm công</strong> có
              thêm mục chọn <strong>nhân viên</strong> để chấm giúp — dữ liệu gửi và bảng «Trong tháng»
              theo nhân viên đang chọn (mặc định «Chính tôi»). Ở khối «Trong tháng» có thêm hai nút:
            </p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-800">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Nút
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Ý nghĩa
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">Xuất Excel</td>
                    <td className="px-3 py-2">
                      File bảng chấm công theo tháng/năm đang chọn (tổng hợp nhân viên).
                    </td>
                  </tr>
                  <tr>
                    <td className="whitespace-nowrap px-3 py-2 font-medium">Xuất log (Excel)</td>
                    <td className="px-3 py-2">
                      Log các lần gửi thành công trong tháng (đối soát).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-slate-600">
              Quản trị có thể mở trang admin qua liên kết trên header (ví dụ bấm số điện thoại khi được
              cấp quyền).
            </p>
          </section>

          <section className="mb-6">
            <h3 className="mb-2 font-semibold text-slate-900">
              5. Đăng ký (nếu được bật)
            </h3>
            <p className="text-slate-700">
              Trang đăng ký: họ tên, số điện thoại, mật khẩu, loại nhân viên — sau đó đăng nhập để vào
              chấm công.
            </p>
          </section>

          <section className="mb-2">
            <h3 className="mb-3 font-semibold text-slate-900">
              6. Khắc phục sự cố
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-800">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Hiện tượng
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Gợi ý
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2">Hết phiên, yêu cầu đăng nhập lại</td>
                    <td className="px-3 py-2">Đăng nhập lại; phiên phụ thuộc cookie trình duyệt.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Không có loại CC trong combobox</td>
                    <td className="px-3 py-2">
                      Quản trị cần bật các loại trong danh mục Loại chấm công.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2">Không gửi được / lỗi mạng</td>
                    <td className="px-3 py-2">Kiểm tra kết nối, thử lại; báo IT nếu lỗi lặp.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="shrink-0 border-t border-slate-100 px-5 py-3 sm:px-6">
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
