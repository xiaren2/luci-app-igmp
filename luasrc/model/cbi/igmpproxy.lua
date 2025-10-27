local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

-- 确保配置文件存在并设置默认值
if not uci:get_first("igmpproxy", "igmpproxy") then
    uci:section("igmpproxy", "igmpproxy", nil, {
        quickleave = "1",
        verbose = "1"
    })
    uci:commit("igmpproxy")
end

-- 获取网络接口
local networks = {}
uci:foreach("network", "interface", function(section)
    if section[".name"] ~= "loopback" then
        networks[#networks + 1] = section[".name"]
    end
end)

-- 获取防火墙区域
local zones = {}
uci:foreach("firewall", "zone", function(section)
    if section.name then
        zones[#zones + 1] = section.name
    end
end)

m = Map("igmpproxy", translate("IGMP Proxy"), translate("Configure IGMP Proxy for multicast forwarding."))

-- 常规设置
s = m:section(TypedSection, "igmpproxy", translate("General Settings"))
s.anonymous = true

-- 启用开关
o = s:option(Flag, "enabled", translate("Enable IGMP Proxy"))
o.default = 1
o.rmempty = false

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
o:value("", translate("Not specified"))      -- 未指定
for _, net in ipairs(networks) do
    o:value(net)
end
o:value("_custom_", translate("Custom..."))  -- 自定义选项
o.rmempty = true
function o.write(self, section, value)
    if value == "_custom_" then
        local custom = luci.http.formvalue("cbid.igmpproxy." .. section .. ".network_custom")
        if custom and #custom > 0 then
            uci:set("igmpproxy", section, "network", custom)
        end
    else
        Value.write(self, section, value)
    end
end
function o.cfgvalue(self, section)
    local val = uci:get("igmpproxy", section, "network")
    if val and not (val == "" or val == "_custom_") and not table.contains(networks, val) then
        self.default = "_custom_"
    end
    return val
end

-- Zone 区域
o = s2:option(ListValue, "zone", translate("Zone"))
o:value("", translate("Not specified"))      -- 未指定
for _, zone in ipairs(zones) do
    o:value(zone)
end
o:value("_custom_", translate("Custom..."))  -- 自定义选项
o.rmempty = true
function o.write(self, section, value)
    if value == "_custom_" then
        local custom = luci.http.formvalue("cbid.igmpproxy." .. section .. ".zone_custom")
        if custom and #custom > 0 then
            uci:set("igmpproxy", section, "zone", custom)
        end
    else
        Value.write(self, section, value)
    end
end
function o.cfgvalue(self, section)
    local val = uci:get("igmpproxy", section, "zone")
    if val and not (val == "" or val == "_custom_") and not table.contains(zones, val) then
        self.default = "_custom_"
    end
    return val
end

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
