import { useId, useMemo } from 'react'
import { mechanicsTaxonomy } from '../lib/mechanicsTaxonomy'
import { betModifiersTaxonomy } from '../lib/betModifiersTaxonomy'
import {
  defaultBaseGameBreakdown,
  loadBaseGameBreakdown,
  loadBaseGameBreakdownFromServer,
  type BaseGameBreakdown,
  type Volatility,
} from '../lib/baseGameBreakdown'
import { useEffect, useState } from 'react'

type BaseGameBreakdownCardProps = {
  gameId: number | null
  userEmail: string | null
  isEditMode: boolean
  value?: BaseGameBreakdown | null
  onChange?: (next: BaseGameBreakdown) => void
}

function parseNumberOrEmpty(value: string): number | '' {
  if (!value.trim()) return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

function formatNumber(value: number | '') {
  return value === '' ? '' : String(value)
}

export function BaseGameBreakdownCard({ gameId, userEmail, isEditMode, value, onChange }: BaseGameBreakdownCardProps) {
  const reelId = useId()
  const winWaysId = useId()
  const mechanicSelectId = useId()
  const betModifierSelectId = useId()
  const canEdit = isEditMode && Boolean(userEmail) && Boolean(gameId)

  const [serverBreakdown, setServerBreakdown] = useState<BaseGameBreakdown | null>(null)

  useEffect(() => {
    let cancelled = false
    if (isEditMode || !gameId || value) {
      setServerBreakdown(null)
      return
    }

    loadBaseGameBreakdownFromServer(gameId)
      .then((data) => {
        if (!cancelled) {
          setServerBreakdown(data)
          // Keep local cache in sync for offline + mechanic search.
          try {
            window.localStorage.setItem(`spin-examiner:base-breakdown:game:${gameId}`, JSON.stringify(data))
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
    if (!gameId) return defaultBaseGameBreakdown
    return serverBreakdown ?? loadBaseGameBreakdown(gameId)
  }, [value, gameId, serverBreakdown])

  const setValue = (next: BaseGameBreakdown | ((current: BaseGameBreakdown) => BaseGameBreakdown)) => {
    const resolved = typeof next === 'function' ? (next as (current: BaseGameBreakdown) => BaseGameBreakdown)(breakdown) : next
    onChange?.(resolved)
  }

  const helperText = useMemo(() => {
    if (!gameId) return 'Select a game to capture its base game breakdown.'
    if (!isEditMode) return 'Enable edit mode to update this breakdown.'
    if (!userEmail) return 'Sign in to update this breakdown.'
    return 'Record the core mechanical components of the base game.'
  }, [gameId, isEditMode, userEmail])

  const summaryRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = []

    if (breakdown.reelSize.trim()) {
      rows.push({ label: 'Reel size', value: breakdown.reelSize.trim() })
    }

    const winWaysLabel = breakdown.winWays.trim()
    if (winWaysLabel) {
      const count = breakdown.winWaysCount === '' ? '' : String(breakdown.winWaysCount)
      rows.push({ label: 'Win ways', value: count ? `${winWaysLabel} (${count})` : winWaysLabel })
    }

    if (breakdown.topPrizeAmount.trim()) {
      rows.push({ label: 'Top prize', value: breakdown.topPrizeAmount.trim() })
    }
    if (breakdown.gameSpeed.trim()) {
      rows.push({ label: 'Game speed', value: breakdown.gameSpeed.trim() })
    }
    if (breakdown.volatility) {
      rows.push({ label: 'Volatility', value: breakdown.volatility })
    }

    const symbolParts: string[] = []
    if (breakdown.lowPaySymbolCount !== '') symbolParts.push(`Low ${breakdown.lowPaySymbolCount}`)
    if (breakdown.mediumPaySymbolCount !== '') symbolParts.push(`Medium ${breakdown.mediumPaySymbolCount}`)
    if (breakdown.highPaySymbolCount !== '') symbolParts.push(`High ${breakdown.highPaySymbolCount}`)
  if (breakdown.wildSymbolCount !== '') symbolParts.push(`Wild ${breakdown.wildSymbolCount}`)
  if (breakdown.bonusSymbolCount !== '') symbolParts.push(`Bonus ${breakdown.bonusSymbolCount}`)
    if (breakdown.specialSymbolCount !== '') symbolParts.push(`Special ${breakdown.specialSymbolCount}`)

    if (symbolParts.length) {
      rows.push({ label: 'Symbol counts', value: symbolParts.join(' · ') })
    }

    if (breakdown.mechanics.length) {
      rows.push({ label: 'Mechanics', value: breakdown.mechanics.join(' · ') })
    }
    if (breakdown.betModifiers.length) {
      rows.push({ label: 'Bet modifiers', value: breakdown.betModifiers.join(' · ') })
    }

    return rows
  }, [breakdown])

  function handleAddMechanic(mechanic: string) {
    if (!mechanic) return
    setValue((current) => {
      if (current.mechanics.includes(mechanic)) return current
      return { ...current, mechanics: [...current.mechanics, mechanic] }
    })
  }

  function handleRemoveMechanic(mechanic: string) {
    setValue((current) => ({ ...current, mechanics: current.mechanics.filter((item) => item !== mechanic) }))
  }

  function handleAddBetModifier(modifier: string) {
    if (!modifier) return
    setValue((current) => {
      if (current.betModifiers.includes(modifier)) return current
      return { ...current, betModifiers: [...current.betModifiers, modifier] }
    })
  }

  function handleRemoveBetModifier(modifier: string) {
    setValue((current) => ({ ...current, betModifiers: current.betModifiers.filter((item) => item !== modifier) }))
  }

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/95 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-spruce">Base game</p>
          <h2 className="mt-2 font-display text-2xl text-ink">Base Game Breakdown</h2>
          <p className="mt-2 text-sm text-ink/70">{helperText}</p>
        </div>
      </div>

      {!isEditMode ? (
        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          {summaryRows.length ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="rounded-2xl border border-spruce/10 bg-white px-3 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">{row.label}</dt>
                  <dd className="mt-2 text-sm font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-ink/65">No base game breakdown saved yet. Enable edit mode to add one.</p>
          )}
        </div>
      ) : (

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <label htmlFor={reelId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">
            Reel size
          </label>
          <input
            id={reelId}
            type="text"
            value={breakdown.reelSize}
            onChange={(event) => setValue((current) => ({ ...current, reelSize: event.target.value }))}
            disabled={!canEdit}
            placeholder="e.g. 6x5"
            className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
          />

          <div className="mt-4">
            <label htmlFor={winWaysId} className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">
              Win ways
            </label>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
              <select
                id={winWaysId}
                value={breakdown.winWays}
                onChange={(event) =>
                  setValue((current) => ({ ...current, winWays: event.target.value, winWaysCount: '' }))
                }
                disabled={!canEdit}
                className="w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              >
                <option value="">Select…</option>
                <option value="Win Lines">Win Lines</option>
                <option value="Adjacent Wins">Adjacent Wins</option>
                <option value="Megaways / Variable Height">Megaways / Variable Height</option>
                <option value="Cluster Wins">Cluster Wins</option>
                <option value="Scatter Wins">Scatter Wins</option>
                <option value="Pay Anywhere">Pay Anywhere</option>
              </select>

              <div>
                <label className="sr-only" htmlFor={`${winWaysId}-count`}>
                  Win ways count
                </label>
                <input
                  id={`${winWaysId}-count`}
                  type="number"
                  min={0}
                  value={breakdown.winWaysCount === '' ? '' : String(breakdown.winWaysCount)}
                  onChange={(event) =>
                    setValue((current) => ({ ...current, winWaysCount: parseNumberOrEmpty(event.target.value) }))
                  }
                  disabled={!canEdit}
                  placeholder="#"
                  className="w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-ink/60">Pick the base win model and enter the count (e.g. 20 lines / 243 ways).</p>
          </div>
        </div>

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Symbol counts</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">Low pay</label>
              <input
                type="number"
                value={formatNumber(breakdown.lowPaySymbolCount)}
                onChange={(event) => setValue((current) => ({ ...current, lowPaySymbolCount: parseNumberOrEmpty(event.target.value) }))}
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">Medium pay</label>
              <input
                type="number"
                value={formatNumber(breakdown.mediumPaySymbolCount)}
                onChange={(event) =>
                  setValue((current) => ({ ...current, mediumPaySymbolCount: parseNumberOrEmpty(event.target.value) }))
                }
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">High pay</label>
              <input
                type="number"
                value={formatNumber(breakdown.highPaySymbolCount)}
                onChange={(event) =>
                  setValue((current) => ({ ...current, highPaySymbolCount: parseNumberOrEmpty(event.target.value) }))
                }
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">Wild</label>
              <input
                type="number"
                value={formatNumber(breakdown.wildSymbolCount)}
                onChange={(event) =>
                  setValue((current) => ({ ...current, wildSymbolCount: parseNumberOrEmpty(event.target.value) }))
                }
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">Bonus</label>
              <input
                type="number"
                value={formatNumber(breakdown.bonusSymbolCount)}
                onChange={(event) =>
                  setValue((current) => ({ ...current, bonusSymbolCount: parseNumberOrEmpty(event.target.value) }))
                }
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">Special</label>
              <input
                type="number"
                value={formatNumber(breakdown.specialSymbolCount)}
                onChange={(event) =>
                  setValue((current) => ({ ...current, specialSymbolCount: parseNumberOrEmpty(event.target.value) }))
                }
                disabled={!canEdit}
                className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4 lg:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Base game mechanics</p>
              <p className="mt-2 text-sm text-ink/70">Select mechanics from the taxonomy and build a stacked list.</p>
            </div>

            <div className="min-w-[14rem]">
              <select
                id={mechanicSelectId}
                disabled={!canEdit}
                defaultValue=""
                onChange={(event) => {
                  handleAddMechanic(event.target.value)
                  event.currentTarget.value = ''
                }}
                className="w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              >
                <option value="">Add a mechanic…</option>
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
            {breakdown.mechanics.length ? (
              breakdown.mechanics.map((mechanic: string) => (
                <div key={mechanic} className="inline-flex items-center gap-2 rounded-full border border-spruce/15 bg-white px-3 py-1 text-sm text-ink">
                  <span>{mechanic}</span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMechanic(mechanic)}
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

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Top prize amount</label>
          <input
            type="text"
            value={breakdown.topPrizeAmount}
            onChange={(event) => setValue((current) => ({ ...current, topPrizeAmount: event.target.value }))}
            disabled={!canEdit}
            placeholder="e.g. 10,000x"
            className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
          />
        </div>

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Game speed</label>
          <select
            value={breakdown.gameSpeed}
            onChange={(event) => setValue((current) => ({ ...current, gameSpeed: event.target.value }))}
            disabled={!canEdit}
            className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
          >
            <option value="">Select speed…</option>
            <option value="Very Slow">Very Slow</option>
            <option value="Slow">Slow</option>
            <option value="Medium">Medium</option>
            <option value="Fast">Fast</option>
            <option value="Very Fast">Very Fast</option>
          </select>
        </div>

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Volatility</label>
          <select
            value={breakdown.volatility}
            onChange={(event) => setValue((current) => ({ ...current, volatility: event.target.value as Volatility }))}
            disabled={!canEdit}
            className="mt-2 w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
          >
            <option value="">Select volatility…</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Extreme">Extreme</option>
          </select>
        </div>

        <div className="rounded-3xl border border-spruce/12 bg-white/70 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Bet modifiers</p>
            </div>

            <div className="min-w-[14rem]">
              <select
                id={betModifierSelectId}
                disabled={!canEdit}
                defaultValue=""
                onChange={(event) => {
                  handleAddBetModifier(event.target.value)
                  event.currentTarget.value = ''
                }}
                className="w-full rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
              >
                <option value="">Add a modifier…</option>
                {betModifiersTaxonomy.map((category) => (
                  <optgroup key={category.name} label={category.name}>
                    {category.modifiers.map((modifier) => (
                      <option key={modifier} value={modifier}>
                        {modifier}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {breakdown.betModifiers.length ? (
              breakdown.betModifiers.map((modifier: string) => (
                <div key={modifier} className="inline-flex items-center gap-2 rounded-full border border-spruce/15 bg-white px-3 py-1 text-sm text-ink">
                  <span>{modifier}</span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveBetModifier(modifier)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-spruce/15 bg-white text-sm font-semibold text-ink transition hover:border-spruce/35"
                      aria-label={`Remove ${modifier}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">No modifiers selected yet.</p>
            )}
          </div>
        </div>
      </div>
      )}
    </section>
  )
}
