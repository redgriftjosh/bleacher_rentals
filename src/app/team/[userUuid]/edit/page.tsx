import { redirect } from "next/navigation";

export default async function EditUserPage({ params }: { params: Promise<{ userUuid: string }> }) {
  const { userUuid } = await params;
  redirect(`/team/${userUuid}/edit/basic-user-info`);
}
