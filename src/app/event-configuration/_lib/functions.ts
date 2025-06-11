"use client";
import { fetchBleachers } from "@/app/(dashboards)/bleachers-dashboard/_lib/db";
import { DashboardBleacher } from "@/app/(dashboards)/bleachers-dashboard/_lib/types";
import { fetchUsers } from "@/app/team/_lib/db";
import { activityTypes } from "@/types/Constants";
import { useMemo } from "react";

export function getActivityTypeOptions() {
  return activityTypes.map((type) => ({
    value: type,
    label: type,
  }));
}

export function getDashboardBleacherById(bleacherId: number | null): DashboardBleacher | null {
  const allBleachers = fetchBleachers();

  return useMemo(() => {
    if (!bleacherId) return null;
    return allBleachers.find((b) => b.bleacherId === bleacherId) ?? null;
  }, [allBleachers, bleacherId]);
}

export function getUsersById(userId: number | null) {
  const allUsers = fetchUsers();

  return useMemo(() => {
    if (!userId) return null;
    return allUsers.find((u) => u.user_id === userId) ?? null;
  }, [allUsers, userId]);
}

export function getDriversOptions() {
  const allUsers = fetchUsers();

  return useMemo(() => {
    const drivers = allUsers.filter((u) => u.role === 3) ?? null;
    if (!drivers) return [];
    return drivers.map((d) => ({
      value: d.user_id,
      label: `${d.first_name} ${d.last_name}`,
    }));
  }, [allUsers]);
}
