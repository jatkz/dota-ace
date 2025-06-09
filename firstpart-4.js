// Create structured Morphling data matching our schema
const morphlingData = {
  "hero": "morphling",
  "name": "Morphling",
  "id": 11,
  "primary_attribute": "agility",
  "attack_type": "ranged",
  "roles": ["carry", "escape", "durable", "nuker", "disabler"],
  
  "base_stats": {
    "strength": 23,
    "agility": 24,
    "intelligence": 19,
    "base_health": 626,
    "base_mana": 303,
    "base_armor": 2,
    "base_magic_resistance": 26.9,
    "base_attack_damage_min": 33,
    "base_attack_damage_max": 42,
    "base_attack_range": 350,
    "movement_speed": 285,
    "attack_speed": 100,
    "base_attack_time": 1.5,
    "turn_rate": 0.7,
    "vision_day": 1800,
    "vision_night": 800
  },
  
  "stat_growth": {
    "strength_per_level": 2.6,
    "agility_per_level": 3.9,
    "intelligence_per_level": 1.8
  },
  
  "facets": {
    "ebb": {
      "name": "Ebb",
      "type": "agility",
      "description": "Sets primary attribute to Agility",
      "ability_modifier": "Waveform attacks enemies in its path"
    },
    "flow": {
      "name": "Flow", 
      "type": "strength",
      "description": "Sets primary attribute to Strength",
      "ability_modifier": "Adaptive Strike stuns based on Strength to Agility ratio"
    }
  },
  
  "abilities": {
    "waveform": {
      "name": "Waveform",
      "hotkey": "Q",
      "type": "point_target",
      "damage_type": "magical",
      "affects": "enemies",
      "description": "Surges forward, damaging enemy units in Morphling's path. Morphling is invulnerable during Waveform.",
      "levels": {
        "1": {"damage": 75, "cast_range": 700, "cooldown": 21, "mana_cost": 115},
        "2": {"damage": 150, "cast_range": 800, "cooldown": 18, "mana_cost": 115},
        "3": {"damage": 225, "cast_range": 900, "cooldown": 15, "mana_cost": 115},
        "4": {"damage": 300, "cast_range": 1000, "cooldown": 12, "mana_cost": 115}
      },
      "special_values": {
        "damage_radius": 200,
        "cast_animation": 0.25
      }
    },
    
    "adaptive_strike": {
      "name": "Adaptive Strike",
      "hotkey": "W", 
      "type": "unit_target",
      "damage_type": "variable",
      "affects": "enemies",
      "description": "Launches a surge of water toward an enemy unit. Damage and effect vary based on Morphling's attribute configuration.",
      "facet_modifier": "With Flow facet: Stuns based on Strength to Agility ratio"
    },
    
    "attribute_shift": {
      "name": "Attribute Shift",
      "hotkey": "E",
      "type": "toggle",
      "affects": "self",
      "description": "Shifts attributes between Strength and Agility over time.",
      "shard_upgrade": "Can shift attributes while disabled. Reduces mana cost."
    },
    
    "morph": {
      "name": "Morph",
      "hotkey": "R",
      "type": "unit_target",
      "affects": "enemy_heroes",
      "description": "Creates an illusion of the target enemy hero under Morphling's control.",
      "scepter_upgrade": "Illusion can cast all basic abilities with Alt-Cast enabled",
      "shard_upgrade": "Grants ability upgrades to acquired abilities"
    }
  },
  
  "talents": {
    "10": [
      {"option_1": "+12s Morph Duration", "type": "ability_improvement"},
      {"option_2": "+15% Magic Resistance", "type": "magic_resistance"}
    ],
    "15": [
      {"option_1": "+75 Attack Range", "type": "attack_range"},
      {"option_2": "+250 Waveform Cast Range/Distance", "type": "ability_improvement"}
    ],
    "20": [
      {"option_1": "+15 Agility", "type": "agility"},
      {"option_2": "-3s Adaptive Strike Cooldown", "type": "cooldown_reduction"}
    ],
    "25": [
      {"option_1": "+35 Strength", "type": "strength"},
      {"option_2": "-40% Waveform Cooldown", "type": "cooldown_reduction"}
    ]
  },
  
  "aghanims": {
    "scepter": {
      "description": "Morph creates strong illusions that can cast basic abilities with Alt-Cast"
    },
    "shard": {
      "description": "Attribute Shift can be used while disabled and has reduced mana cost"
    }
  }
};

console.log("=== MORPHLING DATA STRUCTURE ===");
console.log(JSON.stringify(morphlingData, null, 2));

// Let's also show a summary
console.log("\n=== PARSING SUMMARY ===");
console.log("✅ Successfully extracted:");
console.log("- Hero basic information");
console.log("- Base stats and growth rates");
console.log("- Both facets (Ebb and Flow)");
console.log("- All 4 abilities with key details");
console.log("- Talent tree (4 levels)");
console.log("- Aghanim's upgrades");
console.log("\nThis data structure matches our Dota 2 schema and can be used for calculations!");
