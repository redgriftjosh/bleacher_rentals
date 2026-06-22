"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompaniesTab } from "@/features/companiesContacts/components/CompaniesTab";
import { ContactsTab } from "@/features/companiesContacts/components/ContactsTab";

export default function CompaniesContactsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-5">Companies & Contacts</h1>

      <Tabs defaultValue="companies">
        <TabsList className="bg-gray-100 p-1 rounded-lg h-auto gap-0 w-auto inline-flex mb-5">
          <TabsTrigger
            value="companies"
            className="rounded-md text-sm px-5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 font-medium transition-all"
          >
            Companies
          </TabsTrigger>
          <TabsTrigger
            value="contacts"
            className="rounded-md text-sm px-5 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500 font-medium transition-all"
          >
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
