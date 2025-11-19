-- Copyright
module("luci.controller.igmpproxy", package.seeall)

function index()
    if not nixio.fs.access("/etc/config/igmpproxy") then
        return
    end

    local page = entry({"admin", "services", "igmpproxy"}, view("igmpproxy/overview"), _("igmpproxy"))
    page.dependent = true
end
