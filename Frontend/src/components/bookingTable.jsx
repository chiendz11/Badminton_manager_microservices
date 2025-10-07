import React from "react";

const BookingTable = ({
  courts,
  bookingData,
  toggleBookingStatus,
  times,
  slotCount,
  currentUserId,
}) => {
  return (
    <div className="mt-4 bg-green-100 p-2 rounded-md">
      <table className="table-fixed w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              className="p-2 bg-green-100 text-center font-bold text-black"
              style={{ width: "60px", height: "50px" }}
            ></th>
            {Array.from({ length: slotCount }, (_, i) => {
              const startHour = times[i];
              const endHour = times[i + 1];
              return (
                <th
                  key={i}
                  className="bg-green-100 text-black relative"
                  style={{ width: "50px", height: "50px" }} // Đảm bảo tất cả các cột có độ rộng 50px
                >
                  <div
                    className="absolute bottom-0 bg-yellow-500"
                    style={{ left: "-0.5px", width: "2px", height: "4px" }}
                  />
                  <div
                    className="absolute font-bold text-[10px]"
                    style={{
                      left: 0,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {startHour}:00
                  </div>
                  {i === slotCount - 1 && (
                    <>
                      <div
                        className="absolute bottom-0 bg-yellow-500"
                        style={{ right: "-0.5px", width: "2px", height: "4px" }}
                      />
                      <div
                        className="absolute font-bold text-[10px]"
                        style={{
                          right: 0,
                          top: "50%",
                          transform: "translate(20%, -50%)", // Giảm translate để nhãn không tràn ra ngoài quá nhiều
                          whiteSpace: "nowrap",
                        }}
                      >
                        {endHour}:00
                      </div>
                    </>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {courts.map((court, rowIndex) => (
            <tr key={rowIndex} style={{ border: "1px solid black" }}>
              <td
                className="bg-green-200 text-black text-center font-bold"
                style={{ width: "60px", height: "40px", padding: "2px" }}
              >
                {court.name}
              </td>
              {Array.from({ length: slotCount }, (_, colIndex) => {
                const rawStatus =
                  bookingData && bookingData[court._id]
                    ? bookingData[court._id][colIndex]
                    : "trống";

                const isObject = typeof rawStatus === "object" && rawStatus !== null;
                const statusStr = isObject ? rawStatus.status?.toLowerCase() : rawStatus.toLowerCase();
                const username = isObject ? rawStatus.username || "" : "";

                let userId = isObject ? rawStatus.userId : "";
                if (userId && typeof userId === "string" && userId.includes("_id")) {
                  try {
                    const parsed = JSON.parse(userId);
                    userId = parsed._id || userId;
                  } catch (e) {
                    console.warn(`Không thể parse userId: ${userId}`);
                  }
                }

                let status;
                if (statusStr.includes("đã đặt") || statusStr.includes("booked")) {
                  status = "đã đặt";
                } else if (statusStr.includes("pending")) {
                  status = userId && userId.toString() === currentUserId?.toString() ? "myPending" : "pending";
                } else if (statusStr.includes("chờ xử lý") || statusStr.includes("processing")) {
                  status = userId && userId.toString() === currentUserId?.toString() ? "myProcessing" : "processing";
                } else if (statusStr.includes("locked")) {
                  status = "locked";
                } else {
                  status = "trống";
                }

                const clickable = status === "trống" || status === "myPending" || status === "myProcessing";

                const bgColor =
                  status === "trống"
                    ? "bg-white"
                    : status === "pending"
                    ? "bg-yellow-500"
                    : status === "myPending"
                    ? "bg-green-500"
                    : status === "processing"
                    ? "bg-[#0288D1]"
                    : status === "myProcessing"
                    ? "bg-[#0288D1]"
                    : status === "đã đặt"
                    ? "bg-red-500"
                    : "bg-gray-500";

                const textColor =
                  status === "trống"
                    ? "text-black"
                    : status === "pending"
                    ? "text-black"
                    : status === "myPending"
                    ? "text-white"
                    : status === "processing"
                    ? "text-white"
                    : status === "myProcessing"
                    ? "text-white"
                    : status === "đã đặt"
                    ? "text-white"
                    : "text-white";

                return (
                  <td
                    key={colIndex}
                    className="relative"
                    style={{
                      width: "50px", // Đảm bảo tất cả các cột có độ rộng 50px
                      height: "40px",
                      padding: "0",
                      border: "1px solid black",
                      pointerEvents: clickable ? "auto" : "none",
                      cursor: clickable ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (clickable) {
                        toggleBookingStatus(rowIndex, colIndex);
                      }
                    }}
                  >
                    <div
                      className={`h-full flex items-center justify-center ${bgColor} ${textColor}`}
                      title={
                        username
                          ? `${status === "myProcessing" || status === "processing" ? "Đang xử lý" : status === "myPending" || status === "pending" ? "Pending" : "Đã đặt"} bởi ${username}`
                          : status
                      }
                    >
                      {/* Không hiển thị text, chỉ hiển thị màu */}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingTable;