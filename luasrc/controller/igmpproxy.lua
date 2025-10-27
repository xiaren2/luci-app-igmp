module("luci.controller.igmpproxy", package.seeall)

function index()
    if not nixio.fs.access("/etc/config/igmpproxy") then
        return
    end

    entry({"admin", "network", "igmpproxy"}, cbi("igmpproxy"), _("IGMP Proxy"), 60).dependent = true

end
