import type { Session } from '../types'

type SessionTableProps = {
  sessions: Session[]
  selectedSessionId: number | null
  onSelectSession: (sessionId: number) => void
}

export function SessionTable({ sessions, selectedSessionId, onSelectSession }: SessionTableProps) {
  function getStatusTone(status: Session['processingStatus']) {
    if (status === 'completed') {
      return 'border-lime/40 bg-lime/20 text-ink'
    }

    if (status === 'failed') {
      return 'border-roseclay/35 bg-roseclay/25 text-ink'
    }

    return 'border-ember/35 bg-ember/45 text-ink'
  }

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-spruce">Session index</p>
          <h2 className="mt-2 font-display text-2xl text-ink">Base Game Breakdown</h2>
        </div>
        <span className="rounded-full bg-roseclay/18 px-3 py-1 text-xs font-semibold text-ink">Click a session to load spins</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-ink/70">
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">Total spins</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">RTP</th>
              <th className="px-3 py-2 font-medium">Total win</th>
              <th className="px-3 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => {
              const isActive = session.id === selectedSessionId

              return (
                <tr
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`cursor-pointer rounded-2xl transition ${
                    isActive ? 'bg-night text-mist' : 'bg-spruce/8 text-ink hover:bg-lime/40'
                  }`}
                >
                  <td className="rounded-l-2xl px-3 py-3 font-semibold">
                    <div>Session {sessions.length - index}</div>
                    {session.sourceVideoPath ? (
                      <div className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(session.processingStatus)}`}>
                        Uploaded video
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">{session.totalSpins}</td>
                  <td className="px-3 py-3">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${getStatusTone(session.processingStatus)}`}>
                      {session.processingStatus}
                    </div>
                    {session.processingError ? <div className="mt-2 max-w-[16rem] text-xs text-current/70">{session.processingError}</div> : null}
                  </td>
                  <td className="px-3 py-3">{session.rtp}</td>
                  <td className="px-3 py-3">{session.totalWin}</td>
                  <td className="rounded-r-2xl px-3 py-3">{session.date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}