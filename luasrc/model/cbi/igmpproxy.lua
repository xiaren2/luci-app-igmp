local m, s, o
local uci = require "luci.model.uci".cursor()

-- 确保配置文件存在并设置默认值
if not uci:get_first("igmpproxy", "igmpproxy") then
    uci:section("igmpproxy", "igmpproxy", nil, {
        quickleave = "1",
        verbose = "1"
    })
    uci:commit("igmpproxy")
end

m = Map("igmpproxy", "IGMP代理", "配置 IGMP 代理以实现组播转发，igmpproxy 仅支持 IPv4。")

-- 常规设置
s = m:section(TypedSection, "igmpproxy", "常规设置")
s.anonymous = true

o = s:option(Flag, "quickleave", "快速离开")
o.default = 1
o.rmempty = false
o.description = "启用快速离开功能可加速组播组的离开过程。"

o = s:option(ListValue, "verbose", "日志级别")
o:value("0", "无")
o:value("1", "最小")
o:value("2", "中等")
o:value("3", "最大")
o.default = "1"
o.rmempty = false
o.description = "设置日志输出的详细程度。"

-- 接口设置
s2 = m:section(TypedSection, "phyint", "接口配置")
s2.addremove = true
s2.template = "cbi/tblsection"
s2.anonymous = true   -- ✅ 允许匿名 section，否则保存 invalid
s2.description = "通过观察 igmpproxy 日志来决定放行的 IP 段，<br>并不一定是组播 IP 段。<br>如不会查看日志，请放行 0.0.0.0/0。"

-- 网络接口选择
o = s2:option(ListValue, "network", "网络接口")
o.template = "cbi/network_netlist"
o.widget = "select"
o.nocreate = true
o.unspecified = true
o.rmempty = true
o:value("", "未配置")
o.description = "选择要配置的物理网络接口。"

-- 防火墙区域选择
o = s2:option(ListValue, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.widget = "select"
o.rmempty = true
o:value("", "未配置")
o.description = "选择要绑定的防火墙区域（可留空）。"

-- 方向选择
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行 (连接到组播来源)")
o:value("downstream", "下行 (连接到接收设备)")
o.default = "downstream"
o.rmempty = false
o.description = "设置接口的组播流向方向。"

-- 放行的网络段（仅对上行接口有效）
o = s2:option(DynamicList, "altnet", "放行的网络段")
o.placeholder = "10.0.0.0/8"
-- ✅ 允许 CIDR，不然 10.0.0.0/8 会 invalid
o.datatype = "ip4addr(1)"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "仅对上行接口有效，可添加多个放行地址段。"

return m
