import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Head from "next/head";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/bleachers-dashboard");
  }

  return (
    <div className="flex flex-col items-center justify-between h-screen overflow-x-hidden xl:overflow-hidden min-w-[320px]">
      <Head>
        <title>Welcome to Bleacher Rentals</title>
      </Head>
    </div>
  );
}
