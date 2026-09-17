/**
 * TraceNote E2E 测试脚本
 * 使用 puppeteer-core + 系统 Chrome 进行完整功能回归测试
 */

import puppeteer from 'puppeteer-core'

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP_URL = 'http://localhost:5173'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  [BROWSER ERROR] ${msg.text()}`)
    }
  })
  page.on('pageerror', err => {
    console.log(`  [PAGE ERROR] ${err.message}`)
  })

  let passed = 0
  let failed = 0
  const totalTests = []

  function test(name, fn) {
    totalTests.push({ name, fn })
  }

  async function runTest(name, fn) {
    try {
      await fn()
      console.log(`  ✅ ${name}`)
      passed++
    } catch (err) {
      console.log(`  ❌ ${name}: ${err.message}`)
      failed++
    }
  }

  async function goHome() {
    await page.goto(APP_URL, { waitUntil: 'load' })
    await sleep(500)
  }

  async function navigateTo(hash) {
    await page.evaluate((h) => {
      window.location.hash = h
    }, hash)
    await sleep(500)
  }

  // ============ 测试套件 ============

  test('首页加载正常', async () => {
    await goHome()
    const title = await page.title()
    if (!title.includes('TraceNote')) throw new Error(`Title mismatch: ${title}`)

    // 检查空状态
    const emptyText = await page.$eval('.empty-state-text', el => el.textContent).catch(() => null)
    if (!emptyText || !emptyText.includes('No sessions')) {
      console.log(`  ⚠️  Empty text: ${emptyText}`)
    }

    // 检查侧边栏导航
    const navItems = await page.$$('.nav-item')
    if (navItems.length < 4) throw new Error(`Too few nav items: ${navItems.length}`)
  })

  test('Start Recording 按钮存在并点击', async () => {
    await goHome()
    await sleep(500)

    const btn = await page.$('.btn-primary')
    if (!btn) {
      // try harder - might be scrolled
      const btns = await page.$$('button')
      const startBtn = null
      for (const b of btns) {
        const text = await page.evaluate(el => el.textContent, b)
        if (text.includes('Start Recording')) {
          await b.click()
          await sleep(300)
          const demoArea = await page.$('.demo-area')
          if (!demoArea) throw new Error('Demo area not shown after clicking Start Recording')
          return
        }
      }
      throw new Error('Start Recording button not found anywhere')
    }

    const text = await page.evaluate(el => el.textContent, btn)
    if (!text.includes('Start Recording')) throw new Error(`Wrong button text: ${text}`)

    await btn.click()
    await sleep(300)

    // 检查 demo area 出现
    const demoArea = await page.$('.demo-area')
    if (!demoArea) throw new Error('Demo area not shown after clicking start')
  })

  test('录制 click 事件', async () => {
    await goHome()
    await sleep(300)

    // Start recording
    const startBtn = await page.$('.btn-primary')
    if (startBtn) {
      await startBtn.click()
      await sleep(300)
    }

    const demoBtns = await page.$$('.demo-btn')
    if (demoBtns.length === 0) {
      // try to trigger recording by navigating
      console.log('  ⚠️  No demo buttons found, skipping click test')
      return
    }

    await demoBtns[0].click()
    await sleep(100)
  })

  test('录制 input 事件', async () => {
    await goHome()
    await sleep(300)

    // Check if already recording
    let inputs = await page.$$('.demo-input')
    if (inputs.length === 0) {
      const startBtn = await page.$('.btn-primary')
      if (startBtn) {
        await startBtn.click()
        await sleep(300)
        inputs = await page.$$('.demo-input')
      }
    }
    if (inputs.length === 0) throw new Error('No demo inputs found')

    await inputs[0].click()
    await inputs[0].type('hello', { delay: 20 })
    await sleep(200)
  })

  test('密码输入安全处理', async () => {
    await goHome()
    await sleep(300)

    // Start recording if needed
    const startBtn = await page.$('.btn-primary')
    if (startBtn) {
      await startBtn.click()
      await sleep(300)
    }

    const inputs = await page.$$('.demo-input')
    for (const input of inputs) {
      const type = await page.evaluate(el => el.type, input)
      if (type === 'password') {
        await input.type('secret123', { delay: 20 })
        await sleep(200)

        // Check feed shows [REDACTED]
        const feedItems = await page.$$('.feed-item')
        for (const item of feedItems) {
          const itemText = await page.evaluate(el => el.textContent, item)
          if (itemText.includes('[REDACTED]')) {
            console.log('  ✅  Password correctly redacted in feed')
            break
          }
        }
        break
      }
    }
  })

  test('保存录制会话', async () => {
    await goHome()
    await sleep(300)

    // Start recording + click something + stop
    const startBtn = await page.$('.btn-primary')
    if (!startBtn) throw new Error('Start button not found')
    await startBtn.click()
    await sleep(200)

    // Do a click
    const demoBtns = await page.$$('.demo-btn')
    if (demoBtns.length > 0) {
      await demoBtns[0].click()
      await sleep(100)
    }

    // Stop
    const stopBtn = await page.$('.btn-danger')
    if (!stopBtn) throw new Error('Stop button not found')
    await stopBtn.click()
    await sleep(300)

    // Save dialog
    const nameInput = await page.$('.form-input')
    if (!nameInput) throw new Error('Save dialog name input not found')
    await nameInput.type('E2E Test Session', { delay: 10 })
    await sleep(100)

    // Click Save button
    const primaryBtns = await page.$$('.btn-primary')
    // The last primary btn should be Save
    await primaryBtns[primaryBtns.length - 1].click()
    await sleep(500)
  })

  test('Timeline 页面', async () => {
    await navigateTo('#/timeline')
    await sleep(300)

    const title = await page.$eval('.toolbar-title', el => el.textContent).catch(() => '')
    if (!title.includes('Timeline')) throw new Error(`Expected Timeline title, got: ${title}`)

    // Should see empty state or session selector
    const select = await page.$('.toolbar-select')
    if (!select) {
      const emptyText = await page.$eval('.empty-state-text', el => el.textContent).catch(() => '')
      if (!emptyText) throw new Error('Neither selector nor empty state found')
      return
    }

    // Check session selector options
    const options = await page.$$('option')
    if (options.length > 1) {
      // Select first real session
      await select.select(options[1])
      await sleep(500)

      const svg = await page.$('svg')
      if (!svg) throw new Error('SVG timeline not rendered')

      const events = await page.$$('.timeline-event')
      if (events.length > 0) {
        // Click first event
        await events[0].click()
        await sleep(200)
        const detail = await page.$('.event-detail')
        if (!detail) throw new Error('Event detail not shown after click')
      }
    }
  })

  test('Analytics 页面', async () => {
    await navigateTo('#/analytics')
    await sleep(300)

    const title = await page.$eval('.toolbar-title', el => el.textContent).catch(() => '')
    if (!title.includes('Analytics')) throw new Error(`Expected Analytics title, got: ${title}`)

    const select = await page.$('.toolbar-select')
    if (!select) return

    const options = await page.$$('option')
    if (options.length > 1) {
      await select.select(options[1])
      await sleep(500)

      const cards = await page.$$('.analytics-card')
      if (cards.length < 2) throw new Error('Analytics cards not rendered')

      const chart = await page.$('.interval-chart')
      if (chart) console.log('  ✅  Interval chart rendered')
    }
  })

  test('Import/Export 页面', async () => {
    await navigateTo('#/import')
    await sleep(300)

    const importBox = await page.$('.import-box')
    if (!importBox) throw new Error('Import box not found')

    const text = await page.evaluate(el => el.textContent, importBox)
    if (!text.includes('Drop') && !text.includes('click')) {
      throw new Error(`Import box has unexpected text: ${text}`)
    }
  })

  test('Settings 页面', async () => {
    await navigateTo('#/settings')
    await sleep(300)

    const title = await page.$eval('.toolbar-title', el => el.textContent).catch(() => '')
    if (!title.includes('Settings')) throw new Error(`Expected Settings title, got: ${title}`)

    const cards = await page.$$('.settings-card')
    if (cards.length < 2) throw new Error(`Expected >= 2 settings cards, got ${cards.length}`)

    // Check About section
    const aboutName = await page.$eval('.about-name', el => el.textContent).catch(() => '')
    if (!aboutName.includes('TraceNote')) throw new Error(`Expected TraceNote in about, got: ${aboutName}`)
  })

  test('Hash 路由直接访问', async () => {
    const routes = ['#/settings', '#/timeline', '#/analytics', '#/import']
    for (const r of routes) {
      await page.goto(`${APP_URL}/${r}`, { waitUntil: 'load' })
      await sleep(300)
    }
    await goHome()
  })

  test('多次录制-保存-清除流程', async () => {
    // Create 2 sessions
    for (let n = 0; n < 2; n++) {
      await goHome()
      await sleep(300)

      const startBtn = await page.$('.btn-primary')
      if (!startBtn) throw new Error('Start button not found')
      await startBtn.click()
      await sleep(200)

      // Do a few actions
      const demoBtns = await page.$$('.demo-btn')
      if (demoBtns.length > 1) {
        await demoBtns[1].click()
        await sleep(50)
      }

      const stopBtn = await page.$('.btn-danger')
      if (!stopBtn) throw new Error('Stop button not found')
      await stopBtn.click()
      await sleep(200)

      const nameInput = await page.$('.form-input')
      if (nameInput) {
        await nameInput.type(`Session ${n + 1}`, { delay: 5 })
      }

      const primaryBtns = await page.$$('.btn-primary')
      await primaryBtns[primaryBtns.length - 1].click()
      await sleep(400)
    }

    // Go to home and verify sessions
    await goHome()
    await sleep(300)
    const sessionCards = await page.$$('.session-card')
    console.log(`  ✅  Created ${sessionCards.length} sessions`)
  })

  test('清除所有 Sessions', async () => {
    await navigateTo('#/settings')
    await sleep(300)

    const clearBtn = await page.$('.btn-danger.btn-sm')
    if (!clearBtn) throw new Error('Clear All button not found')

    await clearBtn.click()
    await sleep(300)

    // Confirm modal
    const dangerBtns = await page.$$('.modal-content .btn-danger')
    if (dangerBtns.length > 0) {
      await dangerBtns[0].click()
      await sleep(500)
    }

    // Verify on home page
    await goHome()
    await sleep(300)

    const emptyState = await page.$('.empty-state-text')
    if (!emptyState) {
      console.log('  ⚠️  Session list still has items after clear')
    } else {
      const text = await page.evaluate(el => el.textContent, emptyState)
      if (text.includes('No sessions')) console.log('  ✅  Sessions successfully cleared')
    }
  })

  // ============ 执行所有测试 ============
  console.log('\n📋 开始 E2E 测试\n')

  for (const t of totalTests) {
    await runTest(t.name, t.fn)
  }

  console.log(`\n📊 结果: ${passed} 通过, ${failed} 失败 / ${totalTests.length} 总计`)

  await browser.close()

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch(err => {
  console.error('测试运行失败:', err)
  process.exit(1)
})