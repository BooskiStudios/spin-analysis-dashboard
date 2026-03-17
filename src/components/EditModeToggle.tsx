type EditModeToggleProps = {
  isEditMode: boolean
  onToggle: () => void
}

export function EditModeToggle({ isEditMode, onToggle }: EditModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition ${
        isEditMode
          ? 'border-lime/40 bg-night text-mist hover:bg-spruce'
          : 'border-spruce/18 bg-white/70 text-ink hover:bg-white'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isEditMode ? 'bg-lime' : 'bg-spruce/40'}`} />
      {isEditMode ? 'Edit mode: on' : 'Edit mode'}
    </button>
  )
}
