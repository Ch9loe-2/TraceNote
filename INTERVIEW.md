# TraceNote — 面试资产

---

## ① 一句话项目介绍

> 纯浏览器端用户操作录制与回放分析工具，将用户操作自动捕获为结构化事件数据，支持时间线查看、操作回放和分析统计。

---

## ② 30 秒项目介绍

TraceNote 是一个纯浏览器端的 Web 用户操作录制与回放分析工具。它通过 DOM 事件监听，将用户的点击、输入、滚动、导航等操作自动捕获为结构化事件数据，并记录事件类型、时间戳、CSS Selector、坐标、操作内容等信息。录制完成后，可以在 Timeline 页面查看 SVG 时间轴可视化，在 Analytics 页面查看操作统计和最长停顿分析，并支持按原始时间间隔回放所有操作。

---

## ③ 1 分钟项目介绍

TraceNote 解决的是一个非常实际的问题：开发者经常需要知道"用户究竟是怎么操作页面的？"传统方式依赖用户口述，效率低且难以准确复现。

**核心技术点：**
- **录制引擎**：监听 8 种 DOM 事件，使用 `performance.now()` 记录高精度时间戳
- **智能 Selector 生成**：5 级优先级策略（id → data-* → class → DOM 路径 → 坐标 fallback），确保回放时能准确定位元素
- **回放引擎**：按事件时间戳顺序执行，保持原始操作间隔；Input 使用 native value setter 解决 React/Vue 受控组件兼容问题
- **保护机制**：密码等敏感字段在录制和回放双阶段 redact
- **持久化**：IndexedDB 保存 Session，数据库连接单例复用

**项目状态**：6 轮 commit 推送到 GitHub，13 项 E2E 测试全部通过，可作为正式简历项目展示。

---

## ④ 5 个最值得讲的技术点

### 1. Selector 生成策略（为什么不能只靠坐标）

```
问题：回放时页面布局可能变化，坐标会失效
方案：5 级优先级
  1. id
  2. data-testid / data-cy 等测试属性
  3. class 组合（检查唯一性）
  4. DOM 层级路径 (nth-of-type)
  5. 坐标 fallback
```

**为什么面试官会追问**：这是回放正确性的核心，展示了"先理解问题本质，再设计解决方案"的思维方式。

### 2. 回放引擎的 abort 死锁修复

```
问题：旧版用 setTimeout + clearTimeout 实现 sleep，
      abort 时 timer 可能已触发但 Promise 未 resolve，导致 UI 永久卡住
方案：改用轮询式 sleep，每 16ms 检查一次 abort 标志
```

**为什么面试官会追问**：这是一个典型的"看起来能用但实际有隐患"的坑，展示了 bug 定位和修复能力。

### 3. Input 合并与受控组件兼容

```
问题 1：用户打字时，每个字符触发一个 input 事件 → 录制大量冗余事件
  解决：合并同一元素的连续 input 事件，只保留最后一次

问题 2：React/Vue 受控组件用 el.value = 'x' 无法触发框架变更检测
  解决：使用 HTMLInputElement.prototype.value 的 native setter
```

### 4. IndexedDB 连接单例

```
问题：每次 CRUD 操作都调用 indexedDB.open() 创建新连接
  解决：缓存 dbPromise，复用同一连接
  收益：减少每次操作的异步等待，数据库操作更稳定
```

### 5. 敏感字段录制+回放双保护

```
录制：检测 type=password / name=password / autocomplete 等属性
      → 替换为 [REDACTED]
回放：input.value === '[REDACTED]' 时跳过，不写入真实值
```

---

## ⑤ 10 个高频面试问题

