# dsh-floating-clock · 悬浮时钟

[DeepSeek Harness (DSH)](https://github.com/deepseek-ai) Web 界面内的悬浮时钟插件：时钟 + Win11 风格月历 + 每日日程 + 闹钟提醒，数据持久化在 Host 磁盘。

A floating clock plugin for the DeepSeek Harness web GUI: draggable clock, Windows 11-style monthly calendar, per-day schedules, and alarm reminders — persisted on the Host disk.

## 功能 Features

- **悬浮时钟**：界面内悬浮显示 `hh:mm`，冒号以 1s 周期闪烁（与真实秒边界对齐）；可拖动到任意位置，位置持久化。
- **Win11 风格日历**：点击时钟弹出当月日历；今天高亮、可翻月、可回到今天；周起始日与日期文案跟随界面语言（`Intl` 本地化）。
- **每日日程**：在日历中**右键任意日期**打开当天日程面板；每行 `hh:mm + 内容`，按时间升序；末行 **＋** 新增空白行，填写时间与内容后点 **✓** 保存；已存条目点 **−** 删除；未填写的空行点击别处自动丢弃。
- **闹钟提醒**：到达日程时间（可提前）时，时钟下方出现**跳动的闹钟 + 日程内容**；点击后停止跳动并**变绿**（已读）；日程时间过后 5 分钟提醒自动消失，未点击则变**红**（未读）。
- **错过标记**：提醒消失时若从未点击，该日程标为"未点"——日历格上显示**红点 + 未读数量**，日程列表中该行标红点；绿点则只统计**正常日程**（未过期或已读），某天全部日程都是未读时只显示红点。提醒时段内 Harness 未运行或页面未打开的日程，在**下次启动的首个时钟 tick**、**Host 数据加载完成时**以及**关闭 Harness（pagehide/卸载）时**按同一规则补标为未读并落盘。
- **设置面板**（日历右上角齿轮）：显示大小 60%–200%（时钟与日历**等比缩放**）、冒号闪烁开关、24 小时制开关、提前提醒（立即 / 1 / 5 / 10 分钟 / 自定义 ≤30 分钟）、重置位置；右上角返回箭头回到时钟。
- **主题与本地化**：全部使用宿主 `--dsw-alias-*` 主题令牌，明暗主题自适应；中英文词典走 DSH Client locale 服务。
- **持久化**：设置、日程、闹钟状态保存在 Host 端 `$DSH_HOME/plugin-data/floating-clock/store.json`（原子写入），**重启 DSH、端口变化、换浏览器、重启电脑均不丢失**；浏览器 localStorage 仅作为本机缓存。

## 安装 Install

需要已安装并运行 DSH（开发版本为 `0.2.2-rc.1`，Web GUI）。

1. 将本仓库克隆或下载到本地任意目录：

   ```bash
   git clone https://github.com/chcczb/dsh-floating-clock.git
   ```

2. 在 DSH 会话中让 Agent 安装该目录（Agent 会调用 `plugin_manager install_bundle`）：

   > 帮我把 `<上面目录的绝对路径>` 安装为 DSH 插件

3. 刷新 DSH Web 页面，时钟出现在窗口右上区域。

卸载：让 Agent 执行 `plugin_manager remove_bundle @local/floating-clock`，或手动删除 `$DSH_HOME/plugin-data/floating-clock/` 中的持久化数据。

## 使用 Usage

| 操作 | 效果 |
|---|---|
| 拖动时钟 | 移动位置（持久化） |
| 单击时钟 | 打开 / 收起日历面板 |
| 齿轮图标 | 打开设置（再点回到日历） |
| 返回箭头 | 关闭面板回到时钟 |
| 右键日期格 | 打开当天日程面板 |
| ＋ / ✓ / − | 新增 / 保存 / 删除日程 |
| 单击跳动闹钟 | 停止跳动（记为已点） |
| Esc / 点击外部 | 关闭弹层 |

## 结构 Layout

```
├── package.json        # bundle 清单（dsh.bundle + dsh.client 声明）
├── cordis.patch.yml    # Loader 行：floating-clock
├── index.js            # Host 半：本地守卫的持久化存储端点 /plugins/floating-clock-store
├── client.js           # Client 半：shell.overlay 槽内的全部 UI（React，无构建步骤）
├── icon.svg            # 插件图标（原创）
└── locale/{en,zh}.json # 插件管理器显示元数据
```

安全说明：Host 存储端点仅接受**本机回环 + 同源**请求（Host/Origin 校验，防 DNS rebinding 与跨站调用），请求体上限 512 KiB。

## License

[MIT](LICENSE) © 2026 chcczb
