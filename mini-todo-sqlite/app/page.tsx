import { AddTodoForm } from "@/app/components/AddTodoForm";
import { TodoList } from "@/app/components/TodoList";
import { getTasks } from "@/app/lib/get-tasks";

export default async function Home() {
  const tasks = await getTasks();

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">할 일 목록</h1>
        <AddTodoForm />
        <TodoList tasks={tasks} />
      </main>
    </div>
  );
}