| # | 问题 | 答案要点 | 代码位置 |
|---|------|---------|---------|
| 1 | 为什么不用记录鼠标坐标？ | 页面布局变化后坐标失效 | selector.js, README |
| 2 | 怎么保证回放的时序准确性？ | `performance.now()` 记录毫秒级时间戳，回放保持原始间隔 | Recorder.js `_getTimestamp()` |
| 3 | 密码怎么处理？ | 录制时检测敏感字段，回放时跳过 | sensitive.js, ReplayEngine.js `_replayInput` |
| 4 | IndexedDB 和 localStorage 选哪个？ | IndexedDB 存储结构化大对象更合适，异步不阻塞主线程 | SessionStore.js |
| 5 | 项目没有后端，瓶颈在哪？ | 所有事件在内存 + IndexedDB，20 万级以上事件可能卡顿 | — |
| 6 | 怎么保证 Selector 回放时能找到元素？ | 5 级优先级 + `document.querySelectorAll` 唯一性检查 | selector.js |
| 7 | Vue 3 怎么用的？ | Composition API, Vue Router hash 模式, 组件化拆分 | views/*.vue, router/index.js |
| 8 | 测试覆盖了哪些场景？ | 13 项 E2E 测试，覆盖录制/回放/分析/导入导出/边界情况 | test-e2e.mjs |
| 9 | 如果用户录制了 1 小时操作会怎样？ | 内存消耗随事件数线性增长，IndexedDB 有存储上限限制 | — |
| 10 | 怎么防止录制过程中内存泄漏？ | onUnmounted 清理定时器和 EventListener | HomeView.vue, Recorder.js _unbindAll |

---

## ⑥ 10 个深挖问题

| # | 问题 | 真实回答 |
|---|------|---------|
| 1 | 如果元素有重复的 id 怎么办？ | `hasUniqueSelector` 会检查 `querySelectorAll` 的结果，如果 id 不唯一会降级到下一级策略 |
| 2 | `performance.now()` 在浏览器最小化时会暂停吗？ | 会，但 timestamp 只用来计算事件间隔，不影响录制正确性 |
| 3 | 如果回放时页面跟录制时完全不一样了怎么办？ | Click/Input 等事件会报 Warning 并跳过，尝试坐标 fallback |
| 4 | 为什么选择 `capture: true` 监听事件？ | capture 阶段能捕获到 stopPropagation 阻止的事件 |
| 5 | pushState/replaceState 的 monkey-patch 会不会影响其他代码？ | stop() 时恢复原始函数，不影响其他组件 |
| 6 | 大量事件时 SVG 时间轴标签会重叠吗？ | 当前实现会叠，需要增加碰撞检测算法优化 |
| 7 | 同一个 session 多次回放会怎样？ | 每次新建 `ReplayEngine` 实例，互不影响 |
| 8 | `_sleepCheck` 的 16ms 间隔怎么选的？ | 约等于 60fps 的一帧，人眼无感知，同时保持 abort 响应性 |
| 9 | 录制时切换页面（SPA 路由跳转）会丢失录制吗？ | 不会，Recorder 持续存在，popstate/pushState 会被记录为 navigation 事件 |
| 10 | 如果用户用 Emoji 输入，`el.value` 能正确记录吗？ | 能，`el.value` 是原始字符串，Emoji 和特殊字符都支持 |

---

## ⑦ 可能暴露项目短板的问题

面试官可能从哪里突破：

1. **"这只是一个 demo 工具，离生产还差什么？"**
   - 缺少录制过滤器（只能全录）
   - 缺少回放暂停/逐帧功能
   - 大数据量性能瓶颈未压测
   - 无法录制 iframe 内操作

2. **"回放时如果页面有网络请求怎么办？"**
   - 当前不支持拦截/等待网络请求
   - 回放 Navigation 时可能页面还没加载完就执行下一个事件

3. **"Selector 策略在动态列表页（如 todo list）会怎样？"**
   - 相同结构的列表项 nth-of-type 能区分，但如果列表项增删会错位
   - 没有使用数据属性或文本内容辅助定位

4. **"为什么不用 Web Worker？"**
   - IndexedDB 在 Worker 中可用，但 DOM 操作必须在主线程
   - 录制阶段不适合 Worker，因为需要实时监听 DOM 事件
   - 分析阶段可优化但当前数据量不大

5. **"横向对比同类工具（如 LogRocket / FullStory）的差距"**
   - 缺少页面截图/录屏
   - 缺少网络请求录制
   - 缺少 console 日志捕获
   - 缺少用户身份关联
   - 但 TraceNote 是完全免费、开箱即用的纯前端方案