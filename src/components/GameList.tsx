import type { Game } from '../types'

type GameListProps = {
  games: Game[]
  selectedGameId: number | null
  onSelectGame: (gameId: number) => void
}

export function GameList({ games, selectedGameId, onSelectGame }: GameListProps) {
  return (
    <div className="space-y-2">
      {games.map((game, index) => {
        const isActive = game.id === selectedGameId

        return (
          <button
            key={game.id}
            type="button"
            onClick={() => onSelectGame(game.id)}
            className={`w-full rounded-[1.35rem] border px-3 py-3 text-left transition ${
              isActive
                ? 'border-lime bg-lime/90 text-ink shadow-panel'
                : 'border-white/10 bg-white/5 text-mist hover:border-roseclay/40 hover:bg-white/10'
            }`}
          >
            <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                  isActive ? 'bg-ink text-mist' : 'bg-white/10 text-lime'
                }`}
              >
                {index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-[11px] uppercase tracking-[0.24em] ${isActive ? 'text-ink/70' : 'text-roseclay'}`}>
                  {game.provider}
                </p>
                <h3 className={`mt-1 break-words pr-1 text-[15px] font-semibold leading-snug ${isActive ? 'text-ink' : 'text-mist'}`}>
                  {game.name}
                </h3>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}