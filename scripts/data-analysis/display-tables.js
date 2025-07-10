function printStatsTable(data) {
  const headers = ['Lvl', 'STR', 'AGI', 'INT', 'AS', 'AD', 'AR', 'APS', 'DPS'];
  const colWidths = [3, 6, 6, 6, 5, 6, 6, 6, 7];
  
  data.forEach((group) => {
    console.log(`\n=== ${group.label} ===`);
    
    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));
    
    // Print each level
    group.data.forEach((item) => {
      const row = [
        item.level.toString().padEnd(colWidths[0]),
        item.stats.strength.toFixed(1).padEnd(colWidths[1]),
        item.stats.agility.toFixed(1).padEnd(colWidths[2]),
        item.stats.intelligence.toFixed(1).padEnd(colWidths[3]),
        item.stats.attack_speed.toString().padEnd(colWidths[4]),
        item.stats.attack_damage.toFixed(1).padEnd(colWidths[5]),
        item.attackRate.toFixed(2).padEnd(colWidths[6]),
        item.attacksPS.toFixed(2).padEnd(colWidths[7]),
        item.dps.toFixed(1).padEnd(colWidths[8])
      ].join(' | ');
      
      console.log(row);
    });
  });
}

// For comparing specific levels across groups
function printLevelComparison(data, level) {
  const headers = ['Group', 'STR', 'AGI', 'INT', 'AS', 'AD', 'AR', 'APS', 'DPS'];
  const colWidths = [5, 6, 6, 6, 5, 6, 6, 6, 7];
  
  console.log(`\n=== Level ${level} Comparison ===`);
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  console.log(headerRow);
  console.log('-'.repeat(headerRow.length));
  
  data.forEach((group) => {
    const item = group.data.find(d => d.level === level);
    if (item) {
      const row = [
        group.label.padEnd(colWidths[0]),
        item.stats.strength.toFixed(1).padEnd(colWidths[1]),
        item.stats.agility.toFixed(1).padEnd(colWidths[2]),
        item.stats.intelligence.toFixed(1).padEnd(colWidths[3]),
        item.stats.attack_speed.toString().padEnd(colWidths[4]),
        item.stats.attack_damage.toFixed(1).padEnd(colWidths[5]),
        item.attackRate.toFixed(2).padEnd(colWidths[6]),
        item.attacksPS.toFixed(2).padEnd(colWidths[7]),
        item.dps.toFixed(1).padEnd(colWidths[8])
      ].join(' | ');
      
      console.log(row);
    }
  });
}

function printDPSComparison(data) {
  const headers = ['Lvl', ...data.map(group => group.label)];
  const colWidths = [3, ...data.map(() => 8)];
  
  console.log('\n=== DPS Comparison ===');
  const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ');
  console.log(headerRow);
  console.log('-'.repeat(headerRow.length));
  
  for (let level = 1; level <= 30; level++) {
    const row = [
      level.toString().padEnd(colWidths[0]),
      ...data.map((group, groupIndex) => {
        const item = group.data.find(d => d.level === level);
        return item ? item.dps.toFixed(1).padEnd(colWidths[groupIndex + 1]) : 'N/A'.padEnd(colWidths[groupIndex + 1]);
      })
    ].join(' | ');
    
    console.log(row);
  }
}

/**
 * rewrite the displays if needed.
 * 
 */

// const data = 

// Usage:
// printStatsTable(data);
// printLevelComparison(data, 10);
// printDPSComparison(data);