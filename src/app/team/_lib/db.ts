"use client";
import { useInvitedUsersStore } from "@/state/invitedUserStore";
import { useUsersStore } from "@/state/userStore";
import { createClient } from "@/utils/supabase/client";

export async function inviteUser(email: string, token: string) {
  console.log("inserting user", token);
  const supabase = createClient(token);

  const { error, data } = await supabase.from("InvitedUsers").insert({ email });

  if (error) {
    console.error("Insert failed:", error.message);
  } else {
    console.log("Inserted invited user:", data);
  }
}

export function fetchUsers() {
  const users = useUsersStore((s) => s.users);
  const invitedUsers = useInvitedUsersStore((s) => s.invitedUsers);

  // Get all emails that are already in Users
  const userEmails = new Set(users.map((u) => u.email));

  // Filter invited users whose email is not already in the Users table
  const pendingUsers = invitedUsers
    .filter((invited) => !userEmails.has(invited.email))
    .map((invited) => ({
      first_name: "Pending",
      last_name: "",
      email: invited.email,
      user_id: null,
      phone: null,
      clerk_user_id: null,
      created_at: invited.created_at,
      status: "invited", // optional: to distinguish visually
    }));

  // Combine existing users and pending invites
  const combined = [...users, ...pendingUsers];

  return combined;
}
