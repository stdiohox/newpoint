import { queue } from "@trigger.dev/sdk";

/** One CRM task at a time: the claims share crm.leads rows (see processNewLeads). */
export const crmQueue = queue({ name: "crm", concurrencyLimit: 1 });
