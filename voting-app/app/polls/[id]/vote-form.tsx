"use client";

import { useActionState } from "react";
import type { Option } from "@/lib/polls";
import { castVoteAction, type VoteState } from "./actions";

export function VoteForm({ pollId, options }: { pollId: string; options: Option[] }) {
  const [state, formAction, pending] = useActionState<VoteState, FormData>(
    castVoteAction.bind(null, pollId),
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">선택지</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-black/10 px-4 py-3 has-[:checked]:border-foreground dark:border-white/15"
          >
            <input type="radio" name="optionId" value={option.id} required />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-4 py-3 font-medium text-background disabled:opacity-50"
      >
        {pending ? "제출 중…" : "투표하기"}
      </button>
    </form>
  );
}
