"use client";

import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithApprovalResponses, type InferAgentUIMessage } from "ai";
import { useState } from "react";
import type { CoachAgent } from "@/ai/coach";

type CoachMessage = InferAgentUIMessage<CoachAgent>;

const SUGGESTIONS = [
  "I did 5 weighted pull-ups with 25 lb at 180 lb bodyweight. What's my training max?",
  "I can't do pistol squats because of my knee. What can I swap in?",
  "Add weighted dips to my exercises.",
];

const TOOL_LABELS: Record<string, string> = {
  listExercises: "Checked your exercises",
  calculateTrainingMax: "Calculated training max",
  projectProgression: "Built a progression",
};

export function CoachChat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error, addToolApprovalResponse } = useChat<CoachMessage>({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });
  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="card space-y-2">
            <p className="text-sm opacity-80">
              Ask about exercise substitutions, training maxes, 5/3/1 programming, or have me add an exercise for you.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="btn-ghost h-auto py-2 text-left" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl px-4 py-3 text-sm ${
              m.role === "user" ? "ml-auto max-w-[85%] bg-orange-600 text-white" : "max-w-[95%] border border-stone-300/70 dark:border-stone-700"
            }`}
          >
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
              }
              if (part.type === "tool-addExercise") {
                const input = part.input as { name?: string; category?: string; nextProgression?: string; trainingMax?: number; increment?: number; cyclesPerBlock?: number; jokersEnabled?: boolean } | undefined;
                return (
                  <div key={part.toolCallId} className="my-2 rounded-lg border border-stone-400/50 p-3">
                    <p className="font-medium">Add exercise: {input?.name}</p>
                    <p className="text-xs opacity-70">
                      {input?.category}
                      {input?.category === "bodyweight"
                        ? input?.nextProgression ? ` · next: ${input.nextProgression}` : ""
                        : ` · TM ${input?.trainingMax}`}
                      {input?.increment ? ` · +${input.increment}/cycle` : ""}
                      {input?.cyclesPerBlock ? ` · ${input.cyclesPerBlock} cycles/block` : ""}
                      {input?.jokersEnabled ? " · jokers" : ""}
                    </p>
                    {part.state === "approval-requested" && !part.approval.isAutomatic && (
                      <div className="mt-2 flex gap-2">
                        <button className="btn" onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: true })}>Add it</button>
                        <button className="btn-ghost" onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: false })}>Cancel</button>
                      </div>
                    )}
                    {part.state === "output-available" && <p className="mt-1 text-xs text-green-600">Added to your exercises.</p>}
                    {part.state === "output-denied" && <p className="mt-1 text-xs opacity-70">Not added.</p>}
                    {part.state === "output-error" && <p className="mt-1 text-xs text-red-600">Could not add: {part.errorText}</p>}
                  </div>
                );
              }
              if (part.type.startsWith("tool-")) {
                const name = part.type.slice(5);
                return (
                  <p key={i} className="my-1 text-xs italic opacity-60">
                    {TOOL_LABELS[name] ?? name}
                  </p>
                );
              }
              return null;
            })}
          </div>
        ))}
        {status === "submitted" && <p className="text-sm opacity-60">Thinking…</p>}
        {error && <p className="text-sm text-red-600">Something went wrong. Try again in a moment.</p>}
      </div>

      {/* Sits above the phone tab bar (plus the home-indicator inset) */}
      <form
        className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 flex gap-2 bg-[var(--background)] px-4 py-2 md:bottom-3 md:mx-0 md:px-0"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="input bg-white dark:bg-stone-900"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          maxLength={2000}
          enterKeyHint="send"
          autoComplete="off"
          aria-label="Message"
        />
        <button className="btn" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
