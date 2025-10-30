local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

-- ✅ 初始化网络与防火墙模型（非常关键）
local netm = require "luci.model.network".init()
local fwm = require "luci.model.firewall".init()

-- 兼容 table.contains() 函数（新版 Luci/ucode 环境无此函数）
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

-- 确保配置文件存在并设置默认值
if not uci:get_first("igmpproxy", "igmpproxy") then
    uci:section("igmpproxy", "igmpproxy", nil, {
        quickleave = "1",
        verbose = "1"
    })
    uci:commit("igmpproxy")
end

m = Map("igmpproxy", "IGMPPROXY设置", "配置IGMPPROXY以实现组播转发，igmpproxy仅支持ipv4。")

-- 绑定网络、防火墙模型，让模板可以正常显示接口状态
m.network = netm
m.firewall = fwm

-- 常规设置
s = m:section(TypedSection, "igmpproxy", "常规设置")
s.anonymous = true

-- Quick Leave
o = s:option(Flag, "quickleave", "快速离开")
o.default = 1
o.rmempty = false
o.description = "启用快速离开功能，减少离开延迟"

-- Verbose 级别
o = s:option(ListValue, "verbose", "日志级别")
o:value("0", "无")
o:value("1", "最小")
o:value("2", "中等")
o:value("3", "详细")
o.default = "1"
o.rmempty = false
o.description = "设置日志输出的详细程度"

-- 接口设置
s2 = m:section(TypedSection, "phyint", "接口配置")
s2.addremove = true
s2.anonymous = false
s2.template = "cbi/tblsection"
s2.description = "通过观察 igmpproxy 日志来决定放行的 IP 段，并不一定是组播 IP 段。如不会查看请放行0.0.0.0/0"

-- 方向
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行 (连接到组播来源)")
o:value("downstream", "下行 (连接到接收设备)")
o.default = "downstream"
o.rmempty = false
o.description = "设置接口的组播流向方向"

-- 使用OpenWrt官方风格的网络接口选择
o = s2:option(Value, "network", "网络接口")
o.template = "cbi/network_netlist"
o.unspecified = true
o.rmempty = true
o.description = "选择要配置的物理网络接口"

-- 使用OpenWrt官方风格的防火墙区域选择
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.nocreate = true
o.unspecified = true
o.rmempty = true
o.description = "选择要配置的防火墙区域"

-- Alt Network
o = s2:option(DynamicList, "altnet", "放行网络段")
o.placeholder = "例如: 10.0.0.0/8"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "仅对上行接口有效。可以添加多个组播地址/中转范围。"

return m
