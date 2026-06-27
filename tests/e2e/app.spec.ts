import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('https://cdn.jsdelivr.net/gh/devicons/devicon@latest/devicon.min.css', async (route) => {
    await route.fulfill({
      contentType: 'text/css',
      body: '.devicon-github-original::before { content: ""; }',
    })
  })
})

async function openAdvancedAdd(page: Page) {
  const advancedPanel = page.locator('details').filter({ hasText: 'Advanced add' })
  const isOpen = await advancedPanel.evaluate((element) => (element as HTMLDetailsElement).open)
  if (!isOpen) {
    await page.getByText('Advanced add').click()
  }
}

async function removeSelectedPackage(page: Page, token: string) {
  await page
    .getByRole('listitem')
    .filter({ hasText: token })
    .getByRole('button', { name: '解除' })
    .click()
}

function selectedItem(page: Page, token: string) {
  return page
    .getByRole('heading', { name: /選択中の項目/ })
    .locator('xpath=ancestor::section[1]')
    .getByRole('listitem')
    .filter({ hasText: token })
}

async function dropBrewfile(page: Page, content: string) {
  await page.evaluate((brewfileContent) => {
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(new File([brewfileContent], 'Brewfile', { type: 'text/plain' }))
    window.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer }))
    window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }))
  }, content)
}

async function downloadBrewfileText(
  page: Page,
  expectedFilename: RegExp | string = /^Brewfile-\d{8}-\d{6}(?:-\d+)?$/,
): Promise<string> {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'ダウンロード' }).click()
  const download = await downloadPromise
  const path = await download.path()
  const suggestedFilename = download.suggestedFilename()
  if (typeof expectedFilename === 'string') {
    expect(suggestedFilename).toBe(expectedFilename)
  } else {
    expect(suggestedFilename).toMatch(expectedFilename)
  }
  await expect(page.getByText(`brew bundle --file "$HOME/Downloads/${suggestedFilename}"`)).toBeVisible()
  expect(path).not.toBeNull()
  if (!path) {
    throw new Error('Download path was not available')
  }
  return readFile(path, 'utf8')
}

function packageIndexWithDisabledFixture() {
  return {
    schemaVersion: 1,
    generatedAt: '2026-06-27T00:00:00.000Z',
    counts: { formula: 2, cask: 1 },
    source: {
      formula: 'fixture',
      cask: 'fixture',
    },
    formula: {
      git: {
        type: 'brew',
        token: 'git',
        fullName: 'git',
        tap: 'homebrew/core',
        desc: 'Version control',
        homepage: 'https://git-scm.com',
        aliases: [],
        oldNames: [],
        deprecated: false,
        disabled: false,
        deprecationReason: null,
        disableReason: null,
        replacement: null,
      },
      'old-tool': {
        type: 'brew',
        token: 'old-tool',
        fullName: 'old-tool',
        tap: 'homebrew/core',
        desc: 'Disabled fixture package',
        homepage: 'https://example.com/old-tool',
        aliases: [],
        oldNames: [],
        deprecated: false,
        disabled: true,
        deprecationReason: null,
        disableReason: 'fixture',
        replacement: 'git',
      },
    },
    cask: {
      'visual-studio-code': {
        type: 'cask',
        token: 'visual-studio-code',
        fullToken: 'homebrew/cask/visual-studio-code',
        name: ['Visual Studio Code'],
        desc: 'Code editor',
        homepage: 'https://code.visualstudio.com/',
        oldTokens: [],
        deprecated: false,
        disabled: false,
        deprecationReason: null,
        disableReason: null,
        replacement: null,
      },
    },
  }
}

test('opens the lab preset and updates selection', async ({ page }) => {
  const externalRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('formulae.brew.sh')) {
      externalRequests.push(request.url())
    }
  })

  await page.goto('/p/lab-2026')
  await expect(page.getByRole('heading', { name: 'Brewfile Picker' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub repositoryを開く' })).toHaveAttribute(
    'href',
    'https://github.com/miz77/brewfile-picker',
  )
  await expect(page.getByText('brew bundle --file')).toHaveCount(0)
  await expect(
    page.getByText('Brewfile をダウンロードすると、実行用コマンドがここに表示されます。'),
  ).toBeVisible()
  await expect(page.getByText(/brew [\d,]+ \/ cask [\d,]+/)).toBeVisible()
  await expect(page.getByText(/パッケージ情報取得/)).toBeVisible()
  await expect(selectedItem(page, 'git')).toBeVisible()
  await expect(selectedItem(page, 'python')).toBeVisible()
  await expect(selectedItem(page, 'visual-studio-code')).toBeVisible()

  await page.getByRole('button', { name: '選択中の項目を折りたたむ' }).click()
  await expect(selectedItem(page, 'git')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'リンクをコピー' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ダウンロード' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'インストール手順' })).toBeVisible()
  await page.getByRole('button', { name: '選択中の項目を展開' }).click()
  await expect(selectedItem(page, 'git')).toBeVisible()

  await removeSelectedPackage(page, 'git')
  await expect(selectedItem(page, 'git')).toHaveCount(0)

  await page.getByRole('searchbox').fill('zotero')
  await page.getByRole('button', { name: '追加' }).first().click()
  await expect(selectedItem(page, 'zotero')).toBeVisible()

  expect(externalRequests).toEqual([])
})

test('opens the blank preset on the root route', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByLabel('プリセット')).toHaveValue('blank')
  await expect(page.getByText('まだ何も選択されていません。')).toBeVisible()
  await expect(selectedItem(page, 'git')).toHaveCount(0)
})

