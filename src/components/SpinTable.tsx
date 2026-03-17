import type { Spin } from '../types'

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(1).padStart(4, '0')

  return `${minutes}:${remainingSeconds}`
}

type SpinTableProps = {
  spins: Spin[]
  selectedSpinId: number | null
  onSelectSpin: (spinId: number) => void
}

export function SpinTable({ spins, selectedSpinId, onSelectSpin }: SpinTableProps) {
  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-spruce">Spin ledger</p>
          <h2 className="mt-2 font-display text-2xl text-ink">Bonus Game Breakdown</h2>
        </div>
        <span className="rounded-full bg-roseclay/18 px-3 py-1 text-xs font-semibold text-ink">Click a row for replay details</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-ink/70">
              <th className="px-3 py-2 font-medium">Spin #</th>
              <th className="px-3 py-2 font-medium">Win amount</th>
              <th className="px-3 py-2 font-medium">Cascades</th>
              <th className="px-3 py-2 font-medium">Bonus triggered</th>
              <th className="px-3 py-2 font-medium">Spin duration</th>
            </tr>
          </thead>
          <tbody>
            {spins.map((spin) => {
              const isActive = spin.id === selectedSpinId

              return (
                <tr
                  key={spin.id}
                  onClick={() => onSelectSpin(spin.id)}
                  className={`cursor-pointer transition ${
                    isActive ? 'bg-ember text-ink' : 'bg-spruce/8 text-ink hover:bg-roseclay/22'
                  }`}
                >
                  <td className="rounded-l-2xl px-3 py-3 font-semibold">{spin.spinNumber}</td>
                  <td className="px-3 py-3">£{spin.totalWin.toFixed(2)}</td>
                  <td className="px-3 py-3">{spin.cascades}</td>
                  <td className="px-3 py-3">{spin.bonusTriggered ? 'Yes' : 'No'}</td>
                  <td className="rounded-r-2xl px-3 py-3">{formatDuration(spin.duration)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}