// 动效 (Motion pack) — the package's single browser module.
//
// The app already animates a few things (dialog entrance, toast slide, menu
// open, context-menu pop, shimmer sweeps, the running whale APNG). This module
// adds motion where the shipped UI stays still, driven by the semantic
// `data-*` hooks the shell and the chat view already publish:
//
// - Chat: new flow-row entrance, streaming body breathing + a moving tail
//   shimmer, reasoning separator pulse, running tool icon pulse, tool-row
//   hover nudge, user-bubble pop, local-echo pop, scroll-button lift.
// - Interface: global button press feedback, menu-row / session-row nudge,
//   sidebar panel-icon entrance cascade and hover lift, composer focus ring,
//   settings navigation nudge.
// - Ambience: floating new-session brand mark, brand-mark hover lift,
//   conversation content fade, a soft glow ring on the sending button.
//
// One global stylesheet is rendered into `shell.overlay` (a frame-wide slot),
// scoped under `html[data-dsh-multimotion]` and inside
// `@media (prefers-reduced-motion: no-preference)`. The Settings page tunes
// three presets and four switches; choices live in localStorage (like the
// shipped community plugins here) and apply live through a tiny store.
//
// Plain JS, no build step and no JSX. No Harness Client package is imported;
// React is the platform seed.