test('switches presets from the preset selector', async ({ page }) => {
  await page.goto('/p/lab-2026')
  await expect(selectedItem(page, 'git')).toBeVisible()

  await page.getByLabel('プリセット').selectOption('blank')
  await expect(page).toHaveURL(/\/p\/blank$/)
  await expect(page.getByText('まだ何も選択されていません。')).toBeVisible()
  await expect(selectedItem(page, 'git')).toHaveCount(0)
})

test('imports a Brewfile and preserves complex lines', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await expect(page.locator('textarea')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'プレビュー' })).toHaveCount(0)
  await dropBrewfile(
    page,
    [
      'tap "homebrew/cask-fonts"',
      'brew "node"',
      'cask "zotero"',
      '# keep this option',
      'brew "node", args: ["with-icu4c"]',
    ].join('\n'),
  )
  await expect(page.getByText('認識した項目 3 / 保持する行 1')).toBeVisible()

  await page.getByRole('button', { name: '置き換え' }).click()
  const content = await downloadBrewfileText(page)
  expect(content).toContain('tap "homebrew/cask-fonts"')
  expect(content).toContain('brew "node"')
  expect(content).toContain('cask "zotero"')
  expect(content).toContain('# keep this option')
  expect(content).toContain('brew "node", args: ["with-icu4c"]')
})

test('downloads the generated Brewfile', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await expect(downloadBrewfileText(page)).resolves.toContain('brew "git"')
})

test('configures the downloaded Brewfile filename', async ({ page }) => {
  await page.goto('/p/lab-2026')
  await expect(page.getByText('Brewfile-YYYYMMDD-HHMMSS')).toBeVisible()

  await page.getByLabel('ファイル名').selectOption('plain')
  await expect(downloadBrewfileText(page, 'Brewfile')).resolves.toContain('brew "git"')
  await expect(page.getByText('同名ファイルがある場合は、Downloads 内の実際のファイル名に合わせてください。')).toBeVisible()

  await page.getByLabel('ファイル名').selectOption('custom')
  await page.getByLabel('カスタム名').fill('lab/mac:setup')
  await expect(page.getByText('lab-mac-setup')).toBeVisible()
  await expect(downloadBrewfileText(page, 'lab-mac-setup')).resolves.toContain('brew "git"')
})

test('creates and restores a share URL without preserving mas or raw lines', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await removeSelectedPackage(page, 'git')
  await openAdvancedAdd(page)
  await page.getByLabel('種類').selectOption('mas')
  await page.getByLabel('アプリ名').fill('Xcode')
  await page.getByLabel('App Store ID').fill('497799835')
  await page.getByRole('button', { name: '追加' }).click()
  await page.getByLabel('種類').selectOption('raw')
  await page.getByLabel('token / raw line').fill('vscode "svelte.svelte-vscode"')
  await page.getByRole('button', { name: '追加' }).click()

  await page.getByRole('button', { name: 'リンクをコピー' }).click()
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible()
  await expect(page.getByText('2 件の項目はURL共有に含めません。')).toBeVisible()
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText())

  await page.goto('about:blank')
  await page.goto(shareUrl)
  await expect(selectedItem(page, 'python')).toBeVisible()
  await expect(selectedItem(page, 'visual-studio-code')).toBeVisible()
  await expect(selectedItem(page, 'git')).toHaveCount(0)
  await expect(selectedItem(page, 'Xcode')).toHaveCount(0)
  await expect(downloadBrewfileText(page)).resolves.not.toContain('vscode "svelte.svelte-vscode"')

  await openAdvancedAdd(page)
  await page.getByLabel('種類').selectOption('brew')
  await page.getByLabel('token / raw line').fill('node')
  await page.getByRole('button', { name: '追加' }).click()
  await expect(selectedItem(page, 'node')).toBeVisible()
  await expect(page).toHaveURL(/\/p\/lab-2026$/)
  await page.waitForTimeout(400)

  await page.reload()
  await expect(page.getByText('前回の作業がこのブラウザに残っています。')).toBeVisible()
  await expect(selectedItem(page, 'node')).toHaveCount(0)
  await page.getByRole('button', { name: '復元' }).click()
  await expect(selectedItem(page, 'node')).toBeVisible()
})

