<script lang="ts">
  import { Check, Clipboard, Link } from '@lucide/svelte'
  import { onDestroy, onMount } from 'svelte'
  import { createStateFromParsedBrewfile, mergeParsedBrewfileIntoState } from './lib/brewfile-parser/importState'
  import { parseBrewfile, type ParsedBrewfile } from './lib/brewfile-parser/parser'
  import { exportBrewfile } from './lib/brewfile-exporter/exporter'
  import { loadPackageIndex } from './lib/homebrew-index/load'
  import { formatLocalText } from './lib/i18n/locale'
  import { t } from './lib/i18n/t'
  import { searchPackageIndex, type PackageSearchResult } from './lib/package-search/search'
  import { getPackageWarnings, hasDisabledWarning } from './lib/package-status/status'
  import { getPresetById, listPresets } from './lib/presets/presets'
  import { getPresetIdFromPath } from './lib/routing/presetRoute'
  import type { PackageIndex } from './lib/schemas/packageIndex'
  import type { PackageType } from './lib/schemas/preset'
  import { createShareUrl, decodeSharePayload, encodeSharePayload, getShareValueFromHash } from './lib/sharing/codec'
  import { countUnsharedSelectedPackages, createSharePayload, createStateFromSharePayload } from './lib/sharing/shareState'
  import {
    clearStoredPickerState,
    loadStoredPickerState,
    restorePickerStateFromStored,
    saveStoredPickerState,
    type StoredPickerState,
  } from './lib/storage/localStorage'
  import {
    createPickerStateFromPreset,
    getSelectedPackages,
    packageKey,
    setPackageSelected,
    upsertPackage,
    type PickerPackage,
    type PickerState,
  } from './lib/selection/state'

  type IndexStatus = 'loading' | 'ready' | 'missing' | 'error'
  type AdvancedType = PackageType | 'raw'
  type CopyTarget = 'install-homebrew' | 'install-bundle' | 'share-url'
  type FilenameMode = 'timestamp' | 'plain' | 'custom'

  type DownloadFilenameSettings = {
    mode: FilenameMode
    customName: string
  }

  const routePresetId = getPresetIdFromPath(window.location.pathname)
  const availablePresets = listPresets()
  const initialPreset = getPresetById(routePresetId ?? 'lab-2026')
  const advancedTypes: AdvancedType[] = ['brew', 'cask', 'tap', 'mas', 'raw']
  const installHomebrewCommand =
    '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  const homebrewUrl = 'https://brew.sh/'
  const githubRepositoryUrl = 'https://github.com/miz77/brewfile-picker'
  const commitSha = import.meta.env.VITE_COMMIT_SHA
  const shortCommitSha = commitSha ? commitSha.slice(0, 7) : ''
  const commitUrl = commitSha ? `${githubRepositoryUrl}/commit/${commitSha}` : ''
  const repositoryBlobRef = commitSha || 'main'
  const licenseUrl = `${githubRepositoryUrl}/blob/${repositoryBlobRef}/LICENSE`
  const thirdPartyNoticesUrl = `${githubRepositoryUrl}/blob/${repositoryBlobRef}/THIRD_PARTY_NOTICES.md`
  const downloadFilenameStorageKey = 'brewfile-picker:download-filename:v1'

  let activePreset = initialPreset
  let pickerState = createPickerStateFromPreset(activePreset)
  let packageIndex: PackageIndex | null = null
  let indexStatus: IndexStatus = 'loading'
  let indexError = ''
  let searchQuery = ''
  let liveMessage = ''
  let startupMessage = ''
  let shareUrl = ''
  let shareMessage = ''
  let copiedTarget: CopyTarget | null = null
  let downloadedBrewfileFilename = ''
  let downloadedBrewfileFilenameMayCollide = false
  let filenameMode: FilenameMode = 'timestamp'
  let customFilename = 'Brewfile'
  let filenameSettingsLoaded = false
  let importError = ''
  let parsedImport: ParsedBrewfile | null = null
  let advancedType: AdvancedType = 'brew'
  let advancedToken = ''
  let advancedMasId = ''
  let advancedError = ''
  let isDragActive = false
  let showDisabledDownloadDialog = false
  let dragDepth = 0
  let pendingStoredState: StoredPickerState | null = null
  let autoSaveEnabled = false
  let lastDownloadBaseFilename = ''
  let lastDownloadSequence = 0
  let saveTimer: number | undefined
  let copyStatusTimer: number | undefined

  onMount(() => {
    initializeFilenameSettings()
    void initializeState()
    void initializeIndex()
  })

  onDestroy(() => {
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer)
    }
    if (copyStatusTimer !== undefined) {
      window.clearTimeout(copyStatusTimer)
    }
  })

  async function initializeIndex() {
    try {
      packageIndex = await loadPackageIndex()
      indexStatus = packageIndex ? 'ready' : 'missing'
    } catch (error) {
      indexStatus = 'error'
      indexError = error instanceof Error ? error.message : String(error)
    }
  }

  function isFilenameMode(value: unknown): value is FilenameMode {
    return value === 'timestamp' || value === 'plain' || value === 'custom'
  }

  function parseDownloadFilenameSettings(value: unknown): DownloadFilenameSettings | null {
    if (!value || typeof value !== 'object') {
      return null
    }
    const settings = value as Record<string, unknown>
    if (!isFilenameMode(settings.mode)) {
      return null
    }

    return {
      mode: settings.mode,
      customName: typeof settings.customName === 'string' ? settings.customName : 'Brewfile',
    }
  }

  function initializeFilenameSettings() {
    try {
      const raw = globalThis.localStorage?.getItem(downloadFilenameStorageKey)
      const settings = raw ? parseDownloadFilenameSettings(JSON.parse(raw)) : null
      if (settings) {
        filenameMode = settings.mode
        customFilename = settings.customName
      }
    } catch {
      globalThis.localStorage?.removeItem(downloadFilenameStorageKey)
    }
    filenameSettingsLoaded = true
  }

  async function initializeState() {
    const shareValue = getShareValueFromHash(window.location.hash)
    if (shareValue) {
      try {
        const payload = await decodeSharePayload(shareValue)
        activePreset = getPresetById(payload.base.presetId)
        pickerState = createStateFromSharePayload(activePreset, payload)
        const messages = []
        if (routePresetId && routePresetId !== payload.base.presetId) {
          messages.push(t('share.routeMismatch'))
        }
        if (payload.base.revision !== activePreset.revision) {
          messages.push(t('share.revisionMismatch'))
        }
        startupMessage = messages.join(' ')
        autoSaveEnabled = true
        return
      } catch {
        startupMessage = t('share.invalid')
      }
    }

    try {
      pendingStoredState = loadStoredPickerState()
    } catch {
      clearStoredPickerState()
      startupMessage = t('storage.invalidCleared')
    }
    autoSaveEnabled = pendingStoredState === null
  }

  $: selectedPackages = getSelectedPackages(pickerState)
  $: selectedPackageKeys = new Set(selectedPackages.map(packageKey))
  $: presetPackageKeys = new Set(
    pickerState.packages.filter((pkg) => pkg.source === 'preset').map(packageKey),
  )
  $: searchResults = searchPackageIndex(packageIndex, searchQuery, {
    selectedKeys: selectedPackageKeys,
    presetKeys: presetPackageKeys,
    limit: 12,
  })
  $: brewfilePreview = exportBrewfile(pickerState)
  $: runBrewBundleCommand = downloadedBrewfileFilename
    ? `brew bundle --file "$HOME/Downloads/${downloadedBrewfileFilename}"`
    : ''
  $: sanitizedCustomFilename = sanitizeDownloadFilename(customFilename)
  $: downloadFilenamePreview =
    filenameMode === 'timestamp'
      ? t('filename.previewTimestamp')
      : filenameMode === 'plain'
        ? 'Brewfile'
        : sanitizedCustomFilename
  $: downloadFilenameError =
    filenameMode === 'custom' && customFilename.trim().length === 0 ? t('filename.customRequired') : ''
  $: canDownloadBrewfile = brewfilePreview.length > 0 && downloadFilenameError.length === 0
  $: installBundleNote = !downloadedBrewfileFilename
    ? t('install.bundlePending')
    : downloadedBrewfileFilenameMayCollide
      ? t('install.bundleNoteCollision')
      : t('install.bundleNote')
  $: importPackageCount = parsedImport?.packages.length ?? 0
  $: importPassthroughCount = parsedImport?.passthrough.length ?? 0
  $: selectedWarningRows = selectedPackages.flatMap((pkg) =>
    getPackageWarnings(pkg, packageIndex).map((warning) => ({ pkg, warning })),
  )
  $: disabledSelectedPackages = selectedPackages.filter((pkg) =>
    hasDisabledWarning(getPackageWarnings(pkg, packageIndex)),
  )
  $: indexStatusMessage =
    indexStatus === 'loading'
      ? t('index.loading')
      : indexStatus === 'ready' && packageIndex
        ? `brew ${packageIndex.counts.formula.toLocaleString()} / cask ${packageIndex.counts.cask.toLocaleString()}`
        : indexStatus === 'missing'
          ? t('index.missing')
          : `${t('index.error')} ${indexError}`
  $: indexUpdatedMessage =
    indexStatus === 'ready' && packageIndex ? `${t('index.updated')} ${formatLocalDateTime(packageIndex.generatedAt)}` : ''
  $: scheduleStateSave(pickerState, autoSaveEnabled)
  $: saveDownloadFilenameSettings(filenameSettingsLoaded, filenameMode, customFilename)

  function typeLabel(type: PackageType): string {
    return {
      brew: 'brew',
      cask: 'cask',
      tap: 'tap',
      mas: 'mas',
    }[type]
  }

  function typeBadgeClass(type: PackageType): string {
    return {
      brew: 'border-[var(--brand-border)] bg-[var(--brand-soft)] text-[#2b6f8f]',
      cask: 'border-violet-200 bg-violet-50 text-violet-800',
      tap: 'border-amber-200 bg-amber-50 text-amber-800',
      mas: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }[type]
  }

  function formatLocalDateTime(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date)
  }

  function changePreset(event: Event) {
    startNewWorkFromCurrentState()
    const presetId = (event.currentTarget as HTMLSelectElement).value
    const nextPreset = getPresetById(presetId)
    activePreset = nextPreset
    pickerState = createPickerStateFromPreset(nextPreset)
    pendingStoredState = null
    startupMessage = ''
    importError = ''
    parsedImport = null
    clearShareOutput()
    window.history.pushState({}, '', `/p/${nextPreset.id}`)
    liveMessage = `${formatLocalText(nextPreset.name)} ${t('preset.changed')}`
  }

  function addSearchResult(result: PackageSearchResult) {
    startNewWorkFromCurrentState()
    pickerState = upsertPackage(pickerState, {
      type: result.type,
      token: result.token,
      selected: true,
      source: result.inPreset ? 'preset' : 'manual',
    })
    liveMessage = `${result.token} ${t('live.selected')}`
    shareUrl = ''
    shareMessage = ''
  }

  function removeSelectedPackage(pkg: PickerPackage) {
    startNewWorkFromCurrentState()
    pickerState = setPackageSelected(pickerState, packageKey(pkg), false)
    liveMessage = `${pkg.token} ${t('live.removed')}`
    shareUrl = ''
    shareMessage = ''
  }

  function removePassthroughEntry(id: string) {
    startNewWorkFromCurrentState()
    pickerState = {
      ...pickerState,
      passthrough: pickerState.passthrough.filter((entry) => entry.id !== id),
    }
    liveMessage = t('live.removedPassthrough')
    shareUrl = ''
    shareMessage = ''
  }

  function showCopied(target: CopyTarget) {
    copiedTarget = target
    if (copyStatusTimer !== undefined) {
      window.clearTimeout(copyStatusTimer)
    }
    copyStatusTimer = window.setTimeout(() => {
      copiedTarget = null
      copyStatusTimer = undefined
    }, 1600)
  }

  async function copyText(text: string, label: string, target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(text)
      showCopied(target)
      liveMessage = `${label} ${t('live.copied')}`
    } catch {
      liveMessage = t('live.copyFailed')
    }
  }

  function saveDownloadFilenameSettings(loaded: boolean, mode: FilenameMode, customName: string) {
    if (!loaded) {
      return
    }

    globalThis.localStorage?.setItem(
      downloadFilenameStorageKey,
      JSON.stringify({ mode, customName } satisfies DownloadFilenameSettings),
    )
  }

  function sanitizeDownloadFilename(value: string): string {
    const unsafeFilenameCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
    const withoutUnsafeCharacters = Array.from(value.trim(), (character) => {
      return unsafeFilenameCharacters.has(character) || character.charCodeAt(0) < 32 ? '-' : character
    }).join('')
    const sanitized = withoutUnsafeCharacters
      .trim()
      .replace(/-+/g, '-')
      .replace(/^[.\s-]+|[.\s-]+$/g, '')

    return sanitized.length > 0 ? sanitized : 'Brewfile'
  }

  function createLocalTimestamp(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0')
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      '-',
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('')
  }

  function createDownloadFilename(): string {
    if (filenameMode === 'plain') {
      return 'Brewfile'
    }

    if (filenameMode === 'custom') {
      return sanitizedCustomFilename
    }

    const timestamp = createLocalTimestamp(new Date())
    const baseFilename = `Brewfile-${timestamp}`

    if (baseFilename !== lastDownloadBaseFilename) {
      lastDownloadBaseFilename = baseFilename
      lastDownloadSequence = 1
      return baseFilename
    }

    lastDownloadSequence += 1
    return `${baseFilename}-${lastDownloadSequence}`
  }

  function triggerBrewfileDownload() {
    const filename = createDownloadFilename()
    downloadedBrewfileFilename = filename
    downloadedBrewfileFilenameMayCollide = filenameMode !== 'timestamp'
    const blob = new Blob([`${brewfilePreview}\n`], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    liveMessage = t('live.downloaded')
  }

  function downloadBrewfile() {
    if (!canDownloadBrewfile) {
      return
    }

    if (disabledSelectedPackages.length > 0) {
      showDisabledDownloadDialog = true
      return
    }

    triggerBrewfileDownload()
  }

  function cancelDisabledDownload() {
    showDisabledDownloadDialog = false
  }

  function confirmDisabledDownload() {
    if (!canDownloadBrewfile) {
      showDisabledDownloadDialog = false
      return
    }

    showDisabledDownloadDialog = false
    triggerBrewfileDownload()
  }

  function scheduleStateSave(state: PickerState, enabled: boolean) {
    if (!enabled) {
      return
    }
    if (saveTimer !== undefined) {
      window.clearTimeout(saveTimer)
    }
    saveTimer = window.setTimeout(() => saveStoredPickerState(state), 250)
  }

  function restorePendingState() {
    if (!pendingStoredState) {
      return
    }
    activePreset = getPresetById(pendingStoredState.basePresetId)
    pickerState = restorePickerStateFromStored(activePreset, pendingStoredState)
    window.history.pushState({}, '', `/p/${activePreset.id}`)
    pendingStoredState = null
    startupMessage = ''
    autoSaveEnabled = true
    liveMessage = t('storage.restored')
  }

  function clearShareHashForEditedWork() {
    if (!getShareValueFromHash(window.location.hash)) {
      return
    }

    window.history.replaceState({}, '', `/p/${activePreset.id}`)
    startupMessage = ''
  }

  function startNewWorkFromCurrentState() {
    clearShareHashForEditedWork()
    if (!pendingStoredState) {
      return
    }
    clearStoredPickerState()
    pendingStoredState = null
    startupMessage = ''
    autoSaveEnabled = true
  }

  function discardPendingState() {
    clearStoredPickerState()
    pendingStoredState = null
    startupMessage = ''
    autoSaveEnabled = true
    liveMessage = t('storage.discarded')
  }

  async function createAndCopyShareUrl() {
    const encoded = await encodeSharePayload(createSharePayload(pickerState))
    shareUrl = createShareUrl(encoded, window.location)
    const messages = []
    const unsharedCount = countUnsharedSelectedPackages(pickerState)
    if (shareUrl.length > 8000) {
      messages.push(t('share.tooLong'))
    } else if (shareUrl.length > 2000) {
      messages.push(t('share.long'))
    }
    if (unsharedCount > 0) {
      messages.push(`${unsharedCount} ${t('share.omitted')}`)
    }
    shareMessage = messages.join(' ')
    if (shareUrl.length <= 8000) {
      await copyText(shareUrl, t('share.url'), 'share-url')
    }
  }

  function clearShareOutput() {
    shareUrl = ''
    shareMessage = ''
  }

  function parseImportContent(content: string) {
    if (content.trim().length === 0) {
      parsedImport = null
      importError = t('import.empty')
      return
    }

    try {
      parsedImport = parseBrewfile(content)
      importError = ''
      liveMessage = t('import.parsed')
    } catch {
      parsedImport = null
      importError = t('import.failed')
    }
  }

  async function loadImportFile(file: File) {
    if (file.size > 1024 * 1024) {
      parsedImport = null
      importError = t('import.tooLarge')
      return
    }

    const text = await file.text()
    if (text.includes('\0')) {
      parsedImport = null
      importError = t('import.binary')
      return
    }

    parseImportContent(text)
  }

  async function handleImportFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (file) {
      await loadImportFile(file)
    }
    input.value = ''
  }

  function applyImport(mode: 'replace' | 'merge') {
    if (!parsedImport) {
      return
    }
    startNewWorkFromCurrentState()

    pickerState =
      mode === 'replace'
        ? createStateFromParsedBrewfile(activePreset, parsedImport)
        : mergeParsedBrewfileIntoState(pickerState, parsedImport)
    parsedImport = null
    importError = ''
    clearShareOutput()
    liveMessage = mode === 'replace' ? t('import.replaced') : t('import.merged')
  }

  function resetAdvancedAdd() {
    advancedToken = ''
    advancedMasId = ''
    advancedError = ''
  }

  function addAdvancedItem() {
    const token = advancedToken.trim()
    if (token.length === 0) {
      advancedError = t('advanced.empty')
      return
    }

    if (advancedType === 'raw') {
      if (/[\n\r]/.test(token)) {
        advancedError = t('advanced.rawSingleLine')
        return
      }
      startNewWorkFromCurrentState()
      pickerState = {
        ...pickerState,
        passthrough: [
          ...pickerState.passthrough,
          { id: `manual-${Date.now()}`, line: token, source: 'manual' },
        ],
      }
      resetAdvancedAdd()
      clearShareOutput()
      liveMessage = t('advanced.added')
      return
    }

    if (advancedType === 'mas') {
      const masId = Number(advancedMasId)
      if (!Number.isInteger(masId) || masId <= 0 || /["'\n\r]/.test(token)) {
        advancedError = t('advanced.invalidMas')
        return
      }
      startNewWorkFromCurrentState()
      pickerState = upsertPackage(pickerState, {
        type: 'mas',
        token,
        selected: true,
        source: 'manual',
        masId,
      })
      resetAdvancedAdd()
      clearShareOutput()
      liveMessage = t('advanced.added')
      return
    }

    const invalidWarning = getPackageWarnings({ type: advancedType, token }, null).find(
      (warning) => warning.code === 'invalid-token' || warning.code === 'invalid-tap',
    )
    if (invalidWarning) {
      advancedError = invalidWarning.message
      return
    }

    startNewWorkFromCurrentState()
    pickerState = upsertPackage(pickerState, {
      type: advancedType,
      token,
      selected: true,
      source: 'manual',
    })
    resetAdvancedAdd()
    clearShareOutput()
    liveMessage = t('advanced.added')
  }

  function hasFileDrag(event: DragEvent): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }

  function handleWindowDragEnter(event: DragEvent) {
    if (!hasFileDrag(event)) {
      return
    }
    event.preventDefault()
    dragDepth += 1
    isDragActive = true
  }

  function handleWindowDragOver(event: DragEvent) {
    if (!hasFileDrag(event)) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleWindowDragLeave(event: DragEvent) {
    if (!hasFileDrag(event)) {
      return
    }
    dragDepth = Math.max(0, dragDepth - 1)
    isDragActive = dragDepth > 0
  }

  async function handleWindowDrop(event: DragEvent) {
    if (!hasFileDrag(event)) {
      return
    }
    event.preventDefault()
    dragDepth = 0
    isDragActive = false

    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length !== 1) {
      importError = t('import.oneFile')
      return
    }
    await loadImportFile(files[0])
  }
