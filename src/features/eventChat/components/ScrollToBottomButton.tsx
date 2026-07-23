import { ChevronDown } from "lucide-react";

type Props = {
  unreadCount: number;
  onClick: () => void;
};

/**floating button — scroll down; badge when there are unread messages. */
export function ScrollToBottomButton({ unreadCount, onClick }: Props) {
  const label =
    unreadCount > 0
      ? unreadCount === 1
        ? "1 unread message — scroll to latest"
        : `${unreadCount} unread messages — scroll to latest`
      : "Scroll to latest messages";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="absolute bottom-4 right-4 z-10 flex flex-col items-center cursor-pointer group"
    >
      {unreadCount > 0 && (
        <span className="mb-1 min-w-[28px] h-[22px] px-2 rounded-full bg-sky-500 text-white text-xs font-semibold flex items-center justify-center shadow-md">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      <span className="size-10 rounded-full bg-gray-800 text-white flex items-center justify-center shadow-lg group-hover:bg-gray-700 transition-colors">
        <ChevronDown className="size-5" strokeWidth={2.5} />
      </span>
    </button>
  );
}
