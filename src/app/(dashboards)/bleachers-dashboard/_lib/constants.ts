import { Color } from "@/types/Color";

// pretty sure this was just for testing
export const bleachersConst = [
  {
    bleacherId: 1,
    bleacherNumber: "1",
    events: [
      {
        eventName: "Event 1",
        startDate: new Date(new Date().setDate(new Date().getDate() + 4)),
        duration: 3, // days
      },
    ],
  },
];

// bleacherId, bleacherNumber

const sampleBleachers = [
  {
    bleacherId: 1,
    bleacherNumber: "101",
    rows: 10,
    seats: 150,
    homeBase: "Florida",
    events: [
      {
        eventId: 1,
        eventName: "Summer Festival",
        startDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        duration: 3,
        color: Color.LIGHT_BLUE,
      },
      {
        eventId: 2,
        eventName: "County Fair",
        startDate: new Date(new Date().setDate(new Date().getDate() + 15)),
        duration: 5,
        // color: Color.LIGHT_GREEN,
      },
    ],
  },
  {
    bleacherId: 2,
    bleacherNumber: "102",
    rows: 8,
    seats: 120,
    homeBase: "Texas",
    events: [
      {
        eventId: 3,
        eventName: "Sports Tournament",
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        duration: 4,
        // color: Color.ORANGE,
      },
    ],
  },
  {
    bleacherId: 3,
    bleacherNumber: "103",
    rows: 12,
    seats: 180,
    homeBase: "Georgia",
    events: [
      {
        eventId: 4,
        eventName: "Music Festival",
        startDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        duration: 2,
        // color: Color.PURPLE,
      },
      {
        eventId: 5,
        eventName: "School Event",
        startDate: new Date(new Date().setDate(new Date().getDate() + 20)),
        duration: 1,
        // color: Color.YELLOW,
      },
    ],
  },
  {
    bleacherId: 4,
    bleacherNumber: "104",
    rows: 6,
    seats: 90,
    homeBase: "Oklahoma",
    events: [], // Empty events to show available bleacher
  },
  {
    bleacherId: 5,
    bleacherNumber: "105",
    rows: 15,
    seats: 225,
    homeBase: "Ontario",
    events: [
      {
        eventId: 6,
        eventName: "State Fair",
        startDate: new Date(new Date().setDate(new Date().getDate() + 10)),
        duration: 7,
        // color: Color.RED,
      },
    ],
  },
];
