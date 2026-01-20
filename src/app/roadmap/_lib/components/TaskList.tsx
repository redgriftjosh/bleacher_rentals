"use client";

import { useEffect } from "react";
import { getTasks } from "../db";
import { Tab, Task } from "../types";
import { useTasksStore } from "@/state/tasksStore";
import { useLayoutContext } from "@/contexts/LayoutContexts";
import { COLUMN_WIDTHS, TASK_TYPES } from "../constants";

export default function TaskList({
  selectedTab,
  setExistingTask,
  setIsOpen,
}: {
  selectedTab: Tab;
  setExistingTask: (tab: Task) => void;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const tasks = getTasks(selectedTab);
  const { scrollRef } = useLayoutContext();

  // if you're in the backlog, scroll to the bottom when data changes
  const stale = useTasksStore((s) => s.stale);
  useEffect(() => {
    if (!stale && selectedTab === "backlog" && scrollRef?.current) {
      setTimeout(() => {
        if (scrollRef?.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [stale]);

  const handleClick = (task: Task) => {
    setExistingTask(task);
    setIsOpen(true);
  };

  return (
    <tbody>
      {tasks?.map((task, index) => (
        <tr
          key={index}
          onClick={() => handleClick(task)}
          className="border-b h-12 border-gray-200 hover:bg-gray-100 transition-all duration-100 ease-in-out cursor-pointer "
          style={{ height: "auto" }}
        >
          <td
            style={{ width: `${COLUMN_WIDTHS.taskName}px` }}
            className="py-1 px-3 text-left align-top whitespace-normal break-words"
          >
            {task.name}
          </td>
          {/* <td className="py-1 px-3 text-left">{task.description}</td> */}
          <td className="py-1 px-3 text-left align-top whitespace-normal break-words">
            <div className="line-clamp-[inherit] overflow-hidden text-ellipsis max-h-[4.5em] leading-snug">
              {task.description}
            </div>
          </td>
          <td
            className={`py-1 px-3 text-left font-bold ${
              TASK_TYPES.feature === task.task_type.id ? "text-blue-600" : "text-red-600"
            }`}
            style={{ width: `${COLUMN_WIDTHS.type}px` }}
          >
            {task.task_type.label}
          </td>
          <td
            style={{ backgroundColor: task.task_status.hex, width: `${COLUMN_WIDTHS.status}px` }}
            className="py-1 px-3 text-left"
          >
            {task.task_status.label}
          </td>
        </tr>
      ))}
    </tbody>
  );
}