window.__ModuleLoader__.load({
  id: 'dsh-multimotion',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace (also the Settings label source). */
    const NS = 'multimotion';

    /** Frame-wide floating layer: always mounted, so it can carry global CSS. */
    const OVERLAY_SLOT = 'shell.overlay';

    /** Settings navigation page + its icon. */
    const SECTION_SLOT = 'settings.section';
    const SECTION_ICON_SLOT = 'settings.section.icon';
    const SECTION_ID = 'multimotion';

    /** Settings page of the `viewport` subpackage. */
    const VIEWPORT_SECTION_ID = 'multimotion-viewport';

    /** localStorage key: one JSON object with every switch and the preset. */
    const STORAGE_KEY = 'dsh.multimotion.settings.v1';

    /** SVG filter ids for the directional scroll motion blur. */
    const MOTION_BLUR_ID = 'dshm-motion-blur';
    const MOTION_BLUR_PRIMITIVE_ID = 'dshm-motion-blur-primitive';
    const MOTION_BLUR_TAIL1_ID = 'dshm-motion-blur-tail1';
    const MOTION_BLUR_TAIL2_ID = 'dshm-motion-blur-tail2';

    /** Effects that follow the platform's own reduce-motion preference. */
    const DEFAULTS = {
      enabled: true,
      intensity: 'standard',
      chat: true,
      ui: true,
      ambient: true,
      reduceMotion: false,
      // Dynamic blur: vertical (scroll-axis) directional motion blur.
      blurScroll: true,
      // Optional one-sided trail that follows the scroll direction.
      blurDirection: false,
      // Subpackage: main-viewport performance (independent of the motion master).
      viewport: true,
      lazyRows: true,
      scrollChain: true,
      smartEarlier: true,
      margin: 'normal',
    };

    /** Preload margin (px) around the viewport: rows farther away stop rendering. */
    const VIEWPORT_MARGINS = { near: 800, normal: 1600, far: 2600 };

    /** Preset knobs: everything below reads these through CSS variables. */
    const LEVELS = {
      subtle: {
        enter: 190,
        rise: 4,
        smRise: 3,
        press: 0.985,
        nudge: 1,
        floatY: 5,
        floatDur: 6,
        hover: 170,
        breathe: 3,
        expand: 260,
        scrollBlur: 1.2,
        trail: 4,
        glow: 'color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)',
      },
      standard: {
        enter: 260,
        rise: 8,
        smRise: 5,
        press: 0.96,
        nudge: 2,
        floatY: 8,
        floatDur: 4.8,
        hover: 150,
        breathe: 2.6,
        expand: 340,
        scrollBlur: 2,
        trail: 7,
        glow: 'color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent)',
      },
      lively: {
        enter: 340,
        rise: 14,
        smRise: 8,
        press: 0.93,
        nudge: 3,
        floatY: 13,
        floatDur: 4,
        hover: 120,
        breathe: 2,
        expand: 420,
        scrollBlur: 3,
        trail: 11,
        glow: 'color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent)',
      },
    };

    // ------------------------------------------------------------ dictionaries

    /** English fallback dictionary. */
    const en = {
      title: 'Motion',
      subtitle: 'Extra animation across the interface: message entrances, a streaming shimmer, tool-card motion, press feedback, and a floating brand mark.',
      master: 'Enable motion effects',
      intensity: 'Intensity',
      'intensity.subtle': 'Subtle',
      'intensity.standard': 'Standard',
      'intensity.lively': 'Lively',
      'group.chat': 'Conversation',
      'group.chat.desc': 'Message entrance, streaming shimmer, running tool pulse, bubble pop, group and tool-row expand/collapse.',
      'group.ui': 'Interface',
      'group.ui.desc': 'Button press feedback, menu and session row nudges, composer focus ring, panel-icon lift.',
      'group.ambient': 'Ambience',
      'group.ambient.desc': 'Floating new-session brand mark, brand-mark hover lift, content fade, sending glow.',
      reduce: 'Reduce motion',
      'reduce.desc': 'Leave the interface exactly as shipped. The system reduce-motion setting is always respected.',
      preview: 'Preview',
      'preview.on': 'Preset applied to this page',
      'preview.off': 'Effects are off',
      'preview.msg': 'A message arrives',
      'preview.tool': 'A tool call is running',
      'preview.btn': 'Press me',
      note: 'Saved in this window (localStorage) and applied live. The system reduce-motion setting always wins.',
      'blur.title': 'Motion blur',
      'blur.scroll': 'Directional motion blur',
      'blur.scroll.desc': 'While the conversation scrolls, rows blur along the scroll axis (a real directional blur through SVG feGaussianBlur, not a uniform defocus); they sharpen the moment you stop.',
      'blur.direction': 'Directional trail',
      'blur.direction.desc': 'Adds one-sided smear behind the motion (stylized echo). Off keeps the physically symmetric 1D blur.',
      'viewport.title': 'Viewport',
      'viewport.subtitle': 'Main-viewport performance: offscreen areas are measured once, then unloaded; text re-renders just in time when you scroll back. Measured heights, never estimates, so scrolling and anchors stay correct.',
      'viewport.master': 'Enable viewport optimization',
      'viewport.lazy': 'Weak-load offscreen rows',
      'viewport.lazy.desc': 'An offscreen row keeps its real measured height as a placeholder and stops rendering; when it comes back near the viewport its text is rendered again.',
      'viewport.margin': 'Offscreen preload distance',
      'viewport.margin.near': 'Near 800px',
      'viewport.margin.normal': 'Normal 1600px',
      'viewport.margin.far': 'Far 2600px',
      'viewport.scrollChain': 'Contain scroll chaining',
      'viewport.scrollChain.desc': 'Scrolling the conversation no longer chains to the page behind it.',
      'viewport.smartEarlier': 'Smart load earlier',
      'viewport.smartEarlier.desc': 'Near the top of the conversation, earlier history loads by itself — one page at a time, never double-clicking. Fast wheel scrolling predicts arrival and preloads earlier than the fixed distance.',
      'viewport.note': 'Independent of the motion pack: it keeps working with motion off. Saved in this window and applied live.',
    };

    /** Chinese dictionary, shown under the default zh locale. */
    const zh = {
      title: '动效',
      subtitle: '给界面添点生气：消息入场、流式微光、工具卡片动效、按压反馈和漂浮品牌图标。',
      master: '启用动效',
      intensity: '动效强度',
      'intensity.subtle': '柔和',
      'intensity.standard': '标准',
      'intensity.lively': '活泼',
      'group.chat': '对话',
      'group.chat.desc': '消息入场、流式微光、运行中工具图标呼吸、气泡弹出、分组与工具行展开/收起。',
      'group.ui': '界面',
      'group.ui.desc': '按钮按压反馈、菜单与会话行微移、输入框聚焦光环、面板图标抬升。',
      'group.ambient': '氛围',
      'group.ambient.desc': '新会话品牌图标漂浮、品牌标悬浮抬升、内容淡入、发送中光环。',
      reduce: '减少动态效果',
      'reduce.desc': '完全保留原界面。系统「减少动态效果」设置始终生效。',
      preview: '预览',
      'preview.on': '当前预设已应用在本页',
      'preview.off': '动效已关闭',
      'preview.msg': '新消息到达',
      'preview.tool': '工具调用运行中',
      'preview.btn': '按一下我',
      note: '设置保存在本窗口（localStorage）并立即生效；系统「减少动态效果」始终优先。',
      'blur.title': '动态模糊',
      'blur.scroll': '滚动方向性动态模糊',
      'blur.scroll.desc': '滚动对话时沿滚动方向产生方向性拖影（SVG feGaussianBlur，不是虚化失焦），停下立刻清晰。',
      'blur.direction': '方向拖尾',
      'blur.direction.desc': '沿滚动方向加单侧拖影（风格化残影）。关闭时保持物理上对称的 1D 动态模糊。',
      'viewport.title': '视口优化',
      'viewport.subtitle': '主视口性能优化：离屏区域先按真实高度占位、再停止渲染；滚回预加载范围时文字重新渲染。高度实测不估算，不破坏滚动与锚点。',
      'viewport.master': '启用主视口优化',
      'viewport.lazy': '离屏区域弱加载',
      'viewport.lazy.desc': '离屏的对话行记录一次真实高度后暂停渲染，占位高度=实测高度；滚回视口附近时再渲染文字。',
      'viewport.margin': '离屏预加载距离',
      'viewport.margin.near': '近 800px',
      'viewport.margin.normal': '标准 1600px',
      'viewport.margin.far': '远 2600px',
      'viewport.scrollChain': '阻止滚动链',
      'viewport.scrollChain.desc': '滚动会话时不再把滚动传递给背后的页面。',
      'viewport.smartEarlier': '智能加载更早',
      'viewport.smartEarlier.desc': '长对话滚到接近顶部时自动加载更早的历史：距离用上面的「离屏预加载距离」，一次一页，不会重复点击。快速上滚时会按滚轮速度预测到达时间，提前预取。',
      'viewport.note': '独立于动效包：关闭全部动效后依然生效。设置保存在本窗口并立即生效。',
    };

    // ---------------------------------------------------------------- storage

    /** Read the saved settings, clamping every field to a known value. */
    function readSettings() {
      const next = { ...DEFAULTS };
      try {
        let raw = window.localStorage.getItem(STORAGE_KEY);
        // Migrate settings saved by the pre-rename dsh-multimotion build.
        if (raw === null) raw = window.localStorage.getItem('dsh.motion.settings.v1');
        if (raw === null) return next;
        const parsed = JSON.parse(raw);
        if (parsed === null || typeof parsed !== 'object') return next;
        if (typeof parsed.enabled === 'boolean') next.enabled = parsed.enabled;
        if (parsed.intensity === 'subtle' || parsed.intensity === 'standard' || parsed.intensity === 'lively') {
          next.intensity = parsed.intensity;
        }
        if (parsed.margin === 'near' || parsed.margin === 'normal' || parsed.margin === 'far') {
          next.margin = parsed.margin;
        }
        for (const key of ['chat', 'ui', 'ambient', 'reduceMotion', 'blurScroll', 'blurDirection', 'viewport', 'lazyRows', 'scrollChain', 'smartEarlier']) {
          if (typeof parsed[key] === 'boolean') next[key] = parsed[key];
        }
      } catch (error) {
        console.warn('[multimotion] could not read saved settings', error);
      }
      return next;
    }

    /** Persist the whole settings object; storage failures degrade to defaults. */
    function writeSettings(settings) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn('[multimotion] could not save settings', error);
      }
    }

    // ------------------------------------------------------------------ store

    /** Current settings; replaced (never mutated) so React sees a new object. */
    let current = readSettings();

    /** Components subscribing through useSyncExternalStore. */
    const listeners = new Set();

    /** @returns the current settings object. */
    function getSettings() {
      return current;
    }

    /** Apply one patch, persist it, and notify every mounted component. */
    function updateSettings(patch) {
      current = { ...current, ...patch };
      writeSettings(current);
      for (const listener of Array.from(listeners)) listener();
    }

    /** Subscribe to settings changes. @returns unsubscribe. */
    function subscribeSettings(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }

    /** Read the live settings inside a component. */
    function useSettings() {
      return React.useSyncExternalStore(subscribeSettings, getSettings, getSettings);
    }

    // -------------------------------------------------------------- stylesheet

    /** Every motion selector is scoped to this root marker. */
    const P = 'html[data-dsh-multimotion] ';

    /** Shared keyframes; names are prefixed so nothing collides with the app. */
    const KEYFRAMES = [
      '@keyframes dshm-rise{from{opacity:0;translate:0 var(--dshm-rise)}to{opacity:1;translate:0 0}}',
      '@keyframes dshm-rise-sm{from{opacity:0;translate:0 var(--dshm-sm-rise)}to{opacity:1;translate:0 0}}',
      '@keyframes dshm-rise-xs{from{opacity:0;translate:0 3px}to{opacity:1;translate:0 0}}',
      '@keyframes dshm-pop{from{opacity:0;scale:.965}to{opacity:1;scale:1}}',
      '@keyframes dshm-breathe{0%,100%{opacity:1}50%{opacity:.62}}',
      '@keyframes dshm-float{0%,100%{translate:0 0}50%{translate:0 calc(-1 * var(--dshm-float))}}',
      '@keyframes dshm-sweep{from{background-position:200% 0}to{background-position:-200% 0}}',
      '@keyframes dshm-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes dshm-glow-pulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 4px var(--dshm-glow)}}',
      '@keyframes dshm-chevron-pop{from{scale:.55;opacity:.25}to{scale:1;opacity:1}}',
      '@keyframes dshm-unfold{from{opacity:0;translate:0 -4px}to{opacity:1;translate:0 0}}',
      '@keyframes dshm-menu-unfold{0%{clip-path:inset(100% 0 0 0)}100%{clip-path:inset(0)}}',
      '@keyframes dshm-menu-content-in{0%{opacity:0;translate:0 8px}100%{opacity:1;translate:none}}',
      '@keyframes dshm-glass-in{0%{backdrop-filter:blur(0px) saturate(100%)}100%{backdrop-filter:blur(20px) saturate(150%)}}',
      '@keyframes dshm-glass-out{0%{opacity:1}100%{opacity:0}}',
      '@keyframes dshm-menu-row-in{0%{opacity:0;translate:0 5px}100%{opacity:1;translate:none}}',
      '@keyframes dshm-menu-out{0%{opacity:1;scale:1;translate:0 0}100%{opacity:.45;scale:.97;translate:0 8px}}',

    ].join('');

    /** Conversation effects: chat rows, streaming text, tool cards, bubbles. */
    const CHAT_RULES = [
      // New chat flow rows rise in. Rows are `[data-chat-flow-key]` wrappers.
      // `backwards` (not `both`) so the finished animation leaves no lingering
      // `translate`, which would otherwise turn every row into a containing block.
      `${P}[data-chat-flow-key]{animation:dshm-rise var(--dshm-enter) var(--dshm-ease) backwards}`,
      `${P}[data-chat-flow-key]:nth-child(2){animation-delay:30ms}`,
      `${P}[data-chat-flow-key]:nth-child(3){animation-delay:60ms}`,
      `${P}[data-chat-flow-key]:nth-child(4){animation-delay:90ms}`,
      `${P}[data-chat-flow-key]:nth-child(5){animation-delay:120ms}`,
      `${P}[data-chat-flow-key]:nth-child(6){animation-delay:150ms}`,
      // Click to expand / collapse the process group ("执行了命令，修改了文件…").
      // The body is always mounted; collapsing caps it at min(400px, 50vh) and
      // expanding uncaps it. `interpolate-size: allow-keywords` lets Chromium
      // interpolate max-height between a length and `max-content`, so both
      // directions get a real height animation; older engines fall back to the
      // shipped instant toggle. `overflow-y: hidden` keeps the growth clipped
      // while the height animates (at rest max-content == content height).
      `${P}[data-step-process-body]{interpolate-size:allow-keywords;transition:max-height var(--dshm-expand) var(--dshm-ease)}`,
      `${P}[data-step-process-body][class*="expandedBody"]{max-height:max-content;overflow-y:hidden}`,
      // The header grows eight pixels of breathing room when expanded; follow
      // it with the same duration instead of snapping.
      `${P}[data-step-process] button[aria-expanded]{transition:padding-bottom var(--dshm-expand) var(--dshm-ease),color .1s ease}`,
      // The header swaps a down/up chevron; pop the fresh glyph in.
      `${P}[data-step-process-chevron] svg{animation:dshm-chevron-pop 220ms var(--dshm-spring)}`,
      // Every other DisclosureRow (tool calls, file rows, …) mounts its content
      // on expand: fade and slide it in. Its chevron rotation keeps the host
      // timing but gets a springier curve.
      `${P}[data-disclosure-header] + *{animation:dshm-unfold var(--dshm-expand) var(--dshm-ease) backwards}`,
      `${P}[data-turn-process] svg{transition:transform var(--dshm-hover) var(--dshm-spring)}`,
      // Streaming assistant body: a gentle breath plus a moving tail shimmer.
      `${P}div[data-streaming]{position:relative;animation:dshm-breathe var(--dshm-breathe) ease-in-out infinite}`,
      `${P}div[data-streaming]::after{content:"";position:absolute;left:0;right:0;bottom:-3px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent 0%,color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent) 50%,transparent 100%);background-size:200% 100%;opacity:.5;animation:dshm-sweep 2.2s linear infinite;pointer-events:none}`,
      // Reasoning shimmer separator while a run is live.
      `${P}[data-shimmer-decoration]{animation:dshm-breathe calc(var(--dshm-breathe) * .7) ease-in-out infinite}`,
      // A running tool call breathes; an expandable tool row lifts a hair on
      // hover. The lift is vertical only: nothing may grow past its column.
      `${P}[data-tool][data-state="running"] svg{animation:dshm-breathe calc(var(--dshm-breathe) * .6) ease-in-out infinite}`,
      `${P}[data-tool][data-expandable]{transition:translate var(--dshm-hover) ease,background-color var(--dshm-hover) ease,color var(--dshm-hover) ease}`,
      `${P}[data-tool][data-expandable]:hover{translate:0 -1px}`,
      // User bubbles (durable and local echo) pop in.
      `${P}[data-message-bubble]{animation:dshm-pop 240ms var(--dshm-ease) backwards}`,
      `${P}[data-submission-echo]{animation:dshm-pop 200ms var(--dshm-ease) backwards}`,
    ].join('');

    /** Interface effects: controls, menus, sidebar rows, composer, settings nav. */
    const UI_RULES = [
      // Global press feedback. The transition list keeps the host's own
      // background/color transitions animated rather than replacing them.
      // The press scales *down*, so it can never widen its box.
      `${P}button:not(:disabled){transition:transform var(--dshm-hover) var(--dshm-spring),background-color var(--dshm-hover) ease,color var(--dshm-hover) ease,border-color var(--dshm-hover) ease,opacity var(--dshm-hover) ease,box-shadow var(--dshm-hover) ease,filter var(--dshm-hover) ease}`,
      `${P}button:not(:disabled):active{transform:scale(var(--dshm-press))}`,
      // Menu rows slide a hair toward the reading direction. Clip the horizontal
      // edge bluntly: the 更多 menu is the primitives Menu portalled to body —
      //   button[aria-haspopup="menu"]
      //     → div[role="menu"][data-menu-material="translucent"]._scrollable_
      //       → div._viewport_ (the real scroller; its overflow-y:auto turns
      //         overflow-x into auto as well, which is where the bar appeared)
      //         → sidebar.panellist.actions slot rows
      // Clipping the surface alone did nothing, and inner slot rows may bring
      // their own scroll containers, so every descendant of a menu is clipped
      // horizontally too. Vertical scrolling is untouched.
      `${P}[role="menu"],${P}[role="menu"] *,${P}[data-menu-material],${P}[data-menu-material] *{overflow-x:clip}`,
      `${P}[role="menuitem"],${P}[role="menuitemcheckbox"],${P}[role="menuitemradio"]{transition:translate 130ms cubic-bezier(.2,.8,.2,1),background-color 130ms ease,color 130ms ease}`,
      `${P}[role="menuitem"]:hover,${P}[role="menuitemcheckbox"]:hover,${P}[role="menuitemradio"]:hover{translate:var(--dshm-nudge) 0}`,
      // Sidebar workspace / session rows: the row clips itself and only its
      // content slides, so the hovered background stays put and nothing leaves
      // the column or adds a horizontal scrollbar.
      `${P}[data-row-key^="session:"],${P}[data-row-key^="workspace:"]{overflow-x:clip}`,
      `${P}[data-row-key^="session:"] > *,${P}[data-row-key^="workspace:"] > *{transition:translate var(--dshm-hover) cubic-bezier(.2,.8,.2,1)}`,
      `${P}[data-row-key^="session:"]:hover > *,${P}[data-row-key^="workspace:"]:hover > *{translate:var(--dshm-nudge) 0}`,
      // Sidebar panel launchers: cascade in, lift a hair vertically, and pop
      // the glyph inside its button; the button's own padding absorbs the
      // scale, so the rail never widens.
      `${P}[data-slot="sidebar.panellist"] > *{animation:dshm-rise-xs 240ms var(--dshm-ease) backwards}`,
      `${P}[data-slot="sidebar.panellist"] > *:nth-child(2){animation-delay:26ms}`,
      `${P}[data-slot="sidebar.panellist"] > *:nth-child(3){animation-delay:52ms}`,
      `${P}[data-slot="sidebar.panellist"] > *:nth-child(4){animation-delay:78ms}`,
      `${P}[data-slot="sidebar.panellist"] > *:nth-child(5){animation-delay:104ms}`,
      `${P}[data-slot="sidebar.panellist"] > *:nth-child(6){animation-delay:130ms}`,
      `${P}[data-slot="sidebar.panellist"] button{transition:translate var(--dshm-hover) ease,background-color var(--dshm-hover) ease,color var(--dshm-hover) ease}`,
      `${P}[data-slot="sidebar.panellist"] button:hover{translate:0 -1px}`,
      `${P}[data-slot="sidebar.panellist"] svg{transition:scale var(--dshm-hover) var(--dshm-spring)}`,
      `${P}[data-slot="sidebar.panellist"] button:hover svg{scale:1.09}`,
      // Composer: a soft brand ring while the editor holds focus. The ring is
      // drawn *inside* the card (negative offset) so it cannot poke out.
      `${P}[data-composer-card]{outline:1px solid transparent;outline-offset:-1px;transition:outline-color 220ms ease}`,
      `${P}[data-composer-card]:focus-within{outline-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 42%,transparent)}`,
      // Settings navigation cells slide inside the nav column, which clips.
      `${P}[data-shortcut-modal="settings"] nav{overflow-x:clip}`,
      `${P}[data-shortcut-modal="settings"] nav > button{transition:translate 140ms cubic-bezier(.2,.8,.2,1),background-color 140ms ease,color 140ms ease}`,
      `${P}[data-shortcut-modal="settings"] nav > button:hover{translate:var(--dshm-nudge) 0}`,
      // Composer command palette / slash suggestions: the host only fades the
      // surface's children, so the popup card itself gets a short lift+scale.
      // `:has([role="listbox"])` scopes this to composer popovers (the command
      // palette card and the slash suggestion menu), leaving plain menus alone.
      `${P}[data-menu-material]{transform-origin:50% 100%}`,
      // Composer popover glass: the host paints the panel from these two
      // variables on the surface; override them so the panel is darker and
      // frosts the chat behind it. Theme-aware base mixed with black, then
      // made translucent (a fixed rgba would fight the light theme).
      `${P}[data-menu-material]:has([role="listbox"]),${P}[data-menu-material]:has(input){--dsw-menu-surface-fill:color-mix(in srgb,color-mix(in srgb,var(--dsw-alias-bg-base,#26282b) 72%,#000) 44%,transparent);--dsw-menu-backdrop-filter:blur(20px) saturate(150%)}`,

      // The panel grows upward from its bottom edge (it is anchored above the
      // composer): a clip reveal keeps the host's geometry untouched and stays
      // transform-free, so the material can still sample the page behind it.
      `${P}[data-menu-material]:has([role="listbox"]),${P}[data-menu-material]:has(input){animation:dshm-menu-unfold 260ms cubic-bezier(.2,.85,.25,1)}`,
      // Content rises while the panel fades; the material (aria-hidden) keeps
      // its transform-free surface so the glass can be sampled the whole time.
      `${P}[data-menu-material]:has([role="listbox"]) > *:not([aria-hidden="true"]),${P}[data-menu-material]:has(input) > *:not([aria-hidden="true"]){animation:dshm-menu-content-in 220ms cubic-bezier(.2,.85,.25,1)}`,
      `${P}[data-menu-material]:has([role="listbox"]) > [aria-hidden="true"],${P}[data-menu-material]:has(input) > [aria-hidden="true"]{animation:dshm-glass-in 240ms cubic-bezier(.2,.8,.2,1) 280ms backwards}`,
      // Out-of-tree glass: a body-level fixed rect glued to the popup. The
      // host tree has a will-change:transform ancestor, so blurring inside it
      // is unreliable; this element's backdrop is the whole page instead.
      `${P}[data-dshm-glass]{position:fixed;pointer-events:none;z-index:8;border-radius:var(--dsw-radius-lg);background:rgba(6,8,12,.34);-webkit-backdrop-filter:blur(20px) saturate(150%);backdrop-filter:blur(20px) saturate(150%);animation:dshm-glass-in 240ms cubic-bezier(.2,.8,.2,1) 140ms backwards}`,
      `${P}[data-dshm-glass][data-dshm-leaving]{animation:dshm-glass-out 160ms ease-in both}`,
      // Sidebar collapse/expand (A/B): only steer the transition curve. No
      // shaping switch and no row containment — toggling those forced an extra
      // full re-shape at the start/end, which read as a stutter of its own.
      'html[data-dsh-multimotion][data-dshm-sideanim] [class*="_frame"]{transition:grid-template-columns 280ms ease!important}',
      `${P}[data-menu-material]:has([role="listbox"])[data-menu-phase="dismiss"],${P}[data-menu-material]:has(input)[data-menu-phase="dismiss"]{animation:dshm-menu-out 110ms cubic-bezier(.4,0,.7,1) both}`,
      // Options fade up one after another instead of landing as one slab.
      `${P}[data-menu-material] [role="option"],${P}[data-menu-material] [role="presentation"]{animation:dshm-menu-row-in 170ms cubic-bezier(.2,.85,.25,1) backwards}`,
      `${P}[data-menu-material] [role="option"]:nth-child(2){animation-delay:16ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(3){animation-delay:32ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(4){animation-delay:48ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(5){animation-delay:64ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(6){animation-delay:80ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(7){animation-delay:96ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(8){animation-delay:112ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(9){animation-delay:128ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(10){animation-delay:144ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(11){animation-delay:160ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(12){animation-delay:176ms}`,
      `${P}[data-menu-material] [role="option"]:nth-child(13){animation-delay:192ms}`,
    ].join('');

    /** Ambience effects: floating marks, content fade, sending glow. */
    const AMBIENT_RULES = [
      // New-session hero brand mark floats gently (vertical only).
      `${P}[data-slot="conversation.hero.brand.mark"] > *{animation:dshm-float var(--dshm-float-dur) ease-in-out infinite}`,
      // Sidebar brand mark pops its glyph on hover. The scale lives on the
      // svg/img inside the mark, whose own padding absorbs it.
      `${P}[data-slot="sidebar.brand.mark"] svg,${P}[data-slot="sidebar.brand.mark"] img{transition:scale 240ms var(--dshm-spring)}`,
      `${P}[data-slot="sidebar.brand.mark"]:hover svg,${P}[data-slot="sidebar.brand.mark"]:hover img{scale:1.06}`,
      // Conversation content fades in when it (re)mounts.
      `${P}[data-conversation-content]{animation:dshm-fade 260ms ease backwards}`,
      // While a message is being sent, the send button gets a breathing ring.
      // A box-shadow never changes layout or the scrollable width.
      `${P}button[data-sending]{animation:dshm-glow-pulse var(--dshm-breathe) ease-in-out infinite}`,
    ].join('');

    /**
     * Scroll-axis motion blur. The runtime below drives an SVG
     * `feGaussianBlur` with `stdDeviation="0 N"` — a real directional blur
     * along the scroll axis, not a uniform `filter: blur()` defocus — and only
     * tags the scroller while it is moving, so rows carry the filter reference
     * for the duration of a scroll and keep none at rest.
     */
    const SCROLL_BLUR_RULES = [
      `${P}[data-conversation-scroll][data-dshm-blur] [data-chat-flow-key]:not([data-step-process-content] [data-chat-flow-key]){filter:url(#${MOTION_BLUR_ID})}`,
    ].join('');

    /** @returns the CSS variable block for one intensity level. */
    function rootVars(level) {
      return (
        `${P}{` +
        `--dshm-enter:${level.enter}ms;` +
        `--dshm-rise:${level.rise}px;` +
        `--dshm-sm-rise:${level.smRise}px;` +
        `--dshm-press:${level.press};` +
        `--dshm-nudge:${level.nudge}px;` +
        `--dshm-float:${level.floatY}px;` +
        `--dshm-float-dur:${level.floatDur}s;` +
        `--dshm-hover:${level.hover}ms;` +
        `--dshm-breathe:${level.breathe}s;` +
        `--dshm-expand:${level.expand}ms;` +
        '--dshm-ease:cubic-bezier(.2,.8,.2,1);' +
        '--dshm-spring:cubic-bezier(.34,1.56,.64,1);' +
        `--dshm-glow:${level.glow};` +
        '}'
      );
    }

    /**
     * Main-viewport performance rules (subpackage `dsh-multimotion/viewport`).
     * Offscreen rows are handled by the runtime below: each row is rendered
     * once for its real height, then unloaded with `content-visibility: hidden`
     * plus that measured height; nothing here estimates a row height, so the
     * host's scroll anchors and turn paging stay exact.
     * @param settings - live settings.
     * @returns CSS text (deliberately outside the reduce-motion gate: this is
     * performance, not animation).
     */
    function viewportRules(settings) {
      const parts = [];
      if (settings.lazyRows) {
        // While the width moves, skip kerning/ligatures: shaping is the hot
        // spot when CJK text reflows on every width step.
        parts.push(`${P}[data-conversation-scroll][data-dshm-resizing]{text-rendering:optimizeSpeed;font-kerning:none;font-variant-ligatures:none}`);
      }
      if (settings.scrollChain) {
        parts.push(`${P}[data-conversation-scroll]{overscroll-behavior:contain}`);
      }
      if (settings.smartEarlier) {
        parts.push(`@media (prefers-reduced-motion: no-preference){${P}[data-dshm-autoloading] button{animation:dshm-autoload-pulse 1.1s ease-in-out infinite}@keyframes dshm-autoload-pulse{0%,100%{opacity:1}50%{opacity:.55}}}`);
      }
      return parts.join('');
    }

    /**
     * Safe offscreen weak-loading: render a row first (real layout), keep its
     * *measured* height as the placeholder, then stop rendering its contents
     * with `content-visibility: hidden`; when the row returns within the
     * preload margin it re-renders (the text comes back just in time). Because
     * every placeholder height is measured, the chat scroller's own math
     * (anchors, turn paging, scroll follow) stays valid.
     * @param marginKey - preload margin preset: near / normal / far.
     * @returns cleanup that restores every unloaded row.
     */
    function installViewportLazy(marginKey) {
      const margin = VIEWPORT_MARGINS[marginKey] ?? VIEWPORT_MARGINS.normal;
      const observed = new Set();
      let scroller = null;
      let observer = null;
      let mutations = null;
      let widthObserver = null;
      let retry = 0;
      let collectFrame = 0;
      let nearFrame = 0;
      let idleHandle = 0;
      let settleTimer = 0;
      let lastWidth = null;
      let suspended = false;
      /** Hidden rows waiting for an exact re-measure after a width change. */
      let pending = [];
      let pendingIndex = 0;

      /**
       * @param row - flow row.
       * @returns true when the row belongs to the live tail (last few rows) and
       * must stay rendered: a streaming row keeps changing height, and a stale
       * placeholder there leaves a blank gap under the last message.
       */
      function isLiveTail(row) {
        if (row.getAnimations().length > 0) return true;
        if (row.querySelector('[data-streaming], [data-state="running"], [data-chat-motion]') !== null) return true;
        let tail = 0;
        let sibling = row.nextElementSibling;
        while (sibling !== null && tail < 3) {
          if (sibling.matches('[data-chat-flow-key]')) tail += 1;
          sibling = sibling.nextElementSibling;
        }
        return tail < 3;
      }

      /** @param row - a flow row to unload while keeping its measured height. */
      function hide(row) {
        if (suspended) return;
        if (row.getAttribute('data-dshm-lazy') === '') return;
        if (row.contains(document.activeElement)) return;
        if (row.hasAttribute('data-chat-motion')) return;
        if (isLiveTail(row)) return;
        const height = row.getBoundingClientRect().height;
        if (height <= 0) return;
        row.style.containIntrinsicSize = `${intrinsicSize(row, height)}px`;
        row.style.contentVisibility = 'hidden';
        row.setAttribute('data-dshm-lazy', '');
      }

      /** @param row - a row that is back within the preload margin. */
      function show(row) {
        if (row.getAttribute('data-dshm-lazy') !== '') return;
        row.style.contentVisibility = '';
        row.style.containIntrinsicSize = '';
        row.removeAttribute('data-dshm-lazy');
      }

      /** Vertical padding+border that a border-box height includes but contain-intrinsic-size does not. */
      const paddingCache = new WeakMap();
      /**
       * @param row - target row.
       * @param height - measured border-box height.
       * @returns content-box height to use as the intrinsic placeholder size.
       */
      function intrinsicSize(row, height) {
        let extra = paddingCache.get(row);
        if (extra === undefined) {
          const style = getComputedStyle(row);
          extra =
            (parseFloat(style.paddingTop) || 0) +
            (parseFloat(style.paddingBottom) || 0) +
            (parseFloat(style.borderTopWidth) || 0) +
            (parseFloat(style.borderBottomWidth) || 0);
          paddingCache.set(row, extra);
        }
        return Math.max(0, Math.round(height - extra));
      }

      /** Observe every mounted flow row (and prune detached ones). */
      function collect() {
        collectFrame = 0;
        if (scroller === null || observer === null || suspended) return;
        for (const row of Array.from(observed)) {
          if (!row.isConnected) {
            observer.unobserve(row);
            observed.delete(row);
          }
        }
        for (const row of scroller.querySelectorAll('[data-chat-flow-key]')) {
          if (!(row instanceof HTMLElement) || observed.has(row)) continue;
          observed.add(row);
          observer.observe(row);
        }
      }

      /** Debounce a collect pass onto the next frame. */
      const scheduleCollect = () => {
        if (collectFrame !== 0) return;
        collectFrame = requestAnimationFrame(collect);
      };

      /** Stop any incremental re-measure work (new resize, scroll, teardown). */
      function cancelResync() {
        pending = [];
        pendingIndex = 0;
        if (nearFrame !== 0) {
          cancelAnimationFrame(nearFrame);
          nearFrame = 0;
        }
        if (idleHandle !== 0) {
          if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
          else window.clearTimeout(idleHandle);
          idleHandle = 0;
        }
      }

      /** Queue hidden rows by distance to the viewport, nearest first. */
      function queueResync() {
        if (scroller === null) return;
        const rect = scroller.getBoundingClientRect();
        const center = (rect.top + rect.bottom) / 2;
        pending = [];
        for (const row of observed) {
          if (!(row instanceof HTMLElement) || !row.isConnected) continue;
          if (row.getAttribute('data-dshm-lazy') !== '') continue;
          const rowRect = row.getBoundingClientRect();
          pending.push({ row, distance: Math.abs((rowRect.top + rowRect.bottom) / 2 - center) });
        }
        pending.sort((a, b) => a.distance - b.distance);
        pendingIndex = 0;
      }

      /** Re-measure one hidden row at the current width, then unload it again. */
      function measureRow(row) {
        if (!(row instanceof HTMLElement) || !row.isConnected) return;
        if (row.getAttribute('data-dshm-lazy') !== '') return;
        row.style.contentVisibility = '';
        row.style.containIntrinsicSize = '';
        row.removeAttribute('data-dshm-lazy');
        const height = row.getBoundingClientRect().height;
        if (height <= 0) return;
        row.style.containIntrinsicSize = `${intrinsicSize(row, height)}px`;
        row.style.contentVisibility = 'hidden';
        row.setAttribute('data-dshm-lazy', '');
      }

      /** Spend at most a few milliseconds per frame on the nearest rows. */
      function pumpNear() {
        nearFrame = 0;
        if (scroller === null) return;
        const rect = scroller.getBoundingClientRect();
        const nearLimit = rect.height * 3 + margin;
        const started = performance.now();
        while (pendingIndex < pending.length && performance.now() - started < 4) {
          const item = pending[pendingIndex];
          if (item.distance > nearLimit) break;
          pendingIndex += 1;
          measureRow(item.row);
        }
        if (pendingIndex >= pending.length) return;
        if (pending[pendingIndex].distance <= nearLimit) {
          nearFrame = requestAnimationFrame(pumpNear);
          return;
        }
        scheduleIdle();
      }

      /** Continue with rows far away only while the page is idle. */
      function pumpIdle(deadline) {
        idleHandle = 0;
        if (scroller === null || suspended) return;
        while (pendingIndex < pending.length && deadline.timeRemaining() > 2) {
          const item = pending[pendingIndex];
          pendingIndex += 1;
          measureRow(item.row);
        }
        if (pendingIndex < pending.length) scheduleIdle();
      }

      /** Schedule an idle slice, with a budget timeout so it cannot starve. */
      function scheduleIdle() {
        if (idleHandle !== 0) return;
        const run = (deadline) => {
          idleHandle = 0;
          pumpIdle(deadline);
        };
        if (typeof window.requestIdleCallback === 'function') {
          idleHandle = window.requestIdleCallback(run, { timeout: 1200 });
        } else {
          idleHandle = window.setTimeout(() => run({ timeRemaining: () => 3 }), 80);
        }
      }

      /** Start the incremental post-resize pass (never a single burst). */
      function resync() {
        cancelResync();
        queueResync();
        pumpNear();
      }

      /** Suspend unload/reload while the width moves, then re-sync incrementally. */
      function onWidthChange(entries) {
        const entry = entries[0];
        const width = entry === undefined ? null : Math.round(entry.contentRect.width);
        if (width === null) return;
        if (lastWidth === null) {
          lastWidth = width;
          return;
        }
        if (Math.abs(width - lastWidth) < 1) return;
        lastWidth = width;
        suspended = true;
        cancelResync();
        if (scroller !== null) scroller.setAttribute('data-dshm-resizing', '');
        if (settleTimer !== 0) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          settleTimer = 0;
          suspended = false;
          if (scroller !== null) scroller.removeAttribute('data-dshm-resizing');
          scheduleCollect();
          resync();
        }, 180);
      }

      /** Find the conversation scroller once it mounts, then observe rows. */
      function setup() {
        scroller = document.querySelector('[data-conversation-scroll]');
        if (scroller === null) {
          retry = window.setTimeout(setup, 400);
          return;
        }
        observer = new IntersectionObserver((entries) => {
          if (suspended) return;
          for (const entry of entries) {
            const row = entry.target;
            if (!(row instanceof HTMLElement)) continue;
            if (entry.isIntersecting) show(row);
            else hide(row);
          }
        }, { root: scroller, rootMargin: `${margin}px 0px ${margin}px 0px`, threshold: 0 });
        mutations = new MutationObserver(scheduleCollect);
        mutations.observe(scroller, { childList: true, subtree: true });
        if (typeof ResizeObserver === 'function') {
          widthObserver = new ResizeObserver(onWidthChange);
          widthObserver.observe(scroller);
        }
        scroller.addEventListener('scroll', cancelResync, { passive: true });
        collect();
      }

      setup();
      return () => {
        if (retry !== 0) window.clearTimeout(retry);
        if (collectFrame !== 0) cancelAnimationFrame(collectFrame);
        if (settleTimer !== 0) window.clearTimeout(settleTimer);
        cancelResync();
        if (mutations !== null) mutations.disconnect();
        if (observer !== null) observer.disconnect();
        if (widthObserver !== null) widthObserver.disconnect();
        if (scroller !== null) {
          scroller.removeEventListener('scroll', cancelResync);
          scroller.removeAttribute('data-dshm-resizing');
        }
        for (const row of observed) {
          if (!(row instanceof HTMLElement)) continue;
          row.style.contentVisibility = '';
          row.style.containIntrinsicSize = '';
          row.removeAttribute('data-dshm-lazy');
        }
        observed.clear();
        scroller = null;
      };
    }


    /**
     * Smart "load earlier": when the reader scrolls up near the top of a long
     * conversation, click the shipped load-earlier button before they reach it.
     * The button is found structurally (`div[class*="_older"] > button`) so it
     * survives localization; known labels are only a fallback. One page at a
     * time: the runtime waits until the host re-enables the button, then adds a
     * short cooldown so a single scroll gesture cannot chain several pages.
     * @param marginKey - prefetch distance preset (reuses the viewport margins).
     * @returns cleanup that removes listeners, timers and the pulse marker.
     */
    function installSmartEarlier(marginKey) {
      const margin = VIEWPORT_MARGINS[marginKey] ?? VIEWPORT_MARGINS.normal;
      const LABELS = ['加载更早', '载入更早', '加载更多', 'Load earlier', 'Load older', 'Load more'];
      let scroller = null;
      let retry = 0;
      let frame = 0;
      let watchTimer = 0;
      let watchTimeout = 0;
      let releaseTimer = 0;
      let loading = false;
      let cooldownUntil = 0;
      let lastTop = null;
      /** Recent scroll samples for wheel-speed prediction: { t, top }. */
      const samples = [];
      let recentVelocity = 0;
      let activeWrapper = null;

      /**
       * @param top - current scrollTop.
       * @returns smoothed upward velocity in px/s (0 when not moving up).
       */
      function sampleVelocity(top) {
        const now = performance.now();
        samples.push({ t: now, top });
        while (samples.length > 8) samples.shift();
        while (samples.length > 2 && now - samples[0].t > 140) samples.shift();
        if (samples.length < 2) return 0;
        const first = samples[0];
        const last = samples[samples.length - 1];
        const elapsed = last.t - first.t;
        if (elapsed <= 0) return 0;
        recentVelocity = Math.max(0, ((first.top - last.top) / elapsed) * 1000);
        return recentVelocity;
      }

      /**
       * @param top - current scrollTop.
       * @returns predicted milliseconds until the reader reaches the top/edge.
       */
      function predictArrival(top) {
        if (recentVelocity <= 60) return Number.POSITIVE_INFINITY;
        return (top / recentVelocity) * 1000;
      }

      /** @returns the shipped load-earlier button, if the conversation has more. */
      function findButton() {
        if (scroller === null) return null;
        const direct = scroller.querySelector('div[class*="_older"] > button');
        if (direct instanceof HTMLButtonElement) return direct;
        for (const button of scroller.querySelectorAll('button')) {
          if (!(button instanceof HTMLButtonElement)) continue;
          const label = (button.textContent ?? '').trim();
          if (LABELS.includes(label)) return button;
        }
        return null;
      }

      /** @param button - the button whose wrapper should pulse while loading. */
      function markLoading(button) {
        const holder = button.parentElement;
        if (holder === null) return;
        holder.setAttribute('data-dshm-autoloading', '');
        activeWrapper = holder;
      }

      /** Remove the pulse marker from whichever wrapper carried it. */
      function clearMark() {
        if (activeWrapper !== null) activeWrapper.removeAttribute('data-dshm-autoloading');
        activeWrapper = null;
      }

      /** Stop polling the host button state. */
      function clearWatch() {
        if (watchTimer !== 0) {
          window.clearInterval(watchTimer);
          watchTimer = 0;
        }
        if (watchTimeout !== 0) {
          window.clearTimeout(watchTimeout);
          watchTimeout = 0;
        }
      }

      /** Release the guard after a host page finished (or a timeout). */
      function finish(delay) {
        clearWatch();
        if (releaseTimer !== 0) window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(() => {
          releaseTimer = 0;
          loading = false;
          cooldownUntil = performance.now() + (recentVelocity > 1800 ? 260 : 650);
          clearMark();
        }, delay);
      }

      /** Wait until the host re-enables the button, then release the guard. */
      function watch(button) {
        clearWatch();
        loading = true;
        markLoading(button);
        watchTimer = window.setInterval(() => {
          if (scroller === null) {
            clearWatch();
            return;
          }
          const next = findButton();
          if (next === null) {
            // No more history: release and stop trying until it appears again.
            finish(150);
            return;
          }
          if (!next.disabled) finish(120);
        }, 140);
        watchTimeout = window.setTimeout(() => finish(0), 8000);
      }

      /**
       * Try one automatic page load.
       * @param urgent - true when the speed prediction says the reader arrives
       * within the look-ahead window; the fixed margin may still be far.
       */
      function attempt(urgent) {
        if (scroller === null || loading) return;
        if (performance.now() < cooldownUntil) return;
        const deadline = urgent === true ? 6000 : margin;
        if (scroller.scrollTop > deadline) return;
        const button = findButton();
        if (button === null) return;
        if (button.disabled) {
          // The host is already loading a page (e.g. the user clicked it).
          loading = true;
          markLoading(button);
          finish(700);
          return;
        }
        try {
          button.click();
        } catch (error) {
          loading = false;
          clearMark();
          return;
        }
        watch(button);
      }

      /** @param event - a wheel inside the conversation scroller: upward is negative. */
      function onWheel(event) {
        if (scroller === null || event.deltaY >= 0) return;
        if (frame !== 0) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (scroller === null) return;
          const current = scroller.scrollTop;
          const predicted = predictArrival(current);
          const urgent = predicted <= 420 && current <= 6000;
          if (current > margin && !urgent) return;
          attempt(urgent);
        });
      }

      /** @param event - a scroll inside the conversation scroller. */
      function onScroll() {
        if (scroller === null) return;
        const top = scroller.scrollTop;
        const delta = lastTop === null ? 0 : top - lastTop;
        lastTop = top;
        const velocity = sampleVelocity(top);
        // Only a genuine upward gesture may prefetch: programmatic re-anchoring
        // after a page load moves the content the other way.
        if (delta > -1) return;
        if (frame !== 0) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (scroller === null) return;
          const current = scroller.scrollTop;
          // Wheel-speed prediction: a fast upward gesture prefetches before the
          // fixed margin, so the page is ready when the reader reaches the edge.
          const predicted = velocity > 60 ? (current / velocity) * 1000 : Number.POSITIVE_INFINITY;
          const urgent = predicted <= 420 && current <= 6000;
          if (current > margin && !urgent) return;
          attempt(urgent);
        });
      }

      /** Find the conversation scroller once it mounts. */
      function setup() {
        scroller = document.querySelector('[data-conversation-scroll]');
        if (scroller === null) {
          retry = window.setTimeout(setup, 400);
          return;
        }
        scroller.addEventListener('scroll', onScroll, { passive: true });
        scroller.addEventListener('wheel', onWheel, { passive: true });
      }

      setup();
      return () => {
        if (retry !== 0) window.clearTimeout(retry);
        if (frame !== 0) cancelAnimationFrame(frame);
        if (releaseTimer !== 0) window.clearTimeout(releaseTimer);
        clearWatch();
        clearMark();
        if (scroller !== null) {
          scroller.removeEventListener('scroll', onScroll);
          scroller.removeEventListener('wheel', onWheel);
        }
        scroller = null;
      };
    }


    /**
     * Out-of-tree glass for composer popovers. The popup lives under a
     * will-change:transform ancestor, which can break backdrop-filter; instead
     * a body-level fixed rectangle tracks the popup's rect and blurs the page
     * behind it (z-index below the composer stack, above the chat). It fades in
     * and out on its own and is purely decorative (pointer-events: none).
     * @returns cleanup that removes listeners, rAF loops and glass nodes.
     */
    function installPopoverGlass() {
      const SURFACE = '[data-menu-material]:has([role="listbox"]), [data-menu-material]:has(input)';
      /** @type {Map<HTMLElement, HTMLElement>} surface -> glass rect */
      const glasses = new Map();
      let refreshFrame = 0;
      let trackFrame = 0;

      /** @param surface - popup surface element. @returns a fresh glass node. */
      function createGlass(surface) {
        const glass = document.createElement('div');
        glass.setAttribute('data-dshm-glass', '');
        const radius = getComputedStyle(surface).borderRadius;
        if (radius !== '') glass.style.borderRadius = radius;
        document.body.appendChild(glass);
        sync(surface, glass);
        glasses.set(surface, glass);
        return glass;
      }

      /** @param surface - popup surface. @param glass - its glass node. */
      function sync(surface, glass) {
        const rect = surface.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          glass.style.display = 'none';
          return;
        }
        glass.style.display = '';
        glass.style.left = `${Math.round(rect.left)}px`;
        glass.style.top = `${Math.round(rect.top)}px`;
        glass.style.width = `${Math.round(rect.width)}px`;
        glass.style.height = `${Math.round(rect.height)}px`;
      }

      /** @param glass - glass node to fade out and drop. */
      function leave(glass) {
        if (!glass.isConnected || glass.hasAttribute('data-dshm-leaving')) return;
        glass.setAttribute('data-dshm-leaving', '');
        window.setTimeout(() => {
          glass.remove();
        }, 190);
      }

      /** Keep the glass glued while it moves; reap it when its surface closes. */
      function track() {
        trackFrame = 0;
        for (const [surface, glass] of Array.from(glasses)) {
          if (!surface.isConnected) {
            glasses.delete(surface);
            leave(glass);
            continue;
          }
          sync(surface, glass);
        }
        if (glasses.size > 0) trackFrame = requestAnimationFrame(track);
      }

      /** Sync the set of glass nodes with the open popup surfaces. */
      function refresh() {
        refreshFrame = 0;
        for (const [surface, glass] of Array.from(glasses)) {
          if (!surface.isConnected) {
            glasses.delete(surface);
            leave(glass);
          }
        }
        for (const surface of document.querySelectorAll(SURFACE)) {
          if (!(surface instanceof HTMLElement) || glasses.has(surface)) continue;
          createGlass(surface);
        }
        if (glasses.size > 0 && trackFrame === 0) trackFrame = requestAnimationFrame(track);
      }

      const schedule = () => {
        if (refreshFrame !== 0) return;
        refreshFrame = requestAnimationFrame(refresh);
      };

      for (const type of ['pointerdown', 'keydown', 'focusin', 'scroll']) {
        document.addEventListener(type, schedule, true);
      }
      window.addEventListener('resize', schedule);
      refresh();
      return () => {
        if (refreshFrame !== 0) cancelAnimationFrame(refreshFrame);
        if (trackFrame !== 0) cancelAnimationFrame(trackFrame);
        for (const type of ['pointerdown', 'keydown', 'focusin', 'scroll']) {
          document.removeEventListener(type, schedule, true);
        }
        window.removeEventListener('resize', schedule);
        for (const glass of glasses.values()) glass.remove();
        glasses.clear();
      };
    }

    /**
     * Horizontal slide for role=tabpanel mounts (plugin manager 已安装 / 发现,
     * and other tabbed pages). The host unmounts the old panel and mounts a
     * fresh one per tab, so the new panel slides in from the side: a later tab
     * enters from the right, an earlier tab from the left. Direction is inferred
     * from the tablist order and remembered per tablist.
     * @returns cleanup that disconnects the observer.
     */
    function installTabPanelSlide() {
      const PANEL = '[role="tabpanel"]';
      const DURATION = 240;
      const DISTANCE = 26;
      const lastIndex = new WeakMap();

      /** @param panel - tabpanel element. @returns list/index info or null. */
      function tabInfo(panel) {
        const labelId = panel.getAttribute('aria-labelledby');
        if (labelId === null) return null;
        const tab = document.getElementById(labelId);
        if (!(tab instanceof HTMLElement)) return null;
        const list = tab.parentElement;
        if (list === null) return null;
        const tabs = Array.from(list.children).filter((child) => child.getAttribute('role') === 'tab');
        const index = tabs.indexOf(tab);
        if (index < 0) return null;
        return { list, index };
      }

      /** @param panel - freshly mounted tabpanel to slide in. */
      function slide(panel) {
        if (!(panel instanceof HTMLElement) || panel.getAnimations().length > 0) return;
        const info = tabInfo(panel);
        if (info === null) return;
        const previous = lastIndex.get(info.list);
        lastIndex.set(info.list, info.index);
        if (previous === undefined || previous === info.index) return;
        const direction = info.index > previous ? 1 : -1;
        panel.animate([
          { opacity: 0.001, transform: `translateX(${direction * DISTANCE}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches(PANEL)) slide(node);
            for (const panel of node.querySelectorAll(PANEL)) slide(panel);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      // Seed existing panels so opening the page itself does not animate.
      for (const panel of document.querySelectorAll(PANEL)) {
        const info = tabInfo(panel);
        if (info !== null && !lastIndex.has(info.list)) lastIndex.set(info.list, info.index);
      }
      return () => observer.disconnect();
    }

    /**
     * External hook for the left/right sidebar collapse buttons. The host
     * animates grid-template-columns, which reflows the chat every frame. This
     * sets a short-lived root attribute around the toggle click so the
     * stylesheet can steer that transition (280ms curve) instead of letting it
     * snap — the real reflow is kept, only its timing is overridden.
     * @returns cleanup that removes the capture listener.
     */
    function installSidebarReflowAnimation() {
      const TOGGLE = '[data-sidebar-toggle], [data-sidebar-opener], [data-sidebar-mask], [data-sidebar-right-expand], [data-sidebar-right-toggle]';
      const ROOT_ATTR = 'data-dshm-sideanim';
      const DURATION = 280;
      let bypass = false;
      let cleanupTimer = 0;

      /** @param target - click target. @returns true for a host toggle. */
      function isToggle(target) {
        if (!(target instanceof Element)) return false;
        return target.closest(TOGGLE) !== null;
      }

      /** Replay the toggle's click; .click() would be suppressed re-entrantly. */
      function press(toggle) {
        toggle.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: 1,
        }));
      }

      /** Drop the fast-path attribute once the animation is over. */
      function finish() {
        if (cleanupTimer !== 0) {
          window.clearTimeout(cleanupTimer);
          cleanupTimer = 0;
        }
        document.documentElement.removeAttribute(ROOT_ATTR);
      }

      /** @param event - capture-phase click. */
      function onClick(event) {
        if (bypass) return;
        if (!(event.target instanceof Element) || !isToggle(event.target)) return;
        const toggle = event.target.closest(TOGGLE);
        if (!(toggle instanceof HTMLElement)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        document.documentElement.setAttribute(ROOT_ATTR, '');
        bypass = true;
        try {
          press(toggle);
        } finally {
          bypass = false;
        }
        cleanupTimer = window.setTimeout(finish, DURATION + 120);
      }

      document.addEventListener('click', onClick, true);
      return () => {
        document.removeEventListener('click', onClick, true);
        finish();
      };
    }

    /**
     * Build the global stylesheet for one settings object.
     * @param settings - the live settings object.
     * @returns CSS text, or "" when every effect is off.
     */
    function buildCss(settings) {
      const parts = [];
      // The viewport subpackage keeps working with motion turned off.
      if (settings.viewport) {
        const viewport = viewportRules(settings);
        if (viewport !== '') parts.push(viewport);
      }
      if (settings.enabled && !settings.reduceMotion) {
        const level = LEVELS[settings.intensity] || LEVELS.standard;
        parts.push('@media (prefers-reduced-motion: no-preference){', rootVars(level), KEYFRAMES);
        if (settings.chat) parts.push(CHAT_RULES);
        if (settings.ui) parts.push(UI_RULES);
        if (settings.ambient) parts.push(AMBIENT_RULES);
        if (settings.blurScroll) parts.push(SCROLL_BLUR_RULES);
        parts.push('}');
      }
      return parts.join('\n');
    }

    // ------------------------------------------------------- collapse runtime

    /** Collapse duration per preset: short enough to stay snappy. */
    const COLLAPSE_MS = { subtle: 150, standard: 190, lively: 240 };

    /** Whether the platform asks for reduced motion right now. */
    function prefersReducedMotion() {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (error) {
        return false;
      }
    }

    /**
     * Animate a tool-row style disclosure *closing*. The host renders the
     * expanded content conditionally, so collapsing unmounts it in the same
     * click — there is no element left for CSS to animate. This runtime defers
     * the host's click by one short WAAPI shrink, then replays the click so
     * React performs the real collapse. Expanded content already gets the
     * `dshm-unfold` entrance from the stylesheet.
     *
     * Only mouse/touch clicks are deferred; keyboard activation collapses
     * instantly (the host handles Enter/Space through keydown).
     * @param intensity - the active preset, for the duration.
     * @returns cleanup that removes the listener and restores any transient DOM.
     */
    function installCollapseAnimation(intensity) {
      const duration = COLLAPSE_MS[intensity] ?? COLLAPSE_MS.standard;
      /** True while a deferred collapse is running: drop further toggles. */
      let busy = false;
      /** True while the replay click is in flight, so it is not intercepted. */
      let replaying = false;
      /** Transient inline state of the content being animated. */
      let pending = null;

      /** Drop the WAAPI animation and its inline styles, if any. */
      function clearPending() {
        if (pending === null) return;
        const { animation, content } = pending;
        pending = null;
        animation.cancel();
        content.style.overflow = '';
        content.style.willChange = '';
        content.style.height = '';
      }

      /** @param event - a document-level click in the capture phase. */
      function onClick(event) {
        if (replaying) return;
        if (event.defaultPrevented || event.button !== 0) return;
        const target = event.target;
        if (!(target instanceof Element)) return;

        // Only rows that are open and were clicked on themselves; nested
        // controls (copy buttons, links) keep their own behaviour.
        const row = target.closest('[data-disclosure-row][aria-expanded="true"]');
        if (row === null) return;
        const inner = target.closest('button,a,input,textarea,select,[contenteditable="true"]');
        if (inner !== null && inner !== row) return;

        if (busy) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        const header = row.closest('[data-disclosure-header]');
        const root = header === null ? null : header.parentElement;
        const content = header === null ? null : header.nextElementSibling;
        if (root === null || content === null || !(content instanceof HTMLElement)) return;
        if (!root.hasAttribute('data-open')) return;
        const height = content.getBoundingClientRect().height;
        if (height < 6) return;

        // Hold the host toggle for exactly one short animation.
        event.preventDefault();
        event.stopPropagation();
        busy = true;

        const style = getComputedStyle(content);
        const animation = content.animate([
          {
            height: `${height}px`,
            opacity: 1,
            marginTop: style.marginTop,
            marginBottom: style.marginBottom,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
          },
          {
            height: '0px',
            opacity: 0,
            marginTop: '0px',
            marginBottom: '0px',
            paddingTop: '0px',
            paddingBottom: '0px',
          },
        ], { duration, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
        content.style.overflow = 'hidden';
        content.style.willChange = 'height, opacity, margin, padding';
        pending = { animation, content };

        animation.finished.then(() => {
          // Replay the click while the row still looks collapsed, then let the
          // host unmount the content and clear the transient styles.
          pending = null;
          replaying = true;
          try {
            row.click();
          } finally {
            replaying = false;
          }
          requestAnimationFrame(() => {
            animation.cancel();
            content.style.overflow = '';
            content.style.willChange = '';
            content.style.height = '';
            busy = false;
          });
        }).catch(() => {
          clearPending();
          busy = false;
        });
      }

      document.addEventListener('click', onClick, true);
      return () => {
        document.removeEventListener('click', onClick, true);
        clearPending();
        busy = false;
      };
    }

    // --------------------------------------------------------- scroll blur run

    /**
     * True scroll-axis motion blur for the conversation scroller. Scroll events
     * do not bubble but they do capture, so one document listener sees every
     * `[data-conversation-scroll]` scroll; the handler derives speed from
     * scrollTop deltas and drives the shared SVG `feGaussianBlur` with
     * `stdDeviation="0 N"` (vertical only — a directional drag blur, not a
     * uniform defocus). While moving, the scroller is tagged `[data-dshm-blur]`
     * so its rows reference the filter; when scrolling stops the strength
     * decays to zero and the tag is removed, leaving no filter at rest.
     * @param intensity - the active preset, for the maximum stdDeviation.
     * @returns cleanup that resets the filter and every touched scroller.
     */
    function installScrollBlur(intensity, directional) {
      const level = LEVELS[intensity] || LEVELS.standard;
      const maxBlur = level.scrollBlur;
      const maxTrail = level.trail;
      const primitive = document.getElementById(MOTION_BLUR_PRIMITIVE_ID);
      if (primitive === null) return () => undefined;
      const tail1 = directional ? document.getElementById(MOTION_BLUR_TAIL1_ID) : null;
      const tail2 = directional ? document.getElementById(MOTION_BLUR_TAIL2_ID) : null;
      const states = new WeakMap();
      const touched = new Set();
      let current = 0;
      let trail = 0;
      let frame = 0;

      /** Push the current blur and directional trail into the SVG filter. */
      const write = () => {
        primitive.setAttribute('stdDeviation', current < 0.05 ? '0 0' : '0 ' + current.toFixed(2));
        if (tail1 !== null && tail2 !== null) {
          const idle = Math.abs(trail) < 0.1;
          tail1.setAttribute('dy', idle ? '0' : trail.toFixed(2));
          tail2.setAttribute('dy', idle ? '0' : (trail * 2).toFixed(2));
        }
      };

      /** Ease both the blur and the trail back to zero after scrolling stops. */
      const tick = () => {
        frame = 0;
        if (current <= 0.05 && Math.abs(trail) < 0.1) {
          current = 0;
          trail = 0;
          write();
          for (const target of touched) target.removeAttribute('data-dshm-blur');
          return;
        }
        current = Math.max(0, current * 0.74);
        trail *= 0.74;
        write();
        frame = requestAnimationFrame(tick);
      };

      /** @param sigma - target blur sigma; @param dir - signed trail offset px. */
      const bump = (sigma, dir) => {
        if (sigma > current) current = sigma;
        if (dir !== 0) trail = dir;
        write();
        if (frame === 0) frame = requestAnimationFrame(tick);
      };

      /** @param event - a document-level scroll in the capture phase. */
      function onScroll(event) {
        const target = event.target;
        if (!(target instanceof Element) || !target.hasAttribute('data-conversation-scroll')) return;
        const now = performance.now();
        let state = states.get(target);
        if (state === undefined) {
          state = { top: target.scrollTop, time: now };
          states.set(target, state);
          touched.add(target);
        }
        const dt = Math.max(1, now - state.time);
        const top = target.scrollTop;
        const delta = top - state.top;
        const speed = Math.abs(delta) / dt;
        state.top = top;
        state.time = now;
        const sigma = Math.min(maxBlur, speed * 0.55);
        if (sigma <= 0.08) return;
        // Content moves opposite to scrollTop, so the trailing smear sits on
        // the scrollTop side (behind the motion).
        const dir = directional ? Math.sign(delta) * Math.min(maxTrail, speed * 2.2) : 0;
        target.setAttribute('data-dshm-blur', '');
        bump(sigma, dir);
      }

      document.addEventListener('scroll', onScroll, true);
      return () => {
        document.removeEventListener('scroll', onScroll, true);
        if (frame !== 0) cancelAnimationFrame(frame);
        frame = 0;
        current = 0;
        trail = 0;
        write();
        for (const target of touched) target.removeAttribute('data-dshm-blur');
        touched.clear();
      };
    }

    // ------------------------------------------------------------ settings CSS

    /** Stylesheet for the Settings page and its preview (component-local). */
    const SETTINGS_CSS = [
      '.dshm-root{display:flex;flex-direction:column;gap:16px;width:100%;max-width:640px;padding:2px 0 10px;box-sizing:border-box;overflow-x:clip;color:var(--dsw-alias-label-primary)}',
      '.dshm-head{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}',
      '.dshm-head-text{flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.dshm-title{font-size:15px;font-weight:600;line-height:1.35}',
      '.dshm-subtitle{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '.dshm-panel{display:flex;flex-direction:column;gap:10px;min-width:0}',
      '.dshm-panel-title{font-size:12px;line-height:1.4;color:var(--dsw-alias-label-secondary)}',
      '.dshm-presets{display:flex;flex-wrap:wrap;gap:4px;max-width:100%;padding:3px;box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;align-self:flex-start}',
      '.dshm-preset{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.4;padding:5px 14px;border-radius:8px;cursor:pointer;transition:background-color .15s ease,color .15s ease}',
      '.dshm-preset:hover{color:var(--dsw-alias-label-primary)}',
      '.dshm-preset[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l1)}',
      '.dshm-list{display:flex;flex-direction:column;min-width:0;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;overflow:hidden;box-sizing:border-box}',
      '.dshm-row{display:flex;align-items:center;gap:16px;padding:11px 14px;background:var(--dsw-alias-bg-layer-1);box-sizing:border-box}',
      '.dshm-row + .dshm-row{border-top:1px solid var(--dsw-alias-border-l1)}',
      '.dshm-row-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dshm-row-title{font-size:13px;line-height:1.4}',
      '.dshm-row-desc{font-size:12px;line-height:1.45;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '.dshm-switch{flex:none;appearance:none;width:36px;height:21px;padding:0;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);position:relative;cursor:pointer;transition:background-color .18s ease,border-color .18s ease}',
      '.dshm-switch[aria-checked="true"]{background:var(--dsw-alias-brand-primary);border-color:transparent}',
      '.dshm-switch:disabled{opacity:.45;cursor:default}',
      '.dshm-knob{position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:var(--dsw-alias-label-secondary);opacity:.9;transition:translate .18s cubic-bezier(.34,1.56,.64,1),background-color .18s ease}',
      '.dshm-switch[aria-checked="true"] .dshm-knob{translate:14px 0;background:var(--dsw-alias-bg-base);opacity:1}',
      '.dshm-preview{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow:hidden;box-sizing:border-box;min-width:0}',
      '.dshm-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.dshm-preview-stage{display:flex;flex-direction:column;gap:9px;align-items:flex-start;justify-content:center;min-height:96px;width:100%;min-width:0;box-sizing:border-box}',
      '.dshm-preview[data-off] .dshm-preview-stage{opacity:.45}',
      '.dshm-demo-msg{align-self:flex-end;max-width:80%;padding:7px 12px;border-radius:12px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.4;overflow-wrap:anywhere;box-sizing:border-box;animation:dshm-demo-rise 3.4s ease-in-out infinite}',
      '.dshm-demo-tool{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:5px 9px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.4;overflow-wrap:anywhere;box-sizing:border-box;animation:dshm-demo-pulse 2.4s ease-in-out infinite}',
      '.dshm-demo-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary)}',
      '.dshm-demo-btn{appearance:none;border:0;border-radius:8px;padding:6px 14px;max-width:100%;font-size:12px;line-height:1.4;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);cursor:pointer;box-sizing:border-box;animation:dshm-demo-press 2.8s ease-in-out infinite}',
      '.dshm-note{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '@keyframes dshm-demo-rise{0%{opacity:.15;translate:0 10px}35%,100%{opacity:1;translate:0 0}}',
      '@keyframes dshm-demo-pulse{0%,100%{opacity:1}50%{opacity:.5}}',
      '@keyframes dshm-demo-press{0%,60%,100%{transform:scale(1)}70%{transform:scale(.93)}}',
      '@media (prefers-reduced-motion: reduce){.dshm-demo-msg,.dshm-demo-tool,.dshm-demo-btn{animation:none}}',
    ].join('');

    // -------------------------------------------------------------- components

    /** One labelled switch row. The button itself is the `role="switch"`. */
    function SwitchRow(props) {
      const { checked, onChange, label, description, disabled } = props;
      return h('div', { className: 'dshm-row' }, [
        h('div', { key: 'text', className: 'dshm-row-text' }, [
          h('span', { key: 'title', className: 'dshm-row-title' }, label),
          description ? h('span', { key: 'desc', className: 'dshm-row-desc' }, description) : null,
        ]),
        h('button', {
          key: 'switch',
          type: 'button',
          role: 'switch',
          className: 'dshm-switch',
          'aria-checked': checked ? 'true' : 'false',
          'aria-label': label,
          disabled: disabled === true,
          onClick: () => onChange(!checked),
        }, h('span', { className: 'dshm-knob' })),
      ]);
    }

    /** Three-way intensity picker. */
    function PresetPicker(props) {
      const { value, onChange, options } = props;
      return h('div', { className: 'dshm-presets', role: 'group' }, options.map((option) => h('button', {
        key: option.value,
        type: 'button',
        className: 'dshm-preset',
        'aria-pressed': value === option.value ? 'true' : 'false',
        onClick: () => onChange(option.value),
      }, option.label)));
    }

    /** Looping demo of the three effect families; speeds follow the preset. */
    function Preview(props) {
      const { t, intensity, enabled } = props;
      const factor = intensity === 'subtle' ? 1.35 : intensity === 'lively' ? 0.75 : 1;
      const duration = (seconds) => `${(seconds * factor).toFixed(2)}s`;
      return h('div', { className: 'dshm-preview', 'data-off': enabled ? undefined : '' }, [
        h('div', { key: 'head', className: 'dshm-preview-head' }, [
          h('span', { key: 'label' }, t('preview')),
        ]),
        h('div', { key: 'stage', className: 'dshm-preview-stage' }, [
          h('span', { key: 'msg', className: 'dshm-demo-msg', style: { animationDuration: duration(3.4) } }, t('preview.msg')),
          h('span', { key: 'tool', className: 'dshm-demo-tool', style: { animationDuration: duration(2.4) } }, [
            h('span', { key: 'dot', className: 'dshm-demo-dot' }),
            t('preview.tool'),
          ]),
          h('button', { key: 'btn', type: 'button', className: 'dshm-demo-btn', style: { animationDuration: duration(2.8) } }, t('preview.btn')),
        ]),
      ]);
    }

    /** The Settings page: master switch, preset, group switches, preview. */
    function SettingsSection(props) {
      const { t } = props;
      const settings = useSettings();
      const update = (patch) => updateSettings(patch);
      return h('div', { className: 'dshm-root' }, [
        h('style', { key: 'style', children: SETTINGS_CSS }),
        h('div', { key: 'head', className: 'dshm-head' }, [
          h('div', { key: 'text', className: 'dshm-head-text' }, [
            h('span', { key: 'title', className: 'dshm-title' }, t('title')),
          ]),
          h('button', {
            key: 'master',
            type: 'button',
            role: 'switch',
            className: 'dshm-switch',
            'aria-checked': settings.enabled ? 'true' : 'false',
            'aria-label': t('master'),
            onClick: () => update({ enabled: !settings.enabled }),
          }, h('span', { className: 'dshm-knob' })),
        ]),
        h('div', { key: 'intensity', className: 'dshm-panel' }, [
          h('span', { key: 'label', className: 'dshm-panel-title' }, t('intensity')),
          h(PresetPicker, {
            key: 'picker',
            value: settings.intensity,
            onChange: (value) => update({ intensity: value }),
            options: [
              { value: 'subtle', label: t('intensity.subtle') },
              { value: 'standard', label: t('intensity.standard') },
              { value: 'lively', label: t('intensity.lively') },
            ],
          }),
        ]),
        h('div', { key: 'list', className: 'dshm-list' }, [
          h(SwitchRow, {
            key: 'chat',
            checked: settings.chat,
            onChange: (value) => update({ chat: value }),
            label: t('group.chat'),
            disabled: !settings.enabled,
          }),
          h(SwitchRow, {
            key: 'ui',
            checked: settings.ui,
            onChange: (value) => update({ ui: value }),
            label: t('group.ui'),
            disabled: !settings.enabled,
          }),
          h(SwitchRow, {
            key: 'ambient',
            checked: settings.ambient,
            onChange: (value) => update({ ambient: value }),
            label: t('group.ambient'),
            disabled: !settings.enabled,
          }),
          h(SwitchRow, {
            key: 'reduce',
            checked: settings.reduceMotion,
            onChange: (value) => update({ reduceMotion: value }),
            label: t('reduce'),
          }),
        ]),
          h('div', { key: 'blur', className: 'dshm-panel' }, [
          h('span', { key: 'label', className: 'dshm-panel-title' }, t('blur.title')),
          h('div', { key: 'list', className: 'dshm-list' }, [
            h(SwitchRow, {
              key: 'scroll',
              checked: settings.blurScroll,
              onChange: (value) => update({ blurScroll: value }),
              label: t('blur.scroll'),
                disabled: !settings.enabled || settings.reduceMotion,
            }),
            h(SwitchRow, {
              key: 'direction',
              checked: settings.blurDirection,
              onChange: (value) => update({ blurDirection: value }),
              label: t('blur.direction'),
                disabled: !settings.enabled || settings.reduceMotion || !settings.blurScroll,
            }),
          ]),
        ]),
        h(Preview, { key: 'preview', t, intensity: settings.intensity, enabled: settings.enabled && !settings.reduceMotion }),
      ]);
    }

    /** Settings navigation icon: three motion trails and a sweep. */
    function SettingsIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true }, [
        h('path', { key: 'a', d: 'M2 4.5h7', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { key: 'b', d: 'M2 8h10', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { key: 'c', d: 'M2 11.5h5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        h('path', { key: 'd', d: 'M11.6 5.2c1.5 1 2.4 1.9 2.4 2.8s-.9 1.8-2.4 2.8', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', opacity: 0.7 }),
      ]);
    }

    /** The 视口优化 page of the viewport subpackage. */
    function ViewportSection(props) {
      const { t } = props;
      const settings = useSettings();
      const update = (patch) => updateSettings(patch);
      return h('div', { className: 'dshm-root' }, [
        h('style', { key: 'style', children: SETTINGS_CSS }),
        h('div', { key: 'head', className: 'dshm-head' }, [
          h('div', { key: 'text', className: 'dshm-head-text' }, [
            h('span', { key: 'title', className: 'dshm-title' }, t('viewport.title')),
          ]),
          h('button', {
            key: 'master',
            type: 'button',
            role: 'switch',
            className: 'dshm-switch',
            'aria-checked': settings.viewport ? 'true' : 'false',
            'aria-label': t('viewport.master'),
            onClick: () => update({ viewport: !settings.viewport }),
          }, h('span', { className: 'dshm-knob' })),
        ]),
        h('div', { key: 'margin', className: 'dshm-panel' }, [
          h('span', { key: 'label', className: 'dshm-panel-title' }, t('viewport.margin')),
          h(PresetPicker, {
            key: 'picker',
            value: settings.margin,
            onChange: (value) => update({ margin: value }),
            options: [
              { value: 'near', label: t('viewport.margin.near') },
              { value: 'normal', label: t('viewport.margin.normal') },
              { value: 'far', label: t('viewport.margin.far') },
            ],
          }),
        ]),
        h('div', { key: 'list', className: 'dshm-list' }, [
          h(SwitchRow, {
            key: 'lazy',
            checked: settings.lazyRows,
            onChange: (value) => update({ lazyRows: value }),
            label: t('viewport.lazy'),
            disabled: !settings.viewport,
          }),
          h(SwitchRow, {
            key: 'chain',
            checked: settings.scrollChain,
            onChange: (value) => update({ scrollChain: value }),
            label: t('viewport.scrollChain'),
            disabled: !settings.viewport,
          }),
          h(SwitchRow, {
            key: 'earlier',
            checked: settings.smartEarlier,
            onChange: (value) => update({ smartEarlier: value }),
            label: t('viewport.smartEarlier'),
            disabled: !settings.viewport,
          }),
        ]),
      ]);
    }

    /** Settings navigation icon for the viewport subpackage. */
    function ViewportIcon() {
      return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true }, [
        h('rect', { key: 'a', x: 1.5, y: 2.5, width: 13, height: 9.5, rx: 1.6, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { key: 'b', d: 'M1.5 8.5h13', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.6 }),
        h('path', { key: 'c', d: 'M5 14h6', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('path', { key: 'd', d: 'M8 8.5V4.8', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
      ]);
    }

    // ------------------------------------------------------------------ entry

    /** Frame-wide slot occupant: only a scoped stylesheet, no visible box. */
    function MotionStyles() {
      const settings = useSettings();
      React.useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-dsh-multimotion', '');
        return () => {
          root.removeAttribute('data-dsh-multimotion');
        };
      }, []);
      // The deferred-collapse runtime: only for the conversation group, only
      // while motion is on and the platform does not ask for reduced motion.
      React.useEffect(() => {
        if (!settings.enabled || settings.reduceMotion || !settings.chat) return undefined;
        if (prefersReducedMotion()) return undefined;
        return installCollapseAnimation(settings.intensity);
      }, [settings.enabled, settings.reduceMotion, settings.chat, settings.intensity]);
      // Subpackage viewport: rows are measured, unloaded offscreen, and
      // re-rendered near the viewport — exact heights, never estimates.
      React.useEffect(() => {
        if (!settings.viewport || !settings.lazyRows) return undefined;
        return installViewportLazy(settings.margin);
      }, [settings.viewport, settings.lazyRows, settings.margin]);
      // Sidebar collapse/expand: wrap the host reflow in a view transition.
      React.useEffect(() => {
        if (!settings.enabled || !settings.ui || settings.reduceMotion) return undefined;
        return installSidebarReflowAnimation();
      }, [settings.enabled, settings.ui, settings.reduceMotion]);
      // Tab switch slide: role=tabpanel mounts come in from the side.
      React.useEffect(() => {
        if (!settings.enabled || !settings.ui || settings.reduceMotion) return undefined;
        return installTabPanelSlide();
      }, [settings.enabled, settings.ui, settings.reduceMotion]);
      // Composer popover glass, rendered out of tree so the blur always works.
      React.useEffect(() => {
        if (!settings.enabled || !settings.ui || settings.reduceMotion) return undefined;
        return installPopoverGlass();
      }, [settings.enabled, settings.ui, settings.reduceMotion]);
      // Composer popover backdrop: dim + frost the page behind an open popup.
      React.useEffect(() => {
        if (!settings.viewport || !settings.smartEarlier) return undefined;
        return installSmartEarlier(settings.margin);
      }, [settings.viewport, settings.smartEarlier, settings.margin]);
      // Directional motion blur on the conversation scroller (optional trail).
      React.useEffect(() => {
        if (!settings.enabled || settings.reduceMotion || !settings.blurScroll) return undefined;
        if (prefersReducedMotion()) return undefined;
        return installScrollBlur(settings.intensity, settings.blurDirection);
      }, [settings.enabled, settings.reduceMotion, settings.blurScroll, settings.blurDirection, settings.intensity]);
      const css = React.useMemo(() => buildCss(settings), [settings]);
      if (css === '') return null;
      // Directional motion-blur filter: a vertical-only gaussian driven by the
      // scroll runtime. With the trail option on, two offset + faded copies of
      // the blurred image are merged back so the smear follows the scroll
      // direction. Hidden, zero-size and never painted by itself.
      const trail = settings.blurScroll && settings.blurDirection;
      return h(React.Fragment, null, [
        h('style', { key: 'css', 'data-dshm-motion-css': '' }, css),
        h('svg', {
          key: 'filters',
          'aria-hidden': 'true',
          width: 0,
          height: 0,
          style: { position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' },
        }, h('defs', null, h('filter', {
          id: MOTION_BLUR_ID,
          x: '0%',
          y: '-60%',
          width: '100%',
          height: '220%',
          colorInterpolationFilters: 'sRGB',
        }, trail ? [
          h('feGaussianBlur', { key: 'blur', id: MOTION_BLUR_PRIMITIVE_ID, in: 'SourceGraphic', stdDeviation: '0 0', result: 'blur' }),
          h('feOffset', { key: 't1', id: MOTION_BLUR_TAIL1_ID, in: 'blur', dy: 0, result: 'tail1' }),
          h('feOffset', { key: 't2', id: MOTION_BLUR_TAIL2_ID, in: 'blur', dy: 0, result: 'tail2' }),
          h('feComponentTransfer', { key: 'a1', in: 'tail1', result: 'tail1a' },
            h('feFuncA', { type: 'linear', slope: 0.5 })),
          h('feComponentTransfer', { key: 'a2', in: 'tail2', result: 'tail2a' },
            h('feFuncA', { type: 'linear', slope: 0.26 })),
          h('feMerge', { key: 'merge' }, [
            h('feMergeNode', { key: 'base', in: 'blur' }),
            h('feMergeNode', { key: 'm1', in: 'tail1a' }),
            h('feMergeNode', { key: 'm2', in: 'tail2a' }),
          ]),
        ] : h('feGaussianBlur', {
          key: 'blur',
          id: MOTION_BLUR_PRIMITIVE_ID,
          in: 'SourceGraphic',
          stdDeviation: '0 0',
        })))),
      ]);
    }

    /** Client Cordis services this bundle waits for. */
    const inject = ['slots', 'locale'];

    /**
     * Client entry point: locale dictionaries, the global stylesheet overlay,
     * and the Settings page + icon.
     * @param ctx - the Client Cordis context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'dsh-multimotion: dictionaries');
      const t = ctx.locale.bind(NS);
      const Section = (props) => h(SettingsSection, { ...props, t });

      // Always mounted: carries the global motion stylesheet.
      ctx.slots.inject(OVERLAY_SLOT, () => ctx.slots.register({
        name: OVERLAY_SLOT,
        id: 'multimotion-styles',
        order: 952,
      }, MotionStyles));

      // Settings navigation: one page plus its icon.
      ctx.slots.inject(SECTION_SLOT, () => ctx.slots.register({
        name: SECTION_SLOT,
        id: SECTION_ID,
        order: 18,
        locale: NS,
        label: () => t('title'),
      }, Section));
      ctx.slots.inject(SECTION_ICON_SLOT, () => ctx.slots.register({
        name: SECTION_ICON_SLOT,
        id: SECTION_ID,
        order: 18,
      }, SettingsIcon));

      // Subpackage `dsh-multimotion/viewport`: its own Settings page + icon.
      const Viewport = (props) => h(ViewportSection, { ...props, t });
      ctx.slots.inject(SECTION_SLOT, () => ctx.slots.register({
        name: SECTION_SLOT,
        id: VIEWPORT_SECTION_ID,
        order: 19,
        locale: NS,
        label: () => t('viewport.title'),
      }, Viewport));
      ctx.slots.inject(SECTION_ICON_SLOT, () => ctx.slots.register({
        name: SECTION_ICON_SLOT,
        id: VIEWPORT_SECTION_ID,
        order: 19,
      }, ViewportIcon));
    }

    return { inject, apply };
  },
});
