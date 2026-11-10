# 动效 (Motion pack) + 视口优化 (Viewport) · `dsh-multimotion`

- GitHub: <https://github.com/steavenawa/dsh-multimotion>
- npm: <https://www.npmjs.com/package/dsh-multimotion>

给 DeepSeek Harness 的 Web 界面加一层「更多动画」，并把控制权交给用户：
三档强度预设、三组效果开关、一个「减少动态效果」总开关，设置页里带实时预览。

同包还带一个 **subpackage**：`dsh-multimotion/viewport`（主视口性能优化，独立插件行
`multimotion-viewport`、独立设置页，可单独开关，不依赖动效包）。

## 主视口优化（subpackage · `multimotion-viewport`）

目标：长会话里主视口的渲染与滚动成本，同时**不破坏宿主的滚动定位**
（高度全部实测，绝不用估算值）。打开 **设置 → 视口优化**：

| 控件 | 作用 |
| --- | --- |
| 总开关 | 独立于动效包；关掉全部动效后它依然生效（也可以只关它） |
| 离屏区域弱加载 | 离屏的对话行先完成一次真实布局、记录实测高度，然后用 `content-visibility: hidden` 停止渲染文字；滚回预加载范围时重新渲染 |
| 离屏预加载距离 | 近 800px / 标准 1600px / 远 2600px —— 离视口多远开始卸载；**也用作「加载更早」的自动预加载距离** |
| 阻止滚动链 | 给 `[data-conversation-scroll]` 加 `overscroll-behavior: contain`，滚到底不再带动背后页面 |
| 智能加载更早 | 长对话滚到接近顶部时**自动点一次「加载更早」**，把旧历史提前取回来；一次只翻一页，加载期间不重复点、翻完还有短暂冷却；**快速上滚时按滚动速度预测到达时间，提前预取** |

**智能加载更早**的细节：

- 目标是宿主自带的「加载更早」按钮（结构性选择 `div[class*="_older"] > button`，
  不依赖语言文案；文案只作兜底），因此不会和宿主的翻页逻辑打架；
- 只在**向上滚 / 向上滚轮**时触发；距离上以「离屏预加载距离」为基准，但**快速上滚
  时会采样滚动速度、预测到达顶部的时间**：约 0.4s 内就会到顶、且离顶部不超过
  6000px 时立刻预取，不等到固定预加载距离才动手；宿主补内容后位置是向下跳的，
  所以不会因为程序性滚动而连环翻页；
- 触发后等宿主把按钮重新 enable（或按钮消失 = 没有更多了），再进入 650ms 冷却
  （高速上滚后缩短为 260ms）；
- 自动加载时按钮外面会挂 `data-dshm-autoloading`，给一个小小的呼吸提示
  （`prefers-reduced-motion` 下不播动画）；
- 关掉开关立即恢复成纯手动点击。

为什么不用 `content-visibility: auto` 的估算占位：宿主的读取位置/锚点/分页都依赖行高，
估算值一错就会"撞墙"（滚动跳、锚点错位）。这里每行占位高度都来自 `getBoundingClientRect()
.height` 的实测值，所以宿主数学始终成立。

**弱加载的尾部保护**：正在流式输出、带运行态或入场动画的行，以及最后 3 行以内的行，
一律保持渲染、不参与离屏卸载——这些行的高度还在变化，留下旧占位会在最新一条消息
下方露出空白。

**宽度变化（拖侧栏 / 右栏开合）的处理**：宽度一变，文字换行和字形整形都会重排，
逐帧测量等于每帧撞墙。运行时因此：

1. `ResizeObserver` 检测到宽度变化 → **冻结弱加载**（跳过 IntersectionObserver 的
   hide/show，不做任何逐帧测量），只给滚动容器打 `data-dshm-resizing` 标记；
2. 宽度稳定 180ms 后启动**增量重排**（不是一次性爆发）：
   - 被卸载的行按**离视口远近排序**，最近的先来；
   - 近处行用**每帧 ≤4ms 时间片**处理（frame budget），远处行只在
     `requestIdleCallback` 的空闲片里补（单片 ≤2ms 剩余，timeout 1.2s 兜底）；
   - 一次测量 = 临时显示该行 → 读 `getBoundingClientRect()` → 用内容盒高度
     （减去 padding/border）重新占位并再次卸载；
   - **任何滚动 / 再次改宽 / 卸载插件都会立刻取消**未完成的增量队列；
3. 占位高度是内容盒高度（`contain-intrinsic-size` 不含 padding/border），所以
   `scrollHeight` 与真实布局一致，不会多出 padding 的误差；
4. 变化期间把文字整形降级：`text-rendering: optimizeSpeed`、关闭 kerning 与连字。

