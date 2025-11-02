local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()

-- ✅ 初始化网络与防火墙模型（没卵用）
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

m = Map("igmpproxy", "IGMPPROXY设置", "配置IGMPPROXY以实现组播转发，igmpproxy仅支持ipv4。by:xiaren2")

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
s2.description = "接口配置请自行选择，并观察etc/igmpproxy.conf是否生成了配置的那行。一般是选取别名配置，例如br-lan选择lan,那么igmpproxy.conf生成的就是br-lan,如果你直接选br-lan可能会无法在igmpproxy.conf生成配置行，说明选取有误。防火墙不选择可能会无法播放，请自行测试。通过观察 igmpproxy 日志来决定放行的 IP 段，并不一定是组播 IP 段。如不会查看请放行0.0.0.0/0"

-- 方向
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行 (连接到组播来源)")
o:value("downstream", "下行 (连接到接收设备)")
o:value("disabled", "禁用 (不参与组播)")
o.default = "downstream"
o.rmempty = false
o.description = "设置接口的组播流向方向"

-- 手动构建网络接口列表（显示别名和物理接口）
o = s2:option(Value, "network", "网络接口")  -- 改为 Value 类型以支持自定义输入
o.nocreate = false
o.unspecified = true 
o.rmempty = true
-- 获取所有网络接口和别名信息
local nixio = require "nixio"

-- 使用nixio获取所有接口
local ifaces = nixio.getifaddrs() or {}

-- 获取网络配置中的别名信息
local networks = netm:get_networks() or {}

-- 创建接口映射表
local interface_map = {}
local alias_to_physical = {}

-- 首先收集所有物理接口和它们的别名
for _, net in ipairs(networks) do
    local ifname = net:ifname()
    local netname = net:name()
    
    if ifname and netname then
        if ifname == netname then
            -- 这是物理接口
            interface_map[ifname] = {physical = ifname, aliases = {}}
        else
            -- 这是别名，找到对应的物理接口
            alias_to_physical[netname] = ifname
        end
    end
end

-- 处理nixio获取的接口信息
for _, iface in ipairs(ifaces) do
    if iface.name and not interface_map[iface.name] then
        -- 检查这个接口是否是某个别名的物理接口
        local is_physical_for_alias = false
        for alias, physical in pairs(alias_to_physical) do
            if physical == iface.name then
                is_physical_for_alias = true
                if not interface_map[iface.name] then
                    interface_map[iface.name] = {physical = iface.name, aliases = {}}
                end
                table.insert(interface_map[iface.name].aliases, alias)
                break
            end
        end
        
        if not is_physical_for_alias and not alias_to_physical[iface.name] then
            -- 独立的物理接口
            interface_map[iface.name] = {physical = iface.name, aliases = {}}
        end
    end
end

-- 首先添加空值选项
o:value("", "-- 请选择接口 --")

-- 添加接口到选项列表（Emoji 美化）
for ifname, info in pairs(interface_map) do
    local icon, display_text

    if ifname == "lo" then
        icon = "🔴"
        display_text = "回环: " .. ifname
    elseif ifname:match("^br-") then
        icon = "🟢"
        display_text = "网桥: " .. ifname
    elseif ifname:match("^eth") then
        icon = "🔌"
        display_text = "以太网: " .. ifname
    elseif ifname:match("^wlan") or ifname:match("^ath") or ifname:match("^radio") then
        icon = "📶"
        display_text = "无线: " .. ifname
    elseif ifname:match("^tun") or ifname:match("^tap") then
        icon = "🌐"
        display_text = "隧道: " .. ifname
    elseif ifname:match("^ppp") or ifname:match("^pppoe") then
        icon = "📞"
        display_text = "PPP: " .. ifname
    elseif ifname:match("^usb") then
        icon = "💻"
        display_text = "USB: " .. ifname
    elseif ifname:match("^vlan") then
        icon = "🏷️"
        display_text = "VLAN: " .. ifname
    elseif ifname:match("^gre") then
        icon = "🔄"
        display_text = "GRE: " .. ifname
    else
        icon = "⚙️"
        display_text = "网络: " .. ifname
    end

    o:value(ifname, icon .. " " .. display_text)
end

-- 添加别名接口
for alias, physical in pairs(alias_to_physical) do
    if not interface_map[alias] then
        local icon = "🏷️"
        local display_text = "别名: " .. alias .. " (" .. physical .. ")"
        o:value(alias, icon .. " " .. display_text)
    end
end

o.description = "选择要配置的网络接口（优先别名），或选择自定义输入"

-- 使用OpenWrt官方风格的防火墙区域选择
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.nocreate = false
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
