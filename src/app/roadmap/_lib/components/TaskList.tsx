"use client";

import { useEffect } from "react";
import { useRoadmapTasks } from "../hooks/useRoadmapTasks";
import type { Tab, Task } from "../types";
import { useLayoutContext } from "@/contexts/LayoutContexts";
import { COLUMN_WIDTHS, TASK_STATUS_META } from "../constants";

export default function TaskList({
  selectedTab,
  setExistingTask,
  setIsOpen,
}: {
  selectedTab: Tab;
  setExistingTask: (tab: Task) => void;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { tasks } = useRoadmapTasks(selectedTab);
  const { scrollRef } = useLayoutContext();

  // if you're in the backlog, scroll to the bottom when data changes
  useEffect(() => {
    if (selectedTab !== "backlog") return;
    if (!scrollRef?.current) return;

    setTimeout(() => {
      if (scrollRef?.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  }, [scrollRef, selectedTab, tasks.length]);
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
                task.type === "feature" ? "text-blue-600" : "text-red-600"
              }`}
              style={{ width: `${COLUMN_WIDTHS.type}px` }}
            >
              {task.type === "feature" ? "Feature" : "Bug"}
            </td>
            <td
              style={{
                backgroundColor: task.status ? TASK_STATUS_META[task.status].hex : "transparent",
                width: `${COLUMN_WIDTHS.status}px`,
              }}
              className="py-1 px-3 text-left"
            >
              {task.status ? TASK_STATUS_META[task.status].label : ""}
            </td>
        </tr>
      ))}
    </tbody>
  );
}
