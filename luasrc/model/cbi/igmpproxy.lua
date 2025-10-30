local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

-- ✅ Initialize network and firewall models (critical)
local netm = require "luci.model.network".init()
local fwm = require "luci.model.firewall".init()

-- Compatibility for table.contains() function (newer Luci/ucode environments don't have this)
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

-- Ensure configuration exists and set defaults
if not uci:get_first("igmpproxy", "igmpproxy") then
    uci:section("igmpproxy", "igmpproxy", nil, {
        quickleave = "1",
        verbose = "1"
    })
    uci:commit("igmpproxy")
end

m = Map("igmpproxy", "IGMP Proxy Settings", "Configure IGMP proxy for multicast forwarding. igmpproxy supports IPv4 only.")

-- Bind network and firewall models for proper interface status display in templates
m.network = netm
m.firewall = fwm

-- General Settings
s = m:section(TypedSection, "igmpproxy", "General Settings")
s.anonymous = true

-- Quick Leave
o = s:option(Flag, "quickleave", "Quick Leave")
o.default = 1
o.rmempty = false
o.description = "Enable quick leave functionality to reduce leave latency"

-- Verbose Level
o = s:option(ListValue, "verbose", "Log Level")
o:value("0", "None")
o:value("1", "Minimal")
o:value("2", "Medium")
o:value("3", "Verbose")
o.default = "1"
o.rmempty = false
o.description = "Set the verbosity level for log output"

-- Interface Configuration
s2 = m:section(TypedSection, "phyint", "Interface Configuration")
s2.addremove = true
s2.anonymous = false
s2.template = "cbi/tblsection"
s2.description = "Check igmpproxy logs to determine which IP ranges to allow, not necessarily multicast IP ranges. If unsure, allow 0.0.0.0/0"

-- Direction
o = s2:option(ListValue, "direction", "Direction")
o:value("upstream", "Upstream (towards multicast source)")
o:value("downstream", "Downstream (towards receiving devices)")
o.default = "downstream"
o.rmempty = false
o.description = "Set the multicast flow direction for this interface"

-- Network interface selection using OpenWrt official style
o = s2:option(Value, "network", "Network Interface")
o.template = "cbi/network_netlist"
o.unspecified = true
o.rmempty = true
o.description = "Select the physical network interface to configure"

-- Firewall zone selection using OpenWrt official style
o = s2:option(Value, "zone", "Firewall Zone")
o.template = "cbi/firewall_zonelist"
o.nocreate = true
o.unspecified = true
o.rmempty = true
o.description = "Select the firewall zone to configure"

-- Alt Network
o = s2:option(DynamicList, "altnet", "Allowed Networks")
o.placeholder = "e.g., 10.0.0.0/8"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "Only valid for upstream interfaces. You can add multiple multicast addresses/relay ranges."

return m
