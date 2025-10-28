local m, s, s2, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

-- 初始化网络与防火墙模型
local netm = require "luci.model.network".init()
local fwm = require "luci.model.firewall".init()

-- 兼容旧版 Luci 环境中可能缺失的 table.contains()
if not table.contains then
    function table.contains(tbl, val)
        if not tbl or type(tbl) ~= "table" then return false end
        for _, v in ipairs(tbl) do
            if v == val then
                return true
            end
        end
        return false
    end
end

-- 确保 igmpproxy 配置存在
if not uci:get_first("igmpproxy", "igmpproxy") then
    uci:section("igmpproxy", "igmpproxy", nil, {
        quickleave = "1",
        verbose = "1"
    })
    uci:commit("igmpproxy")
end

-- ==============================
-- 主配置页面
-- ==============================
m = Map("igmpproxy", "IGMP代理设置", "配置 IGMP 代理以实现组播转发，igmpproxy 仅支持 IPv4。")

-- 绑定网络、防火墙模型（用于模板或接口选择）
m.network = netm
m.firewall = fwm

-- ==============================
-- 常规设置
-- ==============================
s = m:section(TypedSection, "igmpproxy", "常规设置")
s.anonymous = true

-- 快速离开
o = s:option(Flag, "quickleave", "快速离开")
o.default = 1
o.rmempty = false
o.description = "启用快速离开功能，减少离开延迟"

-- 日志级别
o = s:option(ListValue, "verbose", "日志级别")
o:value("0", "无")
o:value("1", "最小")
o:value("2", "中等")
o:value("3", "详细")
o.default = "1"
o.rmempty = false
o.description = "设置日志输出的详细程度"

-- ==============================
-- 接口配置
-- ==============================
s2 = m:section(TypedSection, "phyint", "接口配置")
s2.addremove = true
s2.anonymous = false
s2.template = "cbi/tblsection"
s2.description = "通过观察 igmpproxy 日志决定放行的 IP 段。如不确定，请放行 0.0.0.0/0。"

-- ==============================
-- 网络接口选择（完整显示所有类型）
-- ==============================
o = s2:option(Value, "network", "网络接口")
o.rmempty = false
o.description = "选择要配置的物理或逻辑网络接口（完整显示桥接、无线、隧道、别名等）"

-- 1. 逻辑网络（lan, wan, iptv 等）
for _, net in ipairs(netm:get_networks()) do
    local netname = net:name()
    local ifaces = net:get_interfaces() or {}
    local ifnames = {}

    for _, iface in ipairs(ifaces) do
        table.insert(ifnames, iface:name())
    end

    if #ifnames > 0 then
        o:value(netname, string.format('桥接: "%s" (%s)', table.concat(ifnames, ", "), netname))
    else
        o:value(netname, string.format('逻辑网络: "%s"', netname))
    end
end

-- 2. 物理接口（以太网、无线、隧道等）
for _, dev in ipairs(netm:get_devices()) do
    local devname = dev:name()
    local desc

    if dev:is_bridge() then
        desc = "桥接"
    elseif dev:is_wireless() then
        desc = "无线网络"
    elseif dev:is_tunnel() then
        desc = "隧道接口"
    else
        desc = "以太网适配器"
    end

    local nets = {}
    for _, net in ipairs(netm:get_networks()) do
        for _, iface in ipairs(net:get_interfaces()) do
            if iface:name() == devname then
                table.insert(nets, net:name())
            end
        end
    end

    if #nets > 0 then
        o:value(devname, string.format('%s: "%s" (%s)', desc, devname, table.concat(nets, ", ")))
    else
        o:value(devname, string.format('%s: "%s"', desc, devname))
    end
end

-- 3. 接口别名（@lan, @wan 等）
for _, net in ipairs(netm:get_networks()) do
    o:value("@" .. net:name(), string.format('接口别名: "@%s"', net:name()))
end

-- ==============================
-- 防火墙区域选择
-- ==============================
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.nocreate = true
o.unspecified = true
o.rmempty = true
o.description = "选择要配置的防火墙区域"

-- 接口方向
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行（连接到组播来源）")
o:value("downstream", "下行（连接到接收设备）")
o.default = "downstream"
o.rmempty = false
o.description = "设置接口的组播流向方向"

-- 放行网络段（仅上行有效）
o = s2:option(DynamicList, "altnet", "放行网络段")
o.placeholder = "例如: 10.0.0.0/8"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "仅对上行接口有效，可添加多个组播地址或中转范围。"

return m
