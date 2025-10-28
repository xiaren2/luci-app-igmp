local m, s, o
local uci = require "luci.model.uci".cursor()
local fs = require "nixio.fs"
local network = require "luci.model.network".init()
local firewall = require "luci.model.firewall".init(uci)

-- 兼容 table.contains()
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

-- 主页面
m = Map("igmpproxy", translate("IGMP Proxy"), translate("Configure IGMP Proxy for multicast forwarding."))

-- 常规设置
s = m:section(TypedSection, "igmpproxy", translate("General Settings"))
s.anonymous = true

-- Quick Leave
o = s:option(Flag, "quickleave", translate("Quick Leave"))
o.default = 1
o.rmempty = false

-- Verbose 级别
o = s:option(ListValue, "verbose", translate("Verbose Level"))
o:value("0", translate("None"))
o:value("1", translate("Minimal"))
o:value("2", translate("More"))
o:value("3", translate("Maximum"))
o.default = "1"
o.rmempty = false

-- 接口设置
s2 = m:section(TypedSection, "phyint", translate("Interfaces"))
s2.addremove = true
s2.template = "cbi/tblsection"
s2.anonymous = false

-- 网络接口
o = s2:option(ListValue, "network", translate("Network"))
o:value("", translate("Not specified"))  -- 未指定
for _, iface in ipairs(network:get_interfaces()) do
    local ifname = iface:name()
    local proto = iface:get("proto") or "?"
    local desc = string.format("%s (%s)", ifname, proto)
    o:value(ifname, desc)
end
o.rmempty = true

-- 防火墙区域
o = s2:option(ListValue, "zone", translate("Zone"))
o:value("", translate("Not specified"))  -- 未指定
for _, z in ipairs(firewall:get_zones()) do
    o:value(z.name, z.name)
end
o.rmempty = true

-- 方向
o = s2:option(ListValue, "direction", translate("Direction"))
o:value("upstream", translate("Upstream"))
o:value("downstream", translate("Downstream"))
o.default = "downstream"

-- Alt Network
o = s2:option(DynamicList, "altnet", translate("Alt Network"))
o.placeholder = "10.0.0.0/8"
o.rmempty = true
o.description = translate("Only valid for upstream interface. You can add multiple multicast ranges here.")

return m
