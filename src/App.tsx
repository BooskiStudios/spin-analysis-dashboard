import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { BaseGameBreakdownCard } from './components/BaseGameBreakdownCard'
import { BonusRoundsBreakdownCard } from './components/BonusRoundsBreakdownCard'
import { GameNotesCard } from './components/GameNotesCard'
import type { UploadWorkflowStatus } from './components/UploadSessionCard'
import { LoginModal } from './components/LoginModal'
import { EditModeToggle } from './components/EditModeToggle'
import { HistoryPanel } from './components/HistoryPanel'
import { EditGameModal } from './components/EditGameModal'
import { ImageGalleryCard } from './components/ImageGalleryCard'
import { createGame, deleteGame, fetchGames, fetchSessions, isStaticDemo, updateGame } from './lib/api'
import { removeBaseGameBreakdown } from './lib/baseGameBreakdown'
import { removeBonusRoundsBreakdown } from './lib/bonusRoundsBreakdown'
import { ensureDemoBreakdownsSeeded } from './lib/demoBreakdownSeed'
import { removeGallery } from './lib/gallery'
import { removeGameNotes } from './lib/gameNotes'
import { appendHistory, removeHistory } from './lib/history'
import {
  clearDraft,
  commitDraft,
  ensureDraft,
  getDraft,
  isDirtyDraft,
  resetDraft,
  subscribeDrafts,
  updateDraft,
} from './lib/editDraftStore'
import { getAuthToken, getUsername } from './lib/user'
import type { Game } from './types'

type UploadActivity = {
  gameId: number | null
  sessionId: number | null
  status: UploadWorkflowStatus
}

