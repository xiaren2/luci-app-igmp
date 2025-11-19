'use strict';
'require form';
'require tools.widgets as widgets';

return L.view.extend({
    render: function() {
        var m, s, o;

        //
        // Main igmpproxy settings
        //
        m = new form.Map('igmpproxy', _('igmpproxy'), _('IGMP Proxy Configuration'));

        s = m.section(form.TypedSection, 'igmpproxy', _('General Settings'));
        s.anonymous = true;

        o = s.option(form.Flag, 'quickleave', _('Quick Leave'),
            _('Enable quickleave mode'));
        o.default = '1';

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'),
            _('0=none, 1=minimal, 2=more, 3=max'));
        o.value('0', _('0 - None'));
        o.value('1', _('1 - Minimal'));
        o.value('2', _('2 - More'));
        o.value('3', _('3 - Maximum'));
        o.default = '1';


        //
        // PHYINT interfaces
        //
        s = m.section(form.TypedSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = true;
        s.addremove = true;
        s.addbtntitle = _('Add Interface');

        o = s.option(widgets.NetworkSelect, 'network', _('Network Interface'),
            _('Select the network interface to use.'));
        o.nocreate = true;

        o = s.option(form.Value, 'zone', _('Firewall Zone'),
            _('Firewall zone name'));
        o.rmempty = true;

        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream'));
        o.value('downstream', _('Downstream'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';

        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'),
            _('Define additional networks allowed to join multicast.'));
        o.placeholder = '0.0.0.0/0';

        return m.render();
    }
});
