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
uci:foreach("network", "interface",
    function(section)
        if section[".name"] ~= "loopback" then
            networks[#networks + 1] = section[".name"]
        end
    end
)

-- 获取防火墙区域
local zones = {}
uci:foreach("firewall", "zone",
    function(section)
        zones[#zones + 1] = section.name
    end
)

m = Map("igmpproxy", translate("IGMP Proxy"), translate("Configure IGMP Proxy for multicast forwarding."))

-- 常规设置
s = m:section(TypedSection, "igmpproxy", translate("General Settings"))
s.anonymous = true

-- 只保留 quickleave 和 verbose 选项
o = s:option(Flag, "quickleave", translate("Quick Leave"))
o.default = 1
o.rmempty = false

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

o = s2:option(ListValue, "network", translate("Network"))
for _, net in ipairs(networks) do
    o:value(net)
end
o.rmempty = false

o = s2:option(ListValue, "zone", translate("Zone"))
for _, zone in ipairs(zones) do
    o:value(zone)
end
o.rmempty = true

o = s2:option(ListValue, "direction", translate("Direction"))
o:value("upstream", translate("Upstream"))
o:value("downstream", translate("Downstream"))
o.default = "downstream"

o = s2:option(DynamicList, "altnet", translate("Alt Network"))
o.placeholder = "224.0.0.0/4"
o.rmempty = true
o.description = translate("Only valid for upstream interface. You can add multiple multicast ranges here.")

return m
