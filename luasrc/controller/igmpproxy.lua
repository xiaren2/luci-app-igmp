module("luci.controller.igmpproxy", package.seeall)

function index()
    if not nixio.fs.access("/etc/config/igmpproxy") then
        return
    end

    -- 从 “admin/network” 改为 “admin/services”
    entry({"admin", "services", "igmpproxy"}, cbi("igmpproxy"), _("IGMP Proxy"), 60).dependent = true
end
