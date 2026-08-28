# 🐧 Linux 使用 systemd 部署 Mihomo 并配置本插件

## 🎯 1. 适用范围

本文面向需要在 Linux 上运行 [Mihomo](https://github.com/MetaCubeX/mihomo)，并让 Koishi 插件通过其代理入口访问 Steam 的用户；Mihomo 采用 GPL-3.0 许可证。

## 🔄 2. 部署前准备

确认系统已安装 `systemd`、`curl`，并准备好 Mihomo 二进制文件和订阅配置；本教程使用独立 HTTP 与 SOCKS5 端口，Koishi 推荐连接 SOCKS5H 端口。

## 📁 3. 推荐目录

将 Mihomo 的程序、配置、缓存和日志集中放在一个目录，例如：

```text
/home/<user>/mihomo/
├── bin/mihomo
├── config/runtime.yaml
├── config/source/
├── logs/mihomo.log
├── cache.db
└── systemd/mihomo.service
```

目录权限应只允许运维用户和 systemd 服务账户读取订阅及日志文件。

## ⚙️ 4. Mihomo 配置要点

在 `runtime.yaml` 中配置订阅、代理组和入站端口。示例只展示本地监听，不包含真实订阅地址：

```yaml
port: 7890
socks-port: 7891
allow-lan: false
mode: rule
external-controller: 127.0.0.1:9090
```

如果 Koishi 与 Mihomo 不在同一台机器，将 `host` 改为 Mihomo 所在局域网地址，并限制防火墙只允许可信网段访问。

### 🎮 Steam/CS2 分流与节点策略

如果机场订阅或本地配置提供包含多个节点的 Steam/CS2 代理组，可将 `steamcommunity.com`、`api.steampowered.com` 和 `store.steampowered.com` 等流量交给该组。机场提供节点及出口线路，Mihomo 按代理组策略选择组内节点；机场也可能在节点服务端继续进行中转或出口调度。笔者认为，若目标是降低单一出口超时、失效或被限制时的影响，可按以下顺序考虑：

1. **`fallback`：优先推荐。** 持续检查组内节点可用性，优先保持使用一个健康节点，仅在当前节点不可用时切换。出口相对稳定，更适合 Steam 这类可能对会话和 IP 敏感的服务。
2. **`url-test`：次选。** 按周期选择延迟较低的节点，适合解决链路质量或延迟问题；但测速快不代表该出口不会被 Steam 限制。
3. **`load-balance`：谨慎使用。** 可将不同连接分配到多个节点，理论上可能分散单一出口压力；但同一次库存查询的多个请求可能落到不同出口，频繁变化的 IP 不一定有利于 Steam 风控。

> ⚠️ 以上仅为经验性建议，以实际线路和 Steam 状态为准。健康检查通常只能判断节点是否可访问测试地址，不能天然识别“Steam 返回 429”并自动切换节点。多节点只能降低单一出口问题的影响，不能保证避免或绕过 429；遇到 429 时，应优先降低请求频率、等待插件退避时间或服务端的 `Retry-After`，再检查节点和 Steam 分流规则。

## 🧩 5. systemd 服务

创建 `systemd/mihomo.service`：

```ini
[Unit]
Description=Mihomo proxy
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/home/<user>/mihomo/bin/mihomo -d /home/<user>/mihomo -f /home/<user>/mihomo/config/runtime.yaml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

安装并启动：

```bash
sudo install -m 644 systemd/mihomo.service /etc/systemd/system/mihomo.service
sudo systemctl daemon-reload
sudo systemctl enable --now mihomo.service
systemctl status mihomo.service
```

查看实时日志：

```bash
journalctl -u mihomo.service -f
```

## 📝 6. Koishi 配置

在每个 Koishi 实例中启用代理，并填写 Mihomo SOCKS5 入站：

```yaml
proxy:
  enabled: true
  protocol: socks5h
  host: 127.0.0.1
  port: 7891
useCookie: false
```

`socks5h` 会将 DNS 解析交给代理端，通常更适合 Steam 社区接口。
如果只开放 HTTP 入站，则将协议改为 `http`，并填写对应端口。

## ✅ 7. 验证链路

先验证 Mihomo 入站：

```bash
curl -I https://www.google.com -x socks5h://127.0.0.1:7891
```

再重启 Koishi，检查日志出现 `代理已启用: socks5h://...`，然后执行一次库存查询。

## 🩺 8. 故障排查

- `429`：降低请求频率，等待插件退避时间，并在 Mihomo 中切换节点；不要连续刷新。
- `403`：确认 Steam 账号库存、个人资料和游戏详情公开；403 不一定是代理故障。
- TLS/重定向错误：优先改用 `socks5h`，检查 Mihomo 规则是否将 Steam 域名交给代理组。
- 连接失败：检查监听地址、防火墙、端口和 `systemctl status` 输出。

## 🔒 9. 订阅与安全

订阅更新脚本可以由 systemd timer 定时执行；更新后先运行 Mihomo 配置校验，再重启服务。不要把订阅 URL、Steam API Key、Cookie、真实节点名或带凭证的配置提交到仓库。

## ↩️ 10. 回滚

恢复升级前的插件版本和 `koishi.yml` 备份，停止 Mihomo 服务即可回到原代理链路：

```bash
sudo systemctl disable --now mihomo.service
```
