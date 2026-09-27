import {
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_OPTIONS,
} from "./poll-rules";
import type { CreatePollError } from "./polls";

export const createPollErrorMessages: Record<CreatePollError, string> = {
  question_empty: "질문을 입력해 주세요.",
  question_too_long: `질문은 ${MAX_QUESTION_LENGTH}자까지 입력할 수 있습니다.`,
  too_few_options: `선택지는 ${MIN_OPTIONS}개 이상이어야 합니다.`,
  too_many_options: `선택지는 ${MAX_OPTIONS}개까지 만들 수 있습니다.`,
  option_empty: "비어 있는 선택지가 있습니다.",
  option_too_long: `선택지는 ${MAX_OPTION_LENGTH}자까지 입력할 수 있습니다.`,
  duplicate_options: "같은 내용의 선택지가 있습니다.",
  deadline_not_in_future: "마감 시각은 지금보다 뒤여야 합니다.",
};
