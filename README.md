# zhajinhua-web
由deepseek网页聊天制作
局域网启动需要nodejs
需要在文件根目录下,在cmd输入 node server.js
这个项目还支持插件功能，有能力的可以在此基础上更改创新
以下是插件技术文档

# 炸金花 · 牌场风云 插件开发文档

**版本：** 1.0.0
**适用游戏：** 炸金花 · 牌场风云（单机版）
**插件后缀：** `.jjh`

---

## 1. 插件系统简介

本游戏内置插件系统，允许通过 `.jjh` 文件扩展游戏功能。
插件本质是一段 **JavaScript 代码**，通过调用全局对象 `JJH` 的 API 与游戏交互。
插件可以：添加大厅标签页、新增牌场、修改金币/点券、监听游戏事件、弹出提示等。

插件安装后保存在浏览器 `localStorage` 中，刷新页面自动重新加载。

---

## 2. 插件文件格式

- 扩展名：`.jjh`
- 内容：纯 JavaScript 代码（UTF-8 编码）
- 必须调用 `JJH.registerPlugin(meta, setup)` 进行注册

---

## 3. 快速开始

### 3.1 最小插件示例

创建一个文件 `hello.jjh`，内容如下：

```javascript
JJH.registerPlugin({
  id: 'hello_world',
  name: '你好世界',
  version: '1.0.0',
  author: '你的名字',
  description: '一个简单的示例插件',
  icon: '👋'
}, function(api) {
  // 插件初始化逻辑
  api.toast('你好，插件已加载！');
});
```

### 3.2 安装插件

1. 打开游戏，进入 **插件** 标签页。
2. 点击「点击上传 .jjh 插件文件」按钮，选择你的 `.jjh` 文件。
3. 插件自动加载并显示在已安装列表中。

也可以直接在「在线编写」文本框中粘贴代码，点击「运行代码」测试。

---

## 4. 注册函数 `JJH.registerPlugin(meta, setup)`

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `meta` | Object | 插件元信息，必须包含 `id` |
| `setup` | Function | 插件初始化函数，接收一个 `api` 对象 |

### `meta` 字段

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | string | 是 | — | 插件唯一标识，不可重复 |
| `name` | string | 否 | `id` | 插件显示名称 |
| `version` | string | 否 | `'1.0.0'` | 插件版本 |
| `author` | string | 否 | `'未知'` | 作者 |
| `description` | string | 否 | `''` | 插件描述 |
| `icon` | string | 否 | `'🔌'` | 插件图标（emoji） |

### `setup(api)` 函数

在插件加载时调用，`api` 提供了所有可用的接口。
所有修改数据的操作完成后，建议调用 `api.save()` 持久化。

---

## 5. API 参考

### 5.1 数据获取

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `api.id` | string | 当前插件 ID |
| `api.version` | string | API 版本号（`'1.0.0'`） |
| `api.getWallet()` | number | 当前金币 |
| `api.getCoupons()` | number | 当前点券 |
| `api.getSaveData()` | Object | 完整存档对象（谨慎修改） |
| `api.getGame()` | Object \| null | 当前牌局对象，不在牌局时为 `null` |
| `api.getCurrentRoom()` | Object \| null | 当前牌场配置 |

### 5.2 数据修改

| 方法 | 说明 |
|------|------|
| `api.setWallet(value)` | 直接设置金币数量 |
| `api.addCoins(amount)` | 增加金币（可为负数） |
| `api.addCoupons(amount)` | 增加点券（可为负数） |
| `api.save()` | 将当前存档写入 `localStorage` |

> 修改金币或点券后，游戏界面会自动更新。

### 5.3 UI 交互

| 方法 | 说明 |
|------|------|
| `api.toast(message)` | 显示顶部浮动提示 |
| `api.showModal(html, options)` | 显示弹窗，返回遮罩元素 |

**`showModal` 参数：**
- `html`：弹窗内部 HTML 字符串
- `options`（可选）：
  - `closeOnMask`：点击遮罩是否关闭，默认 `true`

**示例：**
```javascript
api.showModal(`
  <h3>标题</h3>
  <p>内容</p>
  <button class="modal-btn" onclick="this.closest('.modal-mask').remove()">关闭</button>
`);
```

### 5.4 扩展游戏内容

#### `api.addTab(id, name, renderFn, icon)`

添加一个大厅标签页。

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 标签页唯一 ID |
| `name` | string | 标签显示名称 |
| `renderFn` | Function | 渲染函数，接收 `pane` DOM 元素 |
| `icon` | string | 可选，标签图标 |

**示例：**
```javascript
api.addTab('my_tab', '我的页面', function(pane) {
  pane.innerHTML = '<h3>自定义内容</h3>';
  const btn = document.createElement('button');
  btn.textContent = '点我';
  btn.onclick = () => api.toast('点击了按钮');
  pane.appendChild(btn);
}, '🎮');
```

#### `api.addRoom(roomConfig)`

添加一个新的牌场。`roomConfig` 必须包含以下字段：

```javascript
{
  id: 'custom_room',      // 唯一 ID
  name: '自定义场',
  icon: '🎲',
  buyIn: 10000,           // 买入金币
  baseBet: 500,           // 底注
  maxBet: 50000,          // 封顶（Infinity 表示无上限）
  aiLevel: 4,             // AI 难度 1~7
  color: '#ff00ff',       // 主题色
  desc: '描述文字'
}
```

