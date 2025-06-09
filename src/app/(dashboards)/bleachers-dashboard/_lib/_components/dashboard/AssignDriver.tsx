import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchDrivers } from "../../db";
import { useState } from "react";
import { Tables } from "../../../../../../../database.types";

export function AssignDriver() {
  const [selectedDriver, setSelectedDriver] = useState<Tables<"Users"> | null>(null);
  const drivers = fetchDrivers();

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          {selectedDriver?.avatar_image_url ? (
            <img
              src={selectedDriver?.avatar_image_url}
              alt="Driver"
              className="w-6 h-6 rounded-full mr-2"
            />
          ) : (
            <img
              src={`https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg`}
              alt="Driver"
              className="w-6 h-6 rounded-full mr-2"
            />
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Choose a Driver to Deliver This Bleacher</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>

          {/* map over drivers and display a list here? */}
          {drivers.map((driver) => (
            <div key={driver.user_id}>
              <input
                type="radio"
                name="driver"
                value={driver.user_id}
                onChange={() => setSelectedDriver(driver)}
              />
              <label>
                {driver.first_name} {driver.last_name}
              </label>
            </div>
          ))}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
