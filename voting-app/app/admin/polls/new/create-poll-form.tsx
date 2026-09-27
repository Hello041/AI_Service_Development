"use client";

import { useActionState, useState } from "react";
import { MAX_OPTION_LENGTH, MAX_OPTIONS, MAX_QUESTION_LENGTH, MIN_OPTIONS } from "@/lib/poll-rules";
import { createPollAction, type CreatePollState } from "../../actions";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function CreatePollForm({ defaultDeadline }: { defaultDeadline: string }) {
  const [state, formAction, pending] = useActionState<CreatePollState, FormData>(
    createPollAction,
    {},
  );
  // 입력값을 상태로 들고 있어 검증에 실패해도 내용이 지워지지 않는다.
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(MIN_OPTIONS).fill(""));
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [noDeadline, setNoDeadline] = useState(false);

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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">마감 시각 (한국 시간)</legend>
        <input
          type="datetime-local"
          name="deadline"
          aria-label="마감 시각"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          disabled={noDeadline}
          required={!noDeadline}
          className={`${inputClass} disabled:opacity-40`}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="noDeadline"
            checked={noDeadline}
            onChange={(e) => setNoDeadline(e.target.checked)}
          />
          마감 시각 없음 (운영자가 직접 마감할 때까지 열림)
        </label>
      </fieldset>

      <label className="flex items-start gap-2">
        <input type="checkbox" name="named" defaultChecked className="mt-1" />
        <span className="flex flex-col">
          <span className="text-sm font-medium">기명 투표</span>
          <span className="text-sm text-zinc-500">
            켜면 참여자 이름이 표에 남고, 운영자만 누가 무엇을 골랐는지 봅니다. 만든 뒤에는 바꿀 수
            없습니다.
          </span>
        </span>
      </label>

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
