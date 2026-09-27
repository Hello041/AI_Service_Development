"use client";

import { useActionState, useState } from "react";
import { setDeadlineAction, type DeadlineState } from "../../actions";

// 진행 중인 투표의 마감 시각을 넣거나, 바꾸거나, 없앤다.
export function DeadlineEditor({
  pollId,
  initialValue,
  hasDeadline,
}: {
  pollId: string;
  initialValue: string;
  hasDeadline: boolean;
}) {
  const [state, formAction, pending] = useActionState<DeadlineState, FormData>(
    setDeadlineAction.bind(null, pollId),
    {},
  );
  const [value, setValue] = useState(initialValue);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="deadline" className="text-sm font-medium">
        마감 시각 (한국 시간)
      </label>
      <div className="flex gap-2">
        <input
          id="deadline"
          type="datetime-local"
          name="deadline"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          className="shrink-0 rounded-lg bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
        >
          저장
        </button>
      </div>
      {hasDeadline && (
        <button
          type="submit"
          name="intent"
          value="clear"
          disabled={pending}
          className="self-start text-sm underline disabled:opacity-50"
        >
          마감 시각 없애기
        </button>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      {state.saved && !pending && (
        <p className="text-sm text-green-700 dark:text-green-300">저장했습니다.</p>
      )}
    </form>
  );
}