效果：宽度拖动期间不做任何逐帧重排；松手后只花很小的分片预算，就近的行先恢复
精确，远的历史行在空闲时间慢慢补齐——不会出现"一次大的重排爆发"。代价是远处行
的占位高度在重新测量前可能略微过时（只影响滚动条总长，不影响宿主的锚点/分页）。

## 效果清单

### 对话（Conversation）
- 新的聊天行（消息 / 工具调用 / 回合分隔）淡入并轻微上浮，前几行依次错开。
- **点击展开 / 收缩**：过程分组（「执行了命令，修改了文件…」）在 400px 预览与完整
  高度之间平滑过渡，标题下留白同步生长，chevron 图标弹出切换；单条工具调用 /
  文件行展开时淡入下滑、收起时高度平滑收拢。
- 流式输出中的助手正文有极轻的呼吸感，底部有一条流动的品牌色微光。
- 推理摘要前的 shimmer 分隔在运行中呼吸。
- 运行中的工具调用图标呼吸；可展开的工具行 hover 时上浮 1px。
- 用户消息气泡与本地提交回显弹出（缩放入场）。
- 工具行 hover 的位移只走纵向。

### 界面（Interface）
- 全界面按钮按压缩放反馈（按下变小，不会撑宽）。
- 侧栏面板图标入场时依次浮现，hover 时纵向轻抬 1px。
- **侧栏折叠 / 展开**：宿主的主框架宽度变化被改成 280ms 缓动过渡（只改写过渡
  曲线，不做逐帧重排），收起和展开不再瞬切。
- **标签页切换**（插件管理「已安装 / 发现」等 `role="tabpanel"` 页面）：宿主每次
  切换都会卸载旧面板、挂载新面板，新面板按标签栏顺序从左侧或右侧滑入（26px 位移），
  方向由标签位置推断；直接打开页面本身不播动画。
- 输入框获得焦点时出现内嵌的品牌色光环（画在卡片内部，不越界）。
- 其他微交互保持克制：不移动、不放大任何横向尺寸。

### 动态模糊（Motion blur）
- **滚动方向性动态模糊**：滚动速度换算成沿滚动轴的拖影（SVG `feGaussianBlur`
  `stdDeviation="0 N"` —— 纵向方向性模糊，不是 `filter: blur()` 整层虚化），
  柔和 1.2 / 标准 2 / 活泼 3 σ；只作用在滚动中的顶层消息行（不动输入框、不动滚动条），
  停下约 10 帧内衰减回 0 并移除标记，静止时完全不挂 filter。
- **方向拖尾（可选，默认关）**：打开后按滚动方向叠加两层递减残影
  （`feOffset ×2` + `feComponentTransfer` 降透明度 + `feMerge`），向上滚和向下滚
  拖尾方向相反；偏移上限柔和 4 / 标准 7 / 活泼 11px，随速度变化，停下与模糊一起
  衰减到 0。风格更"电影感"（类似残影），嫌花可以在设置里单独关掉。
- 两个开关；系统「减少动态效果」或总开关关闭时不挂载运行时。

### 氛围（Ambience）
- 新会话首页的品牌图标缓慢漂浮。
- 侧栏品牌图标 hover 时纵向轻抬。
- 会话内容挂载时淡入。
- 发送中按钮出现一圈呼吸光环（box-shadow，不参与布局）。

## 设置

打开 **设置 → 动效**：

| 控件 | 作用 |
| --- | --- |
| 总开关 | 一键关闭全部动效，界面恢复出厂状态 |
| 动效强度 | 柔和 / 标准 / 活泼（影响时长、位移幅度、按压深度、发光强度） |
| 对话 / 界面 / 氛围 | 三组效果分别开关 |
| 滚动动态模糊 | 滚动时沿滚动方向产生方向性拖影，停下立即清晰 |
| 方向拖尾 | 可选：按滚动方向加单侧残影（默认关，风格化更强） |
| 减少动态效果 | 强制关闭；系统级 `prefers-reduced-motion` 始终优先 |

设置保存在本窗口的 `localStorage`（键 `dsh.multimotion.settings.v1`（旧版 `dsh.motion.settings.v1` 会自动迁移）），即时生效，不需要重启。
设置页底部有循环播放的预览，可直接观察当前预设的节奏。

## 横向边界

横向位移动效全部保留，但都被限制在「自己的容器」里，不会产生横向滚动条、
也不会把内容顶出侧栏、菜单或输入框：

