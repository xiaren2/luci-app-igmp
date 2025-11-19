module("luci.controller.igmpproxy", package.seeall)

function index()
    if not nixio.fs.access("/etc/config/igmpproxy") then
        return
    end

    entry({"admin", "services", "igmpproxy"}, view("igmpproxy/overview"), _("igmpproxy"), 20).dependent = true
end
