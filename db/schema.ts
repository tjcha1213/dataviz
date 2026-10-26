import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  course: text("course").notNull(),
  classDate: text("class_date").notNull(),
  createdAt: text("created_at").notNull(),
});

export const checkins = sqliteTable(
  "checkins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    checkedInAt: text("checked_in_at").notNull(),
  },
  (table) => [
    uniqueIndex("checkins_session_name_unique").on(table.sessionId, table.nameKey),
  ]
);