**示例：**
```javascript
api.addRoom({
  id: 'my_room',
  name: '我的场',
  icon: '🎯',
  buyIn: 5000,
  baseBet: 100,
  maxBet: 5000,
  aiLevel: 3,
  color: '#00ccff',
  desc: '插件添加的牌场'
});
```

### 5.5 事件系统

| 方法 | 说明 |
|------|------|
| `api.on(event, callback)` | 监听事件 |
| `api.emit(event, data)` | 触发事件（一般由游戏内部使用） |

**可用事件：**

| 事件名 | 触发时机 | 回调参数 |
|--------|----------|----------|
| `'game_start'` | 进入牌场开始对局时 | `{ room }` |
| `'hand_end'` | 每一局结束时 | `{ handNo }` |

**示例：**
```javascript
api.on('hand_end', function(data) {
  api.addCoins(100);
  api.toast('本局结束，奖励 100 金币！');
});
```

---

## 6. 完整示例插件

### 6.1 每日签到插件

```javascript
JJH.registerPlugin({
  id: 'daily_sign',
  name: '每日签到',
  version: '1.0.0',
  author: 'Demo',
  description: '每天可领取一次签到奖励',
  icon: '📅'
}, function(api) {
  api.addTab('daily_sign', '签到', function(pane) {
    const today = new Date().toDateString();
    const last = api.getSaveData().lastSignDate;

    pane.innerHTML = `
      <div style="padding:20px;text-align:center">
        <h3 style="color:#e8b64c">每日签到</h3>
        <p style="margin:16px 0;color:#9db3a6">今日奖励：1000 金币</p>
        <button class="modal-btn" id="signBtn" style="max-width:200px;margin:0 auto">
          ${last === today ? '今日已签到' : '立即签到'}
        </button>
      </div>
    `;

    const btn = pane.querySelector('#signBtn');
    if (last !== today) {
      btn.onclick = () => {
        api.addCoins(1000);
        api.getSaveData().lastSignDate = today;
        api.save();
        api.toast('签到成功，+1000 金币');
        btn.textContent = '今日已签到';
        btn.disabled = true;
      };
    } else {
      btn.disabled = true;
    }
  }, '📅');
});
```

### 6.2 幸运抽奖插件

```javascript
JJH.registerPlugin({
  id: 'lucky_draw',
  name: '幸运抽奖',
  version: '1.0.0',
  icon: '🎰'
}, function(api) {
  api.addTab('lucky_draw', '抽奖', function(pane) {
    pane.innerHTML = `
      <div style="padding:20px;text-align:center">
        <h3 style="color:#a855f7">幸运抽奖</h3>
        <p style="color:#9db3a6;margin:8px 0">花费 100 金币，有机会赢取大奖！</p>
        <button class="modal-btn" id="drawBtn" style="max-width:200px;margin:12px auto">
          抽 一 次
        </button>
        <div id="result" style="margin-top:16px;font-size:18px;font-weight:bold"></div>
      </div>
    `;

    pane.querySelector('#drawBtn').onclick = () => {
      if (api.getWallet() < 100) {
        api.toast('金币不足');
        return;
      }
      api.addCoins(-100);
      const prize = Math.floor(Math.random() * 1000) + 1;
      api.addCoins(prize);
      pane.querySelector('#result').textContent = '获得 ' + prize + ' 金币！';
      api.toast('抽奖完成');
      api.save();
    };
  }, '🎰');
});
```

---

## 7. 注意事项

1. **插件 ID 必须唯一**，重复注册会抛出错误。
2. **所有数据修改后建议调用 `api.save()`**，否则刷新页面可能丢失。
3. 插件运行在全局作用域，请避免定义全局变量污染。
4. 不要删除或修改游戏核心对象，以免破坏游戏稳定性。
5. 插件文件本质是 JS，请确保语法正确，否则加载失败。
6. 如果插件导致游戏异常，可在插件管理页删除该插件。
7. 插件目前不支持动态卸载，禁用后需刷新页面生效。

---

## 8. 调试与测试

- 在「插件」标签页的在线编写区域粘贴代码，点击「运行代码」即可测试。
- 浏览器控制台（F12）可查看插件错误信息。
- 测试通过后，将代码保存为 `.jjh` 文件分发。

---

## 9. 局域网联机插件开发提示

如果插件需要与外部服务端通信：

1. 使用 `location.hostname` 自动拼接地址，兼容局域网和公网。
2. 局域网 IP（`192.168.x.x`）走 `:3000` 端口，公网域名走默认 443 端口。
3. 需要 HTTPS 支持 WebSocket 时使用 `wss://` 协议。
4. 建议在 `setup()` 里立即隐藏外挂悬浮窗：
   ```javascript
   const el = document.getElementById('cheatFloat');
   if (el) el.style.display = 'none';
   ```

---

## 10. 版本兼容

| API 版本 | 游戏版本 | 说明 |
|----------|----------|------|
| 1.0.0    | v4+      | 当前版本 |

未来游戏更新可能扩展 API，但会保持向后兼容。

---

**祝你开发愉快！**
如有问题，请参考游戏内置的插件文档弹窗。
