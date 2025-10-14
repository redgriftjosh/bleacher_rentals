"use client";
import { useEffect, useState } from "react";
import { useHomeBasesStore } from "@/state/homeBaseStore";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  deactivateUser,
  deleteUser,
  fetchDriverTaxById,
  insertUser,
  reactivateUser,
  updateUser,
  fetchBleachersForOptions,
  fetchUserBleacherAssignments,
  upsertUserBleacherAssignments,
} from "../db";
import { Dropdown } from "@/components/DropDown";
import { useUserRolesStore } from "@/state/userRolesStore";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  checkEmailRules,
  checkInsertUserFormRules,
  deleteInviteUserEmail,
  filterUserRoles,
  sendInviteUserEmail,
} from "../functions";
import { useUsersStore } from "@/state/userStore";
import React from "react";
import { ErrorToast } from "@/components/toasts/ErrorToast";
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
import { MultiSelect } from "@/components/MultiSelect";
import { getHomeBaseOptions } from "@/app/(dashboards)/bleachers-dashboard/_lib/functions";
import { Info, TriangleAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExistingUser } from "../../page";
import { SuccessToast } from "@/components/toasts/SuccessToast";
import { ROLES, STATUSES } from "../constants";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import InputPercents from "@/components/InputPercents";

export function SheetAddTeamMember({
  isOpen,
  setIsOpen,
  existingUser = null,
  setExistingUser,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  existingUser?: ExistingUser;
  setExistingUser: (user: ExistingUser) => void;
}) {
  const { getToken } = useAuth();
  let userRoles = useUserRolesStore((s) => s.userRoles);
  userRoles = filterUserRoles(userRoles, existingUser);
  const users = useUsersStore((s) => s.users);
  const homeBaseOptions = getHomeBaseOptions();

  const [email, setEmail] = useState<string | null>(existingUser?.email ?? null);
  const [firstName, setFirstName] = useState<string | null>(existingUser?.first_name ?? null);
  const [lastName, setLastName] = useState<string | null>(existingUser?.last_name ?? null);
  const [roleId, setRoleId] = useState<number | null>(existingUser?.role ?? null);
  const [homeBaseIds, setHomeBaseIds] = useState<number[]>(
    existingUser?.homeBases.map((hb) => hb.id) ?? []
  );
  const [tax, setTax] = useState<number | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [summerBleacherIds, setSummerBleacherIds] = useState<number[]>([]);
  const [winterBleacherIds, setWinterBleacherIds] = useState<number[]>([]);

  const {
    data: taxData,
    isLoading: isTaxLoading,
    isFetching: isTaxFetching,
    isError: isTaxError,
  } = useQuery({
    queryKey: ["driverTax", existingUser?.user_id],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchDriverTaxById(existingUser!.user_id, token);
    },
    enabled: !!existingUser && existingUser.role === ROLES.driver,
  });

  // Bleacher options for pickers
  const {
    data: bleacherOptions,
    isLoading: isBleachersLoading,
    isError: isBleachersError,
  } = useQuery({
    queryKey: ["bleacherOptions"],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchBleachersForOptions(token);
    },
  });

  // Existing user's assignments
  const {
    data: assignments,
    isLoading: isAssignmentsLoading,
    isFetching: isAssignmentsFetching,
  } = useQuery({
    queryKey: ["bleacherAssignments", existingUser?.user_id],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchUserBleacherAssignments(existingUser!.user_id, token);
    },
    enabled: !!existingUser,
  });

  useEffect(() => {
    if (taxData) {
      setTax(taxData);
    }
  }, [isTaxLoading, isTaxError, taxData]);

  useEffect(() => {
    if (assignments) {
      setSummerBleacherIds(assignments.summer ?? []);
      setWinterBleacherIds(assignments.winter ?? []);
    }
  }, [isAssignmentsLoading, isAssignmentsFetching, assignments]);

  // useEffect to set all back to default
  useEffect(() => {
    if (!isOpen) {
      setEmail(null);
      setFirstName(null);
      setLastName(null);
      setRoleId(null);
      setHomeBaseIds([]);
      setExistingUser(null);
      setTax(undefined);
      setSummerBleacherIds([]);
      setWinterBleacherIds([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (existingUser) {
      setEmail(existingUser.email.toLowerCase());
      setFirstName(existingUser.first_name);
      setLastName(existingUser.last_name);
      setRoleId(existingUser.role);
      setHomeBaseIds(existingUser.homeBases.map((hb) => hb.id));
    }
  }, [existingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    if (
      !checkInsertUserFormRules(
        firstName,
        lastName,
        email,
        roleId,
        homeBaseIds,
        users.map((u) => u.email),
        token,
        existingUser !== null
      )
    ) {
      setSubmitting(false);
      throw new Error("Event form validation failed");
    } else {
      if (existingUser) {
        // update user
        await updateUser(existingUser.user_id, {
          email,
          firstName,
          lastName,
          roleId,
          homeBaseIds,
          tax: tax ?? null,
          token: token!,
        });
        // Save bleacher assignments for existing user
        await upsertUserBleacherAssignments(
          existingUser.user_id,
          summerBleacherIds,
          winterBleacherIds,
          token
        );
        setSubmitting(false);
        setIsOpen(false);
      } else {
        // insert user
        const newUserId = await insertUser(
          email!,
          firstName!,
          lastName!,
          roleId!,
          homeBaseIds,
          tax ?? null,
          token!
        );
        if (newUserId) {
          // Save bleacher assignments for new user
          await upsertUserBleacherAssignments(
            newUserId,
            summerBleacherIds,
            winterBleacherIds,
            token
          );
        }
        if (roleId === ROLES.driver) {
          setSubmitting(false);
          setIsOpen(false);
          return;
        }
        const success = await sendInviteUserEmail(email!);
        if (success) {
          setSubmitting(false);
          setIsOpen(false);
        } else {
          setSubmitting(false);
        }
      }
    }
  };
  const handleResend = async () => {
    if (
      !checkEmailRules(
        email,
        users.map((u) => u.email)
      )
    ) {
      setSubmitting(false);
      return;
    }
    const success = await sendInviteUserEmail(email!);
    if (success) {
      setSubmitting(false);
      toast.custom(
        (t) =>
          React.createElement(SuccessToast, {
            id: t,
            lines: ["Invitation Email Successfully Sent"],
          }),
        { duration: 10000 }
      );
    }
  };

  const handleDeactivate = async () => {
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    if (!token) {
      console.warn("No token found");
      setSubmitting(false);
      return;
    }
    await deactivateUser(existingUser!.user_id, token!);
    setSubmitting(false);
    setIsOpen(false);
  };

  const handleReactivate = async () => {
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    if (!token) {
      console.warn("No token found");
      setSubmitting(false);
      return;
    }
    await reactivateUser(existingUser!.user_id, token!);
    setSubmitting(false);
    setIsOpen(false);
  };

  const handleRevokeInvitationAndDeleteUser = async () => {
    setSubmitting(true);
    const token = await getToken({ template: "supabase" });
    if (!token) {
      console.warn("No token found");
      setSubmitting(false);
      return;
    }
    const success = await deleteInviteUserEmail(email!);
    if (success) {
      await deleteUser(existingUser!.user_id, token!);
      toast.custom(
        (t) =>
          React.createElement(SuccessToast, {
            id: t,
            lines: ["Invitation Revoked"],
          }),
        { duration: 10000 }
      );
      setSubmitting(false);
      setIsOpen(false);
      return;
    } else {
      setSubmitting(false);
      toast.custom(
        (t) =>
          React.createElement(ErrorToast, {
            id: t,
            lines: ["Failed to revoke invitation. Please try again."],
          }),
        { duration: 10000 }
      );
      return;
    }
  };

  const allowResend =
    existingUser && existingUser.status === STATUSES.invited && existingUser.role !== ROLES.driver;

  if (isTaxLoading)
    return (
      <div
        onMouseDown={() => setIsOpen(false)}
        className="fixed inset-0 z-[2000] bg-black/0 backdrop-blur-xs flex items-center justify-center"
      >
        <LoadingSpinner />
      </div>
    );

  return (
    <>
      <PrimaryButton onClick={() => setIsOpen(true)}>+ Invite Team Member</PrimaryButton>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed inset-y-0 right-0 w-full sm:max-w-sm bg-white shadow-xl flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">
                {existingUser ? "Make Changes to This Team Member" : "Invite A New Team Member"}
              </h2>
              <p className="text-sm text-gray-500">
                Just type their email and they'll receive an email to join Bleacher Rentals.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    First Name
                  </label>
                  <input
                    id="firstname"
                    type="text"
                    value={firstName ?? ""}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Last Name
                  </label>
                  <input
                    id="lastname"
                    type="text"
                    value={lastName ?? ""}
                    onChange={(e) => setLastName(e.target.value)}
                    className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email ?? ""}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                    <label htmlFor="name">Role</label>
                    {roleId === ROLES.admin && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TriangleAlert className="h-4 w-4 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Admins can do anything!</p>
                            <p>Make sure you trust this user.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {roleId === ROLES.driver && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <TriangleAlert className="h-4 w-4 text-yellow-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Driver's don't get access to this app at all.</p>
                            <p>
                              Adding a driver just allows you to create work trackers for them but{" "}
                              <br />
                              you'll still need to export the PDF and send to the driver manually.
                            </p>
                            <p>
                              {/* intentionally left blank for spacing */}
                              <br />
                            </p>
                            <p>
                              In the future, we will add a 'Driver App' to automate this process.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="col-span-3">
                    <Dropdown
                      options={userRoles.map((userRole) => ({
                        label: userRole.role,
                        value: userRole.id,
                      }))}
                      selected={roleId}
                      onSelect={(id) => setRoleId(id)}
                      placeholder="Select Role"
                    />
                  </div>
                </div>
              </div>
              {roleId === ROLES.driver && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-5 items-center gap-4">
                    <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                      <label htmlFor="name" className="text-right text-sm font-medium col-span-2">
                        Tax
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Does this driver charge tax?</p>
                            <p>This field is the amount of tax that the driver charges.</p>
                            <p>
                              If they make $1000 on their work tracker and this field is 10% then
                            </p>
                            <p>the driver will get paid $1100.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <InputPercents value={tax ?? 0} setValue={setTax} />
                    {/* <input
                      type="string"
                      className="col-span-3 px-3 py-2 border rounded text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-greenAccent focus:border-0"
                      step="1"
                      min="0"
                      max="100"
                      value={taxRaw}
                      onChange={(e) => {
                        let value = e.target.value;

                        // Remove all leading zeros (but keep a single "0" if that's all there is)
                        if (/^0\d+/.test(value)) {
                          value = value.replace(/^0+/, "");
                        }

                        // If user deletes everything, treat as 0
                        if (value === "") value = "0";

                        setTaxRaw(value);
                        setTax(Number(value));
                      }}
                      placeholder="0%"
                    /> */}
                  </div>
                </div>
              )}
              {roleId === ROLES.driver && (
                <div className="text-xs text-black/50 mt-2">
                  <p>Driver's don't get access to this app at all.</p>
                  <p>
                    Adding a driver just allows you to create work trackers for them but you'll
                    still need to export the PDF and send to the driver manually.
                  </p>
                  <p>
                    {/* intentionally left blank for spacing */}
                    <br />
                  </p>
                  <p>In the future, we will add a 'Driver App' to automate this process.</p>
                </div>
              )}
              {roleId === ROLES.accountManager && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-5 items-center gap-4">
                    <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                      <label htmlFor="name">Home Bases</label>
                      {homeBaseIds.length === 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <TriangleAlert className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                This user won't be able to do anything unless they're assigned to at
                                least one Home Base!
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="col-span-3">
                      <MultiSelect
                        options={homeBaseOptions}
                        color="bg-greenAccent"
                        onValueChange={(value) => setHomeBaseIds(value)}
                        // defaultSelectedValues={homeBaseOptions.map((option) => option.value)}
                        forceSelectedValues={homeBaseIds}
                        placeholder="Home Bases"
                        variant="inverted"
                        maxCount={1}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Summer / Winter bleacher assignments */}
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                    <label>Summer Bleachers</label>
                  </div>
                  <div className="col-span-3">
                    <MultiSelect
                      options={(bleacherOptions ?? []).map((o) => ({
                        label: o.label,
                        value: o.id,
                      }))}
                      color="bg-greenAccent"
                      onValueChange={(value) => setSummerBleacherIds(value)}
                      forceSelectedValues={summerBleacherIds}
                      placeholder={isBleachersLoading ? "Loading..." : "Select Bleachers"}
                      variant="inverted"
                      maxCount={3}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-5 items-center gap-4">
                  <div className="text-right text-sm font-medium col-span-2 flex items-center justify-end gap-1">
                    <label>Winter Bleachers</label>
                  </div>
                  <div className="col-span-3">
                    <MultiSelect
                      options={(bleacherOptions ?? []).map((o) => ({
                        label: o.label,
                        value: o.id,
                      }))}
                      color="bg-greenAccent"
                      onValueChange={(value) => setWinterBleacherIds(value)}
                      forceSelectedValues={winterBleacherIds}
                      placeholder={isBleachersLoading ? "Loading..." : "Select Bleachers"}
                      variant="inverted"
                      maxCount={3}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
              {allowResend && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-5 items-end gap-4">
                    <div className="col-span-2 flex items-center"></div>
                    <div className="col-span-3">
                      <PrimaryButton
                        loading={submitting}
                        loadingText="Sending..."
                        onClick={handleResend}
                      >
                        Resend Invititation
                      </PrimaryButton>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end">
              {/* <PrimaryButton loading={submitting} loadingText="Sending..." onClick={handleSubmit}>
                Send Invite
              </PrimaryButton> */}

              {existingUser && existingUser.status === STATUSES.active && (
                <div className="mr-2">
                  <PrimaryButton
                    className="bg-red-800 hover:bg-red-900"
                    loading={submitting}
                    loadingText="Ok..."
                    onClick={handleDeactivate}
                  >
                    Deactiviate
                  </PrimaryButton>
                </div>
              )}
              {existingUser && existingUser.status === STATUSES.invited && (
                <div className="mr-2">
                  <PrimaryButton
                    className="bg-red-800 hover:bg-red-900"
                    loading={submitting}
                    loadingText="Ok..."
                    onClick={handleRevokeInvitationAndDeleteUser}
                  >
                    Cancel Invitation
                  </PrimaryButton>
                </div>
              )}
              {existingUser && existingUser.status === STATUSES.inactive && (
                <div className="mr-2">
                  <PrimaryButton
                    className="bg-green-800 hover:bg-green-700"
                    loading={submitting}
                    loadingText="Ok..."
                    onClick={handleReactivate}
                  >
                    Reactiviate
                  </PrimaryButton>
                </div>
              )}

              {roleId === ROLES.admin ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <PrimaryButton loading={submitting} loadingText="Sending...">
                      {existingUser ? "Update User" : "Send Invite"}
                    </PrimaryButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Administrators can do everything!</AlertDialogTitle>
                      <AlertDialogDescription>
                        Administrators can add and delete users including you! They can delete any
                        event and modify any kind of data that's in the system. This is a big deal
                        and should only be given to trusted users. Are you sure you want to make
                        this user an administrator?
                      </AlertDialogDescription>
                      <AlertDialogDescription>
                        Are you sure you want to make this user an administrator?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="cursor-pointer rounded-sm">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="cursor-pointer rounded-sm bg-red-800 text-white hover:bg-red-900"
                        onClick={(e) => {
                          // Close the dialog immediately
                          // Then handle the form submission separately
                          setTimeout(() => handleSubmit(e), 0);
                        }}
                      >
                        Yes, I'm sure
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <PrimaryButton loading={submitting} loadingText="Sending..." onClick={handleSubmit}>
                  {existingUser
                    ? "Update User"
                    : roleId === ROLES.driver
                    ? "Create User"
                    : "Send Invite"}
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
