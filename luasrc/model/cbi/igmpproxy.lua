local m, s, o
local uci = require "luci.model.uci".cursor()
local net = require "luci.model.network".init()

m = Map("igmpproxy", "IGMP代理设置", "配置IGMP代理以实现组播转发")

-- 常规设置
s = m:section(TypedSection, "igmpproxy", "常规设置")
s.anonymous = true

o = s:option(Flag, "quickleave", "快速离开")
o.default = 1
o.rmempty = false

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

-- 自定义接口选择器
o = s2:option(ListValue, "network", "网络接口")
o:value("", "-- 请选择 --")

-- 获取所有网络设备并按类型分类
local devices = net:get_devices()
local ifaces = net:get_interfaces()

-- 按类型排序和显示
local types = {
    bridge = "桥接",
    ether = "以太网适配器",
    tunnel = "隧道接口",
    wireless = "无线网络",
    alias = "接口别名"
}

-- 收集所有接口信息
local interfaces = {}
for _, dev in ipairs(devices) do
    local iface = dev:get_interface()
    if iface then
        interfaces[iface:name()] = {
            type = dev:type(),
            dev = dev:name(),
            iface = iface,
            description = iface:get_i18n()
        }
    end
end

-- 按类型分组
local grouped = {}
for name, info in pairs(interfaces) do
    local typ = info.type
    if not grouped[typ] then grouped[typ] = {} end
    table.insert(grouped[typ], info)
end

-- 添加接口到选项
for typ, tname in pairs(types) do
    if grouped[typ] then
        o:value("", "--- "..tname.." ---")
        for _, info in ipairs(grouped[typ]) do
            local label = string.format("%s: %s", tname, info.dev)
            if info.iface:is_bridge() then
                label = label .. " (".. table.concat(info.iface:get_networks(), ", ") ..")"
            elseif info.description ~= info.dev then
                label = label .. " (".. info.description ..")"
            end
            o:value(info.dev, label)
        end
    end
end

-- 防火墙区域选择（保持官方风格）
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.nocreate = true
o.rmempty = true

-- 方向选择
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行")
o:value("downstream", "下行")
o.default = "downstream"
o.rmempty = false

-- Alt Network
o = s2:option(DynamicList, "altnet", "放行网络段")
o.placeholder = "例如: 10.0.0.0/8"
o.rmempty = true
o:depends("direction", "upstream")

return m
