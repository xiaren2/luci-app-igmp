'use strict';
'require form';
'require tools.widgets as widgets';

return L.view.extend({
    render: function() {
        var m, s, o;

        m = new form.Map('igmpproxy', _('igmpproxy'), _('IGMP proxy configuration'));

        s = m.section(form.TypedSection, 'proxy', _('Proxy Instance'));
        s.anonymous = true;
        s.addremove = true;
        s.addbtntitle = _('Add instance');

        o = s.option(widgets.NetworkSelect, 'uplink', _('Uplink interface'), _('Where does the multicast come from?'));
        o.nocreate = true;
        o.rmempty = false;

        o = s.option(widgets.NetworkSelect, 'downlink', _('Downlink interface'), _('Where does the multicast go to?'));
        o.nocreate = true;
        o.rmempty = false;

        return m.render();
    }
});
