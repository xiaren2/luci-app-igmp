local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

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

m = Map("igmpproxy", "IGMP代理设置", "配置IGMP代理以实现组播转发")

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

-- 接口设置
s2 = m:section(TypedSection, "phyint", "接口配置")
s2.addremove = true
s2.anonymous = false
s2.template = "cbi/tblsection"

-- 使用OpenWrt官方风格的网络接口选择
o = s2:option(Value, "network", "网络接口")
o.template = "cbi/network_netlist"
o.nocreate = true
o.rmempty = false

-- 使用OpenWrt官方风格的防火墙区域选择
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.nocreate = true
o.rmempty = true

-- 方向
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行")
o:value("downstream", "下行")
o.default = "downstream"
o.rmempty = false

-- Alt Network
o = s2:option(DynamicList, "altnet", "放行网段")
o.placeholder = "例如: 10.0.0.0/8"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "仅对上行接口有效。可以添加多个组播地址/中间地址范围。"

return m
