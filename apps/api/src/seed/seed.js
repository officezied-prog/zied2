import * as store from "../store/jsonStore.js";
store.reset();
const d = store.load();
console.log(`seeded ${d.creators.length} creators, ${d.brands.length} brands → data/db.json`);
