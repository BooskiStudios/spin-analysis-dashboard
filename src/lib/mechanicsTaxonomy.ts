export type MechanicsCategory = {
  name: string
  mechanics: string[]
}

// A practical taxonomy for modern slot mechanics. These are written to be user-facing.
export const mechanicsTaxonomy: MechanicsCategory[] = [
  {
    name: 'Special symbols',
    mechanics: [
      'Wild (Standard)',
      'Expanding Wild',
      'Sticky Wild',
      'Shifting Wild',
      'Walking Wild',
      'Wild Reels',
      'Split Wild',
      'Nudging Wild',
      'Multiplier Wild',
      'Scatter (Standard)',
      'Collect Symbol',
      'Feature Trigger Symbol',
      'Cash Collector',
    ],
  },
  {
    name: 'Modifiers & multipliers',
    mechanics: [
      'Win Multiplier (Base)',
      'Win Multiplier (Bonus)',
      'Progressive Multiplier',
      'Symbol Value Upgrade',
      'Symbol Value Collection',
      'Mystery Multiplier',
      'Random Modifier',
    ],
  },
  {
    name: 'Reel / grid transforms',
    mechanics: [
      'Reel Expansion',
      'Reel Shrink',
      'Extra Reel / Side Reel',
      'Symbol Transform',
      'Symbol Upgrade (Tiered)',
      'Symbol Removal',
      'Random Reel Feature',
      'Reel Respin',
      'Hold & Spin (Base Feature)',
    ],
  },
  {
    name: 'Bonus game types',
    mechanics: [
      'Free Spins (Standard)',
      'Free Spins (Retriggering)',
      'Free Spins (Fixed Win Multiplier)',
      'Free Spins (Increasing Multiplier)',
      'Pick & Click Bonus',
      'Wheel Bonus',
      'Bonus Trail / Ladder',
      'Hold & Spin / Lock & Respin',
      'Feature Buy / Bonus Buy',
      'Reel Feature Bonus',
    ],
  },
  {
    name: 'Progression & persistence',
    mechanics: [
      'Collector Meter',
      'Progressive Meter',
      'Guaranteed Feature After X Spins',
      'Persistent Wilds (Across Spins)',
      'Persistent Multipliers (Across Spins)',
      'Bonus Leveling / Upgrades',
    ],
  },
]

export const mechanicsOptions: string[] = mechanicsTaxonomy.flatMap((category) => category.mechanics)
