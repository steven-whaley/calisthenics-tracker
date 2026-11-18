import type { ProgressionType } from "@/lib/531";

/** Plain-language descriptions of each progression type, shared by the dashboard FAQ and the exercise form tooltip. */
export type ProgressionInfo = {
  /** One line: what the sets look like. */
  scheme: string;
  /** How the weight (or target) moves. */
  moves: string;
  /** Why you might pick it. */
  choose: string;
  /** The trade-off to know about. */
  tradeoff: string;
};

export const PROGRESSION_INFO: Partial<Record<ProgressionType, ProgressionInfo>> = {
  "531": {
    scheme: "Three working sets a day on a 3-week wave: 65/75/85% for 5s, 70/80/90% for 3s, then 75/85/95% for 5/3/1. The last set is a rep-out (AMRAP). A lighter deload week follows each block.",
    moves: "Your training max rises by a fixed amount after every 3-week cycle, so progress is slow, steady and planned. Optional joker sets let you go heavier on a great day.",
    choose: "Big barbell lifts (squat, bench, deadlift, press) where you want long-term, sustainable strength gains with built-in recovery.",
    tradeoff: "Weights go up on a schedule, not on how you performed, so you have to keep the training max honest (Wendler suggests about 90% of your true max).",
  },
  pyramid: {
    scheme: "Four sets that climb in weight while reps drop (for example 60% x 10 up to 80% x 4 in week 1), on the same 3-week wave and deload.",
    moves: "Like 5/3/1, the training max rises by a fixed amount each cycle.",
    choose: "You like building up to a heavy set with warm-up volume included, or want more total reps than 5/3/1 gives.",
    tradeoff: "No rep-out set, so you get less feedback on how strong you really are on the day.",
  },
  reverse_pyramid: {
    scheme: "Heaviest set first, then lighter sets for more reps (for example 80% x 6, 72% x 8, 64% x 10 in week 1).",
    moves: "The training max rises by a fixed amount each cycle, same wave and deload as the others.",
    choose: "You are freshest at the start and want your best effort on the heaviest set, then volume while fatigued. Good for time-limited sessions.",
    tradeoff: "Needs a proper warm-up before the first set because it starts at the top weight.",
  },
  straight_sets: {
    scheme: "The same weight and reps every set (you choose, for example 5 x 5). Works for weighted and bodyweight exercises.",
    moves: "Performance-driven: the weight (or the reps, for bodyweight) goes up next week only if you hit the target reps on at least half your sets.",
    choose: "Accessory and assistance work, newer lifters, or any exercise where you would rather earn the next step than follow a calendar.",
    tradeoff: "Progress stalls until you hit the target, which is the point, but it can feel slow if the target is too ambitious.",
  },
  duration: {
    scheme: "A target time per set (you choose sets and seconds), such as planks or holds. Weight is optional.",
    moves: "Performance-driven like straight sets: hit the time on at least half your sets and the target rises next week (and the weight too, if you use one).",
    choose: "Isometric holds and timed work (planks, hangs, wall sits, carries) where time, not reps, is the measure.",
    tradeoff: "Only time is tracked, so form quality is on you.",
  },
};

export const BODYWEIGHT_NOTE =
  "Bodyweight exercises use no weights. Pick straight sets (reps) or timed sets (seconds); the target grows when you hit it. When you have mastered an exercise, set a harder variation as its next progression and the coach can suggest one.";

/** Jim Wendler's own pages (verified), for readers who want the full reasoning behind 5/3/1. */
export const WENDLER_LINKS: { title: string; href: string; note: string }[] = [
  { title: "JimWendler.com", href: "https://www.jimwendler.com/", note: "Wendler's official site: articles, books and programs." },
  { title: "The 5/3/1 Philosophy for Beginners", href: "https://www.jimwendler.com/blogs/jimwendler-com/101065094-5-3-1-for-a-beginner", note: "The ideas behind the program, in Wendler's words." },
  { title: "The Training Max: What You Need to Know", href: "https://www.jimwendler.com/blogs/jimwendler-com/101082310-the-training-max-what-you-need-to-know", note: "Why you train from a training max and how to set it." },
  { title: "5/3/1 Second Edition (book)", href: "https://www.jimwendler.com/products/5-3-1-second-edition-hard-copy", note: "The full system, recommended if you are new to 5/3/1." },
  { title: "5/3/1 Forever (book)", href: "https://www.jimwendler.com/products/5-3-1-forever-book", note: "For experienced lifters: jokers, variations and long-term planning." },
  { title: "Boring But Big", href: "https://www.jimwendler.com/blogs/jimwendler-com/101077382-boring-but-big", note: "Wendler's popular assistance work to pair with 5/3/1." },
];
