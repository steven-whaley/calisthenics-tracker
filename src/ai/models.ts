// Only zero-priced models from the AI Gateway catalog (verify with `npm run check:models`).
// Order matters: the first is tried first, the rest are gateway fallbacks.
// We avoid `reflection/beam`, whose price "varies by provider".
export const COACH_MODEL = "reflection/beam-free";
export const COACH_FALLBACK_MODELS = ["nvidia/nemotron-3.5-lightning-free"];
export const ALL_COACH_MODELS = [COACH_MODEL, ...COACH_FALLBACK_MODELS];
