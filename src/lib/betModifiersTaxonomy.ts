export type BetModifierCategory = {
  name: string
  modifiers: string[]
}

// A focused taxonomy for player-selectable bet/feature chance modifiers.
export const betModifiersTaxonomy: BetModifierCategory[] = [
  {
    name: 'Feature chance / trigger boost',
    modifiers: ['Ante Bet / Feature Chance Boost', 'Double Chance', 'Super Stake / Enhanced Mode'],
  },
  {
    name: 'Risk & gamble',
    modifiers: ['Gamble / Risk Feature'],
  },
  {
    name: 'Purchases & workflows',
    modifiers: ['Bonus Buy / Feature Buy', 'Bonus Hunt Mode', 'Quick Spin / Turbo Mode'],
  },
]

export const betModifierOptions = betModifiersTaxonomy.flatMap((category) => category.modifiers)
