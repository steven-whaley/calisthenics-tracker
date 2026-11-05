// Fails if any model the coach can use is not priced at zero in the live gateway catalog.
import { ALL_COACH_MODELS } from "../src/ai/models";

async function main() {
  const res = await fetch("https://ai-gateway.vercel.sh/v1/models");
  if (!res.ok) throw new Error(`Model catalog request failed: ${res.status}`);
  const { data } = (await res.json()) as {
    data: { id: string; pricing?: Record<string, string | boolean | undefined> }[];
  };

  let bad = 0;
  for (const id of ALL_COACH_MODELS) {
    const m = data.find((d) => d.id === id);
    const p = m?.pricing;
    const priced = p ? Object.entries(p).filter(([k, v]) => k !== "varies_by_provider" && Number(v) !== 0) : null;
    const free = !!m && !p?.varies_by_provider && priced?.length === 0;
    console.log(`${free ? "FREE " : "FAIL "} ${id}${m ? "" : " (not in catalog)"}`);
    if (!free) bad++;
  }
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
