"use client";
import { useCurrentUserStore } from "../../state/useCurrentUserStore";
import { useClerkSupabaseClient } from "@/utils/supabase/useClerkSupabaseClient";
import { deactivateUser, reactivateUser, deleteUser } from "../../db/userStatusOperations";
import { sendInviteUserEmail } from "../../api/sendInviteUserEmail";
import { deleteInviteUserEmail } from "../../api/deleteInviteUserEmail";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";
import { createSuccessToast } from "@/components/toasts/SuccessToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { STATUSES } from "../../constants";

export default function StatusButtons() {
  const supabase = useClerkSupabaseClient();
  const existingUserUuid = useCurrentUserStore((s) => s.existingUserUuid);
  console.log("StatusButtons existingUserUuid:", existingUserUuid);
  const statusUuid = useCurrentUserStore((s) => s.statusUuid);
  console.log("StatusButtons statusUuid:", statusUuid);
  const email = useCurrentUserStore((s) => s.email);
  const isSubmitting = useCurrentUserStore((s) => s.isSubmitting);
  const setField = useCurrentUserStore((s) => s.setField);
  const setIsOpen = useCurrentUserStore((s) => s.setIsOpen);
  const resetForm = useCurrentUserStore((s) => s.resetForm);

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleResendInvite = async () => {
    setField("isSubmitting", true);
    try {
      const success = await sendInviteUserEmail(email);
      if (!success) {
        throw new Error("Failed to send invite");
      }
      createSuccessToast(["Invitation email sent successfully"]);
    } catch (error) {
      createErrorToastNoThrow([
        "Failed to send invite",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    } finally {
      setField("isSubmitting", false);
    }
  };

  const handleRevokeInvite = async () => {
    setField("isSubmitting", true);
    try {
      const success = await deleteInviteUserEmail(email);
      if (!success) {
        throw new Error("Failed to revoke invite");
      }

      const deleteResult = await deleteUser(supabase, existingUserUuid!);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || "Failed to delete user");
      }

      createSuccessToast(["Invitation revoked and user removed"]);
      handleClose();
    } catch (error) {
      createErrorToastNoThrow([
        "Failed to revoke invite",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    } finally {
      setField("isSubmitting", false);
    }
  };

  const handleDeactivate = async () => {
    setField("isSubmitting", true);
    try {
      const result = await deactivateUser(supabase, existingUserUuid!);
      if (!result.success) {
        throw new Error(result.error || "Failed to deactivate user");
      }
      createSuccessToast(["User deactivated successfully"]);
      handleClose();
    } catch (error) {
      createErrorToastNoThrow([
        "Failed to deactivate user",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    } finally {
      setField("isSubmitting", false);
    }
  };

  const handleReactivate = async () => {
    setField("isSubmitting", true);
    try {
      const result = await reactivateUser(supabase, existingUserUuid!);
      if (!result.success) {
        throw new Error(result.error || "Failed to reactivate user");
      }
      createSuccessToast(["User reactivated successfully"]);
      handleClose();
    } catch (error) {
      createErrorToastNoThrow([
        "Failed to reactivate user",
        error instanceof Error ? error.message : "Unknown error",
      ]);
    } finally {
      setField("isSubmitting", false);
    }
  };

  if (!existingUserUuid) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-end">
      {/* Invited Status Actions */}
      {statusUuid === STATUSES.invited && (
        <>
          <button
            onClick={handleResendInvite}
            disabled={isSubmitting}
            className="px-4 py-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Resend Invite
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={isSubmitting}
                className="px-4 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Revoke Invite
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will cancel the invitation and remove the user from the system. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="cursor-pointer bg-red-600 text-white hover:bg-red-700"
                  onClick={handleRevokeInvite}
                >
                  Yes, Revoke
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Active Status Actions */}
      {statusUuid === STATUSES.active && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={isSubmitting}
              className="px-4 py-1 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deactivate User
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate User?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the user's account. They will not be able to log in until
                reactivated. You can reactivate them later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="cursor-pointer bg-orange-600 text-white hover:bg-orange-700"
                onClick={handleDeactivate}
              >
                Yes, Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Inactive Status Actions */}
      {statusUuid === STATUSES.inactive && (
        <button
          onClick={handleReactivate}
          disabled={isSubmitting}
          className="px-4 py-1 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reactivate User
        </button>
      )}
    </div>
  );
}
