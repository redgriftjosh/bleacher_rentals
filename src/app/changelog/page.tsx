import { ChangeLogPage } from "@/features/changelog/components/ChangeLogPage";
import { readVersionFiles } from "@/features/changelog/server/readVersionFiles";

export default function Page() {
  // Server component: the release notes are read off disk here and handed to the
  // client page, which merges them with the ChangeLog rows for their dates.
  return <ChangeLogPage files={readVersionFiles()} />;
}
