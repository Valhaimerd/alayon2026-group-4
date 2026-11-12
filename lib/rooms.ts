export type Room = {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export const rooms: Room[] = [
  {
    id: "g1",
    name: "Room G01",
    floor: 0,
    capacity: 40,
    kind: "Classroom",
    x: 314,
    y: 68,
    width: 303,
    height: 275,
  },
  {
    id: "g2",
    name: "Room G02",
    floor: 0,
    capacity: 40,
    kind: "Classroom",
    x: 620,
    y: 68,
    width: 287,
    height: 275,
  },
  {
    id: "g3",
    name: "Room G03",
    floor: 0,
    capacity: 45,
    kind: "Classroom",
    x: 910,
    y: 68,
    width: 297,
    height: 275,
  },
  {
    id: "g4",
    name: "Room G04",
    floor: 0,
    capacity: 35,
    kind: "Classroom",
    x: 316,
    y: 716,
    width: 300,
    height: 250,
  },
  ...[0, 1, 2].map((i) => ({
    id: `s${i + 1}`,
    name: `Room S0${i + 1}`,
    floor: 1,
    capacity: 40,
    kind: "Classroom",
    x: [314, 620, 910][i],
    y: 68,
    width: [303, 287, 297][i],
    height: 275,
  })),
  ...[0, 1, 2].map((i) => ({
    id: `s${i + 4}`,
    name: `Computer lab ${i + 1}`,
    floor: 1,
    capacity: 30,
    kind: "Computer lab",
    x: [314, 620, 910][i],
    y: 716,
    width: [303, 287, 293][i],
    height: 250,
  })),
  {
    id: "s7",
    name: "Room S07",
    floor: 1,
    capacity: 25,
    kind: "Classroom",
    x: 52,
    y: 318,
    width: 175,
    height: 403,
  },
];

export type Booking = {
  id: string;
  roomId: string;
  title: string;
  instructor: string;
  date: string;
  start: string;
  end: string;
  // Staff-only fields; public reads omit them and are always published.
  published?: boolean;
  instructorId?: string | null;
  classSize?: number;
};
export type Instructor = { id: string; name: string };
export type Notice = {
  id: string;
  title: string;
  roomName: string;
  startsAt: string;
  state: string;
};
export type StaffData = {
  instructors: Instructor[];
  notices: Notice[];
  recent: Booking[];
  smsEnabled: boolean;
};
export const demoBookings: Booking[] = [
  {
    id: "demo-1",
    roomId: "g1",
    title: "Introduction to computing",
    instructor: "Demo instructor",
    date: "2026-11-12",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "demo-2",
    roomId: "s4",
    title: "Programming laboratory",
    instructor: "Demo instructor",
    date: "2026-11-12",
    start: "10:00",
    end: "12:00",
  },
];
export function roomStatus(
  roomId: string,
  date: string,
  time: string,
  bookings: Booking[],
) {
  return bookings.some(
    (b) =>
      b.published !== false &&
      b.roomId === roomId &&
      b.date === date &&
      b.start <= time &&
      time < b.end,
  )
    ? "Occupied"
    : "Available";
}
