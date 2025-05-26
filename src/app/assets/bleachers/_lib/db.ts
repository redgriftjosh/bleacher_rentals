import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@/utils/supabase/client";
import { Tables } from "../../../../../database.types";
import { InsertBleacher, UpdateBleacher } from "@/types/tables/Bleachers";
import { toast } from "sonner";
import { ErrorToast } from "@/components/toasts/ErrorToast";
import React from "react";
import { SuccessToast } from "@/components/toasts/SuccessToast";

type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  homeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseId: number;
    winterHomeBaseName: string;
  };
};

export function useBleachersWithHomeBases(): FormattedBleacher[] {
  const LOCAL_STORAGE_KEY = "cached-bleachers-with-home-bases";
  const { getToken } = useAuth();
  const [bleachers, setBleachers] = useState<FormattedBleacher[]>([]);

  useEffect(() => {
    // Load cache on mount
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setBleachers(parsed);
        }
      } catch {
        // fail silently if JSON is malformed
      }
    }

    async function fetchData() {
      const token = await getToken({ template: "supabase" });
      if (!token) return;

      const supabase = createClient(token);

      const { data, error } = await supabase
        .from("Bleachers")
        .select(
          `
          bleacher_number,
          bleacher_rows,
          bleacher_seats,
          home_base:home_base_id (
            home_base_id,
            home_base_name
          ),
          winter_home_base:winter_home_base_id (
            home_base_id,
            home_base_name
          )
        `
        )
        .order("bleacher_number", { ascending: false });

      if (error) {
        console.error("Error fetching bleachers:", error);
        return;
      }

      const formatted = data.map((bleacher) => {
        const homeBase = Array.isArray(bleacher.home_base)
          ? bleacher.home_base[0]
          : bleacher.home_base;
        const winterHomeBase = Array.isArray(bleacher.winter_home_base)
          ? bleacher.winter_home_base[0]
          : bleacher.winter_home_base;

        return {
          bleacherNumber: bleacher.bleacher_number,
          bleacherRows: bleacher.bleacher_rows,
          bleacherSeats: bleacher.bleacher_seats,
          homeBase: {
            homeBaseId: homeBase?.home_base_id ?? 0,
            homeBaseName: homeBase?.home_base_name ?? "",
          },
          winterHomeBase: {
            homeBaseId: winterHomeBase?.home_base_id ?? 0,
            winterHomeBaseName: winterHomeBase?.home_base_name ?? "",
          },
        };
      });

      setBleachers(formatted);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
    }

    fetchData();
  }, [getToken]);

  return bleachers;
}

export function useBleachers(): { bleachers: Tables<"Bleachers">[]; loading: boolean } {
  const LOCAL_STORAGE_KEY = "cached-bleachers";
  const { getToken } = useAuth();
  const [bleachers, setBleachers] = useState<Tables<"Bleachers">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cache on mount
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setBleachers(parsed);
        }
      } catch {
        // fail silently if JSON is malformed
      }
    }

    async function fetchData() {
      const token = await getToken({ template: "supabase" });
      if (!token) return;

      const supabase = createClient(token);

      const { data, error } = await supabase
        .from("Bleachers")
        .select("*")
        .order("bleacher_number", { ascending: false });

      if (error) {
        console.error("Error fetching bleachers:", error);
        return;
      }

      setBleachers(data);
      setLoading(false);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }

    fetchData();
  }, [getToken]);

  return { bleachers, loading };
}

export function useHomeBases(): { homeBases: Tables<"HomeBases">[]; loading: boolean } {
  const LOCAL_STORAGE_KEY = "cached-home-bases";
  const { getToken } = useAuth();
  const [homeBases, setHomeBases] = useState<Tables<"HomeBases">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cache on mount
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setHomeBases(parsed);
        }
      } catch {
        // fail silently if JSON is malformed
      }
    }

    async function fetchData() {
      const token = await getToken({ template: "supabase" });
      if (!token) return;

      const supabase = createClient(token);

      const { data, error } = await supabase.from("HomeBases").select("*");

      if (error) {
        console.error("Error fetching Home bases:", error);
        return;
      }

      setHomeBases(data);
      setLoading(false);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    }

    fetchData();
  }, [getToken]);

  return { homeBases, loading };
}

export async function updateBleacher(bleacher: UpdateBleacher, token: string) {
  console.log("Updating bleacher", token);
  const supabase = createClient(token);
  const { error } = await supabase
    .from("Bleachers")
    .update(bleacher)
    .eq("bleacher_id", bleacher.bleacher_id);

  if (error) {
    console.log("Error inserting bleacher:", error);
    let errorMessage = error.message;
    if (error.code === "23505") {
      errorMessage = "Error: Bleacher number already exists!";
    }
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: ["Error Updating bleacher. Please refresh your page and try again.", errorMessage],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    throw new Error(`Failed to update bleacher: ${error.message}`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Bleacher was Updated"],
      }),
    { duration: 10000 }
  );
}

export async function insertBleacher(bleacher: InsertBleacher, token: string) {
  console.log("inserting bleacher", token);
  const supabase = createClient(token);
  const { error } = await supabase.from("Bleachers").insert(bleacher);
  if (error) {
    console.log("Error inserting bleacher:", error);
    let errorMessage = error.message;
    if (error.code === "23505") {
      errorMessage = "Error: Bleacher number already exists!";
    }
    toast.custom(
      (t) =>
        React.createElement(ErrorToast, {
          id: t,
          lines: [
            "Error inserting bleacher. Please refresh your page and try again.",
            errorMessage,
          ],
        }),
      {
        duration: 10000, // 20 seconds
      }
    );
    throw new Error(`Failed to insert bleacher: ${error.message}`);
  }
  toast.custom(
    (t) =>
      React.createElement(SuccessToast, {
        id: t,
        lines: ["Bleacher was Created"],
      }),
    { duration: 10000 }
  );
}

/**
 * Fetch all taken bleacher numbers from the Supabase "Bleachers" table.
 * Requires a valid Supabase JWT token.
 * I set this one up with tanstack query but didn't really like it.
 */
export async function fetchTakenBleacherNumbers(
  token: string,
  editBleacherNumber?: number
): Promise<number[]> {
  const supabase = createClient(token);

  const { data, error } = await supabase.from("Bleachers").select("bleacher_number");

  if (error) {
    console.error("Failed to fetch bleacher numbers:", error.message);
    throw new Error("Could not fetch bleacher numbers");
  }

  const numbers = data
    .map((row) => row.bleacher_number)
    .filter((n): n is number => typeof n === "number");

  console.log("editBleacherNumber:", editBleacherNumber);
  console.log("numbers:", numbers);

  // Filter out the editBleacherNumber if it exists
  return editBleacherNumber ? numbers.filter((num) => num !== editBleacherNumber) : numbers;
}
