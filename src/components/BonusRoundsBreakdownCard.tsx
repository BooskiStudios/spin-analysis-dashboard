import { useEffect, useId, useMemo, useState } from 'react'
import { mechanicsTaxonomy } from '../lib/mechanicsTaxonomy'
import {
  defaultBonusRoundsBreakdown,
  defaultFreeSpinsBreakdown,
  loadBonusRoundsBreakdown,
  loadBonusRoundsBreakdownFromServer,
  setBonusRoundCount,
  type BonusRoundType,
  type BonusRoundsBreakdown,
} from '../lib/bonusRoundsBreakdown'

type BonusRoundsBreakdownCardProps = {
  gameId: number | null
  userEmail: string | null
  isEditMode: boolean
  value?: BonusRoundsBreakdown | null
  onChange?: (next: BonusRoundsBreakdown) => void
}

function parseCount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(20, Math.floor(parsed)))
}

export function BonusRoundsBreakdownCard({ gameId, userEmail, isEditMode, value, onChange }: BonusRoundsBreakdownCardProps) {
  const countId = useId()
  const canEdit = isEditMode && Boolean(userEmail) && Boolean(gameId)

  const [serverBreakdown, setServerBreakdown] = useState<BonusRoundsBreakdown | null>(null)

  useEffect(() => {
    let cancelled = false
    if (isEditMode || !gameId || value) {
      setServerBreakdown(null)
      return
    }

    loadBonusRoundsBreakdownFromServer(gameId)
      .then((data) => {
        if (!cancelled) {
          setServerBreakdown(data)
          try {
            window.localStorage.setItem(`spin-examiner:bonus-breakdown:game:${gameId}`, JSON.stringify(data))
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerBreakdown(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [gameId, isEditMode, value])

  const breakdown = useMemo(() => {
    if (value) return value
    if (!gameId) return defaultBonusRoundsBreakdown
    return serverBreakdown ?? loadBonusRoundsBreakdown(gameId)
  }, [value, gameId, serverBreakdown])

  const setValue = (next: BonusRoundsBreakdown | ((current: BonusRoundsBreakdown) => BonusRoundsBreakdown)) => {
    const resolved = typeof next === 'function' ? (next as (current: BonusRoundsBreakdown) => BonusRoundsBreakdown)(breakdown) : next
    onChange?.(resolved)
  }

  const helperText = useMemo(() => {
    if (!gameId) return 'Select a game to capture its bonus game breakdown.'
    if (!isEditMode) return 'Enable edit mode to update bonus details.'
    if (!userEmail) return 'Sign in to update bonus details.'
    return 'Describe each distinct bonus round and its configuration.'
  }, [gameId, isEditMode, userEmail])

  const hasAnyBonusContent = useMemo(() => {
    if (breakdown.count > 0) return true
    if (!breakdown.rounds.length) return false

    return breakdown.rounds.some((round) => {
      if (round.type) return true

      if (round.freeSpins) {
        return Boolean(round.freeSpins.reelSize.trim() || round.freeSpins.mechanics.length)
      }

      return Boolean(round.description?.trim())
    })
  }, [breakdown])

  function updateRoundType(index: number, type: BonusRoundType | '') {
    setValue((current) => {
      const rounds = current.rounds.map((round, i) => {
        if (i !== index) return round

        if (type === 'Free Spins') {
          return {
            type,
            freeSpins: round.type === 'Free Spins' ? round.freeSpins ?? defaultFreeSpinsBreakdown : defaultFreeSpinsBreakdown,
          }
        }

        return {
          type,
          description: round.type === type ? round.description ?? '' : '',
        }
      })

      return {
        ...current,
        rounds,
      }
    })
  }

  function addFreeSpinMechanic(index: number, mechanic: string) {
    if (!mechanic) return
    setValue((current) => {
      const rounds = current.rounds.map((round, i) => {
        if (i !== index || round.type !== 'Free Spins') return round
        const existing = round.freeSpins?.mechanics ?? []
        if (existing.includes(mechanic)) return round
        return {
          ...round,
          freeSpins: {
            ...(round.freeSpins ?? defaultFreeSpinsBreakdown),
            mechanics: [...existing, mechanic],
          },
        }
      })

      return { ...current, rounds }
    })
  }

  function removeFreeSpinMechanic(index: number, mechanic: string) {
    setValue((current) => {
      const rounds = current.rounds.map((round, i) => {
        if (i !== index || round.type !== 'Free Spins') return round
        const existing = round.freeSpins?.mechanics ?? []
        return {
          ...round,
          freeSpins: {
            ...(round.freeSpins ?? defaultFreeSpinsBreakdown),
            mechanics: existing.filter((item) => item !== mechanic),
          },
        }
      })

      return { ...current, rounds }
    })
  }

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-spruce">Bonus game</p>
          <h2 className="mt-2 font-display text-2xl text-ink">Bonus Game Breakdown</h2>
          <p className="mt-2 text-sm text-ink/70">{helperText}</p>
        </div>
      </div>

      {!isEditMode ? (
        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          {hasAnyBonusContent ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Bonus rounds</p>
                <span className="rounded-full border border-spruce/15 bg-white px-3 py-1 text-xs text-ink/70">
                  {breakdown.count} total
                </span>
              </div>

              {breakdown.rounds.length ? (
                <ol className="space-y-3">
                  {breakdown.rounds.map((round, index) => (
                    <li key={index} className="rounded-2xl border border-spruce/10 bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spruce">Round {index + 1}</p>
                      <p className="mt-2 text-sm font-semibold text-ink">{round.type || '—'}</p>

                      {round.type === 'Free Spins' ? (
                        <div className="mt-3 space-y-2 text-sm text-ink/80">
                          {round.freeSpins?.reelSize?.trim() ? (
                            <p>
                              <span className="font-semibold text-ink">Reel size:</span> {round.freeSpins.reelSize.trim()}
                            </p>
                          ) : null}
                          {round.freeSpins?.mechanics?.length ? (
                            <p>
                              <span className="font-semibold text-ink">Mechanics:</span> {round.freeSpins.mechanics.join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      ) : round.description?.trim() ? (
                        <p className="mt-3 text-sm text-ink/75 whitespace-pre-wrap">{round.description.trim()}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-ink/65">No bonus rounds configured yet.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink/65">No bonus game breakdown saved yet. Enable edit mode to add one.</p>
          )}
        </div>
      ) : (

        <>
          <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
            <label htmlFor={countId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">
              How Many Bonus Rounds?
            </label>
            <input
              id={countId}
              type="number"
              min={0}
              max={20}
              value={breakdown.count}
              disabled={!canEdit}
              onChange={(event) => setValue((current) => setBonusRoundCount(current, parseCount(event.target.value)))}
              className="mt-2 w-40 rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
            />
          </div>

          <div className="mt-5 space-y-4">
            {breakdown.rounds.map((round, index) => {
              const typeSelectId = `bonus-type-${index}`
              const mechanicSelectId = `bonus-mech-${index}`

              return (
                <div key={index} className="rounded-[2rem] border border-spruce/12 bg-white/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-spruce">Bonus round {index + 1}</p>
                  <h3 className="mt-2 font-display text-xl text-ink">Configuration</h3>
                </div>

                <div className="min-w-[15rem]">
                  <label htmlFor={typeSelectId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">
                    Bonus Round Type
                  </label>
                  <select
                    id={typeSelectId}
                    value={round.type}
                    disabled={!canEdit}
                    onChange={(event) => updateRoundType(index, event.target.value as BonusRoundType)}
                    className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                  >
                    <option value="">Select type…</option>
                    <option value="Free Spins">Free Spins</option>
                    <option value="Pick / Click">Pick / Click</option>
                    <option value="Spin Wheel">Spin Wheel</option>
                    <option value="Hold & Win">Hold & Win</option>
                    <option value="Custom / Other">Custom / Other</option>
                  </select>
                </div>
              </div>

              {round.type === 'Free Spins' ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-3xl border border-spruce/12 bg-white p-4">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Reel size</label>
                    <input
                      type="text"
                      value={round.freeSpins?.reelSize ?? ''}
                      disabled={!canEdit}
                      onChange={(event) =>
                        setValue((current) => {
                          const rounds = current.rounds.map((r, i) => {
                            if (i !== index || r.type !== 'Free Spins') {
                              return r
                            }

                            return {
                              ...r,
                              freeSpins: {
                                ...(r.freeSpins ?? defaultFreeSpinsBreakdown),
                                reelSize: event.target.value,
                              },
                            }
                          })

                          return { ...current, rounds }
                        })
                      }
                      placeholder="e.g. 6x5"
                      className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                    />
                  </div>

                  <div className="rounded-3xl border border-spruce/12 bg-white p-4 lg:col-span-1">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Mechanics</p>
                        <p className="mt-2 text-sm text-ink/70">Select mechanics that apply within the free spins.</p>
                      </div>
                      <div className="min-w-[14rem]">
                        <select
                          id={mechanicSelectId}
                          disabled={!canEdit}
                          defaultValue=""
                          onChange={(event) => {
                            addFreeSpinMechanic(index, event.target.value)
                            event.currentTarget.value = ''
                          }}
                          className="w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                        >
                          <option value="">Add a mechanic…</option>
                          <option value="Improved Base Game">Improved Base Game</option>
                          {mechanicsTaxonomy.map((category) => (
                            <optgroup key={category.name} label={category.name}>
                              {category.mechanics.map((mechanic) => (
                                <option key={mechanic} value={mechanic}>
                                  {mechanic}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {round.freeSpins?.mechanics?.length ? (
                        round.freeSpins.mechanics.map((mechanic) => (
                          <div key={mechanic} className="inline-flex items-center gap-2 rounded-full border border-spruce/15 bg-white px-3 py-1 text-sm text-ink">
                            <span>{mechanic}</span>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => removeFreeSpinMechanic(index, mechanic)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-spruce/15 bg-white text-sm font-semibold text-ink transition hover:border-spruce/35"
                                aria-label={`Remove ${mechanic}`}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-ink/60">No mechanics selected yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : round.type ? (
                <div className="mt-5">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Description</label>
                  <textarea
                    value={round.description ?? ''}
                    disabled={!canEdit}
                    onChange={(event) =>
                      setValue((current) => {
                        const rounds = current.rounds.map((r, i) => (i === index ? { ...r, description: event.target.value } : r))
                        return { ...current, rounds }
                      })
                    }
                    placeholder="Describe this bonus round..."
                    className="mt-2 min-h-24 w-full resize-none rounded-3xl border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-3xl border border-spruce/12 bg-white/60 px-4 py-4 text-sm text-ink/70">
                  Select a bonus round type to configure it.
                </div>
              )}
            </div>
          )
        })}

        {breakdown.count === 0 ? (
          <div className="rounded-3xl border border-spruce/12 bg-white/60 px-4 py-4 text-sm text-ink/70">No bonus rounds configured.</div>
        ) : null}
      </div>
        </>
      )}
    </section>
  )
}
