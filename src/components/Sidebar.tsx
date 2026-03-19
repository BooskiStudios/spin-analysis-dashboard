import { useState } from 'react'
import type { Game } from '../types'
import { getGameMechanics, gameMatchesMechanicQuery } from '../lib/gameMechanicsIndex'
import { CreateGameModal } from './CreateGameModal'
import { GameList } from './GameList'

type SidebarProps = {
  games: Game[]
  selectedGameId: number | null
  isCreatingGame: boolean
  isDemoMode?: boolean
  onSelectGame: (gameId: number) => void
  onCreateGame: (values: { provider: string; name: string; gameType: string; assignedRtp: number | null }) => Promise<void>
}

export function Sidebar({ games, selectedGameId, isCreatingGame, isDemoMode = false, onSelectGame, onCreateGame }: SidebarProps) {
  const [filterText, setFilterText] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const normalizedFilter = filterText.trim().toLowerCase()
  const filteredGames = games.filter((game) => {
    if (!normalizedFilter) {
      return true
    }

    if (`${game.provider} ${game.name}`.toLowerCase().includes(normalizedFilter)) {
      return true
    }

    const mechanics = getGameMechanics(game.id)
    return gameMatchesMechanicQuery(mechanics, normalizedFilter)
  })

  return (
    <aside className="relative border-b border-spruce/20 bg-night text-mist md:fixed md:inset-y-0 md:left-0 md:w-[22rem] lg:w-96 md:border-b-0 md:border-r">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(185,255,156,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(116,226,216,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent)]" />
      <div className="relative flex h-full flex-col px-4 py-6 md:px-5">
        <div className="mb-6 border-b border-white/10 pb-5">
          <p className="text-xs uppercase tracking-[0.4em] text-lime">BGG</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-mist">Competitor Dashboard</h1>
          <p className="mt-3 text-sm text-mist/80">Drill into different competitor games to understand their mechanics & features.</p>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-mist/80">Games library</h2>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isDemoMode}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/12 bg-white/8 text-base leading-none text-lime transition hover:border-lime/55 hover:bg-white/12"
              aria-label="Add game"
              title={isDemoMode ? 'Disabled in demo mode' : 'Add game'}
            >
              +
            </button>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-mist/80">
            {filteredGames.length}/{games.length}
          </span>
        </div>

        <div className="mb-4 space-y-2">
          <label htmlFor="game-filter" className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-mist/70">
            Search games, providers or mechanics
          </label>
          <div className="rounded-[1.2rem] border border-white/10 bg-white/6 px-3 py-2 focus-within:border-lime/70 focus-within:bg-white/10">
            <input
              id="game-filter"
              type="text"
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              placeholder="Filter by game or provider"
              className="w-full border-0 bg-transparent text-sm text-mist placeholder:text-mist/45 focus:outline-none"
            />
          </div>
        </div>

        {isDemoMode ? (
          <div className="mb-4 rounded-[1.25rem] border border-lime/18 bg-white/6 px-4 py-3 text-sm text-mist/82">
            Static demo mode: example sessions are bundled into the site for GitHub Pages.
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {filteredGames.length ? (
            <GameList games={filteredGames} selectedGameId={selectedGameId} onSelectGame={onSelectGame} />
          ) : (
            <div className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-mist/75">
              No games match that filter.
            </div>
          )}
        </div>
      </div>

      <CreateGameModal
        isOpen={isCreateModalOpen && !isDemoMode}
        isSubmitting={isCreatingGame}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (values) => {
          await onCreateGame(values)
          setIsCreateModalOpen(false)
        }}
      />
    </aside>
  )
}