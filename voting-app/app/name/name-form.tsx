"use client";

import { useActionState } from "react";
import { MAX_VOTER_NAME_LENGTH } from "@/lib/voter-name";
import { saveVoterNameAction, type NameState } from "./actions";

export function NameForm({ next, currentName }: { next: string; currentName: string }) {
  const [state, formAction, pending] = useActionState<NameState, FormData>(
    saveVoterNameAction,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="name" className="text-sm font-medium">
        이름
      </label>
      <input
        id="name"
        name="name"
        defaultValue={currentName}
        maxLength={MAX_VOTER_NAME_LENGTH * 2}
        required
        autoFocus
        autoComplete="name"
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "저장 중…" : "입장하기"}
      </button>
    </form>
  );
}
