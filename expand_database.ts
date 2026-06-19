import { IPTVExpansionService } from './src/services/IPTVExpansionService';
import fs from 'fs/promises';
import path from 'path';

async function main() {
    console.log("=== FideTV Database Expansion Agent ===");
    try {
        const channels = await IPTVExpansionService.runExpansion();
        console.log(`Initial batch size: ${channels.length}`);

        // Sort by priority (e.g., specific countries first)
        const priorityCountries = ['NG', 'IN', 'PH', 'US', 'GB'];
        channels.sort((a, b) => {
            const aP = priorityCountries.indexOf(a.country);
            const bP = priorityCountries.indexOf(b.country);
            if (aP !== -1 && bP === -1) return -1;
            if (aP === -1 && bP !== -1) return 1;
            return 0;
        });

        // Limit for this demo run to avoid huge file, but still massive
        const filtered = channels.slice(0, 3000); 

        console.log(`Final batch size for storage: ${filtered.length}`);
        
        const dataPath = path.join(process.cwd(), 'src', 'data', 'channels.json');
        await fs.mkdir(path.dirname(dataPath), { recursive: true });
        await fs.writeFile(dataPath, JSON.stringify(filtered, null, 2));
        
        console.log(`SUCCESS: Expansion complete. Database now contains ${filtered.length} verified/sourced entries.`);
    } catch (e: any) {
        console.error("Expansion failed:", e.message);
    }
}

main();