</script>

<svelte:head>
  <title>{t('app.title')}</title>
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css"
  />
</svelte:head>

<svelte:window
  ondragenter={handleWindowDragEnter}
  ondragover={handleWindowDragOver}
  ondragleave={handleWindowDragLeave}
  ondrop={handleWindowDrop}
/>

<main class="min-h-svh bg-stone-50 text-zinc-950">
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:px-8">
    <header class="flex flex-col gap-3 border-b border-zinc-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="max-w-3xl">
        <p class="text-xs font-medium text-[var(--brand-strong)]">{t('app.kicker')}</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
          {t('app.title')}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {t('app.description')}
        </p>
      </div>
      <div class="flex shrink-0 flex-col gap-1 sm:items-end sm:pt-1">
        <div class="flex items-center gap-2">
          <a
            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-xl text-zinc-700 outline-none transition hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
            href={githubRepositoryUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repositoryを開く"
          >
            <i class="devicon-github-original" aria-hidden="true"></i>
          </a>
          {#if shortCommitSha}
            <a
              class="font-mono text-xs text-zinc-600 underline-offset-2 hover:text-zinc-950 hover:underline"
              href={commitUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Commit ${shortCommitSha}を開く`}
            >
              {shortCommitSha}
            </a>
          {/if}
        </div>
        {#if indexUpdatedMessage}
          <p class="text-xs text-zinc-500 sm:text-right">{indexUpdatedMessage}</p>
        {/if}
        <p class="text-xs text-zinc-500 sm:text-right">{indexStatusMessage}</p>
      </div>
    </header>

    <section class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label class="text-sm font-medium text-zinc-700" for="preset-select">{t('preset.select')}</label>
        <select
          id="preset-select"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:w-72"
          value={activePreset.id}
          onchange={changePreset}
        >
          {#each availablePresets as preset}
            <option value={preset.id}>{formatLocalText(preset.name)}</option>
          {/each}
        </select>
      </div>

      <div class="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label class="text-sm font-medium text-zinc-700" for="filename-mode">{t('filename.title')}</label>
          <select
            id="filename-mode"
            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] sm:w-56"
            bind:value={filenameMode}
          >
            <option value="timestamp">{t('filename.timestamp')}</option>
            <option value="plain">{t('filename.plain')}</option>
            <option value="custom">{t('filename.custom')}</option>
          </select>
        </div>
        {#if filenameMode === 'custom'}
          <input
            class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)] lg:w-52"
            aria-label={t('filename.customLabel')}
            placeholder={t('filename.customPlaceholder')}
            bind:value={customFilename}
          />
        {/if}
        <p class="min-w-0 text-xs text-zinc-500">
          {t('filename.preview')}
          <span class="ml-1 font-mono text-zinc-800">{downloadFilenamePreview}</span>
        </p>
        {#if downloadFilenameError}
          <p class="text-sm text-amber-700">{downloadFilenameError}</p>
        {/if}
      </div>
    </section>

    {#if startupMessage || pendingStoredState}
      <section class="flex flex-col gap-3 rounded-md border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 text-sm text-[var(--brand-ink)] sm:flex-row sm:items-center sm:justify-between">
        <p>{pendingStoredState ? t('storage.available') : startupMessage}</p>
        {#if pendingStoredState}
          <div class="flex gap-2">
            <button
              type="button"
              data-button-variant="primary"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition"
              onclick={restorePendingState}
            >
              {t('storage.restore')}
            </button>
            <button
              type="button"
              class="rounded-md border border-[var(--brand-border-strong)] px-3 py-1.5 text-sm font-medium text-[var(--brand-ink)] transition hover:bg-white/60"
              onclick={discardPendingState}
            >
              {t('storage.discard')}
            </button>
          </div>
        {/if}
      </section>
    {/if}

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
      <section class="flex min-w-0 flex-col gap-5">
        <section class="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div class="border-b border-zinc-200 px-4 py-3">
            <h2 class="text-base font-semibold text-zinc-950">{t('search.title')}</h2>
          </div>
          <div class="p-4">
            <label class="block">
              <span class="text-sm font-medium text-zinc-700">{t('search.label')}</span>
              <input
                class="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                type="search"
                placeholder={t('search.placeholder')}
                bind:value={searchQuery}
              />
            </label>

            {#if searchQuery.trim().length > 0 && searchQuery.trim().length < 2}
              <p class="mt-3 text-sm text-zinc-500">{t('search.minLength')}</p>
            {:else if searchQuery.trim().length >= 2 && searchResults.length === 0}
              <p class="mt-3 text-sm text-zinc-500">{t('search.empty')}</p>
            {:else if searchResults.length > 0}
              <ul class="mt-4 divide-y divide-zinc-100 rounded-md border border-zinc-200">
                {#each searchResults as result}
                  <li class="flex items-start gap-3 px-3 py-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="truncate text-sm font-medium text-zinc-950">{result.token}</p>
                        <span class={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${typeBadgeClass(result.type)}`}>
                          {typeLabel(result.type)}
                        </span>
                        {#if result.inPreset}
                          <span class="rounded border border-[var(--brand-border)] bg-[var(--brand-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[#2b6f8f]">
                            {t('search.inPreset')}
                          </span>
                        {/if}
                      </div>
                      <p class="mt-1 text-sm text-zinc-600">{result.title}</p>
                      {#if result.description}
                        <p class="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{result.description}</p>
                      {/if}
                    </div>
                    <button
                      type="button"
                      class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={result.selected}
                      onclick={() => addSearchResult(result)}
                    >
                      {result.selected ? t('search.selected') : t('search.add')}
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
        </section>

        <section class="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div class="border-b border-zinc-200 px-4 py-3">
            <h2 class="text-base font-semibold text-zinc-950">{t('import.title')}</h2>
          </div>
          <div class="space-y-4 p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label class="inline-flex w-fit cursor-pointer items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800">
                {t('import.file')}
                <input class="sr-only" type="file" onchange={handleImportFile} />
              </label>
              <span class="text-sm text-zinc-500">{t('import.dropHint')}</span>
            </div>
            {#if importError}
              <p class="text-sm text-amber-700">{importError}</p>
            {/if}
            {#if parsedImport}
              <div class="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p class="text-sm text-zinc-700">
                  {t('import.summary')} {importPackageCount} / {t('import.passthrough')} {importPassthroughCount}
                </p>
                <div class="mt-3 flex gap-2">
                  <button
                    type="button"
                    data-button-variant="primary"
                    class="rounded-md px-3 py-1.5 text-sm font-medium transition"
                    onclick={() => applyImport('replace')}
                  >
                    {t('import.replace')}
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800"
                    onclick={() => applyImport('merge')}
                  >
                    {t('import.merge')}
                  </button>
                </div>
              </div>
            {/if}
          </div>
        </section>

        <details class="rounded-md border border-zinc-200 bg-white shadow-sm">
          <summary class="cursor-pointer border-b border-zinc-200 px-4 py-3 text-base font-semibold text-zinc-950 marker:text-zinc-500">
            {t('advanced.title')}
          </summary>
          <div class="space-y-3 p-4">
            <div class="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <label class="block">
                <span class="text-sm font-medium text-zinc-700">{t('advanced.type')}</span>
                <select
                  class="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                  bind:value={advancedType}
                >
                  {#each advancedTypes as type}
                    <option value={type}>{type}</option>
                  {/each}
                </select>
              </label>
              <label class="block">
                <span class="text-sm font-medium text-zinc-700">
                  {advancedType === 'mas' ? t('advanced.name') : t('advanced.token')}
                </span>
                <input
                  class="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                  placeholder={advancedType === 'raw' ? 'vscode "svelte.svelte-vscode"' : 'node'}
                  bind:value={advancedToken}
                />
              </label>
            </div>
            {#if advancedType === 'mas'}
              <label class="block">
                <span class="text-sm font-medium text-zinc-700">{t('advanced.masId')}</span>
                <input
                  class="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
                  inputmode="numeric"
                  placeholder="497799835"
                  bind:value={advancedMasId}
                />
              </label>
            {/if}
            {#if advancedError}
              <p class="text-sm text-amber-700">{advancedError}</p>
            {/if}
            <button
              type="button"
              data-button-variant="primary"
              class="rounded-md px-3 py-1.5 text-sm font-medium transition"
              onclick={addAdvancedItem}
            >
              {t('advanced.add')}
            </button>
          </div>
        </details>

        <section class="rounded-md border border-[var(--brand-border)] bg-[var(--brand-soft)] p-4 text-sm leading-6 text-[var(--brand-ink)]">
          <p class="font-medium">{t('privacy.title')}</p>
          <p class="mt-1">{t('privacy.browserOnly')}</p>
        </section>
      </section>

      <aside class="flex min-w-0 flex-col gap-4">
        <section class="rounded-md border border-zinc-200 bg-white shadow-sm">
          <div class="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3">
            <h2 class="text-base font-semibold text-zinc-950">
              {t('selected.title')}
              <span class="ml-2 text-sm font-normal text-zinc-500">{selectedPackages.length}</span>
            </h2>
            <div class="grid w-full gap-2" style="grid-template-columns: minmax(0, 1.2fr) minmax(7rem, 0.8fr);">
              <button
                type="button"
                class="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 outline-none transition hover:border-zinc-400 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={selectedPackages.length === 0 && pickerState.passthrough.length === 0}
                onclick={createAndCopyShareUrl}
              >
                {#if copiedTarget === 'share-url'}
                  <Check class="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span class="text-emerald-700">Copied!</span>
                {:else}
                  <Link class="h-4 w-4" aria-hidden="true" />
                  <span class="whitespace-nowrap">{t('share.create')}</span>
                {/if}
              </button>
              <button
                type="button"
                data-button-variant="primary"
                class="min-w-0 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canDownloadBrewfile}
                onclick={downloadBrewfile}
              >
                {t('brewfile.download')}
              </button>
            </div>
          </div>
          {#if shareMessage}
            <p class="border-b border-zinc-100 px-4 py-2 text-sm leading-6 text-amber-700">{shareMessage}</p>
          {/if}
          {#if selectedPackages.length === 0 && pickerState.passthrough.length === 0}
            <p class="p-4 text-sm text-zinc-500">{t('selected.empty')}</p>
          {:else}
            <ul class="max-h-64 divide-y divide-zinc-100 overflow-auto">
              {#each selectedPackages as pkg}
                <li class="flex items-center gap-3 px-4 py-2.5">
                  <span class={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${typeBadgeClass(pkg.type)}`}>
                    {typeLabel(pkg.type)}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-sm text-zinc-900">{pkg.token}</span>
                  <button
                    type="button"
                    class="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700"
                    onclick={() => removeSelectedPackage(pkg)}
                  >
                    {t('selected.remove')}
                  </button>
                </li>
              {/each}
              {#each pickerState.passthrough as entry}
                <li class="flex items-center gap-3 px-4 py-2.5">
                  <span class="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700">
                    raw
                  </span>
                  <span class="min-w-0 flex-1 truncate font-mono text-sm text-zinc-900">{entry.line}</span>
                  <button
                    type="button"
                    class="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700"
                    onclick={() => removePassthroughEntry(entry.id)}
                  >
                    {t('selected.remove')}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        {#if selectedWarningRows.length > 0}
          <section class="rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <h2 class="text-base font-semibold text-amber-950">{t('warning.title')}</h2>
            <ul class="mt-2 space-y-1 text-sm leading-6 text-amber-900">
              {#each selectedWarningRows as row}
                <li>
                  <span class="font-medium">{row.pkg.token}</span>: {row.warning.message}
                  {#if row.warning.replacement}
                    <span>{t('warning.replacement')} {row.warning.replacement}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <section class="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 class="text-base font-semibold text-zinc-950">{t('install.title')}</h2>
          <div class="mt-3 space-y-3">
            <div>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-zinc-800">{t('install.homebrew')}</p>
                  <p class="mt-0.5 text-xs leading-5 text-zinc-500">{t('install.homebrewNote')}</p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 outline-none transition hover:border-zinc-400 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
                  title={t('brewfile.copy')}
                  aria-label={`${t('install.homebrew')}をコピー`}
                  onclick={() => copyText(installHomebrewCommand, t('install.homebrew'), 'install-homebrew')}
                >
                  {#if copiedTarget === 'install-homebrew'}
                    <Check class="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  {:else}
                    <Clipboard class="h-4 w-4" aria-hidden="true" />
                  {/if}
                </button>
              </div>
              {#if copiedTarget === 'install-homebrew'}
                <p class="mt-1 text-right text-xs font-medium text-emerald-700">Copied!</p>
              {/if}
              <pre class="mt-2 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50"><code>{installHomebrewCommand}</code></pre>
            </div>
            <div class="border-t border-zinc-100 pt-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-zinc-800">{t('install.bundle')}</p>
                  <p class="mt-0.5 text-xs leading-5 text-zinc-500">{installBundleNote}</p>
                </div>
                {#if downloadedBrewfileFilename}
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 outline-none transition hover:border-zinc-400 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
                    title={t('brewfile.copy')}
                    aria-label={`${t('install.bundle')}をコピー`}
                    onclick={() => copyText(runBrewBundleCommand, t('install.bundle'), 'install-bundle')}
                  >
                    {#if copiedTarget === 'install-bundle'}
                      <Check class="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    {:else}
                      <Clipboard class="h-4 w-4" aria-hidden="true" />
                    {/if}
                  </button>
                {/if}
              </div>
              {#if copiedTarget === 'install-bundle'}
                <p class="mt-1 text-right text-xs font-medium text-emerald-700">Copied!</p>
              {/if}
              {#if downloadedBrewfileFilename}
                <pre class="mt-2 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-50"><code>{runBrewBundleCommand}</code></pre>
              {/if}
            </div>
          </div>
        </section>

      </aside>
    </div>

    <footer class="space-y-1 border-t border-zinc-200 pt-4 pb-2 text-xs text-zinc-500">
      <p>
        {t('footer.homebrewThanksBefore')}
        <a
          class="underline-offset-2 transition hover:text-[var(--brand-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
          href={homebrewUrl}
          target="_blank"
          rel="noreferrer"
        >
          Homebrew
        </a>
        {t('footer.homebrewThanksAfter')}
      </p>
      <nav class="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Legal links">
        <a
          class="underline-offset-2 transition hover:text-[var(--brand-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
          href={licenseUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('footer.licenseMit')}
        </a>
        <span aria-hidden="true">·</span>
        <a
          class="underline-offset-2 transition hover:text-[var(--brand-strong)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
          href={thirdPartyNoticesUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t('footer.notices')}
        </a>
      </nav>
    </footer>

    <p class="sr-only" aria-live="polite">{liveMessage}</p>
  </div>

  {#if isDragActive}
    <div class="fixed inset-0 z-50 grid place-items-center border-4 border-[var(--brand)] bg-[#143d4e]/25 p-6">
      <div class="rounded-md bg-white px-5 py-4 text-base font-semibold text-zinc-950 shadow-lg">
        {t('drop.title')}
      </div>
    </div>
  {/if}

  {#if showDisabledDownloadDialog}
    <div class="fixed inset-0 z-50 grid place-items-center bg-zinc-950/45 p-4">
      <div
        class="w-full max-w-md rounded-md bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disabled-download-title"
      >
        <h2 id="disabled-download-title" class="text-lg font-semibold text-zinc-950">
          {t('download.disabledTitle')}
        </h2>
        <p class="mt-3 text-sm leading-6 text-zinc-700">{t('download.disabledConfirm')}</p>
        <ul class="mt-3 max-h-40 space-y-1 overflow-auto rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {#each disabledSelectedPackages as pkg}
            <li>{pkg.type} "{pkg.token}"</li>
          {/each}
        </ul>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800"
            onclick={cancelDisabledDownload}
          >
            {t('download.cancel')}
          </button>
          <button
            type="button"
            data-button-variant="primary"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition"
            onclick={confirmDisabledDownload}
          >
            {t('download.continue')}
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
