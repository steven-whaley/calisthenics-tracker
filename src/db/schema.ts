import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  image: text("image"),
  // Profile preferences
  unit: text("unit", { enum: ["lb", "kg"] }).notNull().default("lb"),
  rounding: real("rounding").notNull().default(5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category", { enum: ["upper", "lower", "other", "bodyweight"] }).notNull().default("upper"),
    startingTm: real("starting_tm").notNull(),
    trainingMax: real("training_max").notNull(),
    increment: real("increment").notNull(),
    progression: text("progression", { enum: ["531", "pyramid", "reverse_pyramid", "straight_sets", "reps"] })
      .notNull()
      .default("531"),
    // Straight sets only: sets x reps
    setCount: integer("set_count"),
    repTarget: integer("rep_target"),
    // Bodyweight-only ("reps") exercises have no weights: starting_tm / training_max / increment are stored as 0.
    // The next variation the user moves on to (e.g. Pike HSPU -> Elevated pike HSPU).
    nextProgression: text("next_progression"),
    cyclesPerBlock: integer("cycles_per_block").notNull().default(2),
    currentCycle: integer("current_cycle").notNull().default(1),
    currentWeek: integer("current_week").notNull().default(1),
    blockNumber: integer("block_number").notNull().default(1),
    jokersEnabled: boolean("jokers_enabled").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("exercises_user_idx").on(t.userId)],
);

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("templates_user_idx").on(t.userId)],
);

export const templateExercises = pgTable(
  "template_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id").notNull().references(() => templates.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [index("template_exercises_template_idx").on(t.templateId)],
);

// One training day built from a template (or a single ad-hoc exercise); groups that day's workouts.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => templates.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    performedOn: date("performed_on", { mode: "string" }).notNull(),
    /** Total time spent in the workout, from the in-form workout timer (null if it wasn't used). */
    durationSeconds: integer("duration_seconds"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_date_idx").on(t.userId, t.performedOn)],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    performedOn: date("performed_on", { mode: "string" }).notNull().defaultNow(),
    blockNumber: integer("block_number").notNull(),
    cycle: integer("cycle").notNull(),
    week: integer("week").notNull(),
    trainingMax: real("training_max").notNull(),
    notes: text("notes"),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (t) => [
    index("workouts_exercise_idx").on(t.exerciseId),
    index("workouts_user_date_idx").on(t.userId, t.performedOn),
  ],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["main", "joker"] }).notNull(),
    setNumber: integer("set_number").notNull(),
    targetWeight: real("target_weight").notNull(),
    targetReps: integer("target_reps").notNull(),
    isAmrap: boolean("is_amrap").notNull().default(false),
    actualWeight: real("actual_weight"),
    actualReps: integer("actual_reps"),
  },
  (t) => [index("workout_sets_workout_idx").on(t.workoutId)],
);

/** User-submitted issues; each one is also created as a GitHub issue. */
export const issueReports = pgTable(
  "issue_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["bug", "feature", "other"] }).notNull(),
    title: text("title").notNull(),
    githubNumber: integer("github_number").notNull(),
    githubUrl: text("github_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("issue_reports_user_idx").on(t.userId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type IssueReport = typeof issueReports.$inferSelect;