test('offers localStorage restore on the default route', async ({ page }) => {
  await page.goto('/p/lab-2026')
  await removeSelectedPackage(page, 'git')
  await expect(selectedItem(page, 'git')).toHaveCount(0)
  await page.waitForTimeout(400)

  await page.goto('/')
  await expect(page.getByText('前回の作業がこのブラウザに残っています。')).toBeVisible()
  await expect(page.getByLabel('プリセット')).toHaveValue('blank')
  await expect(page.getByText('まだ何も選択されていません。')).toBeVisible()
  await expect(selectedItem(page, 'git')).toHaveCount(0)
  await page.getByRole('button', { name: '復元' }).click()
  await expect(page).toHaveURL(/\/p\/lab-2026$/)
  await expect(selectedItem(page, 'git')).toHaveCount(0)
})

test('offers localStorage restore on an explicit preset route without clobbering it', async ({ page }) => {
  await page.goto('/p/lab-2026')
  await removeSelectedPackage(page, 'git')
  await expect(selectedItem(page, 'git')).toHaveCount(0)
  await page.waitForTimeout(400)

  await page.goto('/p/lab-2026')
  await expect(page.getByText('前回の作業がこのブラウザに残っています。')).toBeVisible()
  await expect(selectedItem(page, 'git')).toBeVisible()

  await page.getByRole('button', { name: '復元' }).click()
  await expect(page).toHaveURL(/\/p\/lab-2026$/)
  await expect(selectedItem(page, 'git')).toHaveCount(0)
})

test('adds advanced tap, mas, and raw entries', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await openAdvancedAdd(page)
  await page.getByLabel('種類').selectOption('tap')
  await page.getByLabel('token / raw line').fill('homebrew/cask-fonts')
  await page.getByRole('button', { name: '追加' }).click()
  await expect(selectedItem(page, 'homebrew/cask-fonts')).toBeVisible()

  await page.getByLabel('種類').selectOption('mas')
  await page.getByLabel('アプリ名').fill('Xcode')
  await page.getByLabel('App Store ID').fill('497799835')
  await page.getByRole('button', { name: '追加' }).click()
  await expect(selectedItem(page, 'Xcode')).toBeVisible()

  await page.getByLabel('種類').selectOption('raw')
  await page.getByLabel('token / raw line').fill('vscode "svelte.svelte-vscode"')
  await page.getByRole('button', { name: '追加' }).click()
  await expect(downloadBrewfileText(page)).resolves.toContain('vscode "svelte.svelte-vscode"')
})

test('imports a Brewfile from a selected file', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await page.locator('input[type="file"]').setInputFiles({
    name: 'Brewfile',
    mimeType: 'text/plain',
    buffer: Buffer.from('brew "node"\ncask "zotero"\n'),
  })
  await expect(page.getByText('認識した項目 2 / 保持する行 0')).toBeVisible()
  await page.getByRole('button', { name: '置き換え' }).click()
  await expect(selectedItem(page, 'node')).toBeVisible()
  await expect(selectedItem(page, 'zotero')).toBeVisible()
})

test('imports a Brewfile through global drag and drop', async ({ page }) => {
  await page.goto('/p/lab-2026')

  await dropBrewfile(page, 'brew "node"\n')

  await expect(page.getByText('認識した項目 1 / 保持する行 0')).toBeVisible()
  await page.getByRole('button', { name: '置き換え' }).click()
  await expect(selectedItem(page, 'node')).toBeVisible()
})

test('shows a dialog before downloading disabled packages', async ({ page }) => {
  await page.route('**/package-index.json', async (route) => {
    await route.fulfill({ json: packageIndexWithDisabledFixture() })
  })
  await page.goto('/p/lab-2026')
  await expect(page.getByText(/brew [\d,]+ \/ cask [\d,]+/)).toBeVisible()

  await openAdvancedAdd(page)
  await page.getByLabel('token / raw line').fill('old-tool')
  await page.getByRole('button', { name: '追加' }).click()
  await expect(page.getByText('Homebrew 側で disabled とされています。')).toBeVisible()

  await page.getByRole('button', { name: 'ダウンロード' }).click()
  const dialog = page.getByRole('dialog', { name: 'disabled package が含まれています' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('brew "old-tool"', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'キャンセル' }).click()
  await expect(page.getByRole('dialog', { name: 'disabled package が含まれています' })).toHaveCount(0)
})
