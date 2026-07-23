import type { ChatEligibleUser } from "../hooks/useChatEligibleUsers";
import { splitMessageBody } from "../utils/mentions";

type Props = {
  body: string;
  members: ChatEligibleUser[];
  currentUserUuid: string | null;
};

/** Renders chat message text with Slack-style @mention highlights. */
export function EventMessageBody({ body, members, currentUserUuid }: Props) {
  const parts = splitMessageBody(body, members);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }

        const isSelf = part.userUuid === currentUserUuid;

        return (
          <span
            key={index}
            className={`font-semibold rounded px-0.5 ${
              isSelf
                ? "bg-amber-200 text-amber-950"
                : "bg-sky-200/80 text-sky-900"
            }`}
          >
            @{part.name}
          </span>
        );
      })}
    </>
  );
}