function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingGame, setIsCreatingGame] = useState(false)
  const [uploadActivity, setUploadActivity] = useState<UploadActivity | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(() => (typeof window === 'undefined' ? null : getUsername()))
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEditingGame, setIsEditingGame] = useState(false)
  const [isUpdatingGame, setIsUpdatingGame] = useState(false)
  const [isDeletingGame, setIsDeletingGame] = useState(false)

  const selectedGame = games.find((game) => game.id === selectedGameId)
  const uploadGame = games.find((game) => game.id === uploadActivity?.gameId)
  const hasActiveUploadLock = Boolean(
    uploadActivity && ['uploading', 'queued', 'processing'].includes(uploadActivity.status),
  )
  const isUploadLockedByAnotherGame = Boolean(
    hasActiveUploadLock && uploadActivity?.gameId && selectedGameId && uploadActivity.gameId !== selectedGameId,
  )

  useEffect(() => {
    let isCancelled = false

    // Only load games if user is authenticated
    const authToken = getAuthToken()
    if (!authToken) {
      setGames([])
      setIsLoading(false)
      return
    }

    if (isStaticDemo) {
      ensureDemoBreakdownsSeeded()
    }

    const loadGames = async () => {
      try {
        setIsLoading(true)
        const gameList = await fetchGames()

        if (isCancelled) {
          return
        }

        setGames(gameList)
        setSelectedGameId((currentGameId) => currentGameId ?? gameList[0]?.id ?? null)
        setErrorMessage(null)
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load games')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadGames()

    return () => {
      isCancelled = true
    }
  }, [username])

  async function reloadGames(preferredGameId?: number | null) {
    const gameList = await fetchGames()
    setGames(gameList)

    setSelectedGameId((currentGameId) => {
      if (preferredGameId && gameList.some((game) => game.id === preferredGameId)) {
        return preferredGameId
      }

      if (currentGameId && gameList.some((game) => game.id === currentGameId)) {
        return currentGameId
      }

      return gameList[0]?.id ?? null
    })
  }

  // Session + spin analytics are disabled for now.

  useEffect(() => {
    let isCancelled = false

    if (uploadActivity?.gameId == null || !uploadActivity.sessionId || !['queued', 'processing'].includes(uploadActivity.status)) {
      return
    }

    const timeoutHandle = window.setTimeout(async () => {
      try {
        const gameId = uploadActivity.gameId
        if (gameId == null) {
          return
        }

    const refreshedSessions = await fetchSessions(gameId)

        if (isCancelled) {
          return
        }

        const activeUploadSession = refreshedSessions.find((session) => session.id === uploadActivity.sessionId)

        if (activeUploadSession) {
          setUploadActivity((currentActivity) => {
            if (!currentActivity || currentActivity.sessionId !== activeUploadSession.id) {
              return currentActivity
            }

            return {
              ...currentActivity,
              status: activeUploadSession.processingStatus,
            }
          })

          if (activeUploadSession.processingStatus === 'completed' || activeUploadSession.processingStatus === 'failed') {
            return
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to refresh session processing status')
        }
      }
    }, 3000)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutHandle)
    }
  }, [selectedGameId, uploadActivity])

  // Spin-by-spin breakdown is intentionally disabled for now.


  async function handleCreateGame(values: { provider: string; name: string; gameType: string; assignedRtp: number | null }) {
    try {
      setIsCreatingGame(true)
      setErrorMessage(null)

      const createdGame = await createGame(values.provider, values.name, values.gameType, values.assignedRtp)

      if (isEditMode && username) {
        appendHistory(`game:${createdGame.id}`, {
          action: 'Created game',
          userEmail: username,
          meta: { provider: createdGame.provider, name: createdGame.name },
        })
      }

      await reloadGames(createdGame.id)
      setSelectedGameId(createdGame.id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create game')
      throw error
    } finally {
      setIsCreatingGame(false)
    }
  }

  const pageKey = selectedGameId ? `game:${selectedGameId}` : 'dashboard'
  const headingKicker = selectedGameId ? 'Game overview' : 'Dashboard overview'

  const [, setDraftTick] = useState(0)

  useEffect(() => {
    const unsubscribe = subscribeDrafts(() => setDraftTick((value) => value + 1))
    return () => {
      unsubscribe()
    }
  }, [])

  const draft = selectedGameId ? getDraft(selectedGameId) : null
  const isDraftDirty = selectedGameId ? isDirtyDraft(selectedGameId) : false

  async function handleUpdateSelectedGame(values: { provider: string; name: string; gameType: string; assignedRtp: number | null }) {
    if (!selectedGameId || !selectedGame) {
      return
    }

    try {
      setIsUpdatingGame(true)
      setErrorMessage(null)

      const updated = await updateGame(selectedGameId, values)

      setGames((current) => current.map((game) => (game.id === updated.id ? updated : game)))

      if (isEditMode && username) {
        appendHistory(pageKey, {
          action: 'Updated game details',
          userEmail: username,
          meta: {
            from: {
              provider: selectedGame.provider,
              name: selectedGame.name,
              gameType: selectedGame.gameType,
              assignedRtp: selectedGame.assignedRtp,
            },
            to: {
              provider: updated.provider,
              name: updated.name,
              gameType: updated.gameType,
              assignedRtp: updated.assignedRtp,
            },
          },
        })
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update game')
      throw error
    } finally {
      setIsUpdatingGame(false)
    }
  }

  async function handleDeleteSelectedGame() {
    if (!selectedGameId || !selectedGame) {
      return
    }

    const deletedGameId = selectedGameId
    const deletedPageKey = `game:${deletedGameId}`
    const remainingGames = games.filter((game) => game.id !== deletedGameId)

    try {
      setIsDeletingGame(true)
      setErrorMessage(null)

      await deleteGame(deletedGameId)

      clearDraft(deletedGameId)
      removeBaseGameBreakdown(deletedGameId)
      removeBonusRoundsBreakdown(deletedGameId)
      removeGameNotes(deletedPageKey)
      removeHistory(deletedPageKey)
      await removeGallery(deletedPageKey)

      setGames(remainingGames)
      setSelectedGameId(remainingGames[0]?.id ?? null)
      setIsEditingGame(false)
      setIsEditMode(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete game')
      throw error
    } finally {
      setIsDeletingGame(false)
    }
  }

  return (
    <div className="min-h-screen bg-mist text-ink">
      <LoginModal
        isOpen={!username}
        onLoggedIn={(newUsername) => {
          setUsername(newUsername)
        }}
      />

      <Sidebar
        games={games}
        selectedGameId={selectedGame?.id ?? null}
        isCreatingGame={isCreatingGame}
        isDemoMode={isStaticDemo}
        onSelectGame={(gameId) => {
          setSelectedGameId(gameId)
          if (isEditMode) {
            ensureDraft(gameId)
          }
        }}
        onCreateGame={handleCreateGame}
      />

      <main className="md:pl-[22rem] lg:pl-96">
        <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-[1.6rem] border border-spruce/15 bg-night px-4 py-3 text-sm text-mist shadow-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-lime">Signed in as</p>
              <p className="mt-1 text-mist/85">{username ?? '--'}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  await reloadGames(selectedGameId ?? undefined)
                }}
                className="inline-flex items-center rounded-full border border-spruce/18 bg-white/70 px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-white"
                title="Refresh games list to see changes from other users"
              >
                ↻ Refresh
              </button>

              {isEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedGameId) {
                        return
                      }

                      commitDraft(selectedGameId, username ?? '')
                      setIsEditMode(false)

                      if (username) {
                        appendHistory(pageKey, { action: 'Saved changes', userEmail: username })
                      }
                    }}
                    disabled={!selectedGameId || !isDraftDirty}
                    className="rounded-full bg-night px-4 py-2 text-sm font-semibold text-mist shadow-sm transition hover:bg-spruce"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedGameId) {
                        return
                      }

                      resetDraft(selectedGameId)
                      setIsEditMode(false)

                      if (username) {
                        appendHistory(pageKey, { action: 'Cancelled changes', userEmail: username })
                      }
                    }}
                    className="rounded-full border border-spruce/18 bg-white/70 px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-white"
                  >
                    Cancel
                  </button>
                </>
              ) : null}

              <EditModeToggle
                isEditMode={isEditMode}
                onToggle={() => {
                  setIsEditMode((current) => {
                    const next = !current

                    if (next && selectedGameId) {
                      ensureDraft(selectedGameId)
                    }

                    if (!next && selectedGameId) {
                      clearDraft(selectedGameId)
                    }

                    if (username) {
                      appendHistory(pageKey, {
                        action: next ? 'Enabled edit mode' : 'Disabled edit mode',
                        userEmail: username,
                      })
                    }
                    return next
                  })
                }}
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-3xl border border-[#d9485f]/28 bg-[linear-gradient(135deg,rgba(255,237,240,0.98),rgba(255,205,214,0.86))] px-4 py-3 text-sm text-[#6f1322] shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a1283d]">Error</p>
                <p className="mt-1">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9485f]/22 bg-white/70 text-base leading-none text-[#8d2034] transition hover:bg-white"
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          ) : null}

          {isUploadLockedByAnotherGame ? (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-3xl border border-[#de8c1d]/28 bg-[linear-gradient(135deg,rgba(255,246,228,0.98),rgba(255,223,165,0.86))] px-4 py-3 text-sm text-[#7a4d10] shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b36a00]">Info</p>
                <p className="mt-1">
                  While {uploadGame?.name ?? 'another game'} is uploading or processing spins, uploads for other games are disabled until that completes.
                </p>
              </div>
            </div>
          ) : null}

          {isStaticDemo ? (
            <div className="mb-4 flex items-start justify-between gap-4 rounded-3xl border border-[#0f766e]/18 bg-[linear-gradient(135deg,rgba(235,255,249,0.98),rgba(190,242,235,0.88))] px-4 py-3 text-sm text-[#11453f] shadow-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0f766e]">Static demo</p>
                <p className="mt-1">This build uses bundled example sessions so it can run on GitHub Pages without the Node API or SQLite backend.</p>
              </div>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-[2rem] border border-spruce/15 bg-[linear-gradient(135deg,rgba(253,253,253,0.98),rgba(185,255,156,0.28))] p-6 shadow-panel">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-spruce">{headingKicker}</p>
                <h2 className="mt-3 font-display text-4xl leading-tight text-ink">
                  {isLoading ? 'Loading dashboard...' : selectedGame?.name ?? 'No game selected'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-ink/75">
                  Review notes, mechanics & features throughout this game.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-night px-4 py-4 text-mist">
                  <p className="text-xs uppercase tracking-[0.25em] text-lime">Provider</p>
                  <p className="mt-2 text-lg font-semibold">{selectedGame?.provider ?? '--'}</p>
                </div>
                <div className="rounded-3xl border border-spruce/15 bg-surface px-4 py-4 text-ink shadow-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-spruce">Game type</p>
                  <p className="mt-2 text-lg font-semibold">{selectedGame?.gameType ?? '--'}</p>
                </div>
                <div className="rounded-3xl border border-ember/40 bg-ember px-4 py-4 text-ink shadow-sm">
                  <p className="text-xs uppercase tracking-[0.25em] text-ink/70">Assigned RTP</p>
                  <p className="mt-2 text-lg font-semibold">
                    {selectedGame?.assignedRtp != null ? `${selectedGame.assignedRtp.toFixed(1)}%` : '--'}
                  </p>
                </div>

                {isEditMode && selectedGame ? (
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsEditingGame(true)}
                      className="inline-flex items-center rounded-full border border-spruce/18 bg-white/70 px-4 py-2 text-sm font-semibold text-ink shadow-sm transition hover:bg-white"
                    >
                      Edit game
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.9fr)]">
            <div className="space-y-6">
              <BaseGameBreakdownCard
                gameId={selectedGameId}
                userEmail={username}
                isEditMode={isEditMode}
                value={isEditMode ? draft?.base : null}
                onChange={(next) => {
                  if (!selectedGameId) return
                  updateDraft(selectedGameId, { base: next })
                }}
              />

              <BonusRoundsBreakdownCard
                gameId={selectedGameId}
                userEmail={username}
                isEditMode={isEditMode}
                value={isEditMode ? draft?.bonus : null}
                onChange={(next) => {
                  if (!selectedGameId) return
                  updateDraft(selectedGameId, { bonus: next })
                }}
              />
            </div>

            <GameNotesCard
              pageKey={pageKey}
              userEmail={username}
              isEditMode={isEditMode}
              title="Notes"
              value={draft?.notes}
              onChange={(next) => {
                if (!selectedGameId) return
                updateDraft(selectedGameId, { notes: next })
              }}
            />
          </div>

          {!isStaticDemo ? (
            <div className="mt-6">
              <ImageGalleryCard
                pageKey={pageKey}
                userEmail={username}
                isEditMode={isEditMode}
                value={draft?.gallery}
                onChange={(next) => {
                  if (!selectedGameId) return
                  updateDraft(selectedGameId, { gallery: next })
                }}
              />
            </div>
          ) : null}

          <div className="mt-6">
            <HistoryPanel pageKey={pageKey} />
          </div>
        </div>
      </main>

      <EditGameModal
        isOpen={isEditingGame && Boolean(selectedGame) && isEditMode}
        isSubmitting={isUpdatingGame}
        isDeleting={isDeletingGame}
        initialValues={{
          provider: selectedGame?.provider ?? '',
          name: selectedGame?.name ?? '',
          gameType: selectedGame?.gameType ?? 'Slot',
          assignedRtp: selectedGame?.assignedRtp ?? null,
        }}
        onClose={() => setIsEditingGame(false)}
        onSubmit={async (values) => {
          await handleUpdateSelectedGame(values)
          setIsEditingGame(false)
        }}
        onDelete={handleDeleteSelectedGame}
      />
    </div>
  )
}

export default App
