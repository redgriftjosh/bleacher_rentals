export function canEditRoadmapTasks(isDeveloper: boolean, isAccountManager: boolean): boolean {
  return isDeveloper || isAccountManager;
}
