"use client";

import { useActionState, useState } from "react";
import { MAX_OPTION_LENGTH, MAX_OPTIONS, MAX_QUESTION_LENGTH, MIN_OPTIONS } from "@/lib/poll-rules";
import { createPollAction, type CreatePollState } from "../../actions";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function CreatePollForm() {
  const [state, formAction, pending] = useActionState<CreatePollState, FormData>(
    createPollAction,
    {},
  );
  // 입력값을 상태로 들고 있어 검증에 실패해도 내용이 지워지지 않는다.
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(MIN_OPTIONS).fill(""));

  const setOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="question" className="text-sm font-medium">
          질문
        </label>
        <input
          id="question"
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_LENGTH}
          required
          className={inputClass}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          선택지 ({MIN_OPTIONS}~{MAX_OPTIONS}개)
        </legend>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <input
              name="option"
              aria-label={`선택지 ${index + 1}`}
              value={option}
              onChange={(e) => setOption(index, e.target.value)}
              maxLength={MAX_OPTION_LENGTH}
              required
              className={inputClass}
            />
            {options.length > MIN_OPTIONS && (
              <button
                type="button"
                onClick={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                className="shrink-0 px-2 text-sm text-zinc-500"
                aria-label={`선택지 ${index + 1} 삭제`}
              >
                삭제
              </button>
            )}
          </div>
        ))}
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="self-start text-sm underline"
          >
            + 선택지 추가
          </button>
        )}
      </fieldset>

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
        {pending ? "만드는 중…" : "투표 만들기"}
      </button>
    </form>
  );
}