- **菜单项滑动**：菜单的横向边直接裁掉。注意菜单真正的滚动层不是
  `[role="menu"]` 外壳，而是它内部的 `._viewport_`（`overflow-y: auto` 会把
  `overflow-x` 也算成 auto），所以 `overflow-x: clip` 同时作用在面板、
  viewport 和 `[data-menu-material]` 根上，不会再冒出横向滚动条；
- **会话/工作区行**：行自身 `overflow-x: clip`，只让行内内容滑动，行的背景不动，
  内容滑到行右缘即被裁切，不会伸进侧栏之外；
- **侧栏面板图标**：按钮纵向轻抬，放大的只是按钮内部的 `svg`（1.09×），
  由按钮 padding 吸收，轨道宽度不变；
- **品牌图标**：同样只放大内部 `svg/img`（1.06×）；
- **设置导航**：导航列 `overflow-x: clip`；
- **输入框聚焦光环**：`outline-offset: -1px`，画在卡片内部；
- 其余动效只用纵向 `translate`、`opacity`、`scale ≤ 1`、`box-shadow`。

静态校验会检查：所有 `scale(1.x)` 只出现在 `svg`/`img` 选择器上，且横向滑动规则
都配有对应容器的 `overflow-x: clip`。

## 实现说明

- Host 半边为空（`index.js`），仅提供插件清单条目与显示元数据。
- 浏览器半边（`client.js`，无构建步骤、不 import 任何 Harness Client 包）：
  - 在 `shell.overlay` 注册一个只渲染 `<style>` 的组件，产出全局动效样式表；
  - 在 `settings.section` + `settings.section.icon` 注册设置页与图标；
  - 样式全部以 `html[data-dsh-motion]` 作用域，并包在
    `@media (prefers-reduced-motion: no-preference)` 中；
  - 选择器使用宿主已发布的语义属性：`data-chat-flow-key`、`data-streaming`、
    `data-tool`/`data-state`、`data-message-bubble`、`data-composer-card`、
    `data-slot="…"` 等，避免依赖构建期哈希类名。
- 卸载插件或关闭总开关后，样式元素随组件卸载移除，界面回到原样。

## 展开 / 收缩动画的实现

过程分组正文一直挂载在 DOM 里：收起时被 `max-height: min(400px, 50vh)` 截断，
展开时宿主把上限设为 `none`。插件用：

```css
[data-step-process-body] {
  interpolate-size: allow-keywords;
  transition: max-height var(--dshm-expand) var(--dshm-ease);
}
[data-step-process-body][class*="expandedBody"] {
  max-height: max-content;   /* 与长度可插值，替代 none */
  overflow-y: hidden;        /* 动画期间裁切，静止时高度=内容高度 */
}
```

`interpolate-size: allow-keywords` 让 Chromium 129+ 在长度与 `max-content` 之间
插值，因此展开和收起都是真正的高度动画（已在 Chromium 中逐帧验证
200px ⇄ 802px 平滑过渡）；旧内核会退化为宿主原本的瞬时切换，不会出错。
动画开启时正文被 `overflow-y: hidden` 裁切，静止展开态 `max-height` 等于内容高度，
不会截断内容。

工具行、文件行等使用宿主 Disclosure 原语，展开时内容才挂载，因此插件给内容
加的是「淡入 + 4px 下滑」的入场动画。

**单条调用的收起**由一个小运行时补上（宿主在点击的同一帧卸载内容，CSS 无从
动画）：捕获展开行的点击 → 用 Web Animations API 先把内容高度/外边距在
150–240ms 内收到 0 → 再补发一次点击让 React 真正卸载。运行时只处理
`[data-disclosure-row][aria-expanded="true"]` 的鼠标点击，会跳过行内嵌套控件
（复制按钮、链接），动画期间重复点击会被吞掉，并且所有临时内联样式在结束后
清理；键盘 Enter/Space 仍走宿主的即时收起。关闭「对话」分组或系统开启
「减少动态效果」时，该运行时完全不挂载。

## 安装 / 卸载

- 从 npm 安装：Plugin Manager → 添加插件 → 输入包名 `dsh-multimotion`
  （插入两行：`multimotion`（动效）与 `multimotion-viewport`（视口优化 subpackage））。
- 从源码安装：Plugin Manager → 添加插件 → 选择本目录（`install_bundle` 会以 link 方式接入）。
- 卸载：Plugin Manager 里移除 `dsh-multimotion` 即可；localStorage 里的键可忽略（旧版
  `dsh.motion.settings.v1` 的设置在升级时自动迁移）。

## 已知边界

- 部分效果依赖宿主发布的数据属性；宿主升级若改名，对应动效会静默失效（不会报错）。
- 动画的视觉验收建议以设置页预览为准；插件不接管头像、挂件等第三方插件的 DOM。

