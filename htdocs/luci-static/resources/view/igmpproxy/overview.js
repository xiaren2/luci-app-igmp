'use strict';
'require form';
'require tools.widgets as widgets';
'require uci';
'require fs';

return L.view.extend({
    load: function() {
        return fs.stat('/etc/config/igmpproxy').then(() => {
            return uci.load('igmpproxy');
        }).catch((err) => {
            return this.createDefaultConfig();
        }).then(() => {
            return this.ensureIgmpProxySection();
        }).then(() => {
            return uci.load('firewall');
        });
    },

    createDefaultConfig: function() {
        // 直接创建包含完整配置的文件
        var defaultConfig = [
            "config igmpproxy",
            "\toption quickleave '1'", 
            "\toption verbose '1'",
            ""
        ].join('\n');

        return fs.write('/etc/config/igmpproxy', defaultConfig)
            .then(() => uci.load('igmpproxy'))
            .catch((err) => {
                console.error('Failed to create igmpproxy config:', err);
                throw err;
            });
    },

    ensureIgmpProxySection: function() {
        var sections = uci.sections('igmpproxy', 'igmpproxy');
        
        if (sections.length === 0) {
            var sid = uci.add('igmpproxy', 'igmpproxy');
            uci.set('igmpproxy', sid, 'quickleave', '1');
            uci.set('igmpproxy', sid, 'verbose', '1');
            return uci.save().then(() => uci.apply());
        } else {
            // 确保现有 section 有 quickleave 选项
            var section = sections[0];
            if (!section.quickleave) {
                uci.set('igmpproxy', section['.name'], 'quickleave', '1');
                return uci.save().then(() => uci.apply());
            }
        }
        
        return Promise.resolve();
    },

    render: function() {
        var m, s, o;

        m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks.'));

        /* General settings - 使用第一个找到的 igmpproxy section */
        var igmpSections = uci.sections('igmpproxy', 'igmpproxy');
        var firstSection = igmpSections.length > 0 ? igmpSections[0]['.name'] : 'config';
        
        s = m.section(form.NamedSection, firstSection, 'igmpproxy', _('General Settings'));
        s.anonymous = false;
        s.addremove = false;

        o = s.option(form.Flag, 'quickleave', _('Quick Leave'));
        o.description = _('Send leave messages immediately on departure of the last member.');
        o.default = '1';

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'));
        o.value('0', _('0 - None'));
        o.value('1', _('1 - Minimal'));
        o.value('2', _('2 - More'));
        o.value('3', _('3 - Maximum'));
        o.default = '1';

        // 其余代码保持不变...
        /* Physical interfaces */
        s = m.section(form.TypedSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing.');

        /* Network interface */
        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.nocreate = false;
        o.optional = false;
        o.unspecified = true;
        o.rmempty = true;

        o.write = function(section_id, value) {
            if (value)
                value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'network', value);
        };

        /* Firewall Zone */
        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.nocreate = false;
        o.multiple = false;
        o.optional = true;
        o.unspecified = true;
        o.rmempty = true;
        o.description = _('Assign this interface to a firewall zone');

        o.write = function(section_id, value) {
            if (value)
                value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'zone', value);
        };

        /* Direction */
        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';

        /* Alternative networks */
        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = '192.168.1.0/24';
        o.description = _('Additional networks considered as directly connected');
        o.datatype = 'list(cidr)';

        return m.render();
    }
});
