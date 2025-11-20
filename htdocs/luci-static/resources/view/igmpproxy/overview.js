'use strict';
'require form';
'require tools.widgets as widgets';
'require uci';
'require fs';

return L.view.extend({
    load: function() {
        return fs.stat('/etc/config/igmpproxy')
            .then(() => uci.load('igmpproxy'))
            .catch(() => this.createDefaultConfig())
            .then(() => this.ensureIgmpProxySection())
            .then(() => uci.load('firewall'));
    },

    createDefaultConfig: function() {
        var defaultConfig = [
            "config igmpproxy",
            "\toption quickleave '1'",
            "\toption verbose '1'",
            ""
        ].join('\n');

        return fs.write('/etc/config/igmpproxy', defaultConfig)
            .then(() => uci.load('igmpproxy'));
    },

    ensureIgmpProxySection: function() {
        var sections = uci.sections('igmpproxy', 'igmpproxy');
        if (sections.length === 0) {
            var sid = uci.add('igmpproxy', 'igmpproxy');
            uci.set('igmpproxy', sid, 'quickleave', '1');
            uci.set('igmpproxy', sid, 'verbose', '1');
            return uci.save().then(() => uci.apply());
        }
        var section = sections[0];
        if (!section.quickleave) {
            uci.set('igmpproxy', section['.name'], 'quickleave', '1');
            return uci.save().then(() => uci.apply());
        }
        return Promise.resolve();
    },

    render: function() {
        var m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks，ipv4 only.by:github.com/xiaren2'));

        // ===== General Settings (垂直布局) =====
        var igmpSections = uci.sections('igmpproxy', 'igmpproxy');
        var firstSection = igmpSections.length > 0 ? igmpSections[0]['.name'] : 'config';
        var s = m.section(form.NamedSection, firstSection, 'igmpproxy', _('General Settings'));
        s.anonymous = false;
        s.addremove = false;

        var o = s.option(form.Flag, 'quickleave', _('Quick Leave'));
        o.default = '1';
        o.description = _('Send leave messages immediately on departure of the last member.');

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'));
        o.value('0', _('0 - None'));
        o.value('1', _('1 - Minimal'));
        o.value('2', _('2 - More'));
        o.value('3', _('3 - Maximum'));
        o.default = '1';

        // ===== Physical Interfaces (表格) =====
        s = m.section(form.GridSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing."Disabled" is applicable to "lo" or "loopback" interface');

        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';

        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.nocreate = false;
        o.optional = false;
        o.unspecified = true;
        o.rmempty = true;
        o.write = function(section_id, value) {
            if (value) value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'network', value);
        };

        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.nocreate = false;
        o.multiple = false;
        o.optional = true;
        o.unspecified = true;
        o.rmempty = true;
        o.write = function(section_id, value) {
            if (value) value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'zone', value);
        };

        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = '10.0.0.0/8';
        o.datatype = 'list(cidr)';

        return m.render();
    }
});
