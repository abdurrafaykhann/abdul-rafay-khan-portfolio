import { MessagesInbox } from "@/components/admin/MessagesInbox";
import { adminMessages } from "@/lib/admin/data";

export default async function MessagesPage() {
  const messages = await adminMessages();
  return (
    <MessagesInbox
      key={messages.map((m) => m.id).join("|")}
      messages={messages}
    />
  );
}
