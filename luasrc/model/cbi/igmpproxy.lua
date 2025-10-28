local m, s, o
local fs = require "nixio.fs"
local uci = require "luci.model.uci".cursor()
local ifaces = require "luci.model.network".init().get_interfaces()

-- 兼容 table.contains() 函数
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

m = Map("igmpproxy", "IGMP代理", "配置IGMP代理以实现组播转发。")

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
o:value("3", "最大")
o.default = "1"
o.rmempty = false

-- 接口设置
s2 = m:section(TypedSection, "phyint", "接口配置")
s2.addremove = true
s2.template = "cbi/tblsection"
s2.anonymous = false

-- 使用更高级的接口选择器
o = s2:option(Value, "network", "网络接口")
o.template = "cbi/network_ifacelist"
o.widget = "radio"
o.nobridges = true
o.nocreate = true
o.unspecified = true
o.rmempty = false

-- 防火墙区域选择器
o = s2:option(Value, "zone", "防火墙区域")
o.template = "cbi/firewall_zonelist"
o.widget = "select"
o.rmempty = false

-- 方向选择
o = s2:option(ListValue, "direction", "方向")
o:value("upstream", "上行 (连接到组播源)")
o:value("downstream", "下行 (连接到接收设备)")
o.default = "downstream"
o.rmempty = false

-- 备用网络
o = s2:option(DynamicList, "altnet", "允许组播网络段")
o.placeholder = "10.0.0.0/8"
o.datatype = "ip4addr"
o.rmempty = true
o:depends("direction", "upstream")
o.description = "仅对上行接口有效，可指定多个组播地址/中转服务器范围"

-- 添加状态显示
s2:option(DummyValue, "_status", "接口状态")
s2:option(DummyValue, "_device", "物理设备")

-- 覆盖部分模板方法以显示更丰富的信息
function s2.cfgsections(self)
    local sections = TypedSection.cfgsections(self)
    for _, section in ipairs(sections) do
        local ifname = self.map:get(section, "network")
        if ifname and ifaces[ifname] then
            local iface = ifaces[ifname]
            section._status = iface:is_up() and "已连接" or "未连接"
            section._device = iface:get_network() or "-"
        else
            section._status = "-"
            section._device = "-"
        end
    end
    return sections
end

return m
