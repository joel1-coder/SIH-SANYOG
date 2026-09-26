import { resetStore, store } from "./services/demoStore";

resetStore();
console.log(`SANYOG seed ready: ${store.users.length} users, ${store.departments.length} departments, ${store.requests.length} demo requests.`);
console.log("Demo tracking IDs: SYN-7K2P4Q, SYN-4M9R1T, SYN-2B8N6X");
