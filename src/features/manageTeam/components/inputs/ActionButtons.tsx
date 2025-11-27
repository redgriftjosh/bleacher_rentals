"use client";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import { validateForm } from "../../util/validation";
import { createUser, updateUser, sendUserInvite } from "../../db/userOperations";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import { useQueryClient } from "@tanstack/react-query";

export default function ActionButtons() {
  const supabase = useClerkSupabaseClient();
  const queryClient = useQueryClient();
  const state = useCurrentUserStore();
  const existingUserId = useCurrentUserStore((s) => s.existingUserId);
  const isSubmitting = useCurrentUserStore((s) => s.isSubmitting);
  const setField = useCurrentUserStore((s) => s.setField);
  const setIsOpen = useCurrentUserStore((s) => s.setIsOpen);
  const resetForm = useCurrentUserStore((s) => s.resetForm);

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    // Validate form
    const validation = validateForm(state);
    if (!validation.isValid) {
      createErrorToastNoThrow(["Validation Error", ...validation.errors]);
      return;
    }

    setField("isSubmitting", true);

    try {
      if (existingUserId) {
        // Update existing user
        const result = await updateUser(supabase, state);
        if (!result.success) {
          throw new Error(result.error || "Failed to update user");
        }

        // Invalidate bleachers query if account manager changes were made
        if (state.isAccountManager) {
          await queryClient.invalidateQueries({ queryKey: ["bleachers"] });
          await queryClient.invalidateQueries({ queryKey: ["bleachers-with-assignments"] });
        }

        createSuccessToast(["User updated successfully"]);
      } else {
        // Create new user
        const result = await createUser(supabase, state);
        if (!result.success) {
          throw new Error(result.error || "Failed to create user");
        }

        // Invalidate bleachers query if account manager was created
        if (state.isAccountManager) {
          await queryClient.invalidateQueries({ queryKey: ["bleachers"] });
          await queryClient.invalidateQueries({ queryKey: ["bleachers-with-assignments"] });
        }

        // Send invite email
        const inviteResult = await sendUserInvite(state.email);
        if (!inviteResult.success) {
          console.error("Failed to send invite:", inviteResult.error);
          createErrorToastNoThrow([
            "User created but invite failed",
            inviteResult.error || "Unknown error",
          ]);
        } else {
          createSuccessToast(["User created and invite sent"]);
        }
      }

      handleClose();
    } catch (error) {
      console.error("Error saving user:", error);
      createErrorToastNoThrow([
        "Error saving user",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    } finally {
      setField("isSubmitting", false);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      {/* Main action buttons */}
      <div className="flex justify-end gap-2">
        <PrimaryButton
          onClick={handleClose}
          className="bg-gray-500 hover:bg-gray-600"
          disabled={isSubmitting}
        >
          Cancel
        </PrimaryButton>
        <PrimaryButton onClick={handleSubmit} loading={isSubmitting} loadingText="Saving...">
          {existingUserId ? "Update User" : "Send Invite"}
        </PrimaryButton>
      </div>
    </div>
  );
}
